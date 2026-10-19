import { createComboBindings } from './combo'
import { advancePress, validateLongPressMs } from './press'
import type { PressState } from './press'
import { validateKey } from './mapping'
import type {
  CancelReason,
  ComboEvent,
  ControllerOptions,
  DeviceInfo,
  GamepadController,
  InputEvent,
  InputEventType,
  NormalizedState,
  Vector
} from './types'

type Listener = (event: InputEvent<string>) => void
/**
 * @en One key's independent event sets; disabling never blocks subscription maintenance.
 * @zh 单个按键的独立事件集合，禁用不影响订阅维护。
 */
interface Bucket {
  /**
   * @en Whether normal input is allowed; subscription editing is always allowed.
   * @zh 是否允许普通输入，订阅编辑始终允许。
   */
  enabled: boolean

  /**
   * @en Separate deduplicated callback sets for each event type.
   * @zh 每种事件类型独立保存去重后的回调集合。
   */
  listeners: Map<InputEventType, Set<Listener>>
}

/**
 * @en Track only input actually delivered to this controller, including its source device.
 * @zh 仅跟踪实际交付给此控制器的输入及其来源设备。
 */
interface Delivered {
  /**
   * @en Source device whose input was delivered.
   * @zh 已交付输入的来源设备。
   */
  device: DeviceInfo<string>

  /**
   * @en In-progress button gesture, if any.
   * @zh 正在进行的按钮手势，可能为空。
   */
  press?: PressState

  /**
   * @en Last nonzero vector delivered to the scene.
   * @zh 最近交付给场景的非零向量。
   */
  axes?: Vector
}

/**
 * @en Manager services injected into a controller.
 * @zh 注入控制器的管理器服务。
 * */
interface Hooks {
  /**
   * @en Schedule a mutation after the current batch.
   * @zh 当前批次结束后执行状态修改。
   * @param action - @en State mutation to queue. @zh 待排队的状态修改。
   */
  mutate(action: () => void): void

  /**
   * @en Run an atomic input event batch.
   * @zh 运行一个原子输入事件批次。
   * @param action - @en Related event deliveries. @zh 相关事件的交付操作。
   */
  batch(action: () => void): void

  /**
   * @en Invalidate the current frame routing.
   * @zh 使当前帧的路由快照失效。
   */
  changed(): void

  /**
   * @en Remove this controller from its manager.
   * @zh 从管理器移除此控制器。
   */
  remove(): void

  /**
   * @en Report an isolated listener error.
   * @zh 报告隔离后的监听器错误。
   * @param error - @en Exception thrown by application code. @zh 业务代码抛出的异常。
   */
  report(error: unknown): void

  /**
   * @en Read monotonic time in milliseconds.
   * @zh 读取以毫秒为单位的单调时间。
   */
  now(): number
}

/**
 * @en Create event buckets and gesture state for one scene.
 * @zh 为一个场景创建事件桶及手势状态。
 * @param id - @en Unique controller ID. @zh 唯一控制器 ID。
 * @param name - @en Application scene name. @zh 应用场景名称。
 * @param options - @en Source binding and threshold override. @zh 输入源绑定及阈值覆盖。
 * @param defaultLongPressMs - @en Manager default threshold. @zh 管理器默认长按阈值。
 * @param hooks - @en Manager scheduling and lifecycle services. @zh 管理器调度及生命周期服务。
 */
export function createController(
  id: string,
  name: string,
  options: ControllerOptions,
  defaultLongPressMs: number,
  hooks: Hooks
) {
  const buckets = new Map<string, Bucket>()
  const delivered = new Map<string, Delivered>()
  // @en Consumed member presses remain suppressed until release.
  // @zh 已被组合消耗的成员按压保持抑制，直到自身松开。
  const suppressed = new Set<string>()
  let deviceId = options.deviceId
  let sourceId: string | undefined
  let longPressMs = validateLongPressMs(
    options.press?.longPressMs ?? defaultLongPressMs
  )
  let destroyed = false
  const combos = createComboBindings({
    /** @en Atomic controller event batches. @zh 控制器原子事件批次。 */
    batch: hooks.batch,
    /** @en Isolated callback error reporting. @zh 隔离的回调错误报告。 */
    report: hooks.report,
    /** @en Monotonic clock. @zh 单调时钟。 */
    now: hooks.now,
    /** @en Capture the current controller threshold on combo down. @zh 在组合 down 时捕获控制器当前阈值。 */
    threshold: () => longPressMs,
    /** @en Read member availability. @zh 读取成员可用性。
     * @param key - @en Member logical key. @zh 成员逻辑按键。
     */
    enabled: (key) => buckets.get(key)?.enabled ?? true,
    /** @en Suppress button gestures only. @zh 仅抑制按钮手势。 */
    suppress: suppressSingles
  })

  /**
   * @en Dispatch one immutable event batch.
   * @zh 分发一个不可变事件批次。
   * @param events - @en Ordered events for the same controller. @zh 同一控制器按顺序接收的事件。
   */
  function emit(events: InputEvent<string>[]) {
    hooks.batch(() => {
      for (const event of events) {
        const value =
          event.type === 'axes' ? Object.freeze([...event.value]) : undefined
        const payload = Object.freeze(
          value ? { ...event, value } : event
        ) as InputEvent<string>
        const listeners = buckets.get(event.key)?.listeners.get(event.type)
        for (const listener of [...(listeners ?? [])]) {
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
   * @en Remove delivered state before notifying cancellation.
   * @zh 通知取消之前先移除已交付状态。
   * @param key - @en Logical key being cancelled. @zh 被取消的逻辑按键。
   * @param reason - @en Cause of cancellation. @zh 取消原因。
   */
  function cancelKey(key: string, reason: CancelReason) {
    const state = delivered.get(key)
    if (!state) return
    delivered.delete(key)
    const now = hooks.now()
    const base = { key, device: state.device, timestamp: now }
    const events: InputEvent<string>[] = []
    if (state.axes)
      events.push({ ...base, type: 'axes', value: [0, 0], dt: 0, reason })
    events.push({
      ...base,
      type: 'cancel',
      reason,
      durationMs: state.press ? Math.max(0, now - state.press.startedAt) : 0
    })
    emit(events)
  }
  /**
   * @en Consume member button gestures without cancelling their independent stick axes.
   * @zh 消耗成员按钮手势，不取消其独立的摇杆轴输入。
   * @param keys - @en Members suppressed until their own release. @zh 分别抑制到自身松开的成员。
   */
  function suppressSingles(keys: readonly string[]) {
    hooks.batch(() => {
      for (const key of keys) suppressed.add(key)
      for (const key of keys) {
        const state = delivered.get(key)
        if (!state?.press) continue
        const press = state.press
        state.press = undefined
        if (!state.axes) delivered.delete(key)
        const timestamp = hooks.now()
        emit([
          {
            key,
            device: state.device,
            timestamp,
            type: 'cancel',
            reason: 'combo',
            durationMs: Math.max(0, timestamp - press.startedAt)
          }
        ])
      }
    })
  }

  /**
   * @en Cancel all in-progress inputs owned by this controller.
   * @zh 取消属于此控制器的全部进行中输入。
   * @param reason - @en Cause of cancellation. @zh 取消原因。
   */
  function cancel(reason: CancelReason) {
    sourceId = undefined
    hooks.batch(() => {
      combos.cancel(reason)
      suppressed.clear()
      for (const key of [...delivered.keys()]) cancelKey(key, reason)
    })
  }

  const api: GamepadController<string> = {
    id,
    name,
    /**
     * @en Read the pinned source, if any.
     * @zh 读取可选的固定输入源。
     */
    get deviceId() {
      return deviceId
    },
    /**
     * @en Maintain subscription sets even while a key is disabled.
     * @zh 即使按键禁用，也允许维护订阅集合。
     * @param key - @en Logical key. @zh 逻辑按键。
     * @param type - @en Input event type. @zh 输入事件类型。
     * @param listener - @en Callback to register. @zh 待注册的回调。
     */
    on(key, type, listener) {
      if (destroyed) throw new Error('Controller has been destroyed')
      validateKey(key)
      if (!buckets.has(key))
        buckets.set(key, { enabled: true, listeners: new Map() })
      const bucket = buckets.get(key)!
      if (!bucket.listeners.has(type)) bucket.listeners.set(type, new Set())
      const listeners = bucket.listeners.get(type)!
      listeners.add(listener as Listener)
      return () => {
        listeners.delete(listener as Listener)
      }
    },
    /**
     * @en Subscribe to a same-device chord, independently of single-key subscriptions.
     * @zh 订阅同设备组合键，与单键订阅分别保存。
     * @param keys - @en Distinct logical member keys. @zh 不同的成员逻辑按键。
     * @param type - @en Button event type. @zh 按钮事件类型。
     * @param listener - @en Combo callback. @zh 组合键回调。
     * @param comboOptions - @en Shared member suppression policy. @zh 共用的成员抑制策略。
     */
    onCombo(keys, type, listener, comboOptions) {
      if (destroyed) throw new Error('Controller has been destroyed')
      return combos.on(
        keys,
        type,
        listener as (event: ComboEvent<string>) => void,
        comboOptions
      )
    },
    /**
     * @en Change key availability and cancel pending input when disabling.
     * @zh 修改按键可用状态，禁用时取消未完成输入。
     * @param key - @en Logical key. @zh 逻辑按键。
     * @param enabled - @en Whether normal input is enabled. @zh 是否允许普通输入。
     */
    setEnabled(key, enabled) {
      validateKey(key)
      hooks.mutate(() => {
        if (destroyed) return
        if (!buckets.has(key))
          buckets.set(key, { enabled: true, listeners: new Map() })
        const bucket = buckets.get(key)!
        if (bucket.enabled === enabled) return
        if (!enabled) {
          combos.cancel('disabled', key)
          cancelKey(key, 'disabled')
        }
        bucket.enabled = enabled
        hooks.changed()
      })
    },
    /**
     * @en Read the enabled flag without exposing event sets.
     * @zh 读取启用标记，不暴露事件集合。
     * @param key - @en Logical key. @zh 逻辑按键。
     */
    isEnabled: (key) => buckets.get(key)?.enabled ?? true,
    /**
     * @en Cancel and change a controller's input source.
     * @zh 取消旧输入并修改控制器输入源。
     * @param next - @en Pinned session ID; omit for automatic routing. @zh 固定会话 ID，省略时自动路由。
     */
    setDevice(next) {
      hooks.mutate(() => {
        if (destroyed || next === deviceId) return
        cancel('rebind')
        deviceId = next
        hooks.changed()
      })
    },
    /**
     * @en Change the threshold used for future presses.
     * @zh 修改后续按压使用的阈值。
     * @param value - @en Finite positive milliseconds. @zh 有限正数毫秒值。
     */
    setLongPressMs(value) {
      if (destroyed) throw new Error('Controller has been destroyed')
      longPressMs = validateLongPressMs(value)
    },
    /**
     * @en Ask the manager to remove this controller.
     * @zh 请求管理器移除此控制器。
     */
    destroy() {
      hooks.mutate(hooks.remove)
    }
  }
  return {
    api,
    /**
     * @en Read the session whose inputs were last delivered.
     * @zh 读取最近实际交付输入的会话。
     */
    get sourceId() {
      return sourceId
    },
    cancel,
    /**
     * @en Cancel and permanently clear controller subscriptions.
     * @zh 取消输入并永久清理控制器订阅。
     */
    dispose() {
      cancel('destroy')
      destroyed = true
      buckets.clear()
      combos.clear()
    },
    /**
     * @en Process sampled changes only while this scene remains eligible.
     * @zh 仅在场景仍有资格接收输入时处理采样变化。
     * @param device - @en Source session metadata. @zh 来源会话信息。
     * @param previous - @en Previous copied logical state. @zh 上次复制的逻辑状态。
     * @param current - @en Current copied logical state. @zh 当前复制的逻辑状态。
     * @param now - @en Sampling time in milliseconds. @zh 采样时间，单位毫秒。
     * @param dt - @en Frame duration in seconds. @zh 帧间隔，单位秒。
     * @param canContinue - @en Whether routing remains valid after callbacks. @zh 回调执行后路由是否仍有效。
     */
    process(
      device: DeviceInfo<string>,
      previous: NormalizedState<string>,
      current: NormalizedState<string>,
      now: number,
      dt: number,
      canContinue: () => boolean
    ) {
      sourceId = device.id
      for (const key of suppressed)
        if (!current.buttons[key]?.pressed) suppressed.delete(key)
      combos.process(device, previous, current, now, canContinue)
      for (const [key, bucket] of [...buckets]) {
        if (!canContinue()) return
        if (!bucket.enabled) continue
        let state = delivered.get(key)
        const button = current.buttons[key]
        if (state?.press && !button) {
          cancelKey(key, 'unavailable')
          if (!canContinue()) return
          state = undefined
        }
        const base = { key, device, timestamp: now }
        if (button && !suppressed.has(key)) {
          if (state?.press) {
            const press = state.press
            const events = advancePress(press, button.pressed, now).map(
              (type) => ({
                ...base,
                type,
                value: button.value,
                durationMs: Math.max(0, now - press.startedAt)
              })
            )
            if (!button.pressed) {
              state.press = undefined
              if (!state.axes) delivered.delete(key)
            }
            if (events.length) emit(events)
          } else if (
            button.pressed &&
            previous.buttons[key] &&
            !previous.buttons[key]!.pressed
          ) {
            state ??= { device }
            state.press = {
              startedAt: now,
              thresholdMs: longPressMs,
              longPressFired: false
            }
            delivered.set(key, state)
            emit([
              { ...base, type: 'down', value: button.value, durationMs: 0 }
            ])
          }
        }
        if (!canContinue()) return
        state = delivered.get(key)
        const axes = current.sticks[key]
        const moving = axes && (axes[0] !== 0 || axes[1] !== 0)
        if (moving) {
          state ??= { device }
          state.axes = axes
          delivered.set(key, state)
          emit([{ ...base, type: 'axes', value: axes, dt }])
        } else if (state?.axes) {
          if (!axes) {
            cancelKey(key, 'unavailable')
          } else {
            state.axes = undefined
            if (!state.press) delivered.delete(key)
            emit([{ ...base, type: 'axes', value: [0, 0], dt }])
          }
        }
      }
    }
  }
}
