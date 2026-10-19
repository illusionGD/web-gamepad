import { INPUT_TYPE } from './constants'
import type { ButtonEventType } from './types'

/**
 * @en Per-press state; its threshold is captured at down.
 * @zh 单次按压状态，阈值在 down 时固定。
 */
export interface PressState {
  /**
   * @en Monotonic time when down was delivered, in milliseconds.
   * @zh 交付 down 时的单调时间，单位毫秒。
   */
  startedAt: number

  /**
   * @en Long-press threshold captured for this press.
   * @zh 本次按压固定采用的长按阈值。
   */
  thresholdMs: number

  /**
   * @en Whether longpress has already been emitted.
   * @zh 是否已经触发 longpress。
   */
  longPressFired: boolean
}

/**
 * @en Validate a finite positive threshold.
 * @zh 校验有限正数阈值。
 * @param value - @en Threshold in milliseconds. @zh 阈值，单位毫秒。
 */
export function validateLongPressMs(value: number) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError('longPressMs must be a positive finite number')
  return value
}

/**
 * @en Advance one press; a release at the threshold is long even when a frame was missed.
 * @zh 推进一次按压，达到阈值时松开仍属于长按，即使错过了中间采样帧。
 * @param state - @en Mutable state of this delivered press. @zh 本次已交付按压的可变状态。
 * @param pressed - @en Whether the button remains physically pressed. @zh 物理按钮是否仍然按住。
 * @param now - @en Current monotonic sampling time in milliseconds. @zh 当前单调采样时间，单位毫秒。
 */
export function advancePress(
  state: PressState,
  pressed: boolean,
  now: number
): Exclude<ButtonEventType, 'cancel' | 'down'>[] {
  const events: Exclude<ButtonEventType, 'cancel' | 'down'>[] = []
  if (!state.longPressFired && now - state.startedAt >= state.thresholdMs) {
    state.longPressFired = true
    events.push(INPUT_TYPE.longpress)
  }
  if (!pressed) {
    events.push(INPUT_TYPE.up)
    if (!state.longPressFired) events.push(INPUT_TYPE.click)
  }
  return events
}
