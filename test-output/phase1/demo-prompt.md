# SMC 偏移量计算器 · UI 设计优化简报（优化模式 · 专业级完成度）

> 模式判定：**优化模式**——输入是已有 UI（`preview-smc-calculator.html`），目标不是「修几个审查点」，而是把它做到**专业工程工具的完成度**：高频专业用户期待的能力（全保真可视化、双向同步、多格式导出、可复用历史、示例/重置）要主动补齐，而不是等用户提。
> 目标宿主：openUBMC Studio shell（暗色、靛蓝强调、字段 hue 配色），故优化同时把工具迁入 Studio 设计系统。

## 设计角色与领域上下文

你是一位专注于 Developer Tools / 工程工具的 UI 设计师 + 前端。
- 产品：SMC 偏移量计算器——BMC 固件 32-bit 命令字 ↔ 5 字段（功能码/命令码/MS/RW/参数）双向编解码器。
- 目标用户：BMC/固件工程师，熟十六进制与位运算；高频阵发使用（写/审一批配置时连用）；要求**快、准、结果可带走、可复用**。
- 风格：openUBMC Studio 暗色工程工具系，信息密度高、mono 字体、功能优先。

---

## §A 设计系统基线（openUBMC Studio shell · 不可发明新 token）

| 用途 | token / hex | 说明 |
|------|------------|------|
| 页面背景 | `--bg #0d0f14` | |
| 卡片/面板 | `--bg-elev-1 #161922` / `-2 #1c2029` / `-3 #252a36` | 三级抬升 |
| 边框 | `--border #262b36` / `--border-strong #39414f` | |
| 强调（靛蓝） | `--accent #4f6ef7` / `--accent-soft rgba(79,110,247,.16)` | 主操作/focus/active |
| 语义 | `--err #f06570` / `--ok #34d399` / `--warn #f5b454` | |
| 文字 | `--text #e6e9f0` / `--text-dim #9aa3b2` / `--text-mute #6b7384` / `--placeholder #566073` | |
| 圆角 | `--radius 6px` / `--radius-lg 10px` | |
| 字体 | `--font-mono`（所有数值/位/hex） + system sans（正文） | |
| **字段 hue** | func `#f59e6b` · cmd `#4f6ef7` · ms `#a78bfa` · rw `#34d399` · param `#f5b454` | 位图、字段卡顶边、图例、swatch **全程同一套配色** |

> 字段 hue 是本工具的视觉主线：同一个字段在「32-bit 位图 / 字段卡顶边 / 图例 / 输入框 swatch」里必须用同一个 hue，让用户一眼把「某段位 ↔ 某个字段」对应起来。

---

## §B 当前 UI 问题诊断（逐项可量化）

> ⚠️ 下列数值均从真实文件 `preview-smc-calculator.html` 测得。

| # | 维度 | 组件 | 当前状态（量化） | 优先级 |
|---|------|------|----------------|--------|
| B1 | 可用性 | 功能码/MS/RW | 枚举语义仅在 `title` hover tooltip，键盘/触摸不可达 | 🔴 |
| B2 | 视觉层级 | 字段网格 | 5 字段 2 列等宽 grid；命令码(16b) 仅靠 `.wide` 跨列，与 MS/RW(1b) 权重未按位宽体现 | 🔴 |
| B3 | 可用性 | 整体 | **无 32-bit 位级可视化**——命令字结构（尤其非半字节对齐）完全不可见 | 🔴 |
| B4 | 反馈与状态 | 结果区 | 仅 hex+dec 两行，零值/未输入/错误三态弱区分；无复制动效 | 🟡 |
| B5 | 可用性 | 复制 | 无复制按钮（原文）/ 复制无格式选择；结果无法以 C、JSON 等形式带走 | 🟡 |
| B6 | 可用性 | 全局 | **无历史/复用**——工程师反复算多个命令字，算过的拿不回来 | 🟡 |
| B7 | 可用性 | 输入 | 只能字段→结果或十进制→字段，**HEX/DEC 顶部双向同步缺失**；无「载入示例/重置」 | 🟡 |
| B8 | 一致性 | 标题/区块 | 🧮/⚡/◆ 装饰符混用，未纳入 Studio 设计系统 | 🟢 |
| B9 | 可访问性 | 文案/错误 | 11px/10px 偏小；非法仅红色无图标；无 aria-live | 🟡 |

---

## §C 问题 → 目标状态（每条可验收）

**C1 语义常驻（B1）** → 功能码/MS/RW 配**样式化 hint 浮层**（非原生 title）：hover/focus 弹出速查表（func：0x01 系统…0x06 散热…；MS：0 多读/1 单读；RW：0 写/1 读）。字段有值时，卡片 foot 处常驻显示语义标签（`· 散热部件管理`）。

**C2 字段权重按位宽（B2）** → 字段卡用**按 bit 宽成比例的 grid**：第一行 `grid-template-columns: 6fr 16fr`（Function 占 6、Command 占 16，命令码最宽最显眼）；第二行 `1fr 1fr 2fr`（MS/RW/Param）。每张卡顶部 2px 字段 hue 边 + swatch。

**C3 完整 32-bit 位图（B3，核心）** → 独立「32-bit 位图」卡：
- **三行网格**（`grid-template-columns: repeat(32, 1fr)`）：①字段带（5 段，按 `grid-column` 跨列：func 1–7 / cmd 7–23 / ms 23–24 / rw 24–25 / param 25–33，**严格按真实位区间**）②32 个 bit 格（逐位显示 0/1，置位时用该字段 hue 高亮：`rgba(hue,.22)` 底 + hue 边 + 亮色字）③位号标尺（31…0，边界位 31/26/25/10/9/8/7/0 加粗）。
- 字段边界（bit 26/10/9/8 右侧）画 `border-strong` 竖线。
- 下方图例：每字段一个 hue 色块 + `Function · [31:26] · 6b` 等。

**C4 结果三态 + 复制动效（B4）** → 顶部 offset 输入即结果区：未输入→占位灰 `placeholder`；有值→靛蓝 mono 大字（19px/600）+ `synced ●` 指示点变 accent 色；复制时按钮短暂 `copied` 态（ok 绿）+ toast。

**C5 多格式导出（B5）** → **拆分按钮**：主键「复制偏移量」+ 右侧 `▾` 展开格式菜单，5 种格式各带实时预览：
- `HEX` → `0x30004500`
- `DEC` → `805322496`
- `HEX+DEC` → `0x30004500 (805322496)`
- `C 字面量` → `0x30004500u`
- `JSON 字段` → `{"offset":"0x30004500","func":"0x0C","cmd":"0x0011","ms":0,"rw":1,"param":"0x00"}`
选定某格式即以该格式复制。每个字段卡另有**单字段复制**按钮（复制 `0x..`）。

**C6 历史「最近 10 次计算」（B6）** → 底部历史卡：
- 复制成功 / `Ctrl+S` → 收藏当前命令字（去重相邻重复）；`localStorage` 持久化（key 版本化，如 `ubmc.smc.history.v2`）。
- 列表网格（`auto-fill minmax(220px,1fr)`）：序号 + `0x________` + `HH:MM` 时间戳；点击任一条**回填**全部字段与输入。
- 空态：「尚无历史记录 · 复制即自动收藏」；「清空」按钮。

**C7 双向同步 + 示例/重置（B7）** → 顶部 HEX 与 DEC 两个输入框**实时双向联动**（改任一边，另一边 + 字段 + 位图全部刷新；空则清空全部）；页头「载入示例」（填一个整齐命令字，如 `0x30004500`）、「重置」（清空回占位态）。

**C8 纳入 Studio 设计系统（B8）** → section header 统一为左侧 3px accent 竖条 + 13px 半粗；去 emoji 混用；整体用 §A token。

**C9 可访问性（B9）** → 文案 ≥12px；非法字段红边 + 图标/文案；结果与错误 `aria-live`；所有控件键盘可达、focus 环（`accent-soft` 3px ring）可见。

---

## §D 跨视图一致性约束

本视图为单视图，但属于 openUBMC Studio 多视图 shell（SMC / Expression / Power&Fan…）。统一约束：
- 复用 `studio-shell.css` 的 tabbar / 按钮 / section-h / toast / token，不自创。
- 字段 hue 系统在所有涉及「位字段」的视图保持一致。
- mono 字体用于所有数值/hex/位；正文 system sans。

---

## §E 各组件设计规格（逐条可实现）

### 1. 页头
H1「SMC 偏移量计算器」+ 副标题（说明双向同步）；右侧「重置 / 载入示例」按钮。

### 2. 顶部偏移量条（offset-bar）
- 两个 `offset-input-wrap`（HEX、DEC），各含 tag（`HEX · 0x...` / `DEC · 0–4 294 967 295`）+ `sync ●` 指示 + 19px mono 输入。
- 右侧 `split-btn`（复制偏移量 + `▾` 格式菜单，见 C5）。
- 下方 `offset-err`（mono 红，min-height 占位防跳动）。
- focus 态：accent 边 + `accent-soft` 3px ring；invalid 态：err 边 + 红 ring。

### 3. 32-bit 位图卡（见 C3）

### 4. 字段卡区（见 C2）
每张 `field-card`：顶 2px hue 边、`field-head`（swatch + 标签 + `field-meta` 如 `[25:10] · 16b · 0–0xFFFF`）、`field-input-wrap`（mono 输入 + 单字段复制按钮，无值时 disabled）、`field-foot`（DEC/HEX 读数 + 语义标签 / 行内错误）。func/ms/rw 标签带 hint 浮层。

### 5. 历史卡（见 C6）

### 实现约束
- **单文件优先 + 一个 `studio-shell.css`**；零构建、零框架（原生 JS）；可双击打开。
- 单一数据源 `state.fields {func,cmd,ms,rw,param}`，顶部双输入与字段输入都读写它；`composeWord`/`decomposeWord` 做编解码。
- 宽松解析 `parseLoose`：`0x` 前缀按 hex、含 a-f 的裸串按 hex、纯数字按 dec；越界给「超出 N-bit 范围」。

---

## §F 状态覆盖（不能只设计 happy path）

| 状态 | 触发 | 表现 |
|------|------|------|
| 空/初始 | 无输入 | 顶部输入占位灰；位图全 0 中性色；字段 foot 显示 `—`；复制/历史按钮 disabled；历史空态文案 |
| 有效 | 任一处输入合法 | HEX/DEC/字段/位图全联动；`synced ●` 变 accent；置位 bit 用字段 hue 高亮 |
| 字段越界 | 单字段 > 范围 | 该输入红边 + ring；foot 显示 `· 超出 N-bit 范围`(红)；不污染其他字段 |
| 偏移量非法 | 顶部输入非 dec/hex | 对应 wrap 红边；`offset-err` 显示原因 |
| 溢出 | > 0xFFFFFFFF | 「超出 32-bit 范围」 |
| 复制成功 | 点复制 / 选格式 | 按钮 `copied`(ok 绿) 800ms + toast「已复制 …」；并自动入历史 |
| 历史回填 | 点历史条 | 全字段/输入/位图刷新 + toast「已回填 0x…」 |
| 持久化 | 刷新页面 | 从 localStorage 恢复历史 |

---

## 待确认清单
1. [ ] 功能码语义表以 `data-structure.md` 的**权威表**为准（0x01 扩展组件…0x06 散热…0x20 Reserved / 0x37-3F OEM）；参考 Demo 里的 System/Power/Fan/Thermal 是占位，需替换为权威映射。
2. [ ] 功能码未定义空洞(0x0A–1F 等)：仅提示 vs 拦截？
3. [ ] 「复制偏移量」之外，是否需要把结果回写宿主（applyOffset 事件）？
4. [ ] 历史是否需要跨会话/跨设备同步，还是仅本地 localStorage？

## 明确不做
- 不引入框架/构建（保持原生 + 单 css）。
- 不做命令字实际下发，仅编解码 + 导出 + 历史。
