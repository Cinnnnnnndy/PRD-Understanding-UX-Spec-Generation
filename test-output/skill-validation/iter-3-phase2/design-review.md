# SMC 偏移量计算器 · 设计审查报告
> 对象：`test-output/skill-validation/iter-3/optimized-demo.html`（PTO 设计系统版，115KB 自包含）
> 日期：2026-06-11 | 阶段二 Step 2.1

---

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 优先级 | 建议方案 |
|---|------|---------|---------|--------|---------|
| D1 | 信息架构 | 功能码 hint 浮层 | 仅展示 6 个常用功能码（0x01/0x03/0x05/0x06/0x09/0x20），完整 FUNC 表共 11 条（含 0x00–0x09 / 0x20 / OEM 范围说明）。用户查询不常见功能码时无法在工具内得到反馈 | 🟡 | 将全部 11 条 FUNC 映射写入浮层列表；OEM 范围（0x37–0x3F）显示为一条说明行；浮层高度超过时加滚动 |
| D2 | 反馈与状态 | MS/RW 分段控件 · 初始状态 | 页面加载时 `state.fields.ms` / `state.fields.rw` 为 `null`，但分段控件视觉上高亮「多读 0」和「写入 0」（renderInputs 将 null 映射至第一项）。用户未明确设置这两个字段，工具已视觉暗示「已选中」，与空态语义矛盾。注：`anySet()` 为 false 时 copy 仍禁用，逻辑正确；但 UI 给用户的信号是「这两个字段有值」 | 🟡 | 方案 A：加灰色 muted 样式区分「默认显示」和「用户主动选择」，如用 `data-implied` 属性降低饱和度；方案 B（更激进）：初始状态不选中任何项，用户第一次点击后才计入字段 |
| D3 | 反馈与状态 | 历史列表 · 时间戳 | 历史记录显示 `HH:MM` 格式，localStorage 跨会话持久化。用户第二天打开时看到「09:30」无法判断是今天还是昨天的记录 | 🟡 | 不超过 24 小时内显示「HH:MM」；超过后显示「M/D HH:MM」（如 6/10 09:30）；使用 `date.toLocaleString()` 或手工格式化 |
| D4 | 视觉一致性 | 复制按钮组（split-button） | `#copyAll`（主操作）和 `#fmBtn`（格式选择▾）形成一个非标准 split-button 模式。PTO 无内建 split-button 组件，当前用 `.smc-split` 拼装，视觉分隔线 `border-left: 1px solid var(--border-default)` 是合理实现，但 `▾` 符号在 CJK 字体下渲染差异较大，不同平台字形不一致 | 🟢 | 将 `▾` 替换为 SVG chevron-down icon（16×16）保证跨平台一致性 |
| D5 | 工程工具特定 | 字段卡 · 语义注记颜色 | `describeFunc()` 对已知功能码返回空 `kind`（注记色为 `--foreground-muted` 灰色，样式：`.smc-sem`），对 Reserved/OEM 返回 `kind:'warn'`（橙色 `--warning`）。正确逻辑无误，但用户视觉上无法区分「功能码描述」（灰色斜体）和「没有语义注记」（都为灰色空白）——已知功能码的注记反而最不显眼 | 🟢 | 已知功能码用 `--foreground-secondary` 区别于 muted；或在前加「·」区分空态与有内容态 |
| D6 | 信息架构 | 字段卡 · 1-bit 字段无 DEC/HEX 双读数 | MS/RW 使用分段控件，`smc-ffoot` 的 stat-chip 判断 `FIELDS[k].w > 1` 才显示 HEX 读数，1-bit 字段只显示「DEC N」而无 HEX。工具面向 firmware 工程师，1-bit 字段也值得显示「HEX 0x0 / 0x1」保持格式一致性 | 🟢 | 统一逻辑：所有字段都显示 DEC + HEX 双读数，1-bit 字段 HEX 为 `0x0` / `0x1` |
| D7 | 反馈与状态 | 格式下拉菜单 · 无 Escape 关闭 | 键盘用户打开格式菜单后无法通过 Esc 关闭；只能点击外部区域或选择一项 | 🟡 | 在 `document.addEventListener('keydown')` 中处理 `Escape` → `menu.classList.remove('open')` |

---

## 设计亮点

1. **信息层级清晰**：4 个 panel 沿垂直轴排列，顺序契合工程师工作流：输入偏移量 → 可视化位结构 → 精细编辑字段 → 复用历史。无需来回切换页面。

2. **32-bit 位图比例精确**：三行结构（字段带 / 位格 / 位号尺），比例 `6:16:1:1:8` 与实际位宽严格对应，字段边界线标注正确，是专业级表达而非等宽装饰。

3. **字段色彩系统一致**：func→orange / cmd→blue / ms→slate-blue / rw→green / param→pink-red 贯穿位图色块、legend swatch、字段卡 swatch 三处，不重复解释，用户眼睛移动一次即可建立映射。

4. **多格式导出实时预览**：下拉菜单中每种格式旁有当前值的实时预览（`pv-hex` / `pv-dec` / `pv-both` / `pv-c` / `pv-json`），工程师可在点击前确认结果，消除复制后粘贴发现格式不对的摩擦。

5. **宽松解析 + 三通道错误反馈**：`parseLoose()` 兼容 `0x` 前缀 hex、裸 hex（含 a-f 判定）、纯十进制。错误时：图标（⚠）+ 颜色（`--danger`）+ 文本说明（「超出 N-bit 范围」）三重反馈，不仅依赖颜色。

6. **历史记录 localStorage 持久化 + 去重**：`state.history[0].word === snap.word` 相邻去重逻辑防止重复收藏；Ctrl+S 快捷键兼顾键盘用户；`recent-chip` 组件点击一键回填全部字段，符合「可带走、可复用」的核心使用场景。

7. **PTO 设计系统完整委托**：零硬编码色，所有颜色/间距/圆角/字体全部通过 PTO 语义 token；`panel-shell` / `segmented-control` / `stat-chip` / `graph-menu` / `recent-chip` 等 PTO 组件正确使用，视觉一致性有系统保证。

---

## 版本说明

本审查基于 `iter-3/optimized-demo.html`（PTO 设计系统内联版，2026-06-11），是阶段二第一轮。  
原始审查对象的阶段一问题（B1–B6）在此版本中全部已修复，本轮发现均为新的改进机会点（D1–D7），而非原问题的残留。
