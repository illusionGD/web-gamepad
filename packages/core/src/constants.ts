import { InitAxesConfigType } from './types'

/** xbox key map */
export const XBOX_KEY_MAP = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LT: 4,
  RT: 5,
  LB: 6,
  RB: 7,
  'select/back': 8,
  'select/forward': 9,
  LS: 10,
  RS: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16
} as const

/** ps5 key map */
export const PS5_BUTTON_MAP = {
  Cross: 0,
  Circle: 1,
  Square: 2,
  Triangle: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  Share: 8,
  Options: 9,
  L3: 10,
  R3: 11,
  PS: 12,
  Touchpad: 13,
  Microphone: 14,
  DpadUp: 15,
  DpadDown: 16,
  DpadLeft: 17,
  DpadRight: 18
} as const

/** gamepad */
export const GAMEPAD_BTN_KEY_MAP = XBOX_KEY_MAP

/** axes btn key map */
export const AXES_BTN_KEY_MAP = {
  LS: 10,
  RS: 11
}

export let OFFSET_MIN = 0.1

export function setAxesConfig({
  left,
  right,
  accuracy
}: InitAxesConfigType) {
  if (left !== undefined && typeof left === 'number') {
    AXES_BTN_KEY_MAP.LS = left
  }

  if (right !== undefined && typeof right === 'number') {
    AXES_BTN_KEY_MAP.RS = right
  }

  if (accuracy !== undefined && typeof accuracy === 'number') {
    OFFSET_MIN = clamp(accuracy, 0, 1)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
