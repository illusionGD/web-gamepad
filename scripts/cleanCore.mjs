import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// @en Delete only generated output directly inside the core package.
// @zh 仅删除核心包目录下的构建产物。
const core = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/core'
)
const target = resolve(core, 'dist')
if (dirname(target) !== core) throw new Error('Invalid build output directory')
await rm(target, { recursive: true, force: true })
