import { STANDARD_BUTTONS, STANDARD_STICKS } from './constants'
import type {
  ButtonSource,
  DeviceInfo,
  MappingProfile,
  NormalizedState,
  RawGamepadState,
  StickSource,
  Vector
} from './types'
/**
 * @en Clamp a value to inclusive bounds.
 * @zh 将数值限制在闭区间内。
 * @param value - @en Input value. @zh 输入数值。
 * @param min - @en Lower bound. @zh 下界。
 * @param max - @en Upper bound. @zh 上界。
 */
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
/**
 * @en Check that a raw control index is a nonnegative integer.
 * @zh 检查原始输入索引是否为非负整数。
 * @param value - @en Index to validate. @zh 待校验的索引。
 */
const validIndex = (value: number) => Number.isInteger(value) && value >= 0
/**
 * @en Create an empty logical state without prototype keys.
 * @zh 创建不含原型键的空逻辑状态。
 */
export const emptyState = (): NormalizedState<string> => ({
  buttons: Object.create(null),
  sticks: Object.create(null)
})
/**
 * @en Require uppercase logical identifiers.
 * @zh 要求逻辑标识使用大写缩写。
 * @param key - @en Logical identifier to validate. @zh 待校验的逻辑标识。
 */
export function validateKey(key: string) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key))
    throw new TypeError(
      `Invalid logical key: ${key}; use uppercase abbreviations`
    )
}
/**
 * @en Validate adapters before attaching browser listeners.
 * @zh 绑定浏览器监听前验证适配配置。
 * @param profiles - @en Custom profiles in matching order. @zh 按匹配顺序排列的自定义配置。
 */
export function validateProfiles(profiles: readonly MappingProfile<string>[]) {
  for (const profile of profiles) {
    if (typeof profile.match !== 'function')
      throw new TypeError('Mapping requires match(gamepad)')
    if (
      profile.normalize &&
      (profile.extends || profile.buttons || profile.sticks)
    )
      throw new TypeError(
        'normalize replaces declarative mapping; do not combine them'
      )
    for (const [key, source] of Object.entries(profile.buttons ?? {})) {
      validateKey(key)
      if (source == null) continue
      if (typeof source === 'number') {
        if (!validIndex(source))
          throw new RangeError(`Invalid button index for ${key}`)
      } else {
        const press = source.pressThreshold ?? 0.5
        const release = source.releaseThreshold ?? Math.min(0.4, press)
        if (
          !validIndex(source.axis) ||
          source.range.length !== 2 ||
          !source.range.every(Number.isFinite) ||
          source.range[0] === source.range[1] ||
          !Number.isFinite(press) ||
          !Number.isFinite(release) ||
          release < 0 ||
          release > press ||
          press > 1 ||
          press <= 0
        )
          throw new RangeError(`Invalid axis button mapping for ${key}`)
      }
    }
    for (const [key, source] of Object.entries(profile.sticks ?? {})) {
      validateKey(key)
      if (source && (!validIndex(source.x) || !validIndex(source.y)))
        throw new RangeError(`Invalid stick mapping for ${key}`)
    }
  }
}
/**
 * @en A resolved per-device adapter; other devices keep their own mappings.
 * @zh 为单台设备解析的适配器，不影响其他设备的映射。
 */
export interface ResolvedMapping {
  /**
   * @en Resolved mapping status.
   * @zh 解析后的映射状态。
   */
  kind: DeviceInfo['mapping']

  /**
   * @en Selected custom profile identifier.
   * @zh 选中的自定义配置标识。
   */
  profile?: string

  /**
   * @en Convert and copy raw input into the logical layout.
   * @zh 将原始输入转换并复制到逻辑布局。
   * @param raw - @en Current raw browser state. @zh 当前浏览器原始状态。
   * @param previous - @en Prior normalized state for axis-button hysteresis. @zh 先前归一化状态，用于轴按钮的双阈值判断。
   * @param deadZone - @en Radial stick dead zone. @zh 摇杆径向死区。
   */
  normalize(
    raw: Gamepad,
    previous: NormalizedState<string>,
    deadZone: number
  ): NormalizedState<string>
}
/**
 * @en Resolve one device's profile, falling back only for standard layouts.
 * @zh 解析单台设备配置，仅标准布局允许默认回退。
 * @param raw - @en Raw device used for profile matching. @zh 用于匹配配置的原始设备。
 * @param profiles - @en Prioritized custom profiles. @zh 按优先级排列的自定义配置。
 */
export function resolveMapping(
  raw: Gamepad,
  profiles: readonly MappingProfile<string>[]
): ResolvedMapping {
  const profile = profiles.find((item) => item.match(raw))
  const standard = profile
    ? profile.extends === 'standard'
    : raw.mapping === 'standard'
  const buttons: Record<string, ButtonSource | null | undefined> = {
    ...(standard ? STANDARD_BUTTONS : {}),
    ...profile?.buttons
  }
  const sticks: Record<string, StickSource | null | undefined> = {
    ...(standard ? STANDARD_STICKS : {}),
    ...profile?.sticks
  }
  return {
    kind: profile ? 'custom' : standard ? 'standard' : 'unmapped',
    profile: profile?.id,
    /**
     * @en Convert raw controls into detached normalized logical state.
     * @zh 将原始输入转换为独立归一化逻辑状态。
     * @param raw - @en Current raw browser input. @zh 当前浏览器原始输入。
     * @param previous - @en Previous logical input for hysteresis. @zh 用于双阈值判断的上一逻辑输入。
     * @param deadZone - @en Radial stick dead zone. @zh 摇杆径向死区。
     */
    normalize(raw, previous, deadZone) {
      if (profile?.normalize) return sanitize(profile.normalize(raw), deadZone)
      const state = emptyState()
      for (const [key, source] of Object.entries(buttons)) {
        if (source == null) continue
        if (typeof source === 'number') {
          const button = raw.buttons[source]
          if (button && Number.isFinite(button.value))
            state.buttons[key] = {
              pressed: button.pressed,
              value: clamp(button.value, 0, 1)
            }
        } else {
          const axis = raw.axes[source.axis]
          if (!Number.isFinite(axis)) continue
          const value = clamp(
            (axis - source.range[0]) / (source.range[1] - source.range[0]),
            0,
            1
          )
          const press = source.pressThreshold ?? 0.5
          const release = source.releaseThreshold ?? Math.min(0.4, press)
          state.buttons[key] = {
            value,
            pressed: previous.buttons[key]?.pressed
              ? value > release
              : value >= press
          }
        }
      }
      for (const [key, source] of Object.entries(sticks)) {
        if (!source) continue
        const x = raw.axes[source.x],
          y = raw.axes[source.y]
        if (Number.isFinite(x) && Number.isFinite(y))
          state.sticks[key] = normalizeStick(
            [x * (source.invertX ? -1 : 1), y * (source.invertY ? -1 : 1)],
            deadZone
          )
      }
      return state
    }
  }
}
/**
 * @en Copy and validate a custom normalizer's output.
 * @zh 复制并验证自定义归一化函数的输出。
 * @param input - @en Adapter-provided logical state. @zh 适配器提供的逻辑状态。
 * @param deadZone - @en Radial stick dead zone. @zh 摇杆径向死区。
 */
function sanitize(input: NormalizedState<string>, deadZone: number) {
  const state = emptyState()
  for (const [key, button] of Object.entries(input.buttons)) {
    validateKey(key)
    if (button && Number.isFinite(button.value))
      state.buttons[key] = {
        pressed: !!button.pressed,
        value: clamp(button.value, 0, 1)
      }
  }
  for (const [key, vector] of Object.entries(input.sticks)) {
    validateKey(key)
    if (vector?.length === 2 && vector.every(Number.isFinite))
      state.sticks[key] = normalizeStick(vector, deadZone)
  }
  return state
}
/**
 * @en Apply a radial dead zone and rescale remaining magnitude.
 * @zh 应用径向死区并重新缩放剩余幅度。
 * @param vector - @en Raw horizontal and vertical values. @zh 原始横向及纵向数值。
 * @param deadZone - @en Ignored radius around the center. @zh 中心附近忽略的半径。
 */
function normalizeStick(vector: Vector, deadZone: number): Vector {
  const [rawX, rawY] = vector
  const x = clamp(rawX, -1, 1),
    y = clamp(rawY, -1, 1)
  const magnitude = Math.hypot(x, y)
  if (magnitude <= deadZone || magnitude === 0) return [0, 0]
  const scale = (Math.min(magnitude, 1) - deadZone) / (1 - deadZone) / magnitude
  return [x * scale, y * scale]
}
/**
 * @en Describe only controls exposed by the device.
 * @zh 仅描述设备实际暴露的输入能力。
 * @param state - @en Normalized device input. @zh 归一化设备输入。
 */
export function capabilities(state: NormalizedState<string>) {
  return Object.freeze(
    [
      ...new Set([...Object.keys(state.buttons), ...Object.keys(state.sticks)])
    ].map((key) =>
      Object.freeze({
        key,
        button: !!state.buttons[key],
        axes: !!state.sticks[key]
      })
    )
  )
}
/**
 * @en Copy and freeze raw data for safe diagnostics.
 * @zh 复制并冻结原始数据，以安全调试。
 * @param raw - @en Current browser device. @zh 当前浏览器设备。
 */
export function rawSnapshot(raw: Gamepad): RawGamepadState {
  return Object.freeze({
    id: raw.id,
    index: raw.index,
    mapping: raw.mapping,
    timestamp: raw.timestamp,
    buttons: Object.freeze(
      Array.from(raw.buttons, (button) =>
        Object.freeze({
          pressed: button.pressed,
          touched: button.touched,
          value: button.value
        })
      )
    ),
    axes: Object.freeze(Array.from(raw.axes))
  })
}
