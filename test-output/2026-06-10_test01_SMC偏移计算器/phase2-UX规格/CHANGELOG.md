# Changelog · SMC 偏移量计算器

---

## [v2.0.0-engineering] — 2026-06-11

阶段二工程化版本：从 Demo 升级为可接入 Web Component。

### 新增

- `<smc-calculator>` 自定义元素（Custom Element + Shadow DOM）
- ES Module 模块化代码结构：`src/utils/` + `src/constants/` + `src/components/`
- 编解码纯函数 `smcCodec.js`（`composeWord` / `decomposeWord` / `parseLoose` / `anyFieldSet` / `fieldOfBit`）
- 格式化工具 `formatters.js`（`formatOutput` / `describeFuncCode` / `fmtHistoryTime`）
- 字段校验工具 `validators.js`
- 常量模块 `enums.js`（字段定义、功能码权威表、历史 localStorage key）
- 单元测试 `src/test/smcCodec.test.js`（23 个用例，`node --test` 全通过）
- 组件输出事件：`smc-copy`（复制时广播）/ `smc-apply`（历史回填时广播）
- VS Code Webview `postMessage` 桥接说明（INTEGRATION.md）
- 设计审查报告（`design-review.md`）
- 可访问性审查报告（`accessibility-audit.md`，WCAG 2.1 AA）
- UX 规格文档（`design-structure.md`，精确 hex/px，全组件状态枚举）
- UX 规格可视化报告（`uxspec-report.html`，8 张 slide）

### 来自审查的变更（相比 iter-3 Demo）

- 修复 A1/A2：格式下拉菜单补 `role="menu"` / `role="menuitem"`；支持 Arrow Up/Down 导航；Escape 关闭并还焦点
- 修复 A3：功能码 hint 浮层补 `role="tooltip"` / `aria-describedby`
- 修复 A5：字段单独复制（⧉ 按钮）成功后触发 toast（不再仅靠颜色反馈）
- 修复 A6：历史列表 `<ul>` 补 `aria-label="最近 10 次计算历史"`
- 修复 D1：功能码 hint 浮层扩展为完整 FUNC_TABLE（11条 + OEM 范围说明）
- 修复 D3：历史时间戳超 24 小时后显示 `M/D HH:MM`（不再丢失日期上下文）

### 待后续处理

- D2：MS/RW 分段控件 null 初始态显示策略（需产品决策：implied 选中 vs 未选中）
- D4：格式选择`▾` 符号替换为 SVG chevron icon（跨平台字形一致性）
- D5：已知功能码语义注记颜色细化（`--foreground-secondary` vs `--foreground-muted`）
- D6：1-bit 字段是否也显示 HEX 读数（产品一致性决策）

---

## [v1.3.0-demo-iter3] — 2026-06-11

阶段一优化 Demo 最终版，PTO 设计系统完整内联。

### 新增

- 完整 PTO 设计系统内联（foundation + semantic + components + style.css，~3200 行 CSS）
- 自包含单文件，`file://` 直接双击可用
- 功能码权威语义表（0x00–0x09 / 0x20 Reserved / 0x37–0x3F OEM）
- Headless Chromium 渲染验证（`render-proof.png`）

### 修复（相比 iter-2）

- 修复 CSS 外链 404 问题（外链改内联）
- 修复空 CSS token 导致页面塌为裸 HTML 的问题

---

## [v1.2.0-demo-iter2] — 2026-06-10

阶段一盲测版，完整 9 大能力首次全部覆盖。

### 新增（相比 v1.0 原始 Demo）

- 完整 32-bit 位图（三行网格：字段带 / 位格 / 位号尺，按实际位宽成比例）
- HEX↔DEC 双向同步输入
- 字段卡按位宽成比例布局（`6fr:16fr` / `1fr:1fr:2fr`）
- 多格式导出（HEX / DEC / HEX+DEC / C字面量 / JSON，含实时预览）
- 最近 10 次历史（localStorage 持久化，去重，Ctrl+S，点击回填）
- 载入示例 / 全局重置
- 字段 DEC/HEX 双读数 stat-chip + 单独复制
- 功能码 hint 浮层（dotted underline，tabindex 键盘可达）
- 宽松解析（0x 前缀 hex / 裸 hex / 纯 dec，超出范围给明确错误）
- 三通道错误反馈（图标 + 颜色 + 文字）+ aria-live

---

## [v1.0.0-demo-original] — 2025（开发方提供）

原始开发 Demo（`test-input/preview-smc-calculator.html`）。

### 已知问题（触发阶段一审查）

- B1：MS/RW 枚举语义仅在 title hover tooltip，不可访问
- B2：字段网格等宽，位宽权重未体现
- B3：无 32-bit 位级可视化
- B4：零值/未输入/错误三态弱区分，无复制
- B5：无历史、无多格式导出、无双向同步、无示例/重置
- B6：错误字号 11px，非法输入仅红色无图标，无 aria-live
