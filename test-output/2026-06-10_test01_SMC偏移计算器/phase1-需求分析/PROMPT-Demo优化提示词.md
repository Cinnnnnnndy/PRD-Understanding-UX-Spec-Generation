# SMC 偏移量计算器 · 优化提示词（iter-3 · 更新后 skill 完整跑）

> 输入：原始 `preview-smc-calculator.html`。模式判定：**优化模式**。
> 设计系统槽位（生成前必问门，已确认）：**`pto-design-system`** → `design-systems/pto-design-system/`。
> 原则：**功能规格（§B/§C，视觉无关）× 设计系统（§A 槽位）= 对齐目标视觉的 Demo。**

## 设计角色与领域上下文

你是一位 Developer Tools 领域的 UI 设计师 + 前端。
- 产品：SMC 偏移量计算器——BMC 固件 32-bit 命令字 ↔ 5 字段（功能码/命令码/MS/RW/参数）双向编解码器。
- 用户：BMC/固件工程师，熟十六进制与位运算；阵发高频（写/审一批配置时连用）；要求**快、准、结果可带走、可复用**。

---

## §A 设计系统（槽位 = pto-design-system，视觉全部委托）

先读 `design-systems/pto-design-system/` 下：`SKILL.md` → `references/DESIGN.md` → `references/quick-reference.md` → `tokens/semantic.css` → `css/style.css`。按其 **Workflow B（改造）** 执行，遵守其 Hard rules：

- **颜色只用语义 token**：`var(--background)` / `var(--surface-1..4)` / `var(--foreground[-secondary|-muted])` / `var(--border-subtle|default|strong)` / `var(--primary)` / `var(--success)` / `var(--warning)` / `var(--danger)` / `var(--accent)` / `var(--state-hover|press|selected)` / `var(--focus-ring)`。**零硬编码 `#xxx`/`rgba()`**（PTO class 内部自带的除外）。
- **间距/圆角/字体**：`var(--space-1..6)` · `var(--radius-sm|md|lg|xl|pill)` · `var(--font-sans)`（正文）/ `var(--font-mono)`（仅数值/ID/读数）。
- **组件只用 PTO class**：按钮 `btn` / `btn btn-solid`（主提交）/ `btn btn-ghost`（图标/三级）/ `btn-icon`；模式二选一 `segmented-control` + `btn.is-selected`；面板 `panel-shell` + `panel-shell-header/title/body`；读数 `stat-chip`；下拉菜单 `graph-menu` + `graph-menu-item`；历史条目 `recent-chip`；顶部页头 `layout-header`（**透明，不加填充底/装饰带**，PTO chrome 基线）。
- **旧装饰必删**（retrofit-container-audit）：原 demo 的 `◆`/emoji section 前缀、info-box 左侧 4px 彩条、结果区渐变+2px 彩边——不得 token 化保留，直接删除，用 PTO 的 panel 层级与排版分层。
- **色彩使用原则**（components.css 头部注释）：卡片底一律中性 surface；高饱和色只用于小色块/tag/位段高亮等紧凑区域，**不做大面积透明色填充**。
- 字段类别 hue → PTO 语义色（沿用 PTO 自身 node-accent 先例 incast→success/op→primary/tensor→accent/outcast→danger）：
  **func→`--warning` · cmd→`--primary` · ms→`--accent` · rw→`--success` · param→`--danger`**；位图/字段卡 swatch/图例全程同色。
- 布局/结构类 class 允许 module-local（如位图 grid），但视觉值全部来自 token。
- 系统没覆盖的（如 toast），用 token 组装并在产出末尾「系统未覆盖项」列出，不发明新视觉语言。

> 换项目时只改本节槽位指向，§B/§C 不动。

## §B 问题诊断（原始 HTML，量化）

| # | 组件 | 问题 | 级 |
|---|------|------|----|
| B1 | 功能码/MS/RW | 枚举语义只在 `title` hover tooltip，键盘/读屏不可达 | 🔴 |
| B2 | 字段网格 | 2 列等宽，命令码(16b) 与 MS(1b) 权重未按位宽体现 | 🔴 |
| B3 | 全局 | 无 32-bit 位级可视化（字段不对齐 nibble，结构不可见） | 🔴 |
| B4 | 结果区 | 零值/未输入/错误三态弱区分；无复制 | 🟡 |
| B5 | 全局 | 无历史复用、无多格式导出、无 HEX↔DEC 双向、无示例/重置 | 🟡 |
| B6 | 文案 | 错误 11px、bits 10px；非法仅红色无图标；无 aria-live | 🟡 |

## §C 能力规格（专业级完成度，视觉无关）

1. **顶部 HEX↔DEC 双输入**：实时双向联动 + synced 指示；空输入清空全部；非法给原因。
2. **完整 32-bit 位图**：三行 grid（字段带 / 32 个逐位 0/1 格 / 位号尺 31…0）；按真实位区间 func[31:26]·cmd[25:10]·ms[9]·rw[8]·param[7:0] 着色与边界线；置位格用对应字段 hue 高亮。
3. **字段卡按位宽布局**：r1 `6fr 16fr`（Function/Command），r2 `1fr 1fr 2fr`（MS/RW/Param）；每卡：swatch + 位区间 meta + 输入 + 单字段复制 + DEC/HEX 读数 + 语义注记。
4. **语义常驻 + hint**：功能码权威表（0x00 公共…0x06 散热…0x09 供电 / 0x20 Reserved / 0x37–3F OEM——**不用 System/Power/Fan 占位**）；MS 0=多读/1=单读、RW 0=写/1=读用 `segmented-control` 常驻；功能码值旁常驻语义注记（reserved/OEM/未定义给 `--warning` 提示）。
5. **多格式导出**：主复制 + 格式菜单（HEX / DEC / HEX+DEC / C 字面量 `…u` / JSON 字段）各带实时预览；选定即复制。
6. **最近 10 次历史**：复制或 Ctrl+S 收藏（相邻去重）；localStorage 持久化；条目=序号+hex+HH:MM；点击回填全部；清空；空态文案。
7. **载入示例 / 重置**；**宽松解析**（`0x` 前缀 hex / 含 a-f 裸 hex / 纯数字 dec，越界报「超出 N-bit 范围」）。
8. **a11y**：文案 ≥12px、错误「图标+色+文案」三通道、结果/错误 `aria-live`、全控件可 Tab + focus ring。
9. 单一数据源 `state.fields`，`composeWord/decomposeWord` 编解码；单文件可双击（链接 vendored PTO css）。

## 迁移对照表（Workflow B 第 4 步，先审后改）

| 原 demo 元素 | PTO 等价 | class / token | 要删的旧装饰 |
|---|---|---|---|
| 🧮 标题 + info-box | 透明页头 + 说明文字 | `layout-header`+`layout-header-brand`；正文 `--text-body-sm` `--foreground-secondary` | **删 emoji、删 info-box 左 4px 彩条与引用底** |
| ⚡ 结果区（渐变+2px 彩边） | 顶部 offset 面板 | `panel-shell` + mono 大字 `--foreground`，synced 点 `--primary` | **删渐变背景与彩色描边** |
| `◆` section 标题 | panel 头 | `panel-shell-header` + `panel-shell-title` | **删 ◆ 伪元素前缀** |
| `.section` 卡片 | 面板 | `panel-shell`（`--surface-*`/`--border-subtle`/`--radius-xl`） | 私有边框/圆角值 |
| hex 输入 + 0x 前缀 | 输入 | `--input-bg(--surface-1)`/`--input-border`/`--radius-md`；focus `--focus-ring` | 私有 focus 蓝 `#007fd4` |
| 应用/取消按钮 | 主/次按钮 | `btn btn-solid` / `btn` | 私有 `#0e639c` |
| MS/RW 文本框填 0/1 | 分段控件 | `segmented-control` + `btn.is-selected` | — |
| 新增格式菜单 | 下拉 | `graph-menu`/`graph-menu-item` | — |
| 新增历史 | 现成组件 | `recent-chip`（+ module-local 网格） | — |
| 字段 DEC/HEX 读数 | 读数 chip | `stat-chip` | — |
| toast | 系统未覆盖 | token 组装（`--background-elevated`/`--border-default`/`--shadow-lg`），列入未覆盖项 | — |

## §F 状态覆盖
空(占位灰`--foreground-muted`，位图全0中性) / 有效(联动+synced) / 字段越界(红边+⚠+「超出 N-bit 范围」) / 偏移量非法(原因) / 复制成功(按钮 done 800ms+toast+入历史) / 历史回填(toast) / 刷新恢复(localStorage)。

## 明确不做
不引入框架/构建；不做命令字下发；PTO 重型 pattern 运行时不适用（表单/数据工具，tokens+css 足够）。
