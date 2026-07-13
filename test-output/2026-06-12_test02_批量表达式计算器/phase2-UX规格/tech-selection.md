# 管道表达式批量评估器 · 技术选型
> 生成时间：2026-07-08 | 阶段二 Step 4

---

## Demo 选型（当前实现）

| 维度 | 选择 | 理由 |
|------|------|------|
| 渲染方式 | 单文件 HTML，纯内联 CSS/JS | VS Code Webview 约束：单文件、零外链 |
| 框架 | 无框架（原生 JS） | 零安装、双击预览、无构建工具依赖 |
| CSS 方案 | PTO Design System 三层 token 内联 | foundation → semantic → component，三主题支持 |
| 状态管理 | 模块级变量（`let parsedExpr`, `inputValues`, ...）| 无需响应式框架，逻辑直接 |
| 持久化 | `localStorage`（4个 key）| VS Code Webview 支持；多窗口共享问题见 G5 |
| 虚拟滚动 | 手写（36px ROW_H, BUF=10，绝对定位）| 零依赖，逻辑约 40 行 |
| 事件通信 | `window.addEventListener('message')` | VS Code Webview postMessage 标准通道 |

---

## 工程选型（目标工程化版本）

本工具为 **纯本地计算 + Webview 宿主桥** 形态，无 HTTP 后端。

| 维度 | 选择 | 理由 |
|------|------|------|
| 框架 | **无框架，原生 Web Components**（Custom Element + Shadow DOM）| 保持轻量约束；Shadow DOM 提供样式隔离；VS Code 扩展官方示例也用此方式 |
| 模块化 | ES Modules（`.js` 文件，`<script type="module">`）| Webview 本地文件可用 ES Module（通过 `vscode.Uri.joinPath` 正确处理路径）|
| 类型系统 | JSDoc `@typedef` + JSDoc 注释 | 零配置，VS Code IntelliSense 自动支持，不需要 TypeScript 构建步骤 |
| CSS 方案 | Shadow DOM 内联 + PTO token 通过 CSS 变量透传（`:host` 继承）| 全局 token 通过 CSS 变量继承自动透传进 Shadow DOM |
| 测试 | `node:test`（Node.js 内置，无额外依赖）| 对核心纯函数（pipeEngine.js）跑单元测试，零依赖 |
| 打包 | **无打包工具**（development 直接 ES Module；production 可选简单 inline 脚本）| 保持轻量约束；开发阶段 Webview 直接引用源文件 |
| 单文件交付 | 可选：`build.js` 简单脚本 inline 所有 `<script>` 和 `<style>` | 生成可双击的 standalone `dist/index.html` |

---

## Demo → 工程迁移路径

| Demo 做法 | 工程做法 |
|---------|---------|
| 所有逻辑内联在 `<script>` 标签 | 拆分为 `src/utils/pipeEngine.js`（评估核心）+ `src/constants/enums.js`（常量）+ `src/utils/formatters.js` |
| HTML 直接操作 DOM（`document.getElementById`）| Web Component 内用 Shadow DOM `this.shadowRoot.querySelector` |
| 全局 `let` 变量管理状态 | 组件实例变量（`this._parsedExpr`, `this._inputValues`, ...），有明确作用域 |
| `history-item` 为 `div[onclick]`（A3 可访问性 bug）| 工程版改为 `<button>` 元素 |
| `restoreHistory` 字符串拼接 onclick（R8 XSS 风险）| 工程版改为 data-index + 事件委托，不拼接字符串 |
| 历史最多 8 条（R1 bug）| 工程版改为 20 条（`HISTORY_MAX = 20`）|
| `_luaPatToRegex` magic 集含 `+`（R3 bug）| 工程版修复：magic 集改为 `'^$()%.[]*?'` |
| `aria-live` 缺失（A6/A7）| 工程版在 `#expr-msg` 和 `#toast` 加 `aria-live` |
| 字号 11px（A1）| 工程版 label 字号升至 12px |
| `foreground-muted` 对比度不足（A2）| 工程版 token 提升到 `rgba(255,255,255,0.52)` |

---

## 被排除的方案

| 方案 | 排除原因 |
|------|---------|
| React / Vue | 需要构建工具，违反「单文件零外链」约束；VS Code Webview 初始化时间长 |
| Alpine.js / Petite-Vue（CDN）| 需要外链 CDN，违反约束；且功能远超需求 |
| TypeScript（tsc 编译）| 需要 Node.js 构建步骤；JSDoc 已能满足类型提示需求 |
| Web Worker（批量执行）| 正确方向（G6 性能优化），当前用例规模（<200 条）主线程够用；保留作后续 P2 优化项 |
| ReactFlow / Cytoscape（图可视化）| 管道是线性流，不是拓扑图，无需图布局引擎 |
