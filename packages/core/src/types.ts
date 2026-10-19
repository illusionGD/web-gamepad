import type {
  STANDARD_KEY,
  INPUT_TYPE,
  CANCEL_REASON,
  MAPPING_TYPE
} from './constants'

/**
 * @en Built-in logical keys derived from STANDARD_KEY.
 * @zh 从 STANDARD_KEY 常量推导的内置逻辑按键。
 */
export type StandardKey = (typeof STANDARD_KEY)[keyof typeof STANDARD_KEY]

/**
 * @en Built-in and application-defined extension keys.
 * @zh 内置按键和应用声明的扩展按键。
 */
export type ControlKey<Extra extends string = never> = StandardKey | Extra

/**
 * @en Keys that may expose analog axes.
 * @zh 允许提供模拟轴输入的逻辑按键。
 */
export type StickKey<Extra extends string = never> = 'LS' | 'RS' | Extra

/**
 * @en Normalized [x, y] components in [-1, 1].
 * @zh 分量范围为 [-1, 1] 的归一化 [x, y] 向量。
 */
export type Vector = readonly [number, number]

/**
 * @en Input event names derived from INPUT_TYPE.
 * @zh 从 INPUT_TYPE 常量推导的输入事件名称。
 */
export type InputEventType = (typeof INPUT_TYPE)[keyof typeof INPUT_TYPE]

/**
 * @en Button and cancellation event names.
 * @zh 按钮事件及取消事件名称。
 */
export type ButtonEventType = Exclude<InputEventType, 'axes'>

/**
 * @en Reason why a delivered input was cancelled.
 * @zh 已交付输入被取消的原因。
 */
export type CancelReason = (typeof CANCEL_REASON)[keyof typeof CANCEL_REASON]

/**
 * @en Resolved device mapping status.
 * @zh 设备映射解析状态。
 */
export type MappingType = (typeof MAPPING_TYPE)[keyof typeof MAPPING_TYPE]

/**
 * @en Button gesture configuration.
 * @zh 按钮手势配置。
 */
export interface PressConfig {
  /**
   * @en Positive finite threshold in milliseconds; default 500.
   * @zh 以毫秒为单位的有限正数阈值，默认 500。
   */
  longPressMs?: number
}

/**
 * @en Stick normalization configuration.
 * @zh 摇杆归一化配置。
 */
export interface AxesConfig {
  /**
   * @en Radial dead zone in [0, 1); default 0.12.
   * @zh 径向死区，范围 [0, 1)，默认 0.12。
   */
  deadZone?: number
}

/**
 * @en Thresholds operate on normalized stick magnitude.
 * @zh 阈值作用于归一化后的摇杆幅度。
 */
export interface TakeoverConfig {
  /**
   * @en Magnitude requesting takeover; default 0.35.
   * @zh 申请接管所需幅度，默认 0.35。
   */
  threshold?: number
  /**
   * @en Re-arm at or below this magnitude; default 0.2, lower than threshold.
   * @zh 回落至此幅度及以下时允许再次接管，默认 0.2，必须小于 threshold。
   */
  resetThreshold?: number
}

/**
 * @en Copied button input.
 * @zh 复制后的按钮输入状态。
 */
export interface ButtonState {
  /**
   * @en Whether this logical button is pressed.
   * @zh 逻辑按钮是否按下。
   */
  readonly pressed: boolean
  /**
   * @en Analog pressure normalized to [0, 1].
   * @zh 归一化到 [0, 1] 的模拟压力值。
   */
  readonly value: number
}

/**
 * @en Device-independent snapshot; missing controls are unavailable.
 * @zh 与设备无关的输入快照，缺少的输入表示不可用。
 */
export interface NormalizedState<K extends string = StandardKey> {
  /**
   * @en Button states keyed by logical identifier.
   * @zh 以逻辑标识为键的按钮状态。
   */
  buttons: Partial<Record<K, ButtonState>>
  /**
   * @en Stick vectors; include neutral entries to expose capabilities.
   * @zh 摇杆向量，应包含中立状态的字段以声明输入能力。
   */
  sticks: Partial<Record<K, Vector>>
}

/**
 * @en Convert an axis into a button using hysteresis.
 * @zh 使用双阈值将原始轴转换为按钮。
 */
export interface AxisButtonSource {
  /**
   * @en Nonnegative integer raw axis index.
   * @zh 非负整数原始轴索引。
   */
  axis: number
  /**
   * @en Raw values for released/full press; descending values invert direction.
   * @zh 松开与全按下的原始数值，倒序范围用于反向。
   */
  range: Vector
  /**
   * @en Normalized press threshold in (0, 1]; default 0.5.
   * @zh 归一化按下阈值，范围 (0, 1]，默认 0.5。
   */
  pressThreshold?: number
  /**
   * @en Release at or below this value; defaults to min(0.4, pressThreshold).
   * @zh 回落至此值及以下时松开，默认 min(0.4, pressThreshold)。
   */
  releaseThreshold?: number
}

/**
 * @en Read a raw button index, or convert an axis into a logical button.
 * @zh 读取原始按钮索引，或将原始轴转换为逻辑按钮。
 */
export type ButtonSource = number | AxisButtonSource

/**
 * @en Raw indices and directions for a two-dimensional stick.
 * @zh 二维摇杆的原始索引及方向配置。
 */
export interface StickSource {
  /**
   * @en Horizontal raw axis index.
   * @zh 横向原始轴索引。
   */
  x: number
  /**
   * @en Vertical raw axis index.
   * @zh 纵向原始轴索引。
   */
  y: number
  /**
   * @en Invert the horizontal direction; default false.
   * @zh 反转横向方向，默认 false。
   */
  invertX?: boolean
  /**
   * @en Invert the vertical direction; default false.
   * @zh 反转纵向方向，默认 false。
   */
  invertY?: boolean
}

/**
 * @en Per-device adapter; the first matching profile wins.
 * @zh 单台设备的适配配置，首个匹配项生效。
 */
export interface MappingProfile<Extra extends string = never> {
  /**
   * @en Optional profile identifier, exposed in device metadata.
   * @zh 可选的配置标识，会出现在设备元数据中。
   */
  id?: string
  /**
   * @en Return true when this profile applies.
   * @zh 返回 true 表示当前设备使用此配置。
   * @param gamepad - @en Raw browser device. @zh 浏览器原始设备。
   */
  match: (gamepad: Gamepad) => boolean
  /**
   * @en Explicitly inherit the standard layout before applying overrides.
   * @zh 显式继承标准布局，再应用覆盖配置。
   */
  extends?: 'standard'
  /**
   * @en Logical button sources; null removes an inherited button.
   * @zh 逻辑按钮来源，null 用于移除继承的按钮。
   */
  buttons?: Partial<Record<ControlKey<Extra>, ButtonSource | null>>
  /**
   * @en Logical stick sources; null removes an inherited stick.
   * @zh 逻辑摇杆来源，null 用于移除继承的摇杆。
   */
  sticks?: Partial<Record<StickKey<Extra>, StickSource | null>>
  /**
   * @en Replace declarative mapping entirely; do not combine with extends/buttons/sticks.
   * @zh 完全替代声明式映射，不与 extends/buttons/sticks 混用。
   * @param gamepad - @en Raw device to normalize; do not mutate it. @zh 待归一化的原始设备，请勿修改。
   */
  normalize?: (gamepad: Gamepad) => NormalizedState<ControlKey<Extra>>
}

/**
 * @en Button and axis capabilities are independent, including LS/RS.
 * @zh 按钮与轴能力独立存在，LS/RS 也遵循此规则。
 */
export interface ControlCapability<K extends string = StandardKey> {
  /**
   * @en Logical key identifier.
   * @zh 逻辑按键标识。
   */
  readonly key: K
  /**
   * @en Whether press events are available.
   * @zh 是否支持按压事件。
   */
  readonly button: boolean
  /**
   * @en Whether two-dimensional axis events are available.
   * @zh 是否支持二维轴事件。
   */
  readonly axes: boolean
}

/**
 * @en Immutable metadata for one connection session.
 * @zh 单次连接会话的不可变元数据。
 */
export interface DeviceInfo<K extends string = StandardKey> {
  /**
   * @en Session ID scoped to the manager; not a permanent hardware ID.
   * @zh 管理器内的连接会话 ID，不是永久硬件标识。
   */
  readonly id: string
  /**
   * @en Current browser slot; may be reused after disconnection.
   * @zh 当前浏览器槽位，断开后可能复用。
   */
  readonly index: number
  /**
   * @en Browser-reported Gamepad.id; format varies by platform.
   * @zh 浏览器报告的 Gamepad.id，格式因平台而异。
   */
  readonly name: string
  /**
   * @en Standard, custom or unmapped status.
   * @zh 标准、自定义或未映射状态。
   */
  readonly mapping: MappingType
  /**
   * @en ID of the matched custom profile, if supplied.
   * @zh 匹配的自定义配置 ID，配置提供时才存在。
   */
  readonly profile?: string
  /**
   * @en Available logical controls and their independent capabilities.
   * @zh 可用逻辑输入及其独立能力。
   */
  readonly controls: readonly ControlCapability<K>[]
}

/**
 * @en Immutable diagnostic copy of a browser button.
 * @zh 浏览器按钮的不可变调试副本。
 */
export interface RawButtonState {
  /**
   * @en Raw pressed state.
   * @zh 原始按下状态。
   */
  readonly pressed: boolean
  /**
   * @en Raw touched state.
   * @zh 原始触摸状态。
   */
  readonly touched: boolean
  /**
   * @en Raw browser-normalized pressure.
   * @zh 浏览器提供的原始归一化压力。
   */
  readonly value: number
}

/**
 * @en Detached read-only data for diagnosing unknown layouts.
 * @zh 用于排查未知布局的独立只读数据。
 */
export interface RawGamepadState {
  /**
   * @en Raw Gamepad.id, distinct from DeviceInfo.id.
   * @zh 原始 Gamepad.id，与 DeviceInfo.id 的会话标识不同。
   */
  readonly id: string
  /**
   * @en Raw browser slot.
   * @zh 原始浏览器槽位。
   */
  readonly index: number
  /**
   * @en Raw browser mapping string.
   * @zh 浏览器原始映射字符串。
   */
  readonly mapping: string
  /**
   * @en Raw device update timestamp.
   * @zh 原始设备更新的时间戳。
   */
  readonly timestamp: number
  /**
   * @en Raw indexed button snapshots.
   * @zh 按原始索引排列的按钮快照。
   */
  readonly buttons: readonly RawButtonState[]
  /**
   * @en Raw indexed axis values.
   * @zh 按原始索引排列的轴数值。
   */
  readonly axes: readonly number[]
}

/**
 * @en Metadata shared by all input events.
 * @zh 所有输入事件共用的元数据。
 */
export interface EventBase<K extends string> {
  /**
   * @en Logical key that produced the event.
   * @zh 产生事件的逻辑按键。
   */
  readonly key: K
  /**
   * @en Immutable source device metadata.
   * @zh 不可变的来源设备信息。
   */
  readonly device: DeviceInfo<string>
  /**
   * @en Monotonic sampling time in milliseconds.
   * @zh 单调递增的采样时间，单位毫秒。
   */
  readonly timestamp: number
}

/**
 * @en Normal button event and its sampled duration.
 * @zh 普通按钮事件及采样得到的按压时长。
 */
export type ButtonEvent<
  K extends string = StandardKey,
  E extends Exclude<ButtonEventType, 'cancel'> = Exclude<
    ButtonEventType,
    'cancel'
  >
> = EventBase<K> & {
  /**
   * @en Concrete button event type.
   * @zh 具体按钮事件类型。
   */
  readonly type: E
  /**
   * @en Sampled analog pressure in [0, 1].
   * @zh 采样时的模拟压力，范围 [0, 1]。
   */
  readonly value: number
  /**
   * @en Milliseconds since down; zero for down itself.
   * @zh 距 down 的毫秒数，down 自身为零。
   */
  readonly durationMs: number
}

/**
 * @en Continuous stick input and one zero event on recentering.
 * @zh 持续摇杆输入，以及回中时的一次零值事件。
 */
export type AxesEvent<K extends string = 'LS' | 'RS'> = EventBase<K> & {
  /**
   * @en Axis event discriminator.
   * @zh 轴事件标识。
   */
  readonly type: 'axes'
  /**
   * @en Normalized vector; [0, 0] on recentering or cancellation.
   * @zh 归一化向量，回中或取消时为 [0, 0]。
   */
  readonly value: Vector
  /**
   * @en Seconds since previous sample, capped at 0.1; zero for cancellation.
   * @zh 距上次采样的秒数，上限 0.1，取消时为零。
   */
  readonly dt: number
  /**
   * @en Present when the zero vector is caused by cancellation.
   * @zh 因取消而发送零向量时提供原因。
   */
  readonly reason?: CancelReason
}

/**
 * @en Cancellation never manufactures a normal release or click.
 * @zh 取消事件不会模拟正常松开或短按。
 */
export type CancelEvent<K extends string = StandardKey> = EventBase<K> & {
  /**
   * @en Cancellation event discriminator.
   * @zh 取消事件标识。
   */
  readonly type: 'cancel'
  /**
   * @en Reason this input lost routing or capability.
   * @zh 输入失去路由或能力的原因。
   */
  readonly reason: CancelReason
  /**
   * @en Elapsed button hold time; zero for axis-only input.
   * @zh 按钮已按住时长，仅有轴输入时为零。
   */
  readonly durationMs: number
}

/**
 * @en Infer callback payload from the chosen event type.
 * @zh 根据所选事件类型推导回调参数。
 */
export type InputEvent<
  K extends string = StandardKey,
  E extends InputEventType = InputEventType
> = E extends 'axes'
  ? AxesEvent<K>
  : E extends 'cancel'
    ? CancelEvent<K>
    : E extends Exclude<ButtonEventType, 'cancel'>
      ? ButtonEvent<K, E>
      : never

/**
 * @en Shared options for one unordered combo key set.
 * @zh 一个无序组合按键集合共用的配置。
 */
export interface ComboOptions {
  /**
   * @en Default false. On recognition, cancel pending member button gestures and suppress them until release; already delivered events cannot be undone.
   * @zh 默认 false。识别组合时取消成员未完成的按钮手势，并抑制至松开；已交付事件无法撤回。
   */
  suppressSingles?: boolean
}

/**
 * @en Button or cancellation payload for a chord; keys replaces the single-key field.
 * @zh 组合键的按钮或取消事件，使用 keys 替代单键 key 字段。
 */
export type ComboEvent<
  K extends string = StandardKey,
  E extends ButtonEventType = ButtonEventType
> = E extends ButtonEventType
  ? Omit<InputEvent<K, E>, 'key'> & {
      /**
       * @en Sorted, immutable member keys; registration order does not affect identity.
       * @zh 排序后的不可变成员按键，注册顺序不影响组合身份。
       */
      readonly keys: readonly K[]
    }
  : never

/**
 * @en Per-scene source and gesture settings.
 * @zh 场景级输入源及手势配置。
 */
export interface ControllerOptions {
  /**
   * @en Pin this connection session; omitted means follow automatic handover.
   * @zh 固定绑定此连接会话，省略时跟随自动接管。
   */
  deviceId?: string
  /**
   * @en Override the manager long-press threshold.
   * @zh 覆盖管理器默认长按阈值。
   */
  press?: PressConfig
}

/**
 * @en A scene-owned collection of logical key events.
 * @zh 场景拥有的逻辑按键事件集合。
 */
export interface GamepadController<Extra extends string = never> {
  /**
   * @en Unique controller ID within this manager.
   * @zh 此管理器内唯一的控制器 ID。
   */
  readonly id: string
  /**
   * @en Application-defined scene name.
   * @zh 应用定义的场景名称。
   */
  readonly name: string
  /**
   * @en Pinned session ID, or undefined for automatic routing.
   * @zh 固定会话 ID，自动路由时为 undefined。
   */
  readonly deviceId: string | undefined
  /**
   * @en Subscribe and return an idempotent unsubscribe function; identical callbacks are deduplicated.
   * @zh 订阅并返回可重复调用的取消订阅函数，相同回调自动去重。
   * @param key - @en Logical key to subscribe or configure. @zh 需要订阅或配置的逻辑按键。
   * @param type - @en Event type valid for this key. @zh 该按键支持的事件类型。
   * @param listener - @en Callback receiving an immutable event. @zh 接收不可变事件的回调。
   */
  on<
    K extends ControlKey<Extra>,
    E extends K extends StickKey<Extra> ? InputEventType : ButtonEventType
  >(
    key: K,
    type: E,
    listener: (event: InputEvent<K, E>) => void
  ): () => void
  /**
   * @en Subscribe to an unordered same-device chord of at least two distinct buttons; returns an idempotent unsubscribe function.
   * @zh 订阅至少两个不同按钮组成的同设备无序组合，返回可重复调用的取消订阅函数。
   * @param keys - @en Member logical keys, including supported extension keys. @zh 成员逻辑按键，可包含支持的扩展键。
   * @param type - @en Button event type; axes is not supported. @zh 按钮事件类型，不支持 axes。
   * @param listener - @en Callback inferred from the selected event type. @zh 根据事件类型推导参数的回调。
   * @param options - @en Options shared by this key set; omit to reuse its existing setting, or default to parallel singles for a new set. @zh 此按键集合共用的配置，省略则沿用已有设置，新集合默认并行交付单键。
   */
  onCombo<K extends ControlKey<Extra>, E extends ButtonEventType>(
    keys: readonly [K, K, ...K[]],
    type: E,
    listener: (event: ComboEvent<K, E>) => void,
    options?: ComboOptions
  ): () => void
  /**
   * @en Disable cancels pending input but preserves subscriptions.
   * @zh 禁用会取消未完成输入，同时保留订阅。
   * @param key - @en Logical key to subscribe or configure. @zh 需要订阅或配置的逻辑按键。
   * @param enabled - @en Whether the key may receive normal input. @zh 是否允许按键接收普通输入。
   */
  setEnabled(key: ControlKey<Extra>, enabled: boolean): void
  /**
   * @en Read the enabled state; new keys default to true.
   * @zh 读取启用状态，新按键默认为 true。
   * @param key - @en Logical key to subscribe or configure. @zh 需要订阅或配置的逻辑按键。
   */
  isEnabled(key: ControlKey<Extra>): boolean
  /**
   * @en Cancel the old source and update device routing.
   * @zh 取消旧输入源并更新设备路由。
   * @param deviceId - @en Session to pin; omit to follow automatic handover. @zh 固定会话 ID，省略则跟随自动接管。
   */
  setDevice(deviceId?: string): void
  /**
   * @en Update future presses; ongoing presses retain their original threshold.
   * @zh 更新后续按压的阈值，进行中的按压仍沿用原阈值。
   * @param durationMs - @en Positive finite threshold in milliseconds. @zh 以毫秒为单位的有限正数阈值。
   */
  setLongPressMs(durationMs: number): void
  /**
   * @en Permanently cancel input, remove subscriptions and prune scene history.
   * @zh 永久取消输入、清理订阅并移除场景历史引用。
   */
  destroy(): void
}

/**
 * @en Manager lifecycle and error event payloads.
 * @zh 管理器生命周期及错误事件参数。
 */
export interface ManagerEvents<Extra extends string = never> {
  /**
   * @en A device became visible and its baseline was captured.
   * @zh 设备变为可见并建立了输入基线。
   */
  connected: {
    /**
     * @en Newly connected session.
     * @zh 新建立的连接会话。
     */
    device: DeviceInfo<ControlKey<Extra>>
  }
  /**
   * @en A physical device disconnected.
   * @zh 物理设备断开连接。
   */
  disconnected: {
    /**
     * @en Session that disconnected.
     * @zh 已断开的会话。
     */
    device: DeviceInfo<ControlKey<Extra>>
  }
  /**
   * @en The automatic source changed; pinned controllers are independent.
   * @zh 自动输入源发生变化，固定绑定的控制器独立处理。
   */
  devicechange: {
    /**
     * @en Previous automatic source, if any.
     * @zh 此前的自动输入源，可能为空。
     */
    previous: DeviceInfo<ControlKey<Extra>> | null
    /**
     * @en New automatic source, or null while waiting.
     * @zh 新的自动输入源，等待操作时为空。
     */
    current: DeviceInfo<ControlKey<Extra>> | null
    /**
     * @en Input takeover or lifecycle reason.
     * @zh 输入接管或生命周期变化原因。
     */
    reason: CancelReason | 'input'
  }
  /**
   * @en An isolated error; unhandled errors are logged to console.
   * @zh 隔离后的错误，未订阅时输出到控制台。
   */
  error: {
    /**
     * @en Caught sampling, mapping or callback exception.
     * @zh 捕获的采样、映射或回调异常。
     */
    error: unknown
  }
}

/**
 * @en Independent manager configuration.
 * @zh 独立的管理器配置。
 */
export interface ManagerOptions<Extra extends string = never> {
  /**
   * @en Custom profiles in matching priority order.
   * @zh 按匹配优先级排列的自定义配置。
   */
  mappings?: readonly MappingProfile<Extra>[]
  /**
   * @en Default button gesture configuration.
   * @zh 默认按钮手势配置。
   */
  press?: PressConfig
  /**
   * @en Radial dead-zone configuration.
   * @zh 径向死区配置。
   */
  axes?: AxesConfig
  /**
   * @en Automatic handover hysteresis thresholds.
   * @zh 自动接管的双阈值配置。
   */
  takeover?: TakeoverConfig
}

/**
 * @en Owns devices, sampling, routing, controllers and scenes.
 * @zh 管理设备、采样、路由、控制器及场景。
 */
export interface GamepadManager<Extra extends string = never> {
  /**
   * @en Start once; false if the API is unavailable or the initial read fails.
   * @zh 幂等启动，API 不可用或初始读取失败时返回 false。
   */
  start(): boolean
  /**
   * @en Cancel inputs and clear sessions; retain scenes and subscriptions for restart.
   * @zh 取消输入并清空会话，保留场景和订阅以便重启。
   */
  stop(): void
  /**
   * @en Permanently release all resources; repeated calls are safe.
   * @zh 永久释放所有资源，可安全重复调用。
   */
  destroy(): void
  /**
   * @en Whether started; remains true while temporarily hidden or blurred.
   * @zh 是否已启动，页面临时隐藏或失焦期间仍为 true。
   */
  readonly running: boolean
  /**
   * @en Create an inactive controller; activate or push it to receive input.
   * @zh 创建未激活的控制器，通过 activate 或 push 开始接收输入。
   * @param name - @en Application-defined scene name. @zh 应用定义的场景名称。
   * @param options - @en Optional device binding and press settings. @zh 可选的设备绑定和按压配置。
   */
  createController(
    name: string,
    options?: ControllerOptions
  ): GamepadController<Extra>
  /**
   * @en Replace the current scene layer.
   * @zh 替换当前场景层。
   * @param controllers - @en One or more controllers owned by this manager. @zh 属于此管理器的一个或多个控制器。
   */
  activate(
    controllers: GamepadController<Extra> | readonly GamepadController<Extra>[]
  ): void
  /**
   * @en Enter a temporary layer while preserving the previous one.
   * @zh 进入临时场景层，同时保留上一层。
   * @param controllers - @en Controllers to activate in the new layer. @zh 新场景层需要激活的控制器。
   */
  push(
    controllers: GamepadController<Extra> | readonly GamepadController<Extra>[]
  ): void
  /**
   * @en Return to the previous layer; safely keep the base layer when empty.
   * @zh 返回上一层，在基础层调用时安全地保持不变。
   */
  pop(): void
  /**
   * @en Return a detached list of active controllers.
   * @zh 返回当前激活控制器的独立列表。
   */
  getActiveControllers(): readonly GamepadController<Extra>[]
  /**
   * @en List visible devices, including unmapped ones.
   * @zh 列出可见设备，包括尚未匹配映射的设备。
   */
  getDevices(): readonly DeviceInfo<ControlKey<Extra>>[]
  /**
   * @en Get the automatic source, or null before meaningful input.
   * @zh 获取自动输入源，尚无有效操作时返回 null。
   */
  getActiveDevice(): DeviceInfo<ControlKey<Extra>> | null
  /**
   * @en Get the latest immutable raw sample, or undefined for an unknown session.
   * @zh 获取最近的不可变原始采样，未知会话返回 undefined。
   * @param deviceId - @en Connection session ID returned in DeviceInfo.id. @zh DeviceInfo.id 返回的连接会话 ID。
   */
  getRawState(deviceId: string): RawGamepadState | undefined
  /**
   * @en Subscribe to manager events; returns an unsubscribe function.
   * @zh 订阅管理器事件，返回取消订阅函数。
   * @param type - @en Manager event name. @zh 管理器事件名称。
   * @param listener - @en Callback receiving the matching payload. @zh 接收对应参数的回调。
   */
  on<E extends keyof ManagerEvents<Extra>>(
    type: E,
    listener: (event: ManagerEvents<Extra>[E]) => void
  ): () => void
}
