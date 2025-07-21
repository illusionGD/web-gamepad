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

| Variable Name  | Type                       | default | Default                                                                                                                          |
| -------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| axes           | object                     |         | Optional,Joystick configuration, not required for standard gamepads, configure left and right joystick keys for special gamepads |
| onConnected    | (gamepad: Gamepad) => void |         | Callback when gamepad is connected                                                                                               |
| onDisconnected | (gamepad: Gamepad) => void |         | Callback when gamepad is disconnected                                                                                            |

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

| Name                  | Type     |                                                                      | Description                                                                                                                                                                              |
| --------------------- | -------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                    | string   |                                                                      | uuid                                                                                                                                                                                     |
| key                   | string   |                                                                      | Custom key                                                                                                                                                                               |
| addBtnEvents          | function | (key: number, inputType: InputEventType, fn: Function \| AxesFnType) | Add button events                                                                                                                                                                        |
| removeBtnEvents       | function | (key: number, inputType: InputEventType, fn: Function)               | Remove button events                                                                                                                                                                     |
| setBtnEventBandStatus | function | (key: number \| number[], isBand: boolean = true)                    | Set button event disable status                                                                                                                                                          |
| checkBtnEventActive   | function | (key: number)                                                        | Check if the button event is disabled, returns boolean                                                                                                                                   |
| checkBtnEventsExits   | function | (key: number)                                                        | Check if button event binding exists                                                                                                                                                     |
| emitsBtnEvents        | function | (key: number, inputType: InputEventType, params?: any)               | Trigger bound button events                                                                                                                                                              |
| getAllBtnEventBucket  | function |                                                                      | Get all button binding events under this controller, returns: `{ key:number,isBand: boolean; onDownBucket: Set<Function>; onUpBucket: Set<Function>; onAxesBucket: Set<AxesFnType>; }[]` |
| isActive              | function |                                                                      | Whether the controller is active                                                                                                                                                         |
| active                | function |                                                                      | Activate the controller                                                                                                                                                                  |
| disable               | function |                                                                      | Deactivate the controller                                                                                                                                                                |
| destroy               | function |                                                                      | Destroy the controller                                                                                                                                                                   |

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
  /** Callback when gamepad is connected */
  onConnected: (gamepad: Gamepad) => {},
  /** Callback when gamepad is disconnected */
  onDisconnected: (gamepad: Gamepad) => {},
  axes: {
    /** Precision for monitoring joystick changes */
    accuracy: 0.001
  }
})
```

## createGamepadController

Create a gamepad controller, return controller instance GamepadControllerType

Parameters：

- key: string，custom key value for the gamepad

- isActive：Boolean，optional, default true, whether to activate the controller

Example：

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

## recallController

recall controller

```ts
import {
  createGamepadController,
  XBOX_KEY_MAP,
  INPUT_TYPE,
  recallController,
  switchGamepadController
} from 'web-gamepad'
const dialogVisible = ref(false)
const controller = createGamepadController('btn1')
const popController = createGamepadController('pop', false)
controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, open)

popController.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {
  dialogVisible.value = false
  handleClose()
})

function open() {
  dialogVisible.value = true
  switchGamepadController(popController.id)
}

// When closing the pop-up window, roll back the first bit of activated controllers
function handleClose() {
  recallController(1)
}
```

## getActiveControllers

Get active controllers, return controller list

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

Get controllers by key, return controller list

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

Whether gamepad is supported, returns `boolean`

## getGamepadList

Get gamepad list

```ts
import {
getGamepadList
} from 'web-gamepad'
initGamepad()
getGamepadList() // [gamepad,...]
```

## stopListening

Stop listening to gamepad input, all gamepad input events will not be triggered

## startListening

Start listening to gamepad input, all gamepad input events will be triggered again
