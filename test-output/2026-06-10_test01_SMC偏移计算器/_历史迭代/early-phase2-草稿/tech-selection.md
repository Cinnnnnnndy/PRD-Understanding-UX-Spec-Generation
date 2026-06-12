# SMC 偏移量计算器 · 技术选型

## Demo 选型（单文件 / 零安装 / CDN）
原始 Demo：单文件 HTML + 内联 CSS/JS，VS Code `--vscode-*` 变量 + standalone polyfill。双击即开，零依赖。**保留此形态用于评审。**

## 工程选型（对齐目标栈）
**结论：原生 HTML + CSS + JS（ES Modules + Web Components），无框架、无构建工具。**

理由：
- 运行宿主是 BMC/VS Code Webview，数据结构梳理显示原 Demo 即纯 HTML/CSS/JS、零依赖——按「BMC/嵌入式管理界面 → 原生 HTML+CSS+JS（保持轻量）」选型表，工程版应延续同样约束，不引入 Vue/React 或打包器。
- 用 **Web Component（`<smc-calculator>` + Shadow DOM）** 实现组件化与样式隔离，既工程化又无需框架/构建。
- 纯逻辑（编解码/校验）抽成 ES Module 纯函数，可被组件、宿主、单测（`node --test`）复用。

| 维度 | 选择 |
|------|------|
| 组件化 | 原生 Custom Element + Shadow DOM |
| 样式 | Shadow DOM 内联 scoped 样式（CSS 变量沿用 `--vscode-*` 可由宿主覆盖） |
| 状态管理 | 组件内实例字段，无需 Redux/Pinia |
| 类型 | JSDoc `@typedef`（纯 JS，无 TS 构建链） |
| 测试 | `node:test`（Node 内置，零依赖） |
| 数据请求 | 无（纯本地计算）；应用结果经 `CustomEvent` → 宿主 postMessage |

## Demo → 工程迁移路径
| Demo 怎么做 | 工程怎么做 |
|------------|-----------|
| 全局 `fieldConfig` 常量 | `constants/enums.js`（字段定义 + 功能码/MS/RW 标签 + 配色） |
| 内联 `encodeOffset/decodeOffset/...` | `utils/smcCodec.js` 纯函数 + `utils/formatters.js` 语义格式化 |
| 直接操作 `document.getElementById` | Web Component 内 `shadowRoot` 局部查询，不污染全局 |
| `❓` title tooltip 语义 | 功能码 select + MS/RW 分段控件（语义常驻） |
| 红色文字表错误 | 颜色 + `⚠` 图标 + `aria-live` 三通道 |
| 「应用」写回十进制框 | `dispatchEvent('smc-apply')` 抛宿主 |
| 无测试 | `test/smcCodec.test.js`（9 用例，`npm test` 通过） |

## 被排除的方案
| 方案 | 排除原因 |
|------|---------|
| Vue 3 + Element Plus | 违反 BMC 轻量约束；为一个计算器引入框架+构建过重 |
| React + Vite | 同上；Webview 内无构建收益 |
| 保持单文件无组件化 | 无法沉淀可复用资产、无样式隔离、逻辑与 UI 耦合难测试 |
