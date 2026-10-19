/**
 * @en Public v2 API. Creating a manager does not access browser globals until start().
 * @zh v2 公共 API。创建管理器时不会访问浏览器全局对象，调用 start() 才开始监听。
 */
export { createGamepadManager } from './manager'
export {
  STANDARD_KEY,
  INPUT_TYPE,
  MANAGER_EVENT,
  MAPPING_TYPE,
  CANCEL_REASON,
  DEFAULT_CONFIG,
  STANDARD_BUTTONS,
  STANDARD_STICKS
} from './constants'
export type * from './types'
