import { AXES_BTN_KEY_MAP } from './constants'
import { v4 as uuidv4 } from 'uuid'
import { AxesFnType,  GamepadControllerType, GamepadEventMapType } from './types'

/**
 * input type: down | up | axes
 */
export const INPUT_TYPE = {
  down: 'down',
  up: 'up',
  axes: 'axes'
} as const

export type InputEventType = keyof typeof INPUT_TYPE

/** controller manager */
const ControllerManager = new Map<string, GamepadControllerType>()

/**
 * Create a handle controller
 * @param key controller key
 * @param isActive is active
 * @returns
 */
export function createGamepadController(key: string, isActive: boolean = true) {
  // Button event bucket
  const btnEventsMap = new Map<number, GamepadEventMapType>()
  const ctrlKey = key
  const id = uuidv4()
  let active = isActive

  const ctrl = {
    id,
    key: ctrlKey,

    /**
     * Add button event
     * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
     * @param inputType input type: down | up | axes
     * @param fn
     */
    addBtnEvents: (
      key: number,
      inputType: InputEventType,
      fn: Function | AxesFnType
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      if (bucket) {
        // axes bucket requires AxesFnType
        if (
          (key === AXES_BTN_KEY_MAP.LS || key === AXES_BTN_KEY_MAP.RS) &&
          inputType === INPUT_TYPE.axes
        ) {
          (bucket as Set<AxesFnType>).add(fn as AxesFnType)
        } else {
          (bucket as Set<Function>).add(fn as Function)
        }
        return true
      }

      const newBucket: GamepadEventMapType = {
        isBand: false,
        onDownBucket: new Set<Function>(),
        onUpBucket: new Set<Function>(),
        onAxesBucket: new Set<AxesFnType>()
      }

      // button
      if (inputType !== INPUT_TYPE.axes) {
        inputType === INPUT_TYPE.down
          ? newBucket.onDownBucket.add(fn as Function)
          : newBucket.onUpBucket.add(fn as Function)
      } else {
        // axes
        if (key === AXES_BTN_KEY_MAP.LS || key === AXES_BTN_KEY_MAP.RS) {
          newBucket.onAxesBucket.add(fn as AxesFnType)
        }
      }

      btnEventsMap.set(key, newBucket)
      return true
    },

    /**
     * Remove button event
     * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
     * @param inputType input type: down | up | axes
     * @param fn
     */
    removeBtnEvents: (
      key: number,
      inputType: InputEventType,
      fn: Function
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)

      bucket && bucket.delete(fn)
    },

    /**
     * Disable button event
     * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
     */
    bandBtnEvents: (key: number | number[]) => {
      const keys = key instanceof Array ? key : [key]
      keys.forEach((item) => {
        const eventSet = btnEventsMap.get(item)
        if (!eventSet) {
          return
        }
        eventSet.isBand = true
      })
    },

    /**
     * Verify whether the button event exists
     * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
     */
    checkBtnEventsExits(key: number) {
      return btnEventsMap.has(key)
    },

    /**
     * Trigger the corresponding button event
     * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
     * @param inputType input type: down | up | axes
     * @param params
     */
    emitsBtnEvents: (
      key: number,
      inputType: InputEventType,
      params?: any
    ) => {
      const bucket = getBucketByInputType(key, inputType, btnEventsMap)
      bucket && bucket.forEach((fn) => fn(params))
    },

    /**
     * check activated
     */
    isActive: () => active,
    disable: () => (active = false),
    active: () => (active = true),
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
 * @param key gamepad key, doc: https://w3c.github.io/gamepad/#remapping
 * @param inputType input type: down | up | axes
 * @param btnEventsMap
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

/** Get the activated controller */
export function getActiveControllers() {
  return Array.from(ControllerManager.values()).filter((item) =>
    item.isActive()
  )
}

/**
 * Switch controllers and support activating multiple controllers simultaneously
 * @param id
 */
export function switchGamepadController(id: string | string[]) {
  const ids = id instanceof Array ? id : [id]
  ControllerManager.forEach((item, id) => {
    if (!ids.includes(id)) {
      item.disable()
    } else {
      item.active()
    }
  })
}

/**
 * add controller
 * @param id
 * @param controller
 * @param isActive
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
 * Remove the gamepad controller
 * @param id
 */
export function removeGamepadController(id: string) {
  ControllerManager.delete(id)
}
