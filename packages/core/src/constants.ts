import { InitAxesConfigType } from './types'

/**
 * @en Xbox button key map
 * @zh Xbox 按钮键位映射
 */
export const XBOX_KEY_MAP = {
  /** @en A button @zh A键 */
  A: 0,
  /** @en B button @zh B键 */
  B: 1,
  /** @en X button @zh X键 */
  X: 2,
  /** @en Y button @zh Y键 */
  Y: 3,
  /** @en Left bumper @zh 左肩键 */
  LB: 4,
  /** @en Right bumper @zh 右肩键 */
  RB: 5,
  /** @en Left trigger @zh 左扳机 */
  LT: 6,
  /** @en Right trigger @zh 右扳机 */
  RT: 7,
  /** @en View button @zh 视图键 */
  view: 8,
  /** @en Menu button @zh 菜单键 */
  menu: 9,
  /** @en Left stick pressed @zh 左摇杆按下 */
  LS: 10,
  /** @en Right stick pressed @zh 右摇杆按下 */
  RS: 11,
  /** @en D-pad up @zh 方向键上 */
  up: 12,
  /** @en D-pad down @zh 方向键下 */
  down: 13,
  /** @en D-pad left @zh 方向键左 */
  left: 14,
  /** @en D-pad right @zh 方向键右 */
  right: 15,
  /** @en Home button @zh Home键 */
  home: 16
} as const

/**
 * @en PlayStation button key map (DirectInput/HTML5 API)
 * @zh PlayStation 按钮键位映射（DirectInput/HTML5 API）
 * @note @en Order may vary by platform, this is the common mapping. @zh 不同平台可能顺序不同，此为常见映射。
 */
export const PS_KEY_MAP = {
  /** @en Cross (confirm) @zh × (确认键) */
  cross: 0,
  /** @en Circle (cancel) @zh ○ (取消键) */
  circle: 1,
  /** @en Square @zh □ */
  square: 2,
  /** @en Triangle @zh △ */
  triangle: 3,
  /** @en L1 (left bumper) @zh 左肩键 */
  L1: 4,
  /** @en R1 (right bumper) @zh 右肩键 */
  R1: 5,
  /** @en L2 (left trigger, axis) @zh 左扳机（模拟轴） */
  L2: 6,
  /** @en R2 (right trigger, axis) @zh 右扳机（模拟轴） */
  R2: 7,
  /** @en Share (PS4) / Create (PS5) @zh 分享键（PS4）/ Create键（PS5） */
  share: 8,
  /** @en Options @zh 选项键 */
  options: 9,
  /** @en Left stick pressed @zh 左摇杆按下 */
  L3: 10,
  /** @en Right stick pressed @zh 右摇杆按下 */
  R3: 11,
  /** @en D-pad up @zh 方向键上 */
  up: 12,
  /** @en D-pad down @zh 方向键下 */
  down: 13,
  /** @en D-pad left @zh 方向键左 */
  left: 14,
  /** @en D-pad right @zh 方向键右 */
  right: 15,
  /** @en PS logo button @zh PS 徽标键 */
  home: 16
} as const

/**
 * @en Switch Pro button key map
 * @zh Switch Pro 手柄键位映射
 * @note @en Order may vary by driver, some platforms simulate as XInput. @zh 不同驱动可能顺序不同，部分平台会模拟为 XInput。
 */
export const SWITCH_PRO_KEY_MAP = {
  /** @en Bottom button (confirm) @zh 底部键（确认） */
  B: 0,
  /** @en Right button (cancel) @zh 右侧键（取消） */
  A: 1,
  /** @en Top button @zh 上方键 */
  Y: 2,
  /** @en Left button @zh 左侧键 */
  X: 3,
  /** @en Left bumper @zh 左肩键 */
  L: 4,
  /** @en Right bumper @zh 右肩键 */
  R: 5,
  /** @en Left trigger (simulated) @zh 左扳机（模拟） */
  ZL: 6,
  /** @en Right trigger (simulated) @zh 右扳机（模拟） */
  ZR: 7,
  /** @en Minus button (-) @zh -键 */
  minus: 8,
  /** @en Plus button (+) @zh +键 */
  plus: 9,
  /** @en Left stick pressed @zh 左摇杆按下 */
  L3: 10,
  /** @en Right stick pressed @zh 右摇杆按下 */
  R3: 11,
  /** @en D-pad up @zh 方向键上 */
  up: 12,
  /** @en D-pad down @zh 方向键下 */
  down: 13,
  /** @en D-pad left @zh 方向键左 */
  left: 14,
  /** @en D-pad right @zh 方向键右 */
  right: 15,
  /** @en Home button @zh Home键 */
  home: 16
} as const

/**
 * @en Axes button key map (default: LS=10, RS=11)
 * @zh 摇杆按钮键位映射（默认：LS=10，RS=11）
 */
export const AXES_BTN_KEY_MAP = {
  /** @en Left stick pressed @zh 左摇杆按下 */
  LS: 10,
  /** @en Right stick pressed @zh 右摇杆按下 */
  RS: 11
}

/**
 * @en Set axes config
 * @zh 设置摇杆配置
 * @param config - @en Axes config object @zh 摇杆配置对象
 * @property left - @en Left stick key index @zh 左摇杆键位索引
 * @property right - @en Right stick key index @zh 右摇杆键位索引
 * @property deadZoneRadius - @en Dead zone radius (optional) @zh 死区半径（可选）
 */
export function setAxesConfig({ left, right }: InitAxesConfigType) {
  if (left !== undefined && typeof left === 'number') {
    AXES_BTN_KEY_MAP.LS = left
  }

  if (right !== undefined && typeof right === 'number') {
    AXES_BTN_KEY_MAP.RS = right
  }
}