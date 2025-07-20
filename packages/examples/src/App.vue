<template>
  <div>
    <el-button type="primary" @click="open">A</el-button>
    <el-button type="primary" @click="drawer = true"
      ><el-icon> <Expand /> </el-icon
    ></el-button>
    <el-dialog
      v-model="dialogVisible"
      title="Tips"
      width="500"
      :before-close="handleClose"
    >
      <div
        ref="textRef"
        class="a-t"
        style="height: 200; width: '100%'; overflow: auto"
      >
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
        testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest
      </div>
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
          <el-radio v-model="radio1" value="1" size="large"> LB </el-radio>
          <el-radio v-model="radio1" value="2" size="large"> RB </el-radio>
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
  XBOX_KEY_MAP,
  INPUT_TYPE,
  switchGamepadController,
  recallController
} from 'web-gamepad'
const dialogVisible = ref(false)
const drawer = ref(false)
const radio1 = ref('1')
const textRef = ref<HTMLElement | null>()
const controller = createGamepadController('btn1')
const controller2 = createGamepadController('btn2', false)
const popController = createGamepadController('pop', false)
const drawerController = createGamepadController('drawer', false)
addEvents()

function addEvents() {
  // 打开对话框
  controller.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, open)
  controller.addBtnEvents(XBOX_KEY_MAP.menu, INPUT_TYPE.down, () => {
    drawer.value = true
    // 切换drawerController
    controller.disable()
    drawerController.active()
    controller2.active()
    // switchGamepadController([
    //   drawerController.id,
    //   controller2.id,
    //   controller2.id
    // ])
  })

  controller2.addBtnEvents(XBOX_KEY_MAP.Y, INPUT_TYPE.down, open)

  // 对话框确认
  popController.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, () => {
    dialogVisible.value = false
    handleClose()
  })

  // 对话框取消
  popController.addBtnEvents(XBOX_KEY_MAP.B, INPUT_TYPE.down, () => {
    dialogVisible.value = false
    handleClose()
  })
  let oldY = 0
  let oldTop = 0
  let dist = 0
  // 滚动
  popController.addBtnEvents(XBOX_KEY_MAP.RS, INPUT_TYPE.axes, ([x, y]) => {
    const direct = y < 0 ? -1 : 1
    dist = Math.abs(Math.abs(y) - oldY) * direct
    oldTop += dist * 20
    if (textRef.value) {
      textRef.value.scrollTop = oldTop
    }
  })

  // drawer确认
  drawerController.addBtnEvents(XBOX_KEY_MAP.A, INPUT_TYPE.down, confirmClick)
  drawerController.addBtnEvents(XBOX_KEY_MAP.B, INPUT_TYPE.down, cancelClick)
  drawerController.addBtnEvents(XBOX_KEY_MAP.LB, INPUT_TYPE.down, () => {
    radio1.value = '1'
  })
  drawerController.addBtnEvents(XBOX_KEY_MAP.RB, INPUT_TYPE.down, () => {
    radio1.value = '2'
  })
}

function cancelClick() {
  drawer.value = false
  // 切回第一个controller
  recallController(1)
}

function confirmClick() {
  open()
}

function open() {
  dialogVisible.value = true
  switchGamepadController(popController.id)
}

function handleClose() {
  recallController(1)
}
console.log('🚀 ~ controller:', controller)
</script>
<style scoped>
.a-t {
  height: 200px;
  width: 100%;
}
</style>
