import {
  GAMEPAD_BTN_KEY_MAP,
} from './constants'
import { getActiveControllers, INPUT_TYPE } from './gamepadController'
import { GamepadBtnKeyType } from './types'

const GamepadManager: {
  [key: number]: Gamepad
} = {}

let frameId = 0
let currentGamepad: Gamepad | null
let isStop = false
let isInit = false

/** initialize gamepad */
export function initGamepad() {
    if (isInit) {
        return
    }
  // Verify whether gamepad is supported
  if (!isGamepadSupported()) {
    throw new Error('not support gamepad')
  }

  initEventListening()
  isInit = true
}

/**
 * Initialize the handle event listener
 */
function initEventListening() {
  window.addEventListener(
    'gamepadconnected',
    function ({ gamepad }: GamepadEvent) {
      addGamepad(gamepad)
      currentGamepad = gamepad

      if (frameId) {
        cancelIdleCallback(frameId)
      }
      gamepadLoop()
    }
  )

  window.addEventListener(
    'gamepaddisconnected',
    ({ gamepad }: GamepadEvent) => {
      removeGamepad(gamepad)

      if (!Object.keys(GamepadManager).length) {
        destroyGamepad()
      }
    }
  )
}

/** stop listen */
export function stopListening() {
  isStop = true
}

/** start listen */
export function startListening() {
  isStop = false
  gamepadLoop()
}

/** destroy listen */
export function destroyGamepad() {
  cancelIdleCallback(frameId)
  stopListening()
  Object.keys(GamepadManager).forEach(
    (index) => delete GamepadManager[Number(index)]
  )
}

/**
 * add gamepad
 * @param gamepad 
 */
export function addGamepad(gamepad: Gamepad) {
  GamepadManager[gamepad.index] = gamepad
}

/**
 * remove gamepad
 * @param gamepad 
 */
export function removeGamepad(gamepad: Gamepad | number) {
  const index = typeof gamepad === 'number' ? gamepad : gamepad.index
  delete GamepadManager[index]
  if (currentGamepad && currentGamepad.index === index) {
    currentGamepad = null
  }
}

/**
 * get gamepad list
 */
export function getGamepadList() {
  return Object.values(GamepadManager)
}

/**
 * Loop monitor the input of the handle
 */
function gamepadLoop() {
  if (isStop) {
    return
  }
  frameId = requestAnimationFrame(() => {
    const controllers = getActiveControllers()
    // Traverse all the handles
    for (const key in GamepadManager) {
      if (Object.prototype.hasOwnProperty.call(GamepadManager, key)) {
        const newGamepad = navigator.getGamepads()[Number(key)]

        if (!newGamepad) {
          break
        }

        const gamepad = GamepadManager[key]
        GamepadManager[key] = newGamepad

        // Two snapshots of the buttons before and after
        for (let index = 0; index < newGamepad.buttons.length; index++) {
          const btn = newGamepad.buttons[index]
          if (btn.pressed !== gamepad.buttons[index].pressed) {
            const key = index as GamepadBtnKeyType
            controllers.forEach((ctl) => {
              if (!ctl.checkBtnEventsExits(key)) {
                return
              }
              ctl.emitsBtnEvents(
                key,
                btn.pressed ? INPUT_TYPE.down : INPUT_TYPE.up
              )
            })
          }
        }

        // Joystick change
        const [newLsX, newLsY, newRsX, newRsY] = newGamepad.axes
        const [lsX, lsY, rsX, rsY] = gamepad.axes
        // left Joystick
        if (Math.abs(newLsX - lsX) > 0.01 || Math.abs(newLsY - lsY) > 0.01) {
          controllers.forEach((ctrl) => {
            if (!ctrl.checkBtnEventsExits(GAMEPAD_BTN_KEY_MAP.LS)) {
              return
            }
            ctrl.emitsBtnEvents(GAMEPAD_BTN_KEY_MAP.LS, INPUT_TYPE.axes, [
              newLsX,
              newLsY
            ])
          })
        }
        // right Joystick
        if (Math.abs(newRsX - rsX) > 0.01 || Math.abs(newRsY - rsY) > 0.01) {
          controllers.forEach((ctrl) => {
            if (!ctrl.checkBtnEventsExits(GAMEPAD_BTN_KEY_MAP.RS)) {
              return
            }
            ctrl.emitsBtnEvents(GAMEPAD_BTN_KEY_MAP.RS, INPUT_TYPE.axes, [
              newRsX,
              newRsY
            ])
          })
        }
      }
    }

    gamepadLoop()
  })
}

/**
 * Does it support a controller
 */
export function isGamepadSupported() {
  return 'getGamepads' in navigator
}
