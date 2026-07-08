# CHANGELOG · 管道表达式批量评估器

---

## [v1.0.0-engineering] — 2026-07-08

工程级重构：从单文件 Demo 拆分为 Web Component + ES Modules 工程结构，修复全部已知 Bug，落实 WCAG 2.1 AA 可访问性改进。

### 新增

- **Web Component** `<pipe-batch-evaluator>`（Custom Element + Shadow DOM）
  - Shadow DOM 隔离样式，CSS 自定义属性继承宿主 PTO token
  - 内置暗色 fallback token，脱离设计系统宿主也可独立渲染
- **工程级目录结构**
  - `src/components/PipeBatchEvaluator/index.js` — 主 Web Component
  - `src/utils/pipeEvalLogic.js` — 管道解析 + 求值引擎（纯函数，独立于 UI）
  - `src/utils/formatters.js` — 值展示工具（`fmtVal` / `normOut` / `relTime` / `esc`）
  - `src/utils/validators.js` — 表达式校验（函数白名单检查）
  - `src/constants/enums.js` — 枚举常量统一维护
  - `src/test/pipeEvalLogic.test.js` — 单元测试（`node:test`，零依赖）
- **JSDoc 类型注释** 覆盖所有公共函数和数据结构
- **单元测试**，覆盖：算术/整除/位运算/Lua三元/管道求值/用例解析/参数分割
- **postMessage 协议文档**（`INTEGRATION.md`）：`setTemplateVars`、`setExpression`、`setBadgeTypes`

### Bug 修复

| # | 描述 | Demo 原因 | 工程修复 |
|---|------|-----------|---------|
| **R1** | 历史记录上限 8 条，规格要求 20 | `h.slice(0, 8)` 硬编码 | `HISTORY_MAX = 20`（`enums.js`）|
| **R3** | `string.gsub` 量词 `%d+`/`%a+` 失效 | `magic` 集合包含 `+`，导致 `+` 被转义为字面量 | `structMagic = '^$()%.[]'`（移除 `+*?-`），量词保持原义 |
| **R8** | `renderHistory` onclick 字符串拼接 XSS | `onclick="restoreHistoryAt('${expr}')"` | `<button data-index>` + 事件监听，不使用字符串插值 |
| **G3** | `$N`（N≥10）参数替换歧义 | 正则按 `$1…$9` 顺序替换，`$10` 被识别为 `$1` 后跟 `0` | `_replParams` 按索引倒序替换（`$10` 先于 `$1` 被处理）|

### 可访问性改进（对照 accessibility-audit.md）

| 编号 | 描述 | 修复方式 |
|------|------|---------|
| **A3** | 历史记录项 `div[onclick]` 不可键盘访问 | 改为 `<button class="history-item">`，支持 Tab 和 Enter |
| **A4** | 参数类型 `badge-select` 无标签 | 添加 `aria-label="参数 $N 的类型标记"` |
| **A5** | 表达式 textarea 无标签 | 添加 `aria-label="管道表达式输入"` + `aria-describedby="expr-msg"` |
| **A6** | 校验结果区域屏幕阅读器无感知 | `<div role="status" aria-live="polite">` 覆盖 `#expr-msg` 和 `#tc-msg` |
| **A7** | Toast 屏幕阅读器无感知 | `<div role="status" aria-live="polite" aria-atomic="true">` |
| **A8** | 模式切换无 ARIA tab 模式 | `role="tablist"` / `role="tab"` / `role="tabpanel"` + `aria-selected`/`aria-labelledby` |
| **A9** | 历史、清空等图标按钮无标签 | 所有图标按钮添加 `aria-label`，SVG 加 `aria-hidden="true"` |
| **A11** | 焦点样式不清晰 | `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }` |
| **A12** | 虚拟表格缺少 ARIA 表格语义 | `role="table"` / `role="row"` / `role="cell"` / `aria-rowcount` / `aria-rowindex` |
| **A2** | `foreground-muted` 对比度不足（~2.9:1） | 说明文字使用 `foreground`（~8:1），次级信息控制在 12px+ |

### 设计文档产物

- `design-review.md` — 设计审查报告（10 个问题，3 个 Critical / 4 个 Major / 3 个 Minor）
- `accessibility-audit.md` — WCAG 2.1 AA 审查报告（13 个问题，11 个已符合项）
- `design-structure.md` — 精确视觉规格（hex/px）+ 9 节结构文档
- `tech-selection.md` — 技术选型（Web Components + ES Modules）
- `REPORT-UX规格报告.html` — UX 规格可视化报告（16:9 幻灯片）
- `INTEGRATION.md` — 工程接入指南

---

## [v0.9.0-demo] — 2026-06-12

阶段一精调版 Demo（Phase 1 输出）。

### 新增（相对于原始 Demo）

- PTO Design System 三层 token 系统（foundation → semantic → component）全内联
- 三主题支持：Dark / Light / Glass，顶栏分段切换控件
- 44px topbar，品牌 SVG logo
- 55/45 双栏布局，1024px 响应式断点
- 参数徽章类型选择器（SYNC / REF / CONST / LITERAL / TEMPLATE）
- 操作符面板（可折叠，localStorage 持久化开合状态）
- 内置示例卡片（3 条，可点击加载）
- 管道数据流展示（阶段卡片 + 类型 chip + 箭头）
- 通过率徽章 + 4 个结果筛选芯片
- VS Code Webview postMessage 通信骨架
- 历史记录（最多 8 条，已知 Bug，工程版修复为 20）

### 已知 Bug（工程版已修复）

- R1: 历史最多 8 条（应为 20）
- R3: `string.gsub` 量词 `%d+` 失效
- R8: 历史恢复 onclick 字符串拼接 XSS

---

## [v0.1.0-original] — 2026-06-12（原始 Demo）

VS Code Webview 风格原型，单文件，功能基本可用，无 PTO Design System，无批量测试，存在上述 Bug。

---

## 待后续迭代

- [ ] 历史记录恢复时同步还原参数值（当前仅还原表达式文本）
- [ ] 后端持久化历史记录（替换 localStorage）
- [ ] `string.len`、`math.abs`、`math.max`、`math.min` 函数支持
- [ ] 结果导出（CSV / JSON）
- [ ] 键盘焦点管理：历史面板关闭后焦点回到触发按钮
