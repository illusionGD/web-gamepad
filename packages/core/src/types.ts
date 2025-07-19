import { GAMEPAD_BTN_UI_MAP } from "./constants"
import { createGamepadController } from "./gamepadController"

export type GamepadEventMapType = {
  isBand: boolean
  onDownBucket: Set<Function>
  onUpBucket: Set<Function>
  onAxesBucket: Set<AxesFnType>
} & {}
export type GamepadControllerType = ReturnType<typeof createGamepadController>
export type AxesFnType = (params: number[]) => void
export type GamepadBtnKeyType = keyof typeof GAMEPAD_BTN_UI_MAP
export type UiMapValueType = (typeof GAMEPAD_BTN_UI_MAP)[GamepadBtnKeyType] & {}