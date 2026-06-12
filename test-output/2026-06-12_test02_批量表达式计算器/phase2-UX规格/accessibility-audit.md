# 管道表达式批量评估器 · 可访问性审查报告
> 标准：WCAG 2.1 AA  
> 对象：`DEMO-优化版/index.html`（v2，2026-06-12）  
> 日期：2026-06-12 | 阶段二 Step 2.2

---

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 严重程度 | 受影响用户 | 修复建议 | 需后端配合 |
|---|------|---------|---------|---------|----------|---------|---------|
| A1 | 可感知性 | 状态编码：mismatch/errored 行 | 批量结果表格中，失败行（`vrow.mismatch`）仅用背景色（`--tone-critical-bg`）区分，配合 `mic-fail`（红圈✗）虽有图标，但虚拟滚动行的 `<div role>` 缺失，屏幕阅读器无法按行播报「第 N 行：失败」 | Critical | 色觉障碍用户 / 屏幕阅读器用户 | 为 `.vrow` 添加 `role="row"`；每行生成时追加 `aria-label="第${i}行 输入:${inp} 期望:${exp} 实际:${act} 状态:${status}"` | 否 |
| A2 | 可感知性 | 内联验证消息（inline-msg）| `#expr-msg` 动态注入 err/ok 消息时无 `role="alert"` 或 `aria-live`，屏幕阅读器无法感知表达式校验结果 | Major | 屏幕阅读器用户 | 添加 `aria-live="polite"` 或在 err 情况下 `role="alert"`；成功提示用 `role="status"` | 否 |
| A3 | 可操作性 | 操作符 Chip 面板折叠按钮 | `.op-head` 是普通 `<div>` 而非 `<button>`，无 `role="button"`、无 `tabindex="0"`、无键盘 Enter/Space 触发事件；键盘用户无法折叠/展开操作符面板 | Major | 键盘用户 | 改为 `<button>` 元素；添加 `aria-expanded`（folded/open）+ `aria-controls="op-body-id"` | 否 |
| A4 | 可操作性 | 模板变量面板折叠区域 | `.tpl-head` 同 A3，`<div onclick>` 无法被键盘访问；tpl-body 内容对辅助技术不可见 | Major | 键盘用户 | 改为 `<button aria-expanded aria-controls>`；体内容区加 `id` 供 controls 引用 | 否 |
| A5 | 可理解性 | 参数类型下拉（badge-select）| `badge-select` 为裸 `<select>`，无关联 `<label>`，屏幕阅读器读到的只是「按钮」而非「参数 $1 类型」 | Major | 屏幕阅读器用户 | 为每个 `badge-select` 添加 `aria-label="参数 $${i+1} 类型"`；或用 visually-hidden `<label>` 关联 | 否 |
| A6 | 可理解性 | 输入参数文本框（input-field）| 参数输入框（`input-field`）无 `<label>` 或 `aria-label`，屏幕阅读器仅能读到 `type="text"` | Major | 屏幕阅读器用户 | `aria-label="参数 $${i+1} 的值"` + 用 `aria-describedby` 关联 warn 消息（param-msg） | 否 |
| A7 | 可理解性 | 错误消息定位不明确 | `#tc-load-err`（用例加载错误）展示错误内容但无 `role="alert"`，用户提交后需手动向下扫描才能发现错误 | Minor | 屏幕阅读器用户 | 添加 `role="alert"` 使错误出现时自动通告；同时确保焦点在提交后移到错误消息区 | 否 |
| A8 | 可感知性 | 通过率 badge（pass-badge）| `<button>` 元素，视觉为「✓ 通过 18/20」，当前无 `aria-label` 描述其点击行为（点击筛选不匹配项）；屏幕阅读器仅播报「按钮 ✓ 通过 18/20」 | Minor | 屏幕阅读器用户 | 添加 `aria-label="通过率 18/20，点击筛选不匹配项"` | 否 |
| A9 | 可感知性 | 主题切换 segmented control | `theme-seg` 有 `role="group" aria-label="主题切换"`，结构正确；但各按钮 `class="active"` 不传达选中状态，应用 `aria-pressed` | Minor | 屏幕阅读器用户 | 将选中按钮的 `aria-pressed` 切换为 `"true"`，其余为 `"false"` | 否 |
| A10 | 鲁棒性 | 虚拟滚动容器缺少语义 | `#vc`（`virtual-container`）无 `role="table"` 或 `role="grid"`；`.vtable-header` 内 `.vcell` 无 `role="columnheader"`；`.vrow` 无 `role="row"`；整个虚拟表对 AT 完全透明 | Major | 屏幕阅读器用户 | 为 container 加 `role="table" aria-label="批量执行结果"`；header 加 `role="rowgroup"`，vcell 加 `role="columnheader"`；vrow 加 `role="row"`；各 vcell 加 `role="cell"` | 否 |
| A11 | 可感知性 | 颜色对比度 · 辅助文字 | `.op-chip .hint`（`.hint` 颜色 `--foreground-muted` = `rgba(255,255,255,0.40)`），在 `surface-1`(`#161616`) 背景上估算对比度约 3.2:1（低于 WCAG AA 4.5:1 要求）；11px 字号属于小字 | Minor | 低视力用户 | 将 hint 颜色提升至 `--foreground-secondary`（rgba(255,255,255,0.60)）≈ 5.0:1；或加粗至 600 weight | 否 |
| A12 | 可操作性 | 格式下拉菜单 · Escape 关闭 | 键盘用户打开格式菜单（如存在）后无法通过 Esc 关闭 | Minor | 键盘用户 | 在 `keydown` 监听中处理 `Escape` 关闭任何打开的浮层 | 否 |

---

## 已符合项

1. **焦点样式可见**：所有 `.btn:focus-visible` 有 `box-shadow: 0 0 0 3px var(--button-focus-ring)` (rgba(67,105,239,0.42)) + outline: none，焦点轮廓清晰，满足 WCAG 2.4.7。
2. **`<kbd>` 语义正确**：Ctrl+Enter / F5 快捷键使用 `<kbd>` 标签，屏幕阅读器可正确读出键名。
3. **表达式 textarea `spellcheck="false"`**：技术内容关闭拼写检查，避免屏幕阅读器播报误拼写警告。
4. **示例卡片（ex-card）可键盘访问**：`<button class="ex-card">` 天然可 Tab 聚焦，有 `:focus-visible` 样式（`outline: 2px solid var(--focus-ring)`）。
5. **模式切换 `role="tablist"`**：`.mode-toggle` 有 `role="tablist"`，各按钮有 `role="tab"`，符合 ARIA 标准。
6. **主题切换 `role="group"`**：`.theme-seg` 有 `role="group" aria-label="主题切换"`，语义正确。
7. **图标 `aria-hidden="true"`**：topbar 图标 `<span aria-hidden="true">` 隔离装饰 SVG，不被 AT 读出。
8. **错误状态视觉非单一颜色**：`expr-textarea.invalid` 同时有红色边框（`--danger`）+ shadow（`--tone-critical-bg`）；inline-msg 有 SVG 图标 + 文字说明，满足 1.4.1 Use of Color。
9. **输入框 `:focus` 有样式**：`border-color: var(--primary)` + `box-shadow: 0 0 0 3px var(--focus-ring)` 双重视觉提示。
10. **文本最小字号**：正文（body-md 14px）/ 次级文字（body-sm 12px）均 ≥ 12px；仅 op-chip hint（11px）+ label-xs（11px）有边界风险（见 A11）。

---

## 待后端配合项

本工具为**纯本地计算**工具，无 HTTP 后端。以下可访问性改进均可由前端独立完成，无需后端配合。

如工具后续演进为云端执行（postMessage 宿主 + 远程计算），需在 INTEGRATION.md 增加：
- 执行状态回传（loading/complete/error）的结构化字段，以便前端播报进度
- 枚举标签（参数类型 SYNC/REF/CONST/LITERAL/TEMPLATE）可由宿主下发，避免前端硬编码

---

## WCAG 2.1 AA 达标评估

| 成功标准 | 级别 | 状态 | 备注 |
|---------|------|------|------|
| 1.1.1 非文字内容 | A | ⚠ 部分 | 装饰 SVG 已隔离；功能性 SVG 无 title（优先级 Minor） |
| 1.3.1 信息与关系 | A | ❌ 不达标 | 虚拟表无 ARIA 表格语义（A10）；输入框无 label（A6） |
| 1.4.1 颜色使用 | A | ✅ | 状态用颜色+图标双重编码 |
| 1.4.3 对比度（最小） | AA | ⚠ 部分 | hint 文字 ~3.2:1 不足（A11） |
| 2.1.1 键盘 | A | ❌ 不达标 | 折叠面板无键盘触发（A3/A4） |
| 2.4.3 焦点顺序 | A | ✅ | 文档顺序合理，无 tabindex 跳跃 |
| 2.4.7 焦点可见 | AA | ✅ | 全组件 focus-visible 样式 |
| 3.3.1 错误识别 | A | ⚠ 部分 | 错误有文字但无 alert 播报（A2/A7） |
| 3.3.2 标签或说明 | A | ❌ 不达标 | 参数输入框无 label（A5/A6） |
| 4.1.2 名称、角色、值 | A | ❌ 不达标 | 折叠按钮非按钮元素（A3/A4）；状态无 aria 传达（A9） |
| 4.1.3 状态消息 | AA | ❌ 不达标 | 动态消息无 aria-live（A2） |

> **结论**：当前版本有 4 项 Critical/Major 缺陷影响 WCAG 2.1 A/AA 达标（1.3.1 / 2.1.1 / 3.3.2 / 4.1.2），需在工程版本中修复。所有修复均可前端独立完成，修复清单已同步进入工程代码 step 5 的实现目标。
