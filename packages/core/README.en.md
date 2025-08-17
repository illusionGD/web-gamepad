# web-gamepad

<p align="center">
  <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://cdn-fusion.imgcdn.store/i/2025/774b32fc5b0d72b2.png" alt="Vite logo">
  </a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**English** | [中文](./README.md)

Web Gamepad Adapter

# Features

- Supports all standard gamepad buttons
- Multi-scene UI control and switching
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
  /** Callback when gamepad input occurs */
  onInput: (gamepad: Gamepad) => {},
  axes: {
    /** Joystick dead zone radius, default 0.05 */
    deadZoneRadius: 0.05
  }
})

/* Create controller */
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
} from 'web-gamepad'
const controller = createGamepadController('btn1')
// Listen to gamepad button events, e.g. Xbox controller
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('c1-A')
    /* Switch & activate controller */
    switchGamepadController(popController.id)
})

/* Multi-scene control switching, create multiple controllers, set second parameter to false to not activate */
const popController = createGamepadController('pop', false)
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down,  () => {
    console.log('popController-A')
    /* Switch & activate controller */
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

| Variable Name     | Type                         | Default | Description                                      |
| ----------------- | --------------------------- | ------- | ------------------------------------------------ |
| axes              |                             |         | Optional, joystick config. Standard gamepads can skip. Special gamepads can configure left/right joystick keys. |
| onConnected       | (gamepad: Gamepad) => void  | None    | Callback when gamepad is connected               |
| onDisconnected    | (gamepad: Gamepad) => void  | None    | Callback when gamepad is disconnected            |

# Variables

## XBOX_KEY_MAP

Xbox gamepad key value table

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

PS5 gamepad key value table

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

Switch Pro gamepad key value table

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

# Types

## GamepadControllerType

Controller type

| Name                      | Type      | Parameters                                                        | Description                                                                                                                                    |
| ------------------------- | --------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| id                        | string    |                                                                   | uuid                                                                                                                                           |
| key                       | string    |                                                                   | Custom key                                                                                                                                     |
| getControllerGamepadIndex | function  |                                                                   | Get the unique index of the controller's gamepad                                                        |
| setGamepadIndex           | function  | (index: number)                                                   | Set the unique index of the controller's gamepad                                                        |
| addBtnEvents              | function  | (key: number, inputType: InputEventType, fn: Function \| AxesFnType) | Add button event                                                                                        |
| removeBtnEvents           | function  | (key: number, inputType: InputEventType, fn: Function)            | Remove button event                                                                                      |
| setBtnEventBandStatus     | function  | (key: number \| number[], isBand: boolean = true)                 | Set button event disable status. Disabled events will not trigger.                                       |
| checkBtnEventActive       | function  | (key: number)                                                     | Check if button event is disabled, returns status                                                       |
| checkBtnEventsExits       | function  | (key: number)                                                     | Check if button event is bound, returns status                                                          |
| emitsBtnEvents            | function  | (key: number, inputType: InputEventType, params?: any)            | Trigger bound button event                                                                              |
| getAllBtnEventBucket      | function  |                                                                   | Get all button event bindings for this controller. Returns: `{ key:number,isBand: boolean; onDownBucket: Set<Function>; onUpBucket: Set<Function>; onAxesBucket: Set<AxesFnType>; }[]` |
| isActive                  | function  |                                                                   | Whether the controller is active, returns status                                                        |
| active                    | function  |                                                                   | Activate controller                                                                                     |
| disable                   | function  |                                                                   | Deactivate controller                                                                                   |
| destroy                   | function  |                                                                   | Destroy controller                                                                                      |

## InputEventType

Gamepad input type

```ts
const INPUT_TYPE = {
  down: 'down', // Pressed
  up: 'up', // Released
  axes: 'axes' // Joystick movement, only joystick buttons can bind this event
} as const
```

# Methods

## initGamepad

Initialize gamepad

```ts
initGamepad({
  /** Callback when gamepad is connected */
  onConnected: (gamepad: Gamepad) => {},
  /** Callback when gamepad is disconnected */
  onDisconnected: (gamepad: Gamepad) => {},
  /** Callback when gamepad input occurs */
  onInput: (gamepad: Gamepad) => {},
  axes: {
    /** Joystick dead zone radius */
    deadZoneRadius: 0.05
  }
})
```

## createGamepadController

Create a gamepad controller, returns a GamepadControllerType instance

Parameters:

- key: string, custom key for the controller
- isActive: Boolean, optional, default true, whether to activate the controller
- index: unique gamepad index, the controller is controlled by this gamepad (if not provided, all gamepads are listened to), can be obtained when listening to controller connection (`onConnected`)

Example:

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

Switch controller(s), activate the specified controller(s), and deactivate others. Supports switching & activating multiple controllers at once.

Example:

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

// Switch multiple
// switchGamepadController([drawerController.id, popController.id]) 
```

## rollbackController

Rollback controller(s)

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
// Dialog confirm
popController.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {
  dialogVisible.value = false
  handleClose()
})

function open() {
  dialogVisible.value = true
  switchGamepadController(popController.id)
}

// When closing the dialog, rollback to the previously activated controllers
function handleClose() {
  rollbackController(1)
}
```

## getRollbackStack

Get rollback stack

```ts
import {
 getRollbackStack
} from 'web-gamepad'

getRollbackStack() // {id: string;btnStatusMap: {[key: number]: boolean;};}[][]
```

## getActiveControllers

Get active controllers, returns a list of controllers

```ts
import {
  createGamepadController,
  getActiveControllers
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const popController = createGamepadController('pop')
const drawerController = createGamepadController('drawer', false)

getActiveControllers() // [controller, popController]
```

## getGamepadControllerById

Get controller by id

```ts
import {
  createGamepadController,
  getGamepadControllerById
} from 'web-gamepad'

const controller = createGamepadController('ctrl')

getGamepadControllerById(controller.id) // controller
```

## getGamepadControllersByKey

Get controllers by key, returns a list of controllers

```ts
import {
  createGamepadController,
  getGamepadControllersByKey
} from 'web-gamepad'

const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl')
getGamepadControllersByKey('ctrl') // [controller, controller2]
```

## removeGamepadController

Remove controller

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

Add controller

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

Add gamepad

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

Remove gamepad

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

Check if gamepad is supported, returns ```boolean```

## getGamepadList

Get gamepad list

```ts
import {
  getGamepadList
} from 'web-gamepad'
initGamepad()
getGamepadList() // [gamepad,...]
```

## getGamepadByIndex

Get gamepad by gamepadIndex

```ts
import {
  getGamepadByIndex
} from 'web-gamepad'
initGamepad()
getGamepadByIndex(0) // gamepad | undefined
```

## stopListening

Stop listening to gamepad input, all gamepad input events will not trigger

## startListening

Start listening to gamepad input, all gamepad input events will trigger again