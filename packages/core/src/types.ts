import { createGamepadController } from './gamepadController'

export type GamepadEventMapType = {
  isBand: boolean
  onDownBucket: Set<Function>
  onUpBucket: Set<Function>
  onAxesBucket: Set<AxesFnType>
} & {}
export type GamepadControllerType = ReturnType<typeof createGamepadController>
export type AxesFnType = (params: number[]) => void
export type InitAxesConfigType = {
  /**
   * @en left axes key, default 9
   * @zh 左摇杆key，默认9
   */
  left?: number
  /**
   * @en right axes key, default 10
   * @zh 右摇杆key，默认10
   */
  right?: number
  /**
   * @en axes deadzone radius: 0-1, default 0.05
   * @zh 手柄摇杆死区半径，默认0.05
   */
  deadZoneRadius?: number
} & {}

export type InitConfigType = {
  /**
   * @en Callback when gamepad is connected
   * @zh 手柄链接时回调
   */
  onConnected?: (gamepad: Gamepad) => void
  /**
   * @en Callback when gamepad is disconnected
   * @zh 手柄断开链接时回调
   */
  onDisconnected?: (gamepad: Gamepad) => void
  /**
   * @en Callback when gamepad is input
   * @zh 手柄输入时回调
   */
  onInput?: (gamepad: Gamepad) => void
  /**
   * @en axes config
   * @zh 摇杆配置
   */
  axes?: InitAxesConfigType
} & {}
