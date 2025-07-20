<script setup lang="ts">
import { ref } from 'vue'
import {
  createGamepadController,
  initGamepad,
  INPUT_TYPE,
  startListening,
  stopListening,
  switchGamepadController,
  XBOX_KEY_MAP,
  type GamepadControllerType
} from 'web-gamepad'
export const GAMEPAD_BTN_UI_MAP = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LT',
  5: 'RT',
  6: 'LB',
  7: 'RB',
  8: 'select/back',
  9: 'select/forward',
  10: 'LS',
  11: 'RS',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
  16: 'other'
} as const
defineProps<{ msg: string }>()

const count = ref(0)
initGamepad()
const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl2')
// controller2.disable()
initAllBtns(controller)
initAllBtns(controller2)
function initAllBtns(controller: GamepadControllerType) {
  Object.values(XBOX_KEY_MAP).forEach((key) => {
    if (key === XBOX_KEY_MAP.LS || key === XBOX_KEY_MAP.RS) {
      controller.addBtnEvents(key, INPUT_TYPE.axes, ([x, y]) => {
        console.log(controller.key + ' x, y:', x, y)
      })
    }
    controller.addBtnEvents(key, 'down', () => {
      console.log(controller.key + 'BtnEvents:', GAMEPAD_BTN_UI_MAP[key])
    })
  })
}
// 测试切换controller
setTimeout(() => {
  switchGamepadController(controller2.id)
}, 3000)
setTimeout(() => {
  stopListening()
  setTimeout(() => {
    startListening()
  }, 2000)
}, 5000)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
