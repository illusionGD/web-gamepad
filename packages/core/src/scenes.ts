/**
 * @en Stack controller IDs; subscriptions remain on controller instances.
 * @zh 场景栈只保存控制器 ID，订阅仍保存在控制器实例中。
 */

export function createSceneStack() {
  let frames: string[][] = [[]]
  return {
    /**
     * @en Read a detached copy of the active controller IDs.
     * @zh 读取当前激活控制器 ID 的独立副本。
     */
    current: () => frames[frames.length - 1].slice(),

    /**
     * @en Replace the current scene layer.
     * @zh 替换当前场景层。
     * @param ids - @en Controller IDs to activate, deduplicated internally. @zh 需要激活的控制器 ID，内部自动去重。
     */
    activate(ids: readonly string[]) {
      frames[frames.length - 1] = [...new Set(ids)]
    },

    /**
     * @en Push a temporary scene while preserving the current one.
     * @zh 压入临时场景并保留当前场景。
     * @param ids - @en Controller IDs belonging to the new layer. @zh 属于新场景层的控制器 ID。
     */
    push(ids: readonly string[]) {
      frames.push([...new Set(ids)])
    },

    /**
     * @en Restore the previous layer; the base layer is never removed.
     * @zh 恢复上一层，基础层始终保留。
     */
    pop() {
      if (frames.length > 1) frames.pop()
    },

    /**
     * @en Remove a destroyed controller from all layers and prune empty history.
     * @zh 从所有场景层移除已销毁控制器，并清理空历史层。
     * @param id - @en Destroyed controller ID. @zh 已销毁的控制器 ID。
     */
    remove(id: string) {
      frames = frames
        .map((frame) => frame.filter((value) => value !== id))
        .filter((frame, index) => index === 0 || frame.length > 0)
    },

    /**
     * @en Reset to an empty base layer.
     * @zh 重置为空的基础层。
     */
    clear() {
      frames = [[]]
    }
  }
}
