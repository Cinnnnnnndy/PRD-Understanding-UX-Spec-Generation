# SMC 偏移量计算器 · 可访问性审查报告（WCAG 2.1 AA）
> 对象：`test-output/skill-validation/iter-3/optimized-demo.html`
> 日期：2026-06-11 | 阶段二 Step 2.2

---

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 严重程度 | 受影响用户 | 修复建议 | 需后端配合 |
|---|------|---------|---------|---------|-----------|---------|----------|
| A1 | 鲁棒性 | 格式下拉菜单 `#menu` | 使用 `div.graph-menu` + `button.graph-menu-item` 实现的下拉，缺少 `role="menu"` 和 `role="menuitem"`。屏幕阅读器无法识别其为菜单控件，用户不知道有下拉打开 | Major | 屏幕阅读器用户 | `#menu` 加 `role="menu"`，每个 `.graph-menu-item` 加 `role="menuitem"`；`#fmBtn` 加 `aria-haspopup="menu"` 和 `aria-expanded` 状态 | 否 |
| A2 | 可操作性 | 格式下拉菜单 | 键盘打开菜单后无 Escape 关闭；菜单内无 Up/Down Arrow 导航；焦点不自动移入菜单 | Major | 键盘用户 | 打开时焦点移至第一个 menuitem；Arrow Up/Down 在条目间导航；Escape 关闭并还焦点至触发按钮 | 否 |
| A3 | 鲁棒性 | 功能码 hint 浮层 `.smc-pop` | hint 浮层通过 CSS `:hover`/`:focus-within` 显示，但无 `role="tooltip"` 且 `.smc-hint` 无 `aria-describedby` 指向浮层内容。屏幕阅读器用户 Tab 到 `.smc-hint` 时不知道有额外信息 | Minor | 屏幕阅读器用户 | `.smc-hint` 加 `aria-describedby`，浮层 `<span>` 加 `id` + `role="tooltip"`；或改为 `<button>` 触发 + `aria-expanded` | 否 |
| A4 | 可感知性 | 位号数字 `.smc-pos`（11px） | `font-size: var(--font-size-label-xs)` = 11px，低于 WCAG 参考值 14px。该文本虽在 `aria-hidden` 位图内，但视力下降的工程师仍需读取位号（如 bit 26、bit 10 等边界位号），11px 在高分屏外可能不可读 | Minor | 视力较弱用户 | 将边界位号（`smc-pos.bound`，即 31/26/25/10/9/8/7/0）升至 12px；其余位号保持 11px | 否 |
| A5 | 可理解性 | 复制按钮 `.copied` 状态 | 字段单独复制成功后按钮变色（`color: var(--success)`，绿色），800ms 后还原。颜色变化无文字变化，对色觉障碍用户「成功」信号不完整。主 copy 按钮走 toast 路径，覆盖此问题；字段单独复制（`⧉`）无 toast | Minor | 色觉障碍用户 | 按钮复制成功时同时替换文字为「✓」或「已复制」（800ms 后还原），不只改颜色；或字段复制也触发 toast | 否 |
| A6 | 可操作性 | 历史列表为 `<ul><li><button>` | 结构语义正确，但 `<ul>` 无 `aria-label`，屏幕阅读器用户进入时不清楚这是「历史记录列表」 | Minor | 屏幕阅读器用户 | `#hlist` 加 `aria-label="最近 10 次计算历史"` | 否 |

---

## 已符合项

| 条目 | 说明 |
|------|------|
| 三通道错误反馈 | 字段越界错误：图标（⚠）+ 颜色（--danger）+ 文字说明，不只依赖颜色（WCAG 1.4.1）|
| aria-live 错误区域 | `#oerr` 有 `role="status" aria-live="polite"`，屏幕阅读器可感知错误消息 |
| aria-live toast | `#toast` 有 `role="status" aria-live="polite"` |
| aria-hidden 位图 | `.smc-grid` 有 `aria-hidden="true"`，视觉装饰区域不暴露给辅助技术 |
| aria-label 输入框 | `#hex`、`#dec` 都有 `aria-label`；字段输入框 `smc-fin` 有 `aria-label` |
| aria-pressed 分段控件 | MS/RW segmented-control 按钮有 `aria-pressed` 状态，随选中状态实时更新 |
| role="group" 分段控件 | `segmented-control` 有 `role="group" aria-label="字段名"` |
| 键盘可访问 hint 浮层 | `.smc-hint` 有 `tabindex="0"`，`:focus-within` 触发浮层显示，键盘可达 |
| focus-visible 样式 | PTO `btn:focus-visible` 和 `smc-fin:focus` 均有明确 focus ring（`box-shadow: 0 0 0 3px var(--focus-ring)`）|
| 语言声明 | `<html lang="zh-CN">` ✅ |
| 语义化 HTML 结构 | `<header>` / `<section>` / `<ul>` / `<li>` / `<button>` 正确使用 |
| 字号 ≥ 12px（主要文本） | 主文 14px、label 12px、meta 11px（仅非功能性位号）|
| Ctrl+S 快捷键 | 键盘保存快捷键有 `e.preventDefault()` 防止浏览器默认保存行为 |
| inputmode | `#dec` 有 `inputmode="numeric"` 优化移动端键盘 |
| 色彩对比度（主路径） | PTO dark 主题 `--foreground` rgba(255,255,255,0.90) on `--background` #101010 → 对比比约 15:1，远超 4.5:1 |

---

## 待后端配合项

本工具为纯前端离线工具，无后端依赖。所有可访问性修复均可前端独立完成。

---

## 与 Step 5 工程代码的对应关系

| 问题 | 工程代码修复位置 |
|------|----------------|
| A1 格式菜单缺 ARIA role | `SmcCalculator/index.js` → `buildFormatMenu()` 中加 role 属性 |
| A2 菜单键盘导航 | `SmcCalculator/index.js` → 格式菜单 keydown handler |
| A3 hint 浮层 role | `SmcCalculator/index.js` → `fieldCard()` 中 hint markup |
| A5 复制成功反馈 | `SmcCalculator/index.js` → 字段 copy handler 加 toast 调用 |
| A6 历史列表 label | `SmcCalculator/index.js` → `buildHistory()` 中 ul 元素 |
