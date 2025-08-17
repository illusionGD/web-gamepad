# web-gamepad

<p align="center">
  <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://cdn-fusion.imgcdn.store/i/2025/774b32fc5b0d72b2.png" alt="Vite logo">
  </a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**中文** | [English](./README.en.md)

web游戏手柄设配器

# 特点

- 适配全部标准手柄按键

- 支持多场景ui控制与切换

- 支持多个手柄输入

# 安装

```base
npm i web-gamepad
```

# 使用

```ts
/** 初始化 */
import { initGamepad } from 'web-gamepad'
initGamepad({
  /** 手柄链接时回调 */
  onConnected: (gamepad: Gamepad) => {},
  /** 手柄断开链接时回调 */
  onDisconnected: (gamepad: Gamepad) => {},
  /** 手柄输入时回调 */
  onInput: (gamepad: Gamepad) => {},
  axes: {
    /** 手柄摇杆死区半径，默认0.05 */
    deadZoneRadius: 0.05
  }
})


/* 创建控制器*/
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
} from 'web-gamepad'
const controller = createGamepadController('btn1')
// 监听手柄按钮事件，如xbox手柄
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('c1-A')
    /* 切换控制器&激活控制器 */
    switchGamepadController(popController.id)
})

/* 多个场景控制切换，创建多个控制器，这里先不激活控制器，第二个参数false */
const popController = createGamepadController('pop', false)
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('popController-A')
    /* 切换控制器&激活控制器 */
    switchGamepadController(controller.id)
})


/*监听摇杆变化*/
controller.addBtnEvents(XBOX_KEY_MAP.LS, INPUT_TYPE.axes, ([x, y]) => {
    console.log('left: ',x, y)
})
controller.addBtnEvents(XBOX_KEY_MAP.RS, INPUT_TYPE.axes, ([x, y]) => {
    console.log('right: ',x, y)
})
```

# 配置

| 变量名            | 类型                         | 默认  | 描述                             |
| -------------- | -------------------------- | --- | ------------------------------ |
| axes           |                            |     | 可选，摇杆配置，标准手柄可不配，特殊手柄配置左右摇杆的key |
| onConnected    | (gamepad: Gamepad) => void | 无   | 手柄连接时回调                        |
| onDisconnected | (gamepad: Gamepad) => void | 无   | 手柄断开连接时回调                      |

# 变量

## XBOX_KEY_MAP

xbox手柄的key值表

```ts
const XBOX_KEY_MAP = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LT: 4,
  RT: 5,
  LB: 6,
  RB: 7,
  view: 8,
  menu: 9,
  LS: 10,
  RS: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16
} as const
```

## PS_KEY_MAP

ps5手柄的key值表

```ts
export const PS_KEY_MAP = {
  cross: 0,
  circle: 1,
  square: 2,
  triangle: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  share: 8,
  options: 9,
  L3: 10,
  R3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16
} as const
```

## SWITCH_PRO_KEY_MAP

switch手柄的key值表

```ts
export const SWITCH_PRO_KEY_MAP = {
  B: 0,
  A: 1,
  Y: 2,
  X: 3,
  L: 4,
  R: 5,
  ZL: 6,
  ZR: 7,
  minus: 8,
  plus: 9,
  L3: 10,
  R3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16
} as const
```

# 类型

## GamepadControllerType

控制器类型

| 名称                        | 类型       | 参数                                                                   | 说明                                                                                                                                            |
| ------------------------- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| id                        | string   |                                                                      | uuid                                                                                                                                          |
| key                       | string   |                                                                      | 自定义key                                                                                                                                        |
| getControllerGamepadIndex | function |                                                                      | 获取该控制器的手柄唯一index                                                                                                                              |
| setGamepadIndex           | function | (index: number)                                                      | 设置该控制器的手柄唯一index                                                                                                                              |
| addBtnEvents              | function | (key: number, inputType: InputEventType, fn: Function \| AxesFnType) | 添加按钮事件                                                                                                                                        |
| removeBtnEvents           | function | (key: number, inputType: InputEventType, fn: Function)               | 移除按钮事件                                                                                                                                        |
| setBtnEventBandStatus     | function | (key: number \| number[], isBand: boolean = true)                    | 设置按钮事件禁用状态，禁用后，不会触发该按钮事件                                                                                                                      |
| checkBtnEventActive       | function | (key: number)                                                        | 检查按钮事件是否处于禁用状态，返回                                                                                                                             |
| checkBtnEventsExits       | function | (key: number)                                                        | 检查是否存在按钮事件的绑定，返回                                                                                                                              |
| emitsBtnEvents            | function | (key: number, inputType: InputEventType, params?: any)               | 触发绑定的按钮事件                                                                                                                                     |
| getAllBtnEventBucket      | function |                                                                      | 获取该控制器下全部按钮绑定事件，返回：`{ key:number,isBand: boolean; onDownBucket: Set<Function>; onUpBucket: Set<Function>; onAxesBucket: Set<AxesFnType>; }[]` |
| isActive                  | function |                                                                      | 控制器是否激活，返回                                                                                                                                    |
| active                    | function |                                                                      | 激活控制器                                                                                                                                         |
| disable                   | function |                                                                      | 不激活控制器                                                                                                                                        |
| destroy                   | function |                                                                      | 销毁控制器                                                                                                                                         |

## InputEventType

手柄输入类型

```ts
const INPUT_TYPE = {
  down: 'down', // 按下
  up: 'up', //抬起
  axes: 'axes' //摇杆变化，只有摇杆按钮才能绑定这输入事件
} as const
```

# 方法

## initGamepad

初始化手柄

```ts
initGamepad({
  /** 手柄链接时回调 */
  onConnected: (gamepad: Gamepad) => {},
  /** 手柄断开链接时回调 */
  onDisconnected: (gamepad: Gamepad) => {},
 /** 手柄输入时回调 */
  onInput: (gamepad: Gamepad) => {},
  axes: {
    /** 手柄死区半径半径 */
    deadZoneRadius: 0.05
  }
})
```

## createGamepadController

创建手柄控制器，返回控制器实例GamepadControllerType

参数：

- key: string，自定义手柄的key值

- isActive：Boolean，可选，默认true，是否激活该控制器

- index: 游戏手柄唯一索引，该控制器由此游戏手柄控制（不传则全部手柄都监听），可在监听手柄连接（`onConnected`）时获取

案例：

```ts
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE
} from 'web-gamepad'

const controller = createGamepadController('btn1')
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {})
```

## switchGamepadController

切换控制器，并激活控制器，禁用其他控制器，支持同时切换&激活多个控制器

案例：

```ts
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
switchGamepadController
} from 'web-gamepad'

const controller = createGamepadController('btn1')
const popController = createGamepadController('pop', false)
const drawerController = createGamepadController('drawer', false)

controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {})
switchGamepadController(drawerController.id)

// 切换多个
// switchGamepadController([drawerController.id,popController.id]) 
```

## rollbackController

回溯controller

```ts
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
  rollbackController,
  switchGamepadController
} from 'web-gamepad'
const dialogVisible = ref(false)
const controller = createGamepadController('btn1')
const popController = createGamepadController('pop', false)
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, open)
// 对话框确认
popController.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {
  dialogVisible.value = false
  handleClose()
})

function open() {
  dialogVisible.value = true
  switchGamepadController(popController.id)
}

// 当关闭弹窗是，回退前1位激活的controllers
function handleClose() {
  rollbackController(1)
}
```

## getRollbackStack

获取回溯栈

```ts
import {
 getRollbackStack
} from 'web-gamepad'

getRollbackStack() // {id: string;btnStatusMap: {[key: number]: boolean;};}[][]
```

## getActiveControllers

获取激活的控制器，返回控制器列表

```ts
import {
  createGamepadController,
getActiveControllers
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const popController = createGamepadController('pop')
const drawerController = createGamepadController('drawer', false)

getActiveControllers() // [controller,popController ]
```

## getGamepadControllerById

通过id获取控制器

```ts
import {
  createGamepadController,
getGamepadControllerById
} from 'web-gamepad'

const controller = createGamepadController('ctrl')

getGamepadControllerById(controller.id) // controller
```

## getGamepadControllersByKey

通过key获取控制器，返回控制器列表

```ts
import {
  createGamepadController,
getGamepadControllersByKey
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl')
getGamepadControllersByKey('ctrl') // [controller,controller2]
```

## removeGamepadController

移除控制器

```ts
import {
  createGamepadController,
removeGamepadController
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl')
removeGamepadController(controller.id)
getGamepadControllersByKey('ctrl') // [controller2]
```

## addGamepadController

添加控制器

```ts
import {
  createGamepadController,
removeGamepadController,
addGamepadController
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl')
removeGamepadController(controller.id)
getGamepadControllersByKey('ctrl') // [controller2]
addGamepadController(controller)
getGamepadControllersByKey('ctrl') // [controller, controller2]
```

## addGamepad

添加手柄

```ts
import {
addGamepad,
getGamepadList
} from 'web-gamepad'
initGamepad()
addGamepad(gamepad)
getGamepadList() // [gamepad]
```

## removeGamepad

移除手柄

```ts
import {
removeGamepad,
getGamepadList
} from 'web-gamepad'
initGamepad()
getGamepadList().forEach(gamepad => removeGamepad(gamepad))
getGamepadList() // []
```

## isGamepadSupported

是否支持手柄，返回```boolean```

## getGamepadList

获取手柄列表

```ts
import {
getGamepadList
} from 'web-gamepad'
initGamepad()
getGamepadList() // [gamepad,...]
```

## getGamepadByIndex

通过gamepadIndex获取游戏手柄

```ts
import {
getGamepadByIndex
} from 'web-gamepad'
initGamepad()
getGamepadByIndex(0) // gamepad | undefined
```

## stopListening

停止手柄输入监听，全部手柄输入事件将不会触发

## startListening

开启手柄输入监听，全部手柄输入事件将重新触发
