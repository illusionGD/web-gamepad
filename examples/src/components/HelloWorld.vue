<script setup lang="ts">
import { ref } from 'vue'
import {
  createGamepadController,
  initGamepad,
  switchGamepadController
} from 'web-gamepad'
import { GAMEPAD_BTN_KEY_MAP } from 'web-gamepad/src/constants'

defineProps<{ msg: string }>()

const count = ref(0)
initGamepad()
const controller = createGamepadController('ctrl')
const controller2 = createGamepadController('ctrl2')
controller.addBtnEvents(GAMEPAD_BTN_KEY_MAP.A, 'down', () => {
  console.log('🚀 ~ controller.addBtnEvents ~ controller:', controller)
  count.value++
})
controller2.addBtnEvents(GAMEPAD_BTN_KEY_MAP.A, 'down', () => {
  console.log('🚀 ~ controller2.addBtnEvents ~ controller2:', controller2)
  count.value--
})
controller2.disable()

// 测试切换controller
setTimeout(() => {
  switchGamepadController('ctrl2')
}, 3000)
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
