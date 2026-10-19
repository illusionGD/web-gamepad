import { INPUT_TYPE } from './constants'
import { validateKey } from './mapping'
import { advancePress } from './press'
import type { PressState } from './press'
import type {
  ButtonEventType,
  CancelReason,
  ComboEvent,
  ComboOptions,
  DeviceInfo,
  NormalizedState
} from './types'

type Listener = (event: ComboEvent<string>) => void

/** @en One order-independent chord and its event sets. @zh 一个与顺序无关的组合键及其事件集合。 */
interface Combo {
  /** @en Sorted, immutable member keys. @zh 排序后的不可变成员按键。 */
  keys: readonly string[]
  /** @en Whether recognition suppresses member button events. @zh 识别成功时是否抑制成员按钮事件。 */
  suppressSingles: boolean
  /** @en Deduplicated listeners by button event type. @zh 按按钮事件类型保存的去重监听器。 */
  listeners: Map<ButtonEventType, Set<Listener>>
  /** @en Members pressed while this binding was eligible on this source. @zh 此绑定可接收当前来源输入期间新按下的成员。 */
  held: Set<string>
  /** @en Gesture captured when all members became pressed. @zh 全部成员按下时创建的手势状态。 */
  active?: {
    /** @en Per-press threshold and timing. @zh 本次按压的阈值与计时。 */
    press: PressState
    /** @en Device that started the chord. @zh 启动组合键的来源设备。 */
    device: DeviceInfo<string>
  }
}

/** @en Controller services shared by combo bindings. @zh 组合键绑定使用的控制器服务。 */
interface ComboHooks {
  /** @en Dispatch an atomic event batch. @zh 交付原子事件批次。
   * @param action - @en Related deliveries. @zh 相关事件交付。
   */
  batch(action: () => void): void
  /** @en Report callback errors. @zh 报告回调错误。
   * @param error - @en Caught exception. @zh 捕获的异常。
   */
  report(error: unknown): void
  /** @en Current monotonic milliseconds. @zh 当前单调时间，单位毫秒。 */
  now(): number
  /** @en Current threshold for new chords. @zh 新组合按压使用的当前阈值。 */
  threshold(): number
  /** @en Check member availability. @zh 检查成员可用性。
   * @param key - @en Logical member key. @zh 逻辑成员按键。
   */
  enabled(key: string): boolean
  /** @en Suppress member button gestures before combo down. @zh 组合 down 前抑制成员按钮手势。
   * @param keys - @en Members to suppress until release. @zh 抑制至松开的成员。
   */
  suppress(keys: readonly string[]): void
}

/**
 * @en Store combo event sets and advance same-device chords using the shared press state machine.
 * @zh 保存组合键事件集合，使用共用按压状态机推进同设备组合手势。
 * @param hooks - @en Controller scheduling, settings and suppression services. @zh 控制器调度、配置及抑制服务。
 */
export function createComboBindings(hooks: ComboHooks) {
  const combos = new Map<string, Combo>()

  /**
   * @en Deliver immutable events without interrupting the poller on callback errors.
   * @zh 交付不可变事件，回调错误不会中断轮询。
   * @param combo - @en Binding owning the listeners. @zh 拥有监听器的绑定。
   * @param events - @en Ordered events in one atomic batch. @zh 一个原子批次内的有序事件。
   */
  function emit(combo: Combo, events: ComboEvent<string>[]) {
    hooks.batch(() => {
      for (const event of events) {
        const payload = Object.freeze(event)
        for (const listener of [...(combo.listeners.get(event.type) ?? [])]) {
          try {
            listener(payload)
          } catch (error) {
            hooks.report(error)
          }
        }
      }
    })
  }

  /**
   * @en Reset eligibility before notifying cancellation, without manufacturing a release.
   * @zh 通知取消前重置可接收状态，不模拟正常松开。
   * @param combo - @en Binding being cancelled. @zh 被取消的绑定。
   * @param reason - @en Interruption reason. @zh 中断原因。
   */
  function cancelCombo(combo: Combo, reason: CancelReason) {
    const active = combo.active
    combo.active = undefined
    combo.held.clear()
    if (!active) return
    const timestamp = hooks.now()
    emit(combo, [
      {
        keys: combo.keys,
        type: INPUT_TYPE.cancel,
        device: active.device,
        timestamp,
        durationMs: Math.max(0, timestamp - active.press.startedAt),
        reason
      }
    ])
  }

  return {
    /**
     * @en Subscribe to an unordered set of at least two distinct keys.
     * @zh 订阅至少两个不同按键组成的无序集合。
     * @param keys - @en Member logical keys. @zh 成员逻辑按键。
     * @param type - @en Button event type, excluding axes. @zh 按钮事件类型，不支持 axes。
     * @param listener - @en Callback receiving a combo payload. @zh 接收组合键参数的回调。
     * @param options - @en Shared options for this key set; omitted values reuse existing settings. @zh 此按键集合共用的配置，省略时复用已有设置。
     */
    on(
      keys: readonly string[],
      type: ButtonEventType,
      listener: Listener,
      options: ComboOptions = {}
    ) {
      if (keys.length < 2 || new Set(keys).size !== keys.length)
        throw new TypeError('A combo requires at least two distinct keys')
      for (const key of keys) validateKey(key)
      if (
        type === ('axes' as string) ||
        !Object.values(INPUT_TYPE).includes(type)
      )
        throw new TypeError('Combos only support button events')
      if (
        options.suppressSingles !== undefined &&
        typeof options.suppressSingles !== 'boolean'
      )
        throw new TypeError('suppressSingles must be a boolean')
      const sorted = [...keys].sort()
      const id = sorted.join('+')
      let combo = combos.get(id)
      if (
        combo &&
        options.suppressSingles !== undefined &&
        combo.suppressSingles !== options.suppressSingles
      )
        throw new TypeError(
          'Conflicting suppressSingles options for the same combo'
        )
      if (!combo) {
        combo = {
          keys: Object.freeze(sorted),
          suppressSingles: options.suppressSingles ?? false,
          listeners: new Map(),
          held: new Set()
        }
        combos.set(id, combo)
      }
      if (!combo.listeners.has(type)) combo.listeners.set(type, new Set())
      const listeners = combo.listeners.get(type)!
      listeners.add(listener)
      const binding = combo
      return () => {
        listeners.delete(listener)
        if (
          ![...binding.listeners.values()].some((set) => set.size) &&
          combos.get(id) === binding
        )
          combos.delete(id)
      }
    },
    /**
     * @en Reset all bindings or those containing a disabled member.
     * @zh 重置全部绑定，或重置包含已禁用成员的绑定。
     * @param reason - @en Cancellation reason. @zh 取消原因。
     * @param key - @en Optional member filter. @zh 可选的成员过滤条件。
     */
    cancel(reason: CancelReason, key?: string) {
      hooks.batch(() => {
        for (const combo of [...combos.values()])
          if (key === undefined || combo.keys.includes(key))
            cancelCombo(combo, reason)
      })
    },
    /** @en Clear subscriptions after lifecycle cancellation. @zh 生命周期取消后清除全部订阅。 */
    clear() {
      combos.clear()
    },
    /**
     * @en Process chords before singles so a completing press can be suppressed in the same frame.
     * @zh 先处理组合再处理单键，使组合完成帧内的按下也能被抑制。
     * @param device - @en The controller's one selected source. @zh 控制器选中的唯一输入源。
     * @param previous - @en Previous logical snapshot. @zh 前一帧逻辑快照。
     * @param current - @en Current logical snapshot. @zh 当前逻辑快照。
     * @param now - @en Sampling time in milliseconds. @zh 采样时间，单位毫秒。
     * @param canContinue - @en Whether callback mutations left routing valid. @zh 回调修改后路由是否仍有效。
     */
    process(
      device: DeviceInfo<string>,
      previous: NormalizedState<string>,
      current: NormalizedState<string>,
      now: number,
      canContinue: () => boolean
    ) {
      for (const [id, combo] of [...combos]) {
        if (!canContinue()) return
        if (combos.get(id) !== combo) continue
        const disabled = combo.keys.some((key) => !hooks.enabled(key))
        if (disabled || combo.keys.some((key) => !current.buttons[key])) {
          cancelCombo(combo, disabled ? 'disabled' : 'unavailable')
          continue
        }
        let rising = false
        for (const key of combo.keys) {
          if (!current.buttons[key]!.pressed) combo.held.delete(key)
          else if (previous.buttons[key] && !previous.buttons[key]!.pressed) {
            combo.held.add(key)
            rising = true
          }
        }
        const pressed = combo.keys.every((key) => combo.held.has(key))
        const value = Math.min(
          ...combo.keys.map((key) => current.buttons[key]!.value)
        )
        const base = { keys: combo.keys, device, timestamp: now, value }
        if (combo.active) {
          const press = combo.active.press
          const events = advancePress(press, pressed, now).map((type) => ({
            ...base,
            type,
            durationMs: Math.max(0, now - press.startedAt)
          }))
          if (!pressed) combo.active = undefined
          if (events.length) emit(combo, events)
        } else if (pressed && rising) {
          if (combo.suppressSingles) hooks.suppress(combo.keys)
          if (!canContinue() || combos.get(id) !== combo) continue
          combo.active = {
            device,
            press: {
              startedAt: now,
              thresholdMs: hooks.threshold(),
              longPressFired: false
            }
          }
          emit(combo, [{ ...base, type: INPUT_TYPE.down, durationMs: 0 }])
        }
      }
    }
  }
}
