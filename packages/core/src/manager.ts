import { DEFAULT_CONFIG } from './constants'
import { createController } from './controller'
import {
  capabilities,
  emptyState,
  rawSnapshot,
  resolveMapping,
  validateProfiles
} from './mapping'
import type { ResolvedMapping } from './mapping'
import { validateLongPressMs } from './press'
import { createSceneStack } from './scenes'
import type {
  CancelReason,
  DeviceInfo,
  GamepadController,
  GamepadManager,
  ManagerEvents,
  ManagerOptions,
  NormalizedState,
  RawGamepadState
} from './types'

/**
 * @en Per-session sampling state. Never retain native Gamepad objects as the previous frame.
 * @zh 每个会话的采样状态，不直接用原生 Gamepad 对象充当前一帧快照。
 */
interface Device {
  /**
   * @en Immutable public metadata for this session.
   * @zh 当前会话对外提供的不可变信息。
   */
  info: DeviceInfo<string>

  /**
   * @en Last detached raw snapshot for diagnostics.
   * @zh 用于调试的最近一次独立原始快照。
   */
  raw: RawGamepadState

  /**
   * @en Adapter resolved for this device only.
   * @zh 仅为此设备解析的适配器。
   */
  mapping: ResolvedMapping

  /**
   * @en Previous copied normalized input.
   * @zh 上一次复制后的归一化输入。
   */
  previous: NormalizedState<string>

  /**
   * @en Current copied normalized input.
   * @zh 当前复制后的归一化输入。
   */
  current: NormalizedState<string>

  /**
   * @en Whether each stick returned to neutral and may request takeover again.
   * @zh 各摇杆是否已回到中立区，允许再次申请接管。
   */
  armed: Map<string, boolean>
}
type Controller = ReturnType<typeof createController>
type EventName = keyof ManagerEvents<string>

/**
 * @en Create an isolated manager without starting browser listeners.
 * @zh 创建独立管理器，此时不启动浏览器监听。
 * @param config - @en Per-instance mapping, gesture and takeover settings. @zh 实例级映射、手势和接管配置。
 */
export function createGamepadManager<Extra extends string = never>(
  config: ManagerOptions<Extra> = {}
): GamepadManager<Extra> {
  const options = config as ManagerOptions<string>
  const profiles = [...(options.mappings ?? [])]
  validateProfiles(profiles)
  const longPressMs = validateLongPressMs(
    options.press?.longPressMs ?? DEFAULT_CONFIG.press.longPressMs
  )
  const deadZone = options.axes?.deadZone ?? DEFAULT_CONFIG.axes.deadZone
  const threshold =
    options.takeover?.threshold ?? DEFAULT_CONFIG.takeover.threshold
  const resetThreshold =
    options.takeover?.resetThreshold ?? DEFAULT_CONFIG.takeover.resetThreshold
  if (!Number.isFinite(deadZone) || deadZone < 0 || deadZone >= 1)
    throw new RangeError('deadZone must be in [0, 1)')
  if (
    !Number.isFinite(threshold) ||
    !Number.isFinite(resetThreshold) ||
    resetThreshold < 0 ||
    resetThreshold >= threshold ||
    threshold > 1
  ) {
    throw new RangeError(
      'takeover requires 0 <= resetThreshold < threshold <= 1'
    )
  }
  const devices = new Map<number, Device>()
  const controllers = new Map<string, Controller>()
  const scenes = createSceneStack()
  const listeners = new Map<EventName, Set<(event: never) => void>>()
  const pending: (() => void)[] = []
  let depth = 0,
    flushing = false,
    revision = 0
  let deviceSequence = 0,
    controllerSequence = 0
  let activeId: string | undefined
  let running = false,
    destroyed = false,
    suspended = false,
    blurred = false
  let frameId: number | undefined
  let lastTime: number | undefined

  const now = () =>
    typeof performance === 'undefined' ? Date.now() : performance.now()
  const findDevice = (id?: string) =>
    id === undefined
      ? undefined
      : [...devices.values()].find((device) => device.info.id === id)
  const activeControllers = () =>
    scenes
      .current()
      .map((id) => controllers.get(id))
      .filter((controller): controller is Controller => !!controller)
  const ensureAlive = () => {
    if (destroyed) throw new Error('Gamepad manager has been destroyed')
  }

  /**
   * @en Apply queued mutations only after the current event batch finishes.
   * @zh 当前事件批次结束后，才应用排队的状态修改。
   */
  function flush() {
    if (depth || flushing) return
    flushing = true
    try {
      while (pending.length) pending.shift()!()
    } finally {
      flushing = false
    }
  }
  /**
   * @en Queue a state change until the current batch ends.
   * @zh 将状态修改排队到当前批次结束。
   * @param action - @en Mutation to execute. @zh 待执行的修改。
   */
  function mutate(action: () => void) {
    pending.push(action)
    flush()
  }
  /**
   * @en Keep related events on the original controller.
   * @zh 保证相关事件由原控制器接收。
   * @param action - @en Event deliveries belonging to this batch. @zh 属于当前批次的事件交付。
   */
  function batch(action: () => void) {
    depth++
    try {
      action()
    } finally {
      depth--
      flush()
    }
  }
  /**
   * @en Report errors without terminating polling.
   * @zh 报告错误，同时保持轮询运行。
   * @param error - @en Caught exception. @zh 捕获的异常。
   */
  function report(error: unknown) {
    const handlers = listeners.get('error')
    if (!handlers?.size) {
      console.error(error)
      return
    }
    batch(() => {
      for (const listener of [...handlers]) {
        try {
          listener({ error } as never)
        } catch (nested) {
          console.error(nested)
        }
      }
    })
  }
  /**
   * @en Notify manager subscribers using a stable callback snapshot.
   * @zh 使用稳定回调快照通知管理器订阅者。
   * @param type - @en Manager event name. @zh 管理器事件名称。
   * @param event - @en Payload matching this event. @zh 与事件匹配的参数。
   */
  function emit<E extends EventName>(type: E, event: ManagerEvents<string>[E]) {
    batch(() => {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        try {
          listener(Object.freeze(event) as never)
        } catch (error) {
          report(error)
        }
      }
    })
  }
  /**
   * @en Cancel controllers that lost their source or active scene.
   * @zh 取消已失去输入源或激活场景的控制器。
   * @param reason - @en Reason to include in cancellation events. @zh 取消事件携带的原因。
   */
  function reconcile(reason: CancelReason) {
    const active = new Set(scenes.current())
    batch(() => {
      for (const [id, controller] of controllers) {
        const target = controller.api.deviceId ?? activeId
        if (
          controller.sourceId &&
          (!active.has(id) ||
            target !== controller.sourceId ||
            !findDevice(target))
        )
          controller.cancel(reason)
      }
    })
  }
  /**
   * @en Cancel the old automatic source before selecting a new one.
   * @zh 选择新自动输入源之前，先取消旧输入源。
   * @param id - @en New session ID, or undefined to wait for input. @zh 新会话 ID，undefined 表示等待输入。
   * @param reason - @en Input takeover or lifecycle reason. @zh 输入接管或生命周期原因。
   */
  function setActive(id: string | undefined, reason: CancelReason | 'input') {
    if (activeId === id) return
    batch(() => {
      const previous = findDevice(activeId)?.info ?? null
      activeId = id
      revision++
      reconcile(reason === 'input' ? 'devicechange' : reason)
      emit('devicechange', {
        previous,
        current: findDevice(id)?.info ?? null,
        reason
      })
    })
  }
  /**
   * @en Isolate adapter failures and produce a detached input state.
   * @zh 隔离适配器异常，并产生独立输入状态。
   * @param device - @en Device session containing the resolved adapter. @zh 包含已解析适配器的设备会话。
   * @param raw - @en Current browser input. @zh 当前浏览器输入。
   */
  function normalize(device: Device, raw: Gamepad) {
    try {
      return device.mapping.normalize(raw, device.current, deadZone)
    } catch (error) {
      report(error)
      return emptyState()
    }
  }
  /**
   * @en Capture a neutral baseline and allocate a new session.
   * @zh 捕获输入基线并分配新会话。
   * @param raw - @en Device exposed by the browser. @zh 浏览器暴露的设备。
   */
  function connect(raw: Gamepad) {
    let mapping: ResolvedMapping
    try {
      mapping = resolveMapping(raw, profiles)
    } catch (error) {
      report(error)
      mapping = { kind: 'unmapped', normalize: emptyState }
    }
    if (!running || destroyed) return
    const device: Device = {
      info: {
        id: 'device-' + ++deviceSequence,
        index: raw.index,
        name: raw.id,
        mapping: mapping.kind,
        profile: mapping.profile,
        controls: []
      },
      raw: rawSnapshot(raw),
      mapping,
      previous: emptyState(),
      current: emptyState(),
      armed: new Map()
    }
    device.current = normalize(device, raw)
    device.previous = device.current
    device.info = Object.freeze({
      ...device.info,
      controls: capabilities(device.current)
    })
    for (const [key, vector] of Object.entries(device.current.sticks)) {
      if (vector) device.armed.set(key, Math.hypot(...vector) <= resetThreshold)
    }
    if (!running || destroyed) return
    devices.set(raw.index, device)
    emit('connected', { device: device.info })
    return device
  }
  /**
   * @en Cancel routed inputs before removing a device session.
   * @zh 移除设备会话前取消已路由输入。
   * @param device - @en Session that became unavailable. @zh 已变得不可用的会话。
   */
  function disconnect(device: Device) {
    batch(() => {
      for (const controller of controllers.values())
        if (controller.sourceId === device.info.id)
          controller.cancel('disconnect')
      if (activeId === device.info.id) setActive(undefined, 'disconnect')
      devices.delete(device.info.index)
      revision++
      emit('disconnected', { device: device.info })
    })
  }
  /**
   * @en Read all devices once, select a source and dispatch one frame.
   * @zh 读取全部设备一次，选择输入源并交付一帧事件。
   * @param time - @en Monotonic sampling time in milliseconds. @zh 单调采样时间，单位毫秒。
   * @param baseline - @en If true, capture state without producing input. @zh 为 true 时仅建立基线，不产生输入事件。
   */
  function sample(time: number, baseline = false) {
    // @en Read once per frame and copy mutable native values.
    // @zh 每帧只读取一次，并复制可能变化的原生数值。
    const rawDevices = navigator.getGamepads()
    const seen = new Set<number>()
    const candidates: string[] = []
    for (const raw of rawDevices) {
      if (!running || suspended) return
      if (!raw?.connected) continue
      seen.add(raw.index)
      let device = devices.get(raw.index)
      if (
        device &&
        (device.info.name !== raw.id || device.raw.mapping !== raw.mapping)
      ) {
        disconnect(device)
        device = undefined
      }
      if (!device) {
        connect(raw)
        continue
      }
      const previous = device.current
      device.previous = previous
      device.current = normalize(device, raw)
      device.raw = rawSnapshot(raw)
      device.info = Object.freeze({
        ...device.info,
        controls: capabilities(device.current)
      })
      if (baseline) {
        device.previous = device.current
        device.armed.clear()
      }
      let intent = false
      for (const [key, button] of Object.entries(device.current.buttons)) {
        if (
          !baseline &&
          button?.pressed &&
          previous.buttons[key] &&
          !previous.buttons[key]!.pressed
        )
          intent = true
      }
      for (const [key, vector] of Object.entries(device.current.sticks)) {
        if (!vector) continue
        const magnitude = Math.hypot(...vector)
        if (magnitude <= resetThreshold) device.armed.set(key, true)
        else if (magnitude >= threshold && device.armed.get(key)) {
          if (!baseline) intent = true
          device.armed.set(key, false)
        }
      }
      if (intent) candidates.push(device.info.id)
    }
    for (const device of [...devices.values()])
      if (!seen.has(device.info.index)) disconnect(device)
    if (baseline || !running || suspended) return
    const bound = new Set(
      activeControllers()
        .map((controller) => controller.api.deviceId)
        .filter(Boolean)
    )
    if (activeId && bound.has(activeId)) setActive(undefined, 'rebind')
    const eligible = candidates.filter((id) => !bound.has(id))
    if (eligible.length) {
      // @en Break simultaneous-input ties using stable connection order.
      // @zh 同帧操作冲突时，使用稳定的连接顺序决定优先级。
      const winner =
        activeId && eligible.includes(activeId)
          ? activeId
          : [...devices.values()].find((device) =>
              eligible.includes(device.info.id)
            )?.info.id
      setActive(winner, 'input')
    }
    reconcile('scene')
    const epoch = revision
    const dt =
      lastTime === undefined
        ? 0
        : Math.min(0.1, Math.max(0, (time - lastTime) / 1000))
    lastTime = time
    const canContinue = () =>
      running && !suspended && !destroyed && revision === epoch
    for (const controller of activeControllers()) {
      if (!canContinue()) break
      const device = findDevice(controller.api.deviceId ?? activeId)
      if (device)
        controller.process(
          device.info,
          device.previous,
          device.current,
          time,
          dt,
          canContinue
        )
    }
  }

  function cancelFrame() {
    if (frameId !== undefined) cancelAnimationFrame(frameId)
    frameId = undefined
  }
  /**
   * @en Maintain at most one pending animation frame for this instance.
   * @zh 保证当前实例至多拥有一个待执行的动画帧。
   */
  function schedule() {
    if (running && !suspended && !destroyed && frameId === undefined)
      frameId = requestAnimationFrame(tick)
  }
  function tick() {
    frameId = undefined
    if (!running || suspended || destroyed) return
    try {
      sample(now())
    } catch (error) {
      report(error)
      mutate(() => stop('unavailable'))
    } finally {
      schedule()
    }
  }
  /**
   * @en Cancel gestures while the page is hidden or unfocused.
   * @zh 页面隐藏或失焦期间取消手势。
   * @param reason - @en Whether visibility or focus caused suspension. @zh 暂停源于可见性还是焦点变化。
   */
  function suspend(reason: 'hidden' | 'blur') {
    if (!running || suspended) return
    suspended = true
    cancelFrame()
    revision++
    batch(() => {
      for (const controller of controllers.values()) controller.cancel(reason)
      setActive(undefined, reason)
    })
    lastTime = undefined
  }
  /**
   * @en Rebaseline all devices before resuming; held buttons do not become new presses.
   * @zh 恢复前重新建立全部设备基线，持续按住的按钮不算新的按下。
   */
  function resume() {
    if (
      !running ||
      !suspended ||
      blurred ||
      document.visibilityState === 'hidden'
    )
      return
    suspended = false
    try {
      sample(now(), true)
    } catch (error) {
      report(error)
      stop('unavailable')
      return
    }
    lastTime = undefined
    schedule()
  }
  const onConnect = (event: GamepadEvent) =>
    mutate(() => {
      if (!running || suspended) return
      const existing = devices.get(event.gamepad.index)
      if (
        existing &&
        existing.info.name === event.gamepad.id &&
        existing.raw.mapping === event.gamepad.mapping
      )
        return
      if (existing) disconnect(existing)
      connect(event.gamepad)
    })
  const onDisconnect = (event: GamepadEvent) =>
    mutate(() => {
      const device = devices.get(event.gamepad.index)
      if (device && device.info.name === event.gamepad.id) disconnect(device)
    })
  const onBlur = () =>
    mutate(() => {
      blurred = true
      suspend('blur')
    })
  const onFocus = () =>
    mutate(() => {
      blurred = false
      resume()
    })
  const onVisibility = () =>
    mutate(() =>
      document.visibilityState === 'hidden' ? suspend('hidden') : resume()
    )

  function attach() {
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
  }
  function detach() {
    if (typeof window === 'undefined') return
    window.removeEventListener('gamepadconnected', onConnect)
    window.removeEventListener('gamepaddisconnected', onDisconnect)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', onVisibility)
  }
  /**
   * @en Clear sessions and listeners while keeping controller subscriptions.
   * @zh 清理会话及监听，同时保留控制器订阅。
   * @param reason - @en Lifecycle reason for cancelling input. @zh 取消输入的生命周期原因。
   */
  function stop(reason: CancelReason) {
    running = false
    suspended = false
    cancelFrame()
    detach()
    revision++
    batch(() => {
      for (const controller of controllers.values()) controller.cancel(reason)
      setActive(undefined, reason)
    })
    devices.clear()
    lastTime = undefined
  }
  /**
   * @en Validate scene ownership and extract controller IDs.
   * @zh 验证场景所属关系并提取控制器 ID。
   * @param input - @en One controller or a controller collection. @zh 单个控制器或控制器集合。
   */
  function sceneIds(
    input: GamepadController<string> | readonly GamepadController<string>[]
  ) {
    ensureAlive()
    const list = Array.isArray(input) ? input : [input]
    for (const item of list)
      if (controllers.get(item.id)?.api !== item)
        throw new Error('Controller does not belong to this manager')
    return list.map((item) => item.id)
  }
  /**
   * @en Apply scene mutations after the current event batch.
   * @zh 当前事件批次结束后应用场景修改。
   * @param action - @en Scene stack mutation. @zh 场景栈修改操作。
   */
  function changeScene(action: () => void) {
    mutate(() => {
      if (!destroyed) {
        action()
        revision++
        reconcile('scene')
      }
    })
  }

  const api: GamepadManager<string> = {
    /**
     * @en Read started state, including temporary visibility suspension.
     * @zh 读取启动状态，包含临时可见性暂停期间。
     */
    get running() {
      return running
    },
    /**
     * @en Start idempotently; capture baseline before polling.
     * @zh 幂等启动，先建立基线再轮询。
     */
    start() {
      ensureAlive()
      if (running) return true
      if (
        typeof window === 'undefined' ||
        typeof document === 'undefined' ||
        typeof navigator === 'undefined' ||
        typeof navigator.getGamepads !== 'function' ||
        typeof requestAnimationFrame !== 'function' ||
        typeof cancelAnimationFrame !== 'function'
      )
        return false
      let success = true
      mutate(() => {
        if (running || destroyed) return
        running = true
        blurred = false
        suspended = document.visibilityState === 'hidden'
        attach()
        try {
          if (!suspended) sample(now(), true)
        } catch (error) {
          report(error)
          stop('unavailable')
          success = false
        }
        lastTime = undefined
        schedule()
      })
      return success
    },
    /**
     * @en Stop listening while retaining scenes and subscriptions.
     * @zh 停止监听，同时保留场景和订阅。
     */
    stop() {
      mutate(() => stop('stop'))
    },
    /**
     * @en Permanently release the manager and its controllers.
     * @zh 永久释放管理器及其控制器。
     */
    destroy() {
      mutate(() => {
        if (destroyed) return
        destroyed = true
        stop('destroy')
        for (const controller of controllers.values()) controller.dispose()
        controllers.clear()
        scenes.clear()
        listeners.clear()
      })
    },
    /**
     * @en Create an inactive controller owned by this manager.
     * @zh 创建属于此管理器的未激活控制器。
     * @param name - @en Application scene name. @zh 应用场景名称。
     * @param controllerOptions - @en Device binding and threshold overrides. @zh 设备绑定及阈值覆盖配置。
     */
    createController(name, controllerOptions = {}) {
      ensureAlive()
      const id = 'controller-' + ++controllerSequence
      const controller = createController(
        id,
        name,
        controllerOptions,
        longPressMs,
        {
          mutate,
          batch,
          now,
          report,
          changed() {
            revision++
            reconcile('rebind')
          },
          remove() {
            if (!controllers.has(id)) return
            controller.dispose()
            controllers.delete(id)
            scenes.remove(id)
            revision++
            reconcile('scene')
          }
        }
      )
      controllers.set(id, controller)
      return controller.api
    },
    /**
     * @en Replace the current layer's controller set.
     * @zh 替换当前层的控制器集合。
     * @param input - @en Controller or controllers to activate. @zh 需要激活的控制器。
     */
    activate(input) {
      const ids = sceneIds(input)
      changeScene(() =>
        scenes.activate(ids.filter((id) => controllers.has(id)))
      )
    },
    /**
     * @en Push a temporary scene layer.
     * @zh 压入临时场景层。
     * @param input - @en Controller or controllers for the new layer. @zh 新场景层的控制器。
     */
    push(input) {
      const ids = sceneIds(input)
      changeScene(() => scenes.push(ids.filter((id) => controllers.has(id))))
    },
    /**
     * @en Safely restore the previous scene.
     * @zh 安全恢复上一层场景。
     */
    pop() {
      ensureAlive()
      changeScene(() => scenes.pop())
    },
    /**
     * @en Return a detached list of active controllers.
     * @zh 返回激活控制器的独立列表。
     */
    getActiveControllers: () =>
      activeControllers().map((controller) => controller.api),
    /**
     * @en List visible device session metadata.
     * @zh 列出可见设备的会话信息。
     */
    getDevices: () => [...devices.values()].map((device) => device.info),
    /**
     * @en Read the current automatic input source.
     * @zh 读取当前自动输入源。
     */
    getActiveDevice: () => findDevice(activeId)?.info ?? null,
    /**
     * @en Read a detached raw device sample.
     * @zh 读取独立的设备原始采样。
     * @param id - @en Connection session ID. @zh 连接会话 ID。
     */
    getRawState: (id) => findDevice(id)?.raw,
    /**
     * @en Subscribe to manager events; return an unsubscribe function.
     * @zh 订阅管理器事件，并返回取消订阅函数。
     * @param type - @en Manager event type. @zh 管理器事件类型。
     * @param listener - @en Application callback. @zh 业务回调。
     */
    on(type, listener) {
      ensureAlive()
      if (!listeners.has(type)) listeners.set(type, new Set())
      const bucket = listeners.get(type)!
      bucket.add(listener as (event: never) => void)
      return () => {
        bucket.delete(listener as (event: never) => void)
      }
    }
  }
  return api as unknown as GamepadManager<Extra>
}
