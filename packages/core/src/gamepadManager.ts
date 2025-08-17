import { AXES_BTN_KEY_MAP, setAxesConfig } from './constants'
import { getActiveControllers, INPUT_TYPE } from './gamepadController'
import {
  GamepadControllerType,
  InitConfigType
} from './types'
import { isInvalid } from './utils'

const GamepadManager: {
  [key: number]: Gamepad
} = {}
const initConfig: InitConfigType = {}

let frameId = 0
let isStop = false
let isInit = false

/**
 * @en Initialize gamepad
 * @zh 初始化游戏手柄
 * @param config - @en Initialization config @zh 初始化配置
 * @returns @en Whether initialized successfully @zh 是否初始化成功
 */
export function initGamepad(config?: InitConfigType) {
  if (isInit) {
    return false
  }

  config && Object.assign(initConfig, config)

  if (initConfig.axes) {
    setAxesConfig(initConfig.axes)
  }

  // @en Verify whether gamepad is supported
  // @zh 校验是否支持游戏手柄
  if (!isGamepadSupported()) {
    throw new Error('not support gamepad')
  }

  initEventListening()
  isInit = true
  return true
}

/**
 * @en Initialize the handle event listener
 * @zh 初始化手柄事件监听
 */
function initEventListening() {
  window.addEventListener(
    'gamepadconnected',
    function ({ gamepad }: GamepadEvent) {
      addGamepad(gamepad)

      initConfig.onConnected && initConfig.onConnected(gamepad)

      frameId && cancelIdleCallback(frameId)

      gamepadLoop()
    }
  )

  window.addEventListener(
    'gamepaddisconnected',
    ({ gamepad }: GamepadEvent) => {
      removeGamepad(gamepad)

      initConfig.onDisconnected && initConfig.onDisconnected(gamepad)

      if (!Object.keys(GamepadManager).length) {
        destroyAllGamepad()
      }
    }
  )
}

/**
 * @en Stop listening
 * @zh 停止监听
 */
export function stopListening() {
  isStop = true
}

/**
 * @en Start listening
 * @zh 开始监听
 */
export function startListening() {
  isStop = false
  gamepadLoop()
}

/**
 * @en Destroy all gamepad listeners
 * @zh 销毁所有游戏手柄监听
 */
function destroyAllGamepad() {
  cancelIdleCallback(frameId)
  stopListening()
  Object.keys(GamepadManager).forEach(
    (index) => delete GamepadManager[Number(index)]
  )
}

/**
 * @en Add gamepad
 * @zh 添加游戏手柄
 * @param gamepad - @en Gamepad instance @zh 游戏手柄实例
 */
export function addGamepad(gamepad: Gamepad) {
  GamepadManager[gamepad.index] = gamepad
}

/**
 * @en Remove gamepad
 * @zh 移除游戏手柄
 * @param gamepad - @en Gamepad instance or index @zh 游戏手柄实例或索引
 */
export function removeGamepad(gamepad: Gamepad | number) {
  const index = typeof gamepad === 'number' ? gamepad : gamepad.index
  delete GamepadManager[index]
}

/**
 * @en Get gamepad list
 * @zh 获取游戏手柄列表
 * @returns @en Array of gamepads @zh 游戏手柄数组
 */
export function getGamepadList() {
  return Object.values(GamepadManager)
}

/**
 * @en Get gamepad by gamepadIndex
 * @zh 通过gamepadIndex获取游戏手柄
 * @returns @en gamepad  @zh 游戏手柄对象
 */
export function getGamepadByIndex(index: number): Gamepad | undefined {
    return GamepadManager[index]
}

/**
 * @en Loop monitor the input of the handle
 * @zh 循环监听手柄输入
 */
function gamepadLoop() {
  if (isStop) {
    return
  }
  frameId = requestAnimationFrame(() => {
    const controllers = getActiveControllers()
    // @en Traverse all the handles
    // @zh 遍历所有手柄
    for (const key in GamepadManager) {
      if (Object.prototype.hasOwnProperty.call(GamepadManager, key)) {
        const newGamepad = navigator.getGamepads()[Number(key)]

        if (!newGamepad) {
          break
        }

        const gamepad = GamepadManager[key]
        GamepadManager[key] = newGamepad

        // @en Two snapshots of the buttons before and after
        // @zh 按钮前后两次快照
        for (let index = 0; index < newGamepad.buttons.length; index++) {
          const btn = newGamepad.buttons[index]
          if (btn.pressed !== gamepad.buttons[index].pressed) {
            const key = index

            // @en Emit global input event
            // @zh 触发全局输入事件
            initConfig.onInput && initConfig.onInput(gamepad)
      
            // @en Emit controller event
            // @zh 触发控制器事件
            controllers.forEach((ctl) => {
              const gamepadIndex = ctl.getControllerGamepadIndex()
              if (!isInvalid(gamepadIndex) && gamepadIndex !== gamepad.index) {
                return
              }
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

        // @en Joystick change
        // @zh 摇杆变化
        const [newLsX, newLsY, newRsX, newRsY] = newGamepad.axes

        // @en Left joystick
        // @zh 左摇杆
        onAxesChange(
          gamepad,
          controllers,
          AXES_BTN_KEY_MAP.LS,
          newLsX,
          newLsY,
        )

        // @en Right joystick
        // @zh 右摇杆
        onAxesChange(
          gamepad,
          controllers,
          AXES_BTN_KEY_MAP.RS,
          newRsX,
          newRsY,
        )
      }
    }

    gamepadLoop()
  })
}

/**
 * @en Joystick axes change event
 * @zh 摇杆轴变化事件
 * @param gamepad - @en Gamepad instance @zh 游戏手柄实例
 * @param controllers - @en Controller list @zh 控制器列表
 * @param key - @en Joystick key index @zh 摇杆键位索引
 * @param newX - @en X axis value @zh X轴数值
 * @param newY - @en Y axis value @zh Y轴数值
 */
function onAxesChange(
  gamepad: Gamepad,
  controllers: GamepadControllerType[],
  key: number,
  newX: number,
  newY: number,
) {
  const DEAD_ZONE_RADIUS = initConfig.axes?.deadZoneRadius || 0.05
  if (
    Math.abs(newX) > DEAD_ZONE_RADIUS ||
    Math.abs(newY) > DEAD_ZONE_RADIUS
  ) {
    initConfig.onInput && initConfig.onInput(gamepad)
    controllers.forEach((ctrl) => {
      if (!ctrl.checkBtnEventsExits(key)) {
        return
      }
      ctrl.emitsBtnEvents(key, INPUT_TYPE.axes, [newX, newY])
    })
  }
}

/**
 * @en Does it support a controller
 * @zh 是否支持游戏手柄
 * @returns @en Support status @zh 支持状态
 */
export function isGamepadSupported() {
  return 'getGamepads' in navigator
}