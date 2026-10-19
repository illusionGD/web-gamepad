import type { StickSource } from './types'

/**
 * @en Built-in logical identifiers; use STANDARD_KEY.S or STANDARD_KEY.LS in subscriptions.
 * @zh 内置逻辑按键标识，订阅时可使用 STANDARD_KEY.S、STANDARD_KEY.LS。
 */
export const STANDARD_KEY = Object.freeze({
  /** @en South @zh 下方按钮 */
  S: 'S',
  /** @en East @zh 右侧按钮 */
  E: 'E',
  /** @en West @zh 左侧按钮 */
  W: 'W',
  /** @en North @zh 上方按钮 */
  N: 'N',
  /** @en Left bumper @zh 左肩键 */
  LB: 'LB',
  /** @en Right bumper @zh 右肩键 */
  RB: 'RB',
  /** @en Left trigger @zh 左扳机 */
  LT: 'LT',
  /** @en Right trigger @zh 右扳机 */
  RT: 'RT',
  /** @en Back @zh 返回键 */
  BK: 'BK',
  /** @en Start @zh 开始键 */
  ST: 'ST',
  /** @en Left stick: movement and press @zh 左摇杆移动与按压 */
  LS: 'LS',
  /** @en Right stick: movement and press @zh 右摇杆移动与按压 */
  RS: 'RS',
  /** @en D-pad up @zh 十字键上 */
  DU: 'DU',
  /** @en D-pad down @zh 十字键下 */
  DD: 'DD',
  /** @en D-pad left @zh 十字键左 */
  DL: 'DL',
  /** @en D-pad right @zh 十字键右 */
  DR: 'DR',
  /** @en Home @zh 主页键 */
  HM: 'HM'
} as const)

/**
 * @en Input event names.
 * @zh 输入事件名称。
 */
export const INPUT_TYPE = Object.freeze({
  /** @en Button pressed @zh 按钮按下 */
  down: 'down',
  /** @en Button released normally @zh 按钮正常松开 */
  up: 'up',
  /** @en Released before the long-press threshold @zh 未达到长按阈值时松开 */
  click: 'click',
  /** @en Threshold reached, once per press @zh 达到阈值，每次按压仅触发一次 */
  longpress: 'longpress',
  /** @en Stick vector, continuously while displaced @zh 摇杆向量，偏转时持续触发 */
  axes: 'axes',
  /** @en Pending input cancelled @zh 未完成输入被取消 */
  cancel: 'cancel'
} as const)

/**
 * @en Manager lifecycle event names.
 * @zh 管理器生命周期事件名称。
 */
export const MANAGER_EVENT = Object.freeze({
  /** @en Connection session created @zh 建立连接会话 */
  connected: 'connected',
  /** @en Connection session removed @zh 设备连接断开 */
  disconnected: 'disconnected',
  /** @en Automatic input source changed @zh 自动输入源切换 */
  devicechange: 'devicechange',
  /** @en Sampling or callback error @zh 采样或回调错误 */
  error: 'error'
} as const)

/**
 * @en Resolved device mapping status.
 * @zh 设备映射解析结果。
 */
export const MAPPING_TYPE = Object.freeze({
  /** @en Browser-standard layout @zh 浏览器标准布局 */
  standard: 'standard',
  /** @en Matched custom profile @zh 匹配自定义配置 */
  custom: 'custom',
  /** @en Unknown layout, raw inspection only @zh 未知布局，仅支持原始输入查看 */
  unmapped: 'unmapped'
} as const)

/**
 * @en Reasons for ending a delivered input without a normal release.
 * @zh 已交付输入未正常松开就结束的原因。
 */
export const CANCEL_REASON = Object.freeze({
  /** @en A recognized combo consumed this button press. @zh 已识别组合消耗了此按钮按压。 */
  combo: 'combo',
  /** @en Another device took over @zh 其他设备接管 */
  devicechange: 'devicechange',
  /** @en Device disconnected @zh 设备断开 */
  disconnect: 'disconnect',
  /** @en Controller left the active scene @zh 控制器退出当前场景 */
  scene: 'scene',
  /** @en Logical key disabled @zh 逻辑按键被禁用 */
  disabled: 'disabled',
  /** @en Manager stopped @zh 管理器停止 */
  stop: 'stop',
  /** @en Manager or controller destroyed @zh 管理器或控制器销毁 */
  destroy: 'destroy',
  /** @en Page hidden @zh 页面隐藏 */
  hidden: 'hidden',
  /** @en Window lost focus @zh 窗口失去焦点 */
  blur: 'blur',
  /** @en Input capability or API became unavailable @zh 输入能力或 API 不再可用 */
  unavailable: 'unavailable',
  /** @en Controller input source changed @zh 控制器重新绑定输入源 */
  rebind: 'rebind'
} as const)

/**
 * @en Immutable defaults used by every new manager.
 * @zh 新建管理器使用的不可变默认配置。
 */
export const DEFAULT_CONFIG = Object.freeze({
  /** @en Button gesture settings. @zh 按钮手势配置。 */
  press: Object.freeze({
    /** @en Long-press threshold in milliseconds. @zh 长按阈值，单位毫秒。 */
    longPressMs: 500
  } as const),
  /** @en Stick normalization settings. @zh 摇杆归一化配置。 */
  axes: Object.freeze({
    /** @en Radial dead zone in [0, 1). @zh 径向死区，范围 [0, 1)。 */
    deadZone: 0.12
  } as const),
  /** @en Automatic device handover settings. @zh 自动设备接管配置。 */
  takeover: Object.freeze({
    /** @en Normalized magnitude that requests control. @zh 申请接管所需的归一化摇杆幅度。 */
    threshold: 0.35,
    /** @en Re-arm below this magnitude before another takeover. @zh 回落到此幅度以下后，才允许再次申请接管。 */
    resetThreshold: 0.2
  } as const)
} as const)

/**
 * @en Standard button indices, independent of printed brand labels.
 * @zh 标准按钮索引，与各品牌印刷键名无关。
 */
export const STANDARD_BUTTONS = Object.freeze({
  /** @en South raw button index @zh 下方按钮原始按钮索引 */
  [STANDARD_KEY.S]: 0,
  /** @en East raw button index @zh 右侧按钮原始按钮索引 */
  [STANDARD_KEY.E]: 1,
  /** @en West raw button index @zh 左侧按钮原始按钮索引 */
  [STANDARD_KEY.W]: 2,
  /** @en North raw button index @zh 上方按钮原始按钮索引 */
  [STANDARD_KEY.N]: 3,
  /** @en Left bumper raw button index @zh 左肩键原始按钮索引 */
  [STANDARD_KEY.LB]: 4,
  /** @en Right bumper raw button index @zh 右肩键原始按钮索引 */
  [STANDARD_KEY.RB]: 5,
  /** @en Left trigger raw button index @zh 左扳机原始按钮索引 */
  [STANDARD_KEY.LT]: 6,
  /** @en Right trigger raw button index @zh 右扳机原始按钮索引 */
  [STANDARD_KEY.RT]: 7,
  /** @en Back raw button index @zh 返回键原始按钮索引 */
  [STANDARD_KEY.BK]: 8,
  /** @en Start raw button index @zh 开始键原始按钮索引 */
  [STANDARD_KEY.ST]: 9,
  /** @en Left stick: movement and press raw button index @zh 左摇杆移动与按压原始按钮索引 */
  [STANDARD_KEY.LS]: 10,
  /** @en Right stick: movement and press raw button index @zh 右摇杆移动与按压原始按钮索引 */
  [STANDARD_KEY.RS]: 11,
  /** @en D-pad up raw button index @zh 十字键上原始按钮索引 */
  [STANDARD_KEY.DU]: 12,
  /** @en D-pad down raw button index @zh 十字键下原始按钮索引 */
  [STANDARD_KEY.DD]: 13,
  /** @en D-pad left raw button index @zh 十字键左原始按钮索引 */
  [STANDARD_KEY.DL]: 14,
  /** @en D-pad right raw button index @zh 十字键右原始按钮索引 */
  [STANDARD_KEY.DR]: 15,
  /** @en Home raw button index @zh 主页键原始按钮索引 */
  [STANDARD_KEY.HM]: 16
} as const)

/**
 * @en Standard stick axis positions; negative X is left and negative Y is up.
 * @zh 标准摇杆轴位置，X 负值向左，Y 负值向上。
 */
export const STANDARD_STICKS = Object.freeze({
  /** @en Left stick axes. @zh 左摇杆轴映射。 */
  LS: Object.freeze({
    /** @en Horizontal axis index. @zh 横向轴索引。 */
    x: 0,
    /** @en Vertical axis index. @zh 纵向轴索引。 */
    y: 1
  } as const),
  /** @en Right stick axes. @zh 右摇杆轴映射。 */
  RS: Object.freeze({
    /** @en Horizontal axis index. @zh 横向轴索引。 */
    x: 2,
    /** @en Vertical axis index. @zh 纵向轴索引。 */
    y: 3
  } as const)
} as const satisfies Record<'LS' | 'RS', StickSource>)
