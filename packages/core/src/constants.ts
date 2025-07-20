import { InitAxesConfigType } from './types'
import { clamp } from './utils'

/** xbox key map */
export const XBOX_KEY_MAP = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  view: 8,
  menu: 9,
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
  cross: 0,
  circle: 1,
  square: 2,
  triangle: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  share: 8,
  options: 9,
  L3: 10,
  R3: 11,
  PS: 12,
  touchpad: 13,
  microphone: 14,
  up: 15,
  down: 16,
  left: 17,
  right: 18
} as const

/** axes btn key map */
export const AXES_BTN_KEY_MAP = {
  LS: 10,
  RS: 11
}

export let OFFSET_MIN = 0.1

export function setAxesConfig({ left, right, accuracy }: InitAxesConfigType) {
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
