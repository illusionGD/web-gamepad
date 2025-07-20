import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import { initGamepad } from 'web-gamepad'
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
const app = createApp(App).use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.mount('#app')
