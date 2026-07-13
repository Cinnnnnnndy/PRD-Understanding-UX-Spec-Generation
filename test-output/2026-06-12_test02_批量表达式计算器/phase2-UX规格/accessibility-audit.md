# 管道表达式批量评估器 · 可访问性审查报告
> 标准：WCAG 2.1 AA  
> 对象：`DEMO-优化版/index.html`（PTO Design System 内联版，2026-07-08 重新生成）  
> 日期：2026-07-08 | 阶段二 Step 2.2

---

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 严重程度 | 受影响用户 | 修复建议 | 需后端配合 |
|---|------|---------|---------|---------|---------|---------|---------|
| A1 | 可感知性（对比度） | `.op-chip`, `.badge`, `.stat-l`, `.filter-chip` | `font-size: 11px`（`--font-size-label-xs`）用于多处常驻文字，低于 WCAG 建议的 14px 等效最小值（11px × 1.333dpr 仍偏小）；长时间使用（BMC 固件工程师日均使用）疲劳感显著 | Critical | 低视力用户、长时间使用 | 标签最小字号升至 **12px**；操作符 chip 的函数名（含 hint）升至 **12px**；若产品需保持 11px，应在用户文档中注明「建议高分辨率屏幕使用」 | 否 |
| A2 | 可感知性（对比度） | `--foreground-muted: rgba(255,255,255,0.40)` on `--surface-2: #1c1c1c` | 计算对比比：前景 `rgba(255,255,255,0.40)` 在 `#1c1c1c` 上 ≈ **2.9:1**（低于 AA 要求的 4.5:1）。影响：`.stage-idx`、`.hi-time`、`.stat-l`、`.pt-hint` | Critical | 低对比度敏感、老年用户 | `--foreground-muted` 在深色主题下提升到 `rgba(255,255,255,0.52)`（对比比 ≈ 4.6:1）；或仅对 12px 以下文字的 `foreground-muted` 用途加 overide token | 否 |
| A3 | 可操作性（键盘） | `.history-item` | `div.history-item[onclick]` — div 非原生可聚焦元素，Tab 键无法访问，屏幕阅读器无法激活 | Critical | 仅使用键盘的用户、屏幕阅读器用户 | 改为 `<button class="history-item" ...>` 或加 `role="button" tabindex="0"` + `keydown Enter/Space` 处理 | 否 |
| A4 | 可理解性（表单标签） | `.badge-select` | `<select class="badge-select">` 无关联 `<label>`，屏幕阅读器无法知道该 select 的用途 | Major | 屏幕阅读器用户 | 添加 `<label class="sr-only" for="badge-select-${i}">参数 $${i+1} 类型</label>` 并给 select 加对应 `id` | 否 |
| A5 | 可理解性（表单标签） | `#tc-input` (load-textarea) | 无 `<label>` 关联，仅靠 placeholder 表达意图；placeholder 在输入后消失，辅助技术无法访问 | Major | 屏幕阅读器用户 | 添加 `<label for="tc-input" class="sr-only">测试用例输入</label>`，并在面板标题旁添加可见标题（已有 `.panel-title` ✅） | 否 |
| A6 | 鲁棒性（ARIA 动态区域） | `#expr-msg` (inline-msg) | 表达式校验结果用 CSS `display:none→flex` 切换显示，但无 `aria-live` region——屏幕阅读器不播报校验结果 | Major | 屏幕阅读器用户 | 在 `#expr-msg` 上添加 `aria-live="polite" aria-atomic="true"`；或改为 `role="status"` | 否 |
| A7 | 鲁棒性（ARIA 动态区域） | `#toast` | Toast 通知用 opacity transition 显示，无 `aria-live` region，屏幕阅读器不播报 | Major | 屏幕阅读器用户 | 添加 `role="status" aria-live="polite" aria-atomic="true"`（success）或 `role="alert" aria-live="assertive"`（error） | 否 |
| A8 | 鲁棒性（ARIA Tabs） | `.mode-toggle` | `role="tablist"` ✅ 已加在 `.mode-toggle`，`role="tab"` ✅ 已加在 `.mode-btn`，但对应内容区缺 `role="tabpanel"` 和 `aria-labelledby` 关联 | Major | 屏幕阅读器用户 | `#dbg-inputs`、`#tc-left` 等面板加 `role="tabpanel" aria-labelledby="btn-debug"` | 否 |
| A9 | 鲁棒性（可操作控件） | `.icon-btn` (删除模板变量) | `<button class="icon-btn">` 内只有 SVG，无文本内容，无 `aria-label`——屏幕阅读器读出「按钮」但无名称 | Major | 屏幕阅读器用户 | 加 `aria-label="删除变量 ${i+1}"` | 否 |
| A10 | 鲁棒性（可操作控件） | `.ex-card` (示例卡片) | `<button class="ex-card">` 内有三行文字，但无 `aria-label` 概括；屏幕阅读器会完整读出内部文字，但无层次区分 | Minor | 屏幕阅读器用户 | 加 `aria-label="示例：${ex.title}"` 让读者能快速跳过不感兴趣的示例 | 否 |
| A11 | 可感知性（焦点可见性） | `.op-chip` (操作符 chip) | `<button class="op-chip">` 无 `:focus-visible` 样式（只有 `.btn:focus-visible` 定义了 box-shadow，`.op-chip` 未继承） | Minor | 仅使用键盘的用户 | `.op-chip:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }` | 否 |
| A12 | 可感知性（焦点可见性） | `.filter-chip` (筛选 chip) | 同 A11，`<button class="filter-chip">` 无 `:focus-visible` 样式 | Minor | 仅使用键盘的用户 | `.filter-chip:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }` | 否 |
| A13 | 可理解性（错误提示） | `#tc-load-err` | 测试用例解析错误显示为 HTML（`el.innerHTML = ...`）但无 `role="alert"`，屏幕阅读器不会主动播报 | Minor | 屏幕阅读器用户 | 添加 `role="alert" aria-live="assertive"` 到 `#tc-load-err` | 否 |

---

## 已符合项（勿破坏）

| 项目 | 位置 | 说明 |
|------|------|------|
| ✅ 示例卡片键盘可访问 | `.ex-card` | 使用 `<button>` 元素，`focus-visible` outline 已定义 |
| ✅ 主操作按钮 focus 样式 | `.btn:focus-visible` | `box-shadow: 0 0 0 3px var(--button-focus-ring)` 已定义 |
| ✅ 表达式 textarea focus | `.expr-textarea:focus` | 蓝色 border + box-shadow focus 环 |
| ✅ 颜色非唯一错误指示 | `.vrow.mismatch` | 红色背景 AND `✗` 图标文字，非颜色唯一 |
| ✅ 通过率 badge 文字标注 | `pass-badge` | `✓/✗ 通过 N/M` 文字，非颜色唯一 |
| ✅ 主题切换控件 | `.theme-seg` | `role="group" aria-label="主题切换"` ✅ |
| ✅ 装饰性图标 | TopBar SVG | `aria-hidden="true"` 已标注 |
| ✅ 键盘快捷键 | `Ctrl+Enter / F5` | 全键盘完成核心操作路径 |
| ✅ 语义 HTML | 大量使用 | `<button>`/`<input>`/`<textarea>`/`<select>` 原生语义元素 |
| ✅ 输入 placeholder | 参数 input | 有 placeholder 文字（尽管不能替代 label，见 A5） |
| ✅ 错误状态颜色+图标 | inline-msg | 错误显示 ⚠ icon + 红色文字，非颜色唯一 |

---

## 待后端配合项

无 HTTP 后端，本工具为纯前端计算 + Webview 消息桥。所有可访问性改进均在前端独立修复。  
以下项依赖宿主（VS Code 扩展）配合：

| 项目 | 说明 |
|------|------|
| 宿主 postMessage 时序 | `setTemplateVars` 注入后需确认 `aria-live` 播报时机与宿主端用户操作不冲突 |
| 多语言支持 | 若未来支持英文界面，aria-label 文案需同步国际化 |

---

## 可访问性修复优先级汇总

| 优先级 | 项目 | 工作量 |
|--------|------|-------|
| P0（阻断性） | A3（div onclick→button）、A6（aria-live 校验消息）、A7（toast aria-live） | 各 <5min |
| P0（阻断性） | A2（foreground-muted 对比度不足） | 改 1 个 token，<2min |
| P1 | A4（badge-select label）、A5（textarea label）、A8（tabpanel 关联）、A9（icon-btn aria-label） | 各 <5min |
| P1 | A1（11px 字号） | 改 token，可能影响布局，需视觉回归 |
| P2 | A10（ex-card aria-label）、A11/A12（chip focus 样式）、A13（tc-load-err alert role） | 各 <3min |
