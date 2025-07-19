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
  left?: number
  right?: number
  /** axes accuracy: 0-1 */
  accuracy?: number
} & {}
