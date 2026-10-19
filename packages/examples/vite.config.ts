import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  /** @en Compile Vue single-file components. @zh 编译 Vue 单文件组件。 */
  plugins: [vue()],
  /** @en Keep runtime resolution aligned with tsconfig.app.json. @zh 运行时解析与 tsconfig.app.json 保持一致。 */
  resolve: {
    /** @en Read the current workspace implementation during development. @zh 开发时读取当前工作区实现。 */
    alias: {
      /** @en Local source entry shared by Vite and editor type hints. @zh Vite 与编辑器类型提示共用的本地源码入口。 */
      'web-gamepad': fileURLToPath(
        new URL('../core/src/index.ts', import.meta.url)
      )
    }
  }
})
