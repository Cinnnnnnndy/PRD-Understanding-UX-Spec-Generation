# SMC 偏移量计算器 · 可访问性审查（/accessibility-review · WCAG 2.1 AA）

> 对象：`preview-smc-calculator.html`。用户是专业工程师但**长时间**使用，可访问性是效率基础设施。
> ⚠️ 环境未安装 `/accessibility-review` skill，按 WCAG 2.1 AA 四原则人工执行。

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 严重程度 | 受影响用户 | 修复建议 | 需后端配合 |
|---|------|----------|---------|---------|-----------|---------|-----------|
| A1 | 可操作性 | `❓` help-icon | 语义只在 `title` hover 出现，无 `aria`，键盘/触摸/屏幕阅读器不可达（WCAG 1.3.1, 4.1.2） | 🔴 严重 | 键盘用户、读屏用户、触摸用户 | 语义改常驻控件（select/分段）；标签与控件 `for`/`aria-labelledby` 关联 | 否 |
| A2 | 可感知性 | 错误/警告/bits 文案 | 11px / 10px 偏小（低于 14px 等效建议）（WCAG 1.4.4） | 🟡 中等 | 低视力、长时间使用者 | 全部 ≥12px，错误文案 13px | 否 |
| A3 | 可感知性 | `.hex-input.invalid` | 非法仅靠红色文字区分，无图标（WCAG 1.4.1 不能仅靠颜色） | 🟡 中等 | 色觉障碍用户 | 红色 + `⚠` 图标 + 文案三通道 | 否 |
| A4 | 可理解性 | 实时结果 / 错误 | 结果与错误变化无 `aria-live`，读屏感知不到（WCAG 4.1.3） | 🟡 中等 | 读屏用户 | 结果 `aria-live="polite"`，错误 `role="status"` | 否 |
| A5 | 可理解性 | 错误文案 | 「超出范围」只说错、不说怎么修（WCAG 3.3.3） | 🟢 轻微 | 全体 | 文案点名字段与上限，如「功能码 ≤ 0x3F」 | 否 |
| A6 | 鲁棒性 | MS/RW 输入 | 用 text input 填 0/1，语义弱，无 label 关联 | 🟡 中等 | 读屏/键盘用户 | 改 `role=group` 分段按钮，`aria-pressed`，`aria-labelledby` | 否 |
| A7 | 可操作性 | focus 可见性 | 复制等新增控件需保证键盘 focus 环可见（WCAG 2.4.7） | 🟢 轻微 | 键盘用户 | `:focus-visible` outline 2px `#007fd4` | 否 |

## 已符合项（保留，勿在迭代中破坏）

- 输入框 focus 有 `outline` + `focus-within`，键盘可见性基础在位。
- 暗色对比：主文字 `#cccccc` on `#1e1e1e` ≈ 9:1，远超 4.5:1。
- 字段输入有实时格式过滤，降低出错概率。

## 待后端/宿主配合项

- 功能码语义标签若由宿主下发枚举字典（含 i18n），可避免前端硬编码与协议表脱节——建议后端提供 `getFunctionLabels()`。当前前端兜底硬编码（`constants/enums.js`），已在 INTEGRATION 标注。

## 流向工程代码

A1/A2/A3/A4/A6/A7 = 前端可独立修，已在 `smc-calculator.js` 落实：分段控件 + `aria-pressed`/`aria-labelledby`、`aria-live` 结果与状态、`⚠` 图标 + 颜色双通道、≥12px、`:focus-visible`。A5 文案已点名字段。
