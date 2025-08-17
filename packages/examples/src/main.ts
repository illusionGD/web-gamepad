import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import { initGamepad } from 'web-gamepad'
initGamepad({
  /** 手柄链接时回调 */
  onConnected: (gamepad: Gamepad) => {
    console.log("🚀 ~ onConnected:", gamepad)
    
  },
  /** 手柄断开链接时回调 */
  onDisconnected: (gamepad: Gamepad) => {},
  onInput:(gamepad: Gamepad) => {
  console.log("🚀 ~ gamepad:", gamepad)

  },
  axes: {
    /** 手柄死区半径 */
    deadZoneRadius: 0.05
  }
})
const app = createApp(App).use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.mount('#app')
