<template>
  <div>
    <el-button type="primary" @click="open">A</el-button>
    <el-button type="primary" @click="open"
      ><el-icon> <Expand /> </el-icon
    ></el-button>
    <el-dialog
      v-model="dialogVisible"
      title="Tips"
      width="500"
      :before-close="handleClose"
    >
      <span>This is a message</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">B</el-button>
          <el-button type="primary" @click="dialogVisible = false">
            A
          </el-button>
        </div>
      </template>
    </el-dialog>
    <el-drawer v-model="drawer" :direction="'rtl'">
      <template #header>
        <h4>set title by slot</h4>
      </template>
      <template #default>
        <div>
          <el-radio v-model="radio1" value="1" size="large"> LT </el-radio>
          <el-radio v-model="radio1" value="2" size="large"> RT </el-radio>
        </div>
      </template>
      <template #footer>
        <div style="flex: auto">
          <el-button @click="cancelClick">B</el-button>
          <el-button type="primary" @click="confirmClick">A</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import {
  createGamepadController,
  GAMEPAD_BTN_KEY_MAP,
  INPUT_TYPE,
  switchGamepadController
} from 'web-gamepad'
const dialogVisible = ref(false)
const drawer = ref(false)
const radio1 = ref('1')

const controller = createGamepadController('btn1')
const popController = createGamepadController('pop', false)
const drawerController = createGamepadController('drawer', false)
addEvents()

function addEvents() {
  // 打开对话框
  controller.addBtnEvents(GAMEPAD_BTN_KEY_MAP.A, INPUT_TYPE.down, open)
  controller.addBtnEvents(
    GAMEPAD_BTN_KEY_MAP['select/forward'],
    INPUT_TYPE.down,
    () => {
      drawer.value = true
      // 先切换drawerController
      switchGamepadController(drawerController.id)
    }
  )

  // 对话框确认
  popController.addBtnEvents(GAMEPAD_BTN_KEY_MAP.A, INPUT_TYPE.down, () => {
    dialogVisible.value = false
    handleClose()
  })

  // 对话框取消
  popController.addBtnEvents(GAMEPAD_BTN_KEY_MAP.B, INPUT_TYPE.down, () => {
    dialogVisible.value = false
    handleClose()
  })

  // drawer确认
  drawerController.addBtnEvents(
    GAMEPAD_BTN_KEY_MAP.A,
    INPUT_TYPE.down,
    confirmClick
  )
  drawerController.addBtnEvents(
    GAMEPAD_BTN_KEY_MAP.B,
    INPUT_TYPE.down,
    cancelClick
  )
  drawerController.addBtnEvents(GAMEPAD_BTN_KEY_MAP.LT, INPUT_TYPE.down, () => {
    radio1.value = '1'
  })
  drawerController.addBtnEvents(GAMEPAD_BTN_KEY_MAP.RT, INPUT_TYPE.down, () => {
    radio1.value = '2'
  })
}

function cancelClick() {
  drawer.value = false
  // 切回第一个controller
  switchGamepadController(controller.id)
}

function confirmClick() {
  open()
}

function open() {
  dialogVisible.value = true
  switchGamepadController(popController.id)
}

function handleClose() {
  switchGamepadController(drawer.value ? drawerController.id : controller.id)
}
console.log('🚀 ~ controller:', controller)
</script>
<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
