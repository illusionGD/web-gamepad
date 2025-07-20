# web-gamepad
<p align="center">
  <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://cdn-fusion.imgcdn.store/i/2025/774b32fc5b0d72b2.png" alt="Vite logo">
  </a>
</p>
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Web gamepad adapter

# Features

- Compatible with all standard gamepad buttons
- Supports multi-scene UI control and switching
- Supports multiple gamepad inputs

# Installation

```base
npm i web-gamepad
```

# Usage

```ts
/** Initialization */
import { initGamepad } from 'web-gamepad'
initGamepad({
  /** Callback when gamepad is connected */
  onConnected: (gamepad: Gamepad) => {},
  /** Callback when gamepad is disconnected */
  onDisconnected: (gamepad: Gamepad) => {},
  axes: {
    /** Precision for monitoring joystick changes */
    accuracy: 0.001
  }
})


/* Create controller */
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
} from 'web-gamepad'
const controller = createGamepadController('btn1')
// Listen to gamepad button events, such as Xbox gamepad
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('c1-A')
    /* Switch controller & activate controller */
    switchGamepadController(popController.id)
})

/* For multi-scene control switching, create multiple controllers. Do not activate the controller here, set the second parameter to false */
const popController = createGamepadController('pop', false)
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('popController-A')
    /* Switch controller & activate controller */
    switchGamepadController(controller.id)
})


/* Listen to joystick changes */
controller.addBtnEvents(XBOX_KEY_MAP.LS, INPUT_TYPE.axes, ([x, y]) => {
    console.log('left: ',x, y)
})
controller.addBtnEvents(XBOX_KEY_MAP.RS, INPUT_TYPE.axes, ([x, y]) => {
    console.log('right: ',x, y)
})
```

# Configuration

| 变量名            | 类型                         | 默认  | 描述                                                                                                                               |
| -------------- | -------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------- |
| axes           | object                     |     | Optional,Joystick configuration, not required for standard gamepads, configure left and right joystick keys for special gamepads |
| onConnected    | (gamepad: Gamepad) => void | 无   | Callback when gamepad is connected                                                                                               |
| onDisconnected | (gamepad: Gamepad) => void | 无   | Callback when gamepad is disconnected                                                                                            |

# Variables

## XBOX_KEY_MAP

Key value table for Xbox gamepad

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

## PS5_BUTTON_MAP

Key value table for PS5 gamepad

```ts
const PS5_BUTTON_MAP = {
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
  PS: 12,
  touchpad: 13,
  microphone: 14,
  up: 15,
  down: 16,
  left: 17,
  right: 18
} as const
```

# Types

## GamepadControllerType

Controller type

| 名称                    | 类型       | 说明                                   |
| --------------------- | -------- | ------------------------------------ |
| id                    | string   | uuid                                 |
| key                   | string   | Custom key                           |
| addBtnEvents          | function | Add button events                    |
| removeBtnEvents       | function | Remove button events                 |
| setBtnEventBandStatus | function | Set button event disable status      |
| checkBtnEventsExits   | function | Check if button event binding exists |
| emitsBtnEvents        | function | Trigger bound button events          |
| isActive              | function | Whether the controller is active     |
| active                | function | Activate the controller              |
| disable               | function | Deactivate the controller            |
| destroy               | function | Destroy the controller               |

## InputEventType

Gamepad input type

```ts
const INPUT_TYPE = {
  down: 'down', // Press down
  up: 'up', //Lift up
  axes: 'axes' // Joystick change, only joystick buttons can bind this input event
} as const
```

# Functions

## initGamepad

Initialize the gamepad

```ts
initGamepad({
  /** 手柄链接时回调 */
  onConnected: (gamepad: Gamepad) => {},
  /** 手柄断开链接时回调 */
  onDisconnected: (gamepad: Gamepad) => {},
  axes: {
    /** 监听手柄摇杆变化精度 */
    accuracy: 0.001
  }
})
```

## createGamepadController

Create a gamepad controller, return controller instance GamepadControllerType

Parameters：

- key: string，custom key value for the gamepad

- isActive：Boolean，optional, default true, whether to activate the controller

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

Switch controllers, activate the controller, disable other controllers, support switching & activating multiple controllers at the same time

Example：

```ts
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE
} from 'web-gamepad'

const controller = createGamepadController('btn1')
const popController = createGamepadController('pop', false)
const drawerController = createGamepadController('drawer', false)

controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {})
switchGamepadController(drawerController.id)

// Switch multiple
// switchGamepadController([drawerController.id,popController.id]) 
```

## getActiveControllers

Get active controllers, return controller list

## getGamepadControllerById

Get controller by id

## getGamepadControllersByKey

Get controllers by key, return controller list

## removeGamepadController

Remove controller

## addGamepadController

Add controller

## addGamepad

Add gamepad

## removeGamepad

Remove gamepad

## isGamepadSupported

Whether gamepad is supported

## getGamepadList

Get gamepad list

## stopListening

Stop gamepad input monitoring

## startListening

Start gamepad input monitoring
