import { GamepadBtnKeyType } from './constants'
import { GamepadEventMapType } from './type'

export type GamepadControllerType = ReturnType<typeof createGamepadController>
// 输入类型
export const INPUT_TYPE = {
  // 按下
  down: 'down',
  // 抬起
  up: 'up',
  move: 'move'
} as const

export type InputType = keyof typeof INPUT_TYPE

const ControllerManager = new Map<string, GamepadControllerType>()

// 创建手柄控制器
export function createGamepadController(key: string) {
  // 按钮事件桶
  const btnEventsMap = new Map<GamepadBtnKeyType, GamepadEventMapType>()
  let active = true

  const ctrl = {
    // 添加按钮事件
    addBtnEvents: (
      key: GamepadBtnKeyType,
      inputType: InputType,
      fn: Function
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      if (bucket) {
        bucket.add(fn)
        return bucket.size
      }

      const newBucket = {
        isBand: false,
        onDownBucket: new Set<Function>(),
        onUpBucket: new Set<Function>()
      }

      inputType === INPUT_TYPE.down
        ? newBucket.onDownBucket.add(fn)
        : newBucket.onUpBucket.add(fn)

      btnEventsMap.set(key, newBucket)
    },
    // 移除按钮事件
    removeBtnEvents: (
      key: GamepadBtnKeyType,
      inputType: InputType,
      fn: Function
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      bucket && bucket.delete(fn)
    },
    // 禁用按钮事件
    bandBtnEvents: (key: GamepadBtnKeyType | GamepadBtnKeyType[]) => {
      const keys = key instanceof Array ? key : [key]
      keys.forEach((item) => {
        const eventSet = btnEventsMap.get(item)
        if (!eventSet) {
          return
        }
        eventSet.isBand = true
      })
    },
    // 校验按钮事件是否存在
    checkBtnEventsExits(key: GamepadBtnKeyType) {
      return btnEventsMap.has(key)
    },
    doneBtnEvents: (key: GamepadBtnKeyType, inputType: InputType) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)
      bucket && bucket.forEach((fn) => fn())
    },
    // 是否激活
    isActive: () => active,
    // 不激活
    disable: () => (active = false),
    // 激活
    active: () => (active = true)
  }
  addGamepadController(key, ctrl, true)
  return ctrl
}

function getBucketByInputType(
  key: GamepadBtnKeyType,
  inputType: InputType,
  btnEventsMap: Map<GamepadBtnKeyType, GamepadEventMapType>
) {
  const eventSet = btnEventsMap.get(key)
  if (!eventSet) {
    return
  }
  if (eventSet.isBand) {
    return
  }
  return inputType === INPUT_TYPE.down
    ? eventSet.onDownBucket
    : eventSet.onUpBucket
}

export function getActiveControllers() {
  return Array.from(ControllerManager.values()).filter((item) =>
    item.isActive()
  )
}

// 切换controller，支持同时激活多个controller
export function switchGamepadController(key: string | string[]) {
    const keys = key instanceof Array ? key : [key]
    ControllerManager.forEach((item, key) => {
        if (!keys.includes(key)) {
            item.disable()
        } else {
            item.active()
        }
    })
}

// 添加controller
export function addGamepadController(
  key: string,
  controller: GamepadControllerType,
  isActive: boolean = false
) {
  if (!isActive) {
    controller.disable()
  }
  ControllerManager.set(key, controller)
}
// 移除gamepad controller
export function removeGamepadController(key: string) {
    ControllerManager.delete(key)
}
