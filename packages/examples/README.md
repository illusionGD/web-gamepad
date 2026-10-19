# web-gamepad Vue 示例 / Vue example

本目录演示仓库中的 v2 API。完整配置与迁移说明见 [中文 README](../../README.md) / [English README](../../README.en.md)。

This application demonstrates the workspace v2 API. See the root READMEs for configuration and migration details.

## 启动 / Run

在仓库根目录执行 / From the repository root:

```sh
pnpm install
pnpm dev
```

`App.vue` 在挂载时启动管理器，卸载时销毁。TypeScript `paths` 与 Vite alias 都指向本地核心源码，无需先构建核心包即可开发、查看类型与 JSDoc 悬停说明。

`App.vue` starts the manager on mount and destroys it on unmount. TypeScript paths and the Vite alias resolve the local core source, so development and type/JSDoc hints do not require a core build first.

## 操作 / Controls

| 场景 / Scene | 操作 / Action |
| --- | --- |
| 主页 / Main | S 短按打开弹窗 / S click opens the dialog |
| 主页 / Main | S 长按或 ST 短按打开抽屉 / S longpress or ST click opens the drawer |
| 主页 / Main | RS 短按、长按记录事件 / RS click and longpress log events |
| 弹窗 / Dialog | RS 滚动内容，S 或 E 短按返回 / RS scrolls; S or E click returns |
| 抽屉 / Drawer | LB / RB 选择选项，S 打开嵌套弹窗，E 返回 / LB/RB select; S opens a nested dialog; E returns |

LB + S（Xbox LB + A / PS L1 + ×）短按和长按会记录组合事件，组合成立后抑制成员单键按钮事件，不会打开 S 对应的弹窗或抽屉。先前已触发的单键行为不能撤回。

LB + S logs combo click/longpress events and suppresses member button gestures after recognition, preventing S from opening the dialog or drawer. Previously delivered single-button actions cannot be undone.

长按阈值输入框更新所有场景后续按压的阈值。设备区显示自动输入源和可用能力，原始快照按钮可用于排查未知布局。

The threshold input updates future presses in all scenes. The device panel displays the automatic source and capabilities; the raw snapshot button helps inspect unknown layouts.

扩展配置只匹配名称包含 `Demo Extended Pad` 的演示设备，将原始按钮 17 / 18 映射到 P1 / P2。这不是特定品牌的通用映射，请按实际采样结果修改。P1 短按与 P2 长按会记录事件。

The extension profile matches an illustrative device name containing `Demo Extended Pad` and maps raw buttons 17/18 to P1/P2. Replace these values with actual device data. P1 click and P2 longpress log events.

## 真机检查 / Hardware checks

以下是建议手动验证的步骤，不代表已经完成真机测试。

These are suggested manual checks, not a claim that physical-device testing has been completed.

1. 连接 Xbox 和 PS5，分别操作让浏览器发现设备，再松开重按。/ Connect Xbox and PS5, interact to expose each device, then release and press again.
2. 交替操作，检查设备切换和新设备首次按下事件；持续按住旧设备不应反复抢占。/ Alternate input and verify handover preserves the triggering press; holding the old device should not repeatedly take over.
3. 分别短按和长按 S，检查互斥行为；按住期间修改阈值，当前按压应沿用原阈值。/ Check S click/longpress exclusivity; changing the threshold while held should affect only future presses.
4. 打开抽屉及嵌套弹窗，通过手柄和鼠标关闭，检查场景恢复。/ Open the drawer and nested dialog, close through gamepad and mouse, and verify scene restoration.
5. 推动及按压 RS，检查两种能力；切换设备、断开或切走窗口时检查取消日志。/ Move and press RS, then verify cancellation during handover, disconnect and window blur.
6. 使用真实特殊手柄数据配置扩展按键或非标准映射，检查原始快照与逻辑事件是否一致。/ Configure actual extra/nonstandard controls and compare raw samples with logical events.

## 构建 / Build

```sh
pnpm --filter ./packages/examples build
```
