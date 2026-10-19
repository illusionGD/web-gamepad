<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  createGamepadManager,
  STANDARD_KEY,
  INPUT_TYPE,
  MANAGER_EVENT,
  MAPPING_TYPE,
  DEFAULT_CONFIG,
  type DeviceInfo,
  type RawGamepadState,
  type ControlKey
} from 'web-gamepad'

/**
 * @en One manager owns this page's sampling, mappings and automatic device handover.
 * @zh 一个管理器负责本页面的采样、映射和手柄自动切换。
 * @en This profile is illustrative; use actual device names and raw indices.
 * @zh 此适配配置仅作演示，请使用真实设备名称和原始索引。
 */
const gamepads = createGamepadManager<'P1' | 'P2'>({
  /** @en Default button gesture settings. @zh 默认按钮按压配置。 */
  press: {
    /** @en Release earlier for click; reach this duration for longpress, in milliseconds. @zh 提前松开为短按，达到此时长为长按，单位毫秒。 */
    longPressMs: DEFAULT_CONFIG.press.longPressMs
  },
  /** @en Prioritized device profiles; the first match wins. @zh 按优先级排列的设备配置，首个匹配项生效。 */
  mappings: [
    {
      /** @en Profile identifier exposed in device metadata. @zh 设备信息中展示的配置标识。 */
      id: 'demo-extended-pad',
      /**
       * @en Apply this profile only to the designated example device.
       * @zh 仅将此配置应用于指定的示例设备。
       * @param pad - @en Browser-reported device used for matching. @zh 用于匹配的浏览器原始设备。
       */
      match: (pad) => pad.id.includes('Demo Extended Pad'),
      /** @en Inherit standard controls before adding rear buttons. @zh 继承标准输入，再补充背键。 */
      extends: 'standard',
      /** @en Extension keys mapped to raw button indices. @zh 扩展按键与原始按钮索引的映射。 */
      buttons: {
        /** @en Example index for the first rear button. @zh 第一个背键的示例索引。 */
        P1: 17,
        /** @en Example index for the second rear button. @zh 第二个背键的示例索引。 */
        P2: 18
      }
    }
  ]
})
/**
 * @en Base scene controller, activated explicitly below.
 * @zh 主页控制器，在下方显式激活。
 */
const main = gamepads.createController('main')
/**
 * @en Temporary dialog scene; pop restores its caller.
 * @zh 临时弹窗场景，pop 后恢复来源场景。
 */
const dialog = gamepads.createController('dialog')
/**
 * @en Drawer scene that may open a nested dialog.
 * @zh 可继续打开嵌套弹窗的抽屉场景。
 */
const drawer = gamepads.createController('drawer')
/**
 * @en All visible sessions, including unmapped devices.
 * @zh 所有可见会话，包含尚未映射的设备。
 */
const devices = ref<readonly DeviceInfo<ControlKey<'P1' | 'P2'>>[]>([])
/**
 * @en Current automatic source; null before meaningful input.
 * @zh 当前自动输入源，尚无有效操作时为 null。
 */
const activeDevice = ref<DeviceInfo<ControlKey<'P1' | 'P2'>> | null>(null)
/**
 * @en Recent event messages, newest first.
 * @zh 最近的事件消息，新消息在前。
 */
const logs = ref<string[]>([])
/**
 * @en Whether the dialog scene is visible.
 * @zh 弹窗场景是否可见。
 */
const dialogVisible = ref(false)
/**
 * @en Whether the drawer scene is visible.
 * @zh 抽屉场景是否可见。
 */
const drawerVisible = ref(false)
/**
 * @en Threshold for future presses in milliseconds.
 * @zh 后续按压使用的阈值，单位毫秒。
 */
const longPressMs = ref<number>(DEFAULT_CONFIG.press.longPressMs)
/**
 * @en Drawer option selected with LB or RB.
 * @zh 使用 LB 或 RB 选中的抽屉选项。
 */
const selectedOption = ref('1')
/**
 * @en Dialog content scrolled with the right stick.
 * @zh 由右摇杆滚动的弹窗内容元素。
 */
const scrollArea = ref<HTMLElement>()
/**
 * @en Read-only sample captured on request, not a live stream.
 * @zh 点击查看时保存的只读快照，并非实时数据流。
 */
const raw = ref<RawGamepadState>()
/**
 * @en Whether the manager started successfully.
 * @zh 管理器是否成功启动。
 */
const supported = ref(true)
/**
 * @en Readable list of independent button and axis capabilities.
 * @zh 将独立的按钮和摇杆能力转换为可读文字。
 */
const capabilities = computed(
  () =>
    activeDevice.value?.controls
      .map(
        (control) =>
          control.key +
          (control.button && control.axes
            ? '（移动 + 按压）'
            : control.axes
              ? '（移动）'
              : '')
      )
      .join(' · ') ?? '操作任意已识别手柄后显示能力'
)
/**
 * @en Prepend a message and retain at most twelve entries.
 * @zh 在顶部添加消息，最多保留十二条。
 * @param message - @en Message to display in the event panel. @zh 显示在事件面板中的消息。
 */
const log = (message: string) => {
  logs.value = [message, ...logs.value].slice(0, 12)
}
/**
 * @en Refresh visible sessions after connection changes.
 * @zh 连接状态变化后刷新可见会话列表。
 */
const refreshDevices = () => {
  devices.value = gamepads.getDevices()
}

/**
 * @en Route mouse, overlay and Escape closes through the same cleanup.
 * @zh 鼠标、遮罩和 Escape 关闭均走相同的场景清理逻辑。
 * @param value - @en Visibility requested by the dialog component. @zh 弹窗组件请求的可见状态。
 */
function onDialogVisibility(value: boolean) {
  if (!value) closeDialog()
}
/**
 * @en Keep drawer visibility and scene history synchronized.
 * @zh 保持抽屉可见状态与场景历史同步。
 * @param value - @en Visibility requested by the drawer component. @zh 抽屉组件请求的可见状态。
 */
function onDrawerVisibility(value: boolean) {
  if (!value) closeDrawer()
}

/**
 * @en Enter the dialog once and preserve the previous scene.
 * @zh 只进入弹窗一次，并保留上一场景。
 */
function openDialog() {
  if (dialogVisible.value) return
  dialogVisible.value = true
  gamepads.push(dialog)
}
/**
 * @en Close the dialog and restore its caller, including a nested drawer.
 * @zh 关闭弹窗并恢复来源场景，也支持返回抽屉。
 */
function closeDialog() {
  if (!dialogVisible.value) return
  dialogVisible.value = false
  gamepads.pop()
}
/**
 * @en Enter the drawer and preserve the main scene.
 * @zh 进入抽屉，并保留主页场景。
 */
function openDrawer() {
  if (drawerVisible.value) return
  drawerVisible.value = true
  gamepads.push(drawer)
}
/**
 * @en Close the drawer and restore the previous scene.
 * @zh 关闭抽屉并恢复上一场景。
 */
function closeDrawer() {
  if (!drawerVisible.value) return
  drawerVisible.value = false
  gamepads.pop()
}
/**
 * @en Update all scenes; an ongoing press retains its captured threshold.
 * @zh 更新全部场景；进行中的按压仍使用按下时的阈值。
 * @param value - @en Positive duration in milliseconds; undefined when cleared. @zh 正数毫秒时长，输入清空时为 undefined。
 */
function updateThreshold(value: number | undefined) {
  if (!value) return
  for (const controller of [main, dialog, drawer])
    controller.setLongPressMs(value)
}
/**
 * @en Inspect the active device or the first visible device, including unmapped devices.
 * @zh 查看当前设备或第一台可见设备，也可用于排查未映射手柄。
 */
function inspectRaw() {
  const device = activeDevice.value ?? devices.value[0]
  raw.value = device ? gamepads.getRawState(device.id) : undefined
}

// @en Each logical key owns separate event sets; click and longpress are mutually exclusive.
// @zh 每个逻辑按键拥有独立事件集合，click 与 longpress 互斥。
main.on(STANDARD_KEY.S, INPUT_TYPE.click, openDialog)
main.on(
  STANDARD_KEY.S,
  INPUT_TYPE.longpress /**
   * @en Open the drawer once S reaches the threshold.
   * @zh S 达到长按阈值后打开抽屉。
   * @param event - @en Button payload with elapsed durationMs and source device. @zh 包含已按压时长 durationMs 和来源设备的按钮事件。
   */,
  (event) => {
    log('S 长按 ' + Math.round(event.durationMs) + 'ms：打开抽屉')
    openDrawer()
  }
)
main.on(STANDARD_KEY.ST, INPUT_TYPE.click, openDrawer)
main.on(STANDARD_KEY.RS, INPUT_TYPE.click, () => log('RS 摇杆短按'))
main.on(STANDARD_KEY.RS, INPUT_TYPE.longpress, () => log('RS 摇杆长按'))
main.on('P1', INPUT_TYPE.click, () => log('扩展背键 P1 短按'))
main.on('P2', INPUT_TYPE.longpress, () => log('扩展背键 P2 长按'))
// @en LB + S uses Xbox LB + A / PS L1 + Cross; consume member clicks in this scene.
// @zh LB + S 对应 Xbox LB + A / PS L1 + ×，在此场景消耗成员单键点击。
main.onCombo(
  [STANDARD_KEY.LB, STANDARD_KEY.S],
  INPUT_TYPE.click,
  /**
   * @en Log a completed short chord without opening the single-S dialog.
   * @zh 记录组合短按，不触发单独 S 键打开弹窗。
   * @param event - @en Combo keys and source device. @zh 组合成员与来源设备。
   */
  (event) => log(event.keys.join(' + ') + ' 组合短按'),
  {
    /** @en Suppress member button gestures once the combo forms. @zh 组合成立后抑制成员按钮手势。 */
    suppressSingles: true
  }
)
main.onCombo(
  [STANDARD_KEY.LB, STANDARD_KEY.S],
  INPUT_TYPE.longpress,
  /**
   * @en Use the controller threshold starting at the final member down.
   * @zh 从最后一个成员按下开始，使用控制器阈值判断长按。
   * @param event - @en Combo hold duration in milliseconds. @zh 组合已按住时长，单位毫秒。
   */
  (event) => log('LB + S 组合长按 ' + Math.round(event.durationMs) + 'ms')
)
main.onCombo(
  [STANDARD_KEY.LB, STANDARD_KEY.S],
  INPUT_TYPE.cancel,
  /**
   * @en Report interrupted chord gestures.
   * @zh 记录被中断的组合手势。
   * @param event - @en Chord interruption reason. @zh 组合中断原因。
   */
  (event) => log('LB + S 组合取消：' + event.reason)
)

// @en Dialog handlers only receive input while the dialog scene is active.
// @zh 仅在弹窗场景激活时接收输入。
dialog.on(STANDARD_KEY.S, INPUT_TYPE.click, closeDialog)
dialog.on(STANDARD_KEY.E, INPUT_TYPE.click, closeDialog)
dialog.on(
  STANDARD_KEY.RS,
  INPUT_TYPE.axes /**
   * @en Scroll at 300 pixels per second at full deflection.
   * @zh 满幅推动时按每秒 300 像素滚动。
   * @param event - @en value is normalized [x, y]; dt is frame duration in seconds. @zh value 为归一化 [x, y]，dt 为帧间隔秒数。
   */,
  (event) => {
    const [, y] = event.value
    if (scrollArea.value) scrollArea.value.scrollTop += y * 300 * event.dt
  }
)
// @en Pushing a nested dialog preserves the drawer for pop().
// @zh 压入嵌套弹窗后保留抽屉，供 pop() 恢复。
drawer.on(STANDARD_KEY.S, INPUT_TYPE.click, openDialog)
drawer.on(STANDARD_KEY.E, INPUT_TYPE.click, closeDrawer)
drawer.on(STANDARD_KEY.LB, INPUT_TYPE.click, () => {
  selectedOption.value = '1'
})
drawer.on(STANDARD_KEY.RB, INPUT_TYPE.click, () => {
  selectedOption.value = '2'
})

for (const controller of [main, dialog, drawer]) {
  for (const key of [
    STANDARD_KEY.S,
    STANDARD_KEY.E,
    STANDARD_KEY.LS,
    STANDARD_KEY.RS
  ]) {
    controller.on(
      key,
      INPUT_TYPE.cancel /**
       * @en Record interrupted input without producing click.
       * @zh 记录输入中断，不会因此产生 click。
       * @param event - @en Cancellation reason and source device. @zh 取消原因 reason 与来源设备。
       */,
      (event) => log(controller.name + '/' + key + ' 取消：' + event.reason)
    )
  }
}
gamepads.on(
  MANAGER_EVENT.connected /**
   * @en Refresh the list after a session connects.
   * @zh 新会话连接后刷新列表。
   * @param event - @en device describes the newly connected session. @zh device 描述新连接的会话。
   */,
  (event) => {
    refreshDevices()
    log('连接：' + event.device.name)
  }
)
gamepads.on(
  MANAGER_EVENT.disconnected /**
   * @en Refresh the list after a session disconnects.
   * @zh 会话断开后刷新列表。
   * @param event - @en device describes the disconnected session. @zh device 描述已断开的会话。
   */,
  (event) => {
    refreshDevices()
    log('断开：' + event.device.name)
  }
)
gamepads.on(
  MANAGER_EVENT.devicechange /**
   * @en Display the source selected by meaningful input.
   * @zh 展示有效操作选中的输入源。
   * @param event - @en current is the new device, or null while waiting for input. @zh current 为新设备，等待有效操作时为 null。
   */,
  (event) => {
    activeDevice.value = event.current
    log('当前设备：' + (event.current?.name ?? '等待有效操作'))
  }
)
gamepads.on(
  MANAGER_EVENT.error /**
   * @en Display isolated errors without stopping other callbacks.
   * @zh 显示已隔离的错误，不影响其他回调。
   * @param event - @en error contains the original thrown value. @zh error 包含原始抛出的错误值。
   */,
  (event) => log('错误：' + String(event.error))
)
// @en New controllers are inactive; explicitly establish the base scene.
// @zh 新建控制器默认未激活，需要显式设置基础场景。
gamepads.activate(main)

// @en Start browser sampling only after mount.
// @zh 页面挂载后才开始浏览器采样。
onMounted(() => {
  supported.value = gamepads.start()
  refreshDevices()
})
// @en Release frame polling, browser listeners, subscriptions and scene history.
// @zh 释放帧轮询、浏览器监听、订阅和场景历史。
onUnmounted(() => gamepads.destroy())
</script>

<template>
  <main class="demo">
    <h1>web-gamepad v2</h1>
    <p>统一逻辑按键 · 自动切换手柄 · 场景事件集合</p>
    <el-alert
      v-if="!supported"
      type="warning"
      title="当前环境无法读取 Gamepad API"
      :closable="false"
    />
    <el-card>
      <template #header>设备与输入</template>
      <p>当前设备：{{ activeDevice?.name ?? '等待手柄有效操作' }}</p>
      <p>首次连接后先操作手柄让浏览器发现设备，再松开并按下开始使用。</p>
      <ul v-if="devices.length">
        <li v-for="device in devices" :key="device.id">
          {{ device.name }} · {{ device.id }} · {{ device.mapping }}
          <span v-if="device.mapping === MAPPING_TYPE.unmapped"
            >（需要配置映射）</span
          >
        </li>
      </ul>
      <p v-else>尚未发现手柄。也可以用下方按钮体验场景。</p>
      <p class="capabilities">{{ capabilities }}</p>
      <el-button @click="inspectRaw">查看原始输入快照</el-button>
      <pre v-if="raw">{{ JSON.stringify(raw, null, 2) }}</pre>
    </el-card>
    <el-card>
      <template #header>场景操作</template>
      <p>S（Xbox A / PS ×）短按打开弹窗，长按打开抽屉；ST 短按也可打开抽屉。</p>
      <p
        >LB + S（Xbox LB + A / PS L1 +
        ×）支持组合短按与长按，组合成立后抑制单键操作。</p
      >
      <p>RS 支持摇杆短按与长按。切换手柄会取消旧设备尚未结束的按压。</p>
      <label
        >长按阈值（ms）：
        <el-input-number
          v-model="longPressMs"
          :min="100"
          :max="3000"
          :step="100"
          @change="updateThreshold"
        />
      </label>
      <div class="actions">
        <el-button type="primary" @click="openDialog">打开弹窗</el-button>
        <el-button @click="openDrawer">打开抽屉</el-button>
      </div>
    </el-card>
    <el-card>
      <template #header>最近事件</template>
      <ul
        ><li v-for="(message, index) in logs" :key="index">{{
          message
        }}</li></ul
      >
    </el-card>

    <el-dialog
      :model-value="dialogVisible"
      title="弹窗场景"
      width="min(560px, 90vw)"
      @update:model-value="onDialogVisibility"
    >
      <p>S / E 短按关闭并恢复上一场景。推动 RS 滚动内容。</p>
      <div ref="scrollArea" class="scroll-area">
        <p v-for="index in 30" :key="index"
          >第 {{ index }} 行：摇杆事件携带 dt，滚动速度按时间计算。</p
        >
      </div>
      <template #footer
        ><el-button type="primary" @click="closeDialog"
          >关闭并返回</el-button
        ></template
      >
    </el-dialog>
    <el-drawer
      :model-value="drawerVisible"
      title="抽屉场景"
      size="min(440px, 90vw)"
      @update:model-value="onDrawerVisibility"
    >
      <p>LB / RB 切换选项，S 打开嵌套弹窗，E 返回主页。</p>
      <el-radio-group v-model="selectedOption">
        <el-radio value="1">LB：选项一</el-radio>
        <el-radio value="2">RB：选项二</el-radio>
      </el-radio-group>
      <div class="actions">
        <el-button type="primary" @click="openDialog">打开嵌套弹窗</el-button>
        <el-button @click="closeDrawer">返回主页</el-button>
      </div>
    </el-drawer>
  </main>
</template>
