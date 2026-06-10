# CHANGELOG · SMC 偏移量计算器

## [v1.0.0-engineering] - 2026-06-10
工程化阶段（阶段二）：把单文件 Demo 升级为可接入的原生 Web Component。

### 新增
- 工程级组件拆分：`<smc-calculator>` Web Component（Shadow DOM 样式隔离）。
- 逻辑分层：`utils/smcCodec.js`（编解码/校验纯函数）、`utils/formatters.js`（语义格式化）、`constants/enums.js`（字段/枚举/配色统一维护）。
- 单元测试桩 `test/smcCodec.test.js`：9 用例覆盖编解码往返、边界、溢出、语义分类，`node --test` 全通过。
- 应用结果通过 `CustomEvent('smc-apply')` 抛宿主（Webview postMessage 桥前端侧）。
- JSDoc 类型标注（`SmcFields` / `SmcApplyDetail`）。

### 修改（Demo → 工程的设计调整）
- 功能码：title tooltip → **带语义标签的下拉选择器** + 区段注记。
- MS/RW：text 填 0/1 → **带标签分段控件**（多读/单读、写/读）。
- 结果区：新增**按真实位区间(6:16:1:1:8)着色的位布局条**，与字段焦点双向高亮。
- 结果三态：合法零值=蓝、未输入=占位灰、超范围=红，不再混淆。
- 「应用」：不再把结果写回十进制框，改为抛事件给宿主，toast 文案明确。
- Section header：🧮/⚡/◆ 混用 → 统一 3px 竖条。

### 来自审查的变更（逐条对应）
- design-review D1 → 语义常驻控件（功能码下拉 + MS/RW 分段）。
- design-review D2 → 结果 hex/dec 一键复制 + 成功反馈。
- design-review D3 → 位布局条 + 命令码满宽权重。
- design-review D4 → 结果三态分色。
- design-review D7 → 统一 section header。
- a11y A1/A4/A6 → `aria-pressed`/`aria-labelledby`/`role=group` + 结果与状态 `aria-live`。
- a11y A2 → 文案 ≥12px。
- a11y A3 → 错误用「红色 + ⚠ 图标 + 文案」三通道。
- a11y A7 → 全控件 `:focus-visible` outline。

### 待后续
- design-review D6 / INTEGRATION 待确认：功能码空洞(0x0A–0x1F)拦截策略（需规格）。
- INTEGRATION：宿主 `setOffset(dec)` 入口、应用真实写回目标（需确认部署形态）。
- 功能码语义改宿主下发（替换前端硬编码，便于 i18n）。
- 窄面板(<360px)单列降级。

## [v0.1.0-demo] - 阶段一
- 单文件 HTML Demo：双向编解码、实时计算、字段校验、溢出告警。
- 已知问题见 design-review.md / accessibility-audit.md。
