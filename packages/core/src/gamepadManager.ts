import { GAMEPAD_BTN_UI_MAP, GamepadBtnKeyType } from './constants'
import {  getActiveControllers, INPUT_TYPE } from './gamepadController'

const GamepadManager: {
  [key: number]: Gamepad
} = {}


let frameId = 0
let currentGamepad: Gamepad | null

// 初始化
export function initGamepad() {
  // 校验是否支持gamepad
  if (!isGamepadSupported()) {
    throw new Error('not support gamepad')
  }
  // 初始化手柄事件监听
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

  // 卸载游戏手柄
  window.addEventListener(
    'gamepaddisconnected',
    ({ gamepad }: GamepadEvent) => {
      removeGamepad(gamepad)
      cancelAnimationFrame(frameId)
    }
  )
}
// 增加gamepad
export function addGamepad(gamepad: Gamepad) {
  GamepadManager[gamepad.index] = gamepad
}

// 移除gamepad
export function removeGamepad(gamepad: Gamepad | number) {
  const index = typeof gamepad === 'number' ? gamepad : gamepad.index
  delete GamepadManager[index]
  if (currentGamepad && currentGamepad.index === index) {
    currentGamepad = null
  }
}

// 获取gamepad列表
export function getGamepadList() {
  return Object.values(GamepadManager)
}

// 循环监听手柄输入
function gamepadLoop() {
  frameId = requestAnimationFrame(() => {
    // 遍历全部手柄
    for (const key in GamepadManager) {
      if (Object.prototype.hasOwnProperty.call(GamepadManager, key)) {
        const newGamepad = navigator.getGamepads()[Number(key)]

        if (!newGamepad) {
          break
        }

        const gamepad = GamepadManager[key]

        // 前后两次按钮快照
        for (let index = 0; index < newGamepad.buttons.length; index++) {
          const btn = newGamepad.buttons[index]
          if (btn.pressed !== gamepad.buttons[index].pressed) {
            const key = index as GamepadBtnKeyType
            const controllers = getActiveControllers()
            controllers.forEach((ctl) => {
                if (!ctl.checkBtnEventsExits(key)) {
                    return
                }
                ctl.doneBtnEvents(key, btn.pressed ? INPUT_TYPE.down : INPUT_TYPE.up)
            })
          }
        }
        GamepadManager[key] = newGamepad
      }
    }

    gamepadLoop()
  })
}

function isGamepadSupported() {
  const gamepadKey = [
    'getGamepads',
    'webkitGetGamepads',
    'mozGetGamepads',
    'msGetGamepads'
  ]
  return gamepadKey.some((key) => key in navigator)
}
