import { AXES_BTN_KEY_MAP } from './constants'
import { v4 as uuidv4 } from 'uuid'
import { AxesFnType, GamepadControllerType, GamepadEventMapType } from './types'
import { clamp, uniqueArray } from './utils'

/**
 * @en Input type: down | up | axes
 * @zh 输入类型：down | up | axes
 */
export const INPUT_TYPE = {
  down: 'down',
  up: 'up',
  axes: 'axes'
} as const

export type InputEventType = keyof typeof INPUT_TYPE

/**
 * @en Controller id stack
 * @zh 控制器ID栈
 */
const idStack: string[] = []

/**
 * @en Controller manager
 * @zh 控制器管理器
 */
const ControllerManager = new Map<string, GamepadControllerType>()

let idLen = 0

/**
 * @en Create a handle controller
 * @zh 创建一个手柄控制器
 * @param key - @en Controller key @zh 控制器标识
 * @param isActive - @en Is active @zh 是否激活
 * @param gamepadIndex - @en Gamepad unique index, The controller is controlled by this gamepad, It can be obtained when listening to the controller connection (`onConnected`) @zh 游戏手柄唯一索引，该控制器由此游戏手柄控制，可在监听手柄连接（`onConnected`）时获取
 */
export function createGamepadController(
  key: string,
  isActive: boolean = true,
  gamepadIndex?: number
) {
  // @en Button event bucket
  // @zh 按钮事件桶
  const btnEventsMap = new Map<number, GamepadEventMapType>()
  const ctrlKey = key
  const id: string = `${idLen}`
  let active = isActive
  let parentIndex = gamepadIndex

  idLen += 1

  const ctrl = {
    /**
     * @en Controller unique id
     * @zh 控制器唯一ID
     */
    id,

    /**
     * @en Customer controller key
     * @zh 用户自定义控制器标识
     */
    key: ctrlKey,

    /**
     * @en get gamepad unique index
     * @zh 获取该控制器的手柄唯一index
     */
    getControllerGamepadIndex() {
      return parentIndex
    },

    /**
     * @en set gamepad unique index
     * @zh 设置该控制器的手柄唯一index
     */
    setGamepadIndex(index: number) {
      parentIndex = index
    },

    /**
     * @en Add button event
     * @zh 添加按钮事件
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     * @param inputType - @en Input type: down | up | axes @zh 输入类型：down | up | axes
     * @param fn - @en Event handler @zh 事件处理函数
     */
    addBtnEvents: (
      key: number,
      inputType: InputEventType,
      fn: Function | AxesFnType
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      if (bucket) {
        // @en Axes bucket requires AxesFnType
        // @zh 轴事件桶需要 AxesFnType
        if (
          (key === AXES_BTN_KEY_MAP.LS || key === AXES_BTN_KEY_MAP.RS) &&
          inputType === INPUT_TYPE.axes
        ) {
          ;(bucket as Set<AxesFnType>).add(fn as AxesFnType)
        } else {
          ;(bucket as Set<Function>).add(fn as Function)
        }
        return true
      }

      const newBucket: GamepadEventMapType = {
        isBand: false,
        onDownBucket: new Set<Function>(),
        onUpBucket: new Set<Function>(),
        onAxesBucket: new Set<AxesFnType>()
      }

      // @en Button
      // @zh 按钮
      if (inputType !== INPUT_TYPE.axes) {
        inputType === INPUT_TYPE.down
          ? newBucket.onDownBucket.add(fn as Function)
          : newBucket.onUpBucket.add(fn as Function)
      } else {
        // @en Axes
        // @zh 轴
        if (key === AXES_BTN_KEY_MAP.LS || key === AXES_BTN_KEY_MAP.RS) {
          newBucket.onAxesBucket.add(fn as AxesFnType)
        }
      }

      btnEventsMap.set(key, newBucket)
      return true
    },

    /**
     * @en Remove button event
     * @zh 移除按钮事件
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     * @param inputType - @en Input type: down | up | axes @zh 输入类型：down | up | axes
     * @param fn - @en Event handler @zh 事件处理函数
     */
    removeBtnEvents: (key: number, inputType: InputEventType, fn: Function) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      bucket && bucket.delete(fn)
    },

    /**
     * @en Whether to prohibit button events
     * @zh 是否禁止按钮事件
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     * @param isBand - @en Whether prohibited @zh 是否禁止
     */
    setBtnEventBandStatus: (key: number | number[], isBand: boolean = true) => {
      const keys = key instanceof Array ? key : [key]
      keys.forEach((item) => {
        const eventSet = btnEventsMap.get(item)
        if (!eventSet) {
          return
        }
        eventSet.isBand = isBand
      })
    },

    /**
     * @en Get all button event buckets
     * @zh 获取所有按钮事件桶
     */
    getAllBtnEventBucket: () => {
      const items: Array<{ key: number } & GamepadEventMapType> = []
      btnEventsMap.forEach((item, key) => {
        items.push({
          key: Number(key),
          ...item
        })
      })
      return items
    },

    /**
     * @en Verify whether the button event is active
     * @zh 校验按钮事件是否激活
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     */
    checkBtnEventActive(key: number) {
      const { isBand } = btnEventsMap.get(key) || {}
      return !!isBand
    },

    /**
     * @en Verify whether the button event exists
     * @zh 校验按钮事件是否存在
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     */
    checkBtnEventsExits(key: number) {
      return btnEventsMap.has(key)
    },

    /**
     * @en Trigger the corresponding button event
     * @zh 触发对应的按钮事件
     * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
     * @param inputType - @en Input type: down | up | axes @zh 输入类型：down | up | axes
     * @param params - @en Event parameters @zh 事件参数
     */
    emitsBtnEvents: (key: number, inputType: InputEventType, params?: any) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)
      bucket && bucket.forEach((fn) => fn(params))
    },

    /**
     * @en Check if activated
     * @zh 检查是否激活
     */
    isActive: () => active,

    /**
     * @en Disable current controller
     * @zh 禁用当前控制器
     */
    disable: () => {
      recordActiveIdStack()
      active = false
    },

    /**
     * @en Activate current controller
     * @zh 激活当前控制器
     */
    active: () => {
      recordActiveIdStack()
      active = true
    },

    /**
     * @en Destroy current controller
     * @zh 销毁当前控制器
     */
    destroy: () => {
      return removeGamepadController(id)
    }
  }

  if (!active) {
    ctrl.disable()
  }

  ControllerManager.set(id, ctrl)

  return ctrl
}

/**
 * @en Get event bucket by input type
 * @zh 根据输入类型获取事件桶
 * @param key - @en Gamepad key, doc: https://w3c.github.io/gamepad/#remapping @zh 游戏手柄按键，参考：https://w3c.github.io/gamepad/#remapping
 * @param inputType - @en Input type: down | up | axes @zh 输入类型：down | up | axes
 * @param btnEventsMap - @en Button events map @zh 按钮事件映射
 */
function getBucketByInputType(
  key: number,
  inputType: InputEventType,
  btnEventsMap: Map<number, GamepadEventMapType>
) {
  const eventSet = btnEventsMap.get(key)
  if (!eventSet) {
    return
  }
  if (eventSet.isBand) {
    return
  }
  // axes
  if (
    (key === AXES_BTN_KEY_MAP.LS || key === AXES_BTN_KEY_MAP.RS) &&
    inputType === INPUT_TYPE.axes
  ) {
    return eventSet.onAxesBucket
  }
  // button
  return inputType === INPUT_TYPE.down
    ? eventSet.onDownBucket
    : eventSet.onUpBucket
}

/**
 * @en Get the activated controllers
 * @zh 获取激活的控制器
 */
export function getActiveControllers() {
  const list = Array.from(ControllerManager.values()).filter((item) =>
    item.isActive()
  )
  return list
}

/**
 * @en Switch controllers and support activating multiple controllers simultaneously
 * @zh 切换控制器，支持同时激活多个控制器
 * @param id - @en Controller id(s) @zh 控制器ID（可为数组）
 */
export function switchGamepadController(id: string | string[]) {
  const ids = id instanceof Array ? uniqueArray(id) : [id]
  ControllerManager.forEach((item, id) => {
    if (!ids.includes(id)) {
      item.disable()
    } else {
      item.active()
    }
  })
}

let recordTimeout: any = null

/**
 * @en Push the active id onto the stack
 * @zh 将激活的ID推入栈中
 */
function recordActiveIdStack() {
  if (recordTimeout) {
    return
  }
  recordTimeout = setTimeout(() => {
    const ids = getActiveControllers()
      .map((item) => {
        const btnEventList = item.getAllBtnEventBucket()
        const btnStatus = btnEventList.reduce((prev, cur, index) => {
          return `${prev}${cur.key}-${cur.isBand ? '0' : '1'}${index === btnEventList.length - 1 ? '' : ','}`
        }, '#')
        return `${item.id}${btnStatus}`
      })
      .join(';')
    ids && idStack.push(ids)
    clearTimeout(recordTimeout)
    recordTimeout = null
  })
}

/**
 * @en Backtracking controller
 * @zh 回溯控制器
 * @param offset - @en Offset steps @zh 回溯步数
 * @param config - @en Config: resetBtnStatus: reset btn status, default `false` @zh 配置项：resetBtnStatus 是否重置按钮状态，默认`false`
 */
export function rollbackController(
  offset: number,
  config?: {
    resetBtnStatus?: boolean
  }
) {
  if (offset <= 0) {
    return
  }
  const [rollbackId] = idStack.splice(
    -clamp(Math.abs(offset) + 1, 0, idStack.length)
  )
  const list = rollbackId.split(';').filter((str) => str)
  const idList: string[] = []

  list.forEach((str) => {
    const { id, btnStatusMap } = parseRollbackRecord(str)
    id && idList.push(id)

    // @en Set button band status
    // @zh 设置按钮禁用状态
    if (config && config.resetBtnStatus) {
      const controller = getGamepadControllerById(id)
      Object.keys(btnStatusMap).forEach((key) => {
        const k = Number(key)
        const status = btnStatusMap[k]
        controller && controller.setBtnEventBandStatus(k, status)
      })
    }
  })

  // @en Activate controller
  // @zh 激活控制器
  switchGamepadController(idList)
}

/**
 * @en Clear rollback stack
 * @zh 清空回溯栈
 */
export function clearRollbackStack() {
  idStack.length = 0
}

/**
 * @en Parse rollback record
 * @zh 解析回溯记录
 * @param str - @en Record string @zh 记录字符串
 */
function parseRollbackRecord(str: string) {
  const [id, status] = str.split('#')
  const statusList: string[] = []
  const btnStatusMap: { [key: number]: boolean } = {}
  status && statusList.push(...status.split(','))
  statusList.forEach((str) => {
    const [key, status] = str.split('-')
    btnStatusMap[Number(key)] = status === '0'
  })

  return {
    id,
    btnStatusMap
  }
}

/**
 * @en Get rollback stack
 * @zh 获取回溯栈
 * @returns [][] @en id: controllerId; btnStatusMap: btn event status, `status=true`-active `status=false`-disable @zh id: 控制器ID; btnStatusMap: 按钮事件状态，`status=true`-激活 `status=false`-禁用
 */
export function getRollbackStack() {
  return idStack
    .map((str) => {
      const list = str.split(';')
      return list.map((item) => parseRollbackRecord(item))
    })
    .reverse()
}

/**
 * @en Add controller
 * @zh 添加控制器
 * @param controller - @en Controller instance @zh 控制器实例
 * @param isActive - @en Is active @zh 是否激活
 */
export function addGamepadController(
  controller: GamepadControllerType,
  isActive: boolean = false
) {
  if (!isActive) {
    controller.disable()
  }
  ControllerManager.set(controller.id, controller)
  return controller
}

/**
 * @en Get all gamepad controllers
 * @zh 获取所有游戏手柄控制器
 */
export function getAllGamepadController() {
  return Array.from(ControllerManager.values())
}

/**
 * @en Get controller by id
 * @zh 根据ID获取控制器
 * @param id - @en Controller id @zh 控制器ID
 */
export function getGamepadControllerById(id: string) {
  return ControllerManager.get(id)
}

/**
 * @en Get controllers by key
 * @zh 根据标识获取控制器
 * @param key - @en Controller key @zh 控制器标识
 */
export function getGamepadControllersByKey(key: string) {
  return Array.from(ControllerManager.values()).filter(
    (item) => item.key === key
  )
}

/**
 * @en Remove the gamepad controller
 * @zh 移除游戏手柄控制器
 * @param id - @en Controller id @zh 控制器ID
 */
export function removeGamepadController(id: string) {
  ControllerManager.delete(id)
}
