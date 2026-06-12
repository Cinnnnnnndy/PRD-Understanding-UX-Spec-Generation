# 管道表达式批量评估器 · 技术选型
> 日期：2026-06-12 | 阶段二 Step 4

---

## Demo 选型（已用 / 单文件 / 零安装）

| 维度 | 选择 | 理由 |
|------|------|------|
| 框架 | 无框架（Vanilla JS） | 单文件 HTML 双击即开，无构建工具 |
| CSS | 内联 PTO Design System CSS（3 层 token） | 零外链，自包含，文件移动不 404 |
| 状态管理 | 全局 let 变量（parsedExpr / inputValues / testCases…） | Demo 阶段简单够用 |
| 本地存储 | localStorage | 历史记录/折叠态持久化 |
| 虚拟滚动 | 手写（JS 计算窗口行 + absolute position） | 零依赖，处理 1000+ 行无卡顿 |
| 通信协议 | postMessage（宿主 ↔ 工具） | 适配 BMC Studio Webview 嵌入场景 |

---

## 工程选型

目标场景：BMC Studio / openUBMC 工具类前端，轻量约束（无 NPM 构建工具）。

| 维度 | 选择 | 理由 |
|------|------|------|
| 组件方案 | **原生 Web Component**（Custom Element + Shadow DOM） | 天然隔离、无构建依赖、可嵌入任意宿主 |
| 样式方案 | Shadow DOM scoped CSS + PTO Design System CSS 变量 | token 穿透 Shadow DOM，主题切换零额外代码 |
| 状态管理 | 组件实例内部属性（无全局 store） | 工具无跨组件共享状态，不需要 store |
| 类型注解 | JSDoc `@typedef`（替代 TypeScript） | 零编译，IDE 类型提示，Node.js 原生支持 |
| 测试 | `node:test`（Node.js 18+ 内置） | 零依赖，纯函数单测，CI 友好 |
| 构建工具 | 无（ES Modules 原生 `import`） | 浏览器原生支持，无 Webpack/Vite 依赖 |
| 代码质量 | JSDoc + ESLint（可选） | 轻量，不强制 TypeScript strict |

> **openUBMC 约束**：目标宿主为嵌入式管理界面 Webview，保持轻量、无构建工具、原生 JS 优先。

---

## Demo → 工程迁移路径

| Demo 实现 | 工程迁移方式 |
|-----------|------------|
| 全局 `let` 变量（parsedExpr 等） | 移入 `PipeBatchEvaluator` 类实例属性（`this._parsedExpr`） |
| `document.getElementById(...)` | 改为 `this._shadow.getElementById(...)` |
| `onclick="fn()"` 行内 handler | 改为 `this.getRootNode().host._fn()` 引用组件实例 |
| CSS 全部内联 `<style>` | 移到组件 shadow root `<link>` 或内联模板样式块 |
| `window.addEventListener('message', ...)` | `connectedCallback` / `disconnectedCallback` 中绑定/解绑 |
| `localStorage` 操作 | 不变（localStorage 在 Shadow DOM 内与外共享） |
| Mock 数据（BUILTIN_EXAMPLES） | 保留为 `src/constants/enums.js`，不改变 |
| `parsePipeExpr` / `PipeEvaluator` 等核心函数 | 提取到 `src/utils/pipeEvalLogic.js`（已完成） |

---

## 被排除的方案

| 方案 | 排除原因 |
|------|---------|
| React / Vue | 目标场景无构建工具约束，引入框架需配 Webpack/Vite，违背轻量原则 |
| iframe 嵌入 | postMessage 已够用；iframe 跨域限制多 |
| TypeScript strict | 无 Node.js 原生编译支持；JSDoc 注解满足 IDE 提示需求 |
| Redux / Pinia | 组件无全局共享状态，store 是过度设计 |
| CSS Modules / Tailwind | Shadow DOM 天然隔离，无需额外 CSS 作用域方案 |
