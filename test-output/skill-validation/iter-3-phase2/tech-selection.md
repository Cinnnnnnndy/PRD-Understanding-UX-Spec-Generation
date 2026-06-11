# SMC 偏移量计算器 · 技术选型
> 日期：2026-06-11 | 阶段二 Step 4

---

## Demo 选型（iter-3 实现）

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | 无框架，原生 HTML/CSS/JS | VS Code Webview 约束：轻量，零安装，双击即开 |
| 设计系统 | PTO（内联 CSS） | 语义 token + 组件 class，单文件内联解决 404 问题 |
| 状态管理 | 单一 JS 对象 `state` + `refresh()` | 计算器工具，状态极简，无需 store |
| 编解码 | 内联纯函数 `compose` / `decompose` | 32-bit 位运算，零依赖 |
| 持久化 | `localStorage` | 浏览器原生，无需依赖 |
| 构建工具 | 无 | 单文件，`file://` 可直接打开 |

---

## 工程选型（Web Component 模块化版）

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | 原生 Web Component（Custom Element + Shadow DOM） | 对齐 BMC/Webview 轻量约束；天然 scoped 样式；可在任何宿主页嵌入 |
| 类型系统 | 纯 JavaScript + JSDoc `@typedef` | 无构建工具；`node --check` 语法验证；BMC 工具链无 TypeScript 支持 |
| CSS 方案 | Shadow DOM 内联 PTO token CSS | 完全 scoped；无 CSS Modules；外部 token 可通过 CSS 自定义属性透传 |
| 状态管理 | 模块内部 `state` 对象 + 自定义事件 | 组件外通信用 `CustomEvent`（`smc-apply`）而非全局状态 |
| 测试框架 | `node:test`（Node 18+ 内置） | 零安装；纯函数逻辑可独立测试 |
| 宿主通信 | `CustomEvent` / `postMessage` | VS Code Webview 桥；不走 HTTP |
| 持久化 | `localStorage`（同 Demo） | 浏览器原生 |
| 构建工具 | 无 | ES Modules，需 HTTP 服务打开（`python3 -m http.server`，不能 file://） |

---

## Demo → 工程迁移路径

| Demo 实现 | 工程实现 |
|-----------|---------|
| 内联 CSS（3000+ 行） | Shadow DOM 内 `<style>`：仅 PTO token + smc-local 部分（约 300 行），其余 PTO chrome 样式由宿主页负责 |
| `const FIELDS = {...}` 顶层变量 | `src/constants/enums.js` 导出 |
| `compose()`、`decompose()` 内联 | `src/utils/smcCodec.js` ES Module 导出 |
| `formatted(f)` 内联 | `src/utils/formatters.js` ES Module 导出 |
| `buildGrid()` / `buildFields()` 内联 | `SmcCalculator` Web Component 内部方法 |
| `state` 全局对象 | 组件私有 `#state` 字段（或模块私有变量） |
| 直接 DOM API | Web Component 内 `this.shadowRoot.querySelector` |
| `window.localStorage` | 组件内 `localStorage`（同浏览器原生） |

---

## 被排除的方案

| 方案 | 排除原因 |
|------|---------|
| React / Vue | BMC 工具链无 Node 构建环境；Webview 不需要 Virtual DOM |
| TypeScript | 无构建工具；JSDoc @typedef 达到同等类型提示效果 |
| Bundler（Vite/Webpack） | BMC 嵌入式场景无构建步骤；需要保持直接可运行 |
| CSS Modules | Shadow DOM 天然 scoped，多余抽象 |
| Zustand / Pinia | 状态极简（5个字段 + 历史数组），全局 store 是过度设计 |
| Canvas（位图可视化） | DOM grid 方案键盘可访问性更好，且性能足够 |
