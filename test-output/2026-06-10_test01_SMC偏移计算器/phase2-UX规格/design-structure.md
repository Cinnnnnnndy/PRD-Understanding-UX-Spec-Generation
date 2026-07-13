# SMC 偏移量计算器 · 设计结构文档
> 生成时间：2026-06-11 | Demo 版本：iter-3/optimized-demo.html（PTO 设计系统版）
> 数据来源：Demo HTML 代码反推 + PTO 语义 token 文件

---

## 一、页面整体布局

### 1.1 分区结构（ASCII 树）

```
页面（最大宽 980px，居中，背景 #101010，overflow-y: auto）
├── 页头（layout-header）   透明，无背景，padding: 0，内容高 ~44px
│   ├── 左侧：品牌标题 + 副标题描述文字
│   └── 右侧：「重置」按钮 + 「载入示例」按钮
├── 面板 1：偏移量面板（panel-shell）
│   ├── panel-shell-header：「偏移量 · 32-bit」标题 + 副标题
│   └── panel-shell-body
│       ├── smc-offset-row（三列 1fr 1fr auto）
│       │   ├── HEX 输入框（smc-owrap）
│       │   ├── DEC 输入框（smc-owrap）
│       │   └── 复制组（btn-solid + 格式选择▾ + graph-menu 下拉）
│       └── 错误提示行（oerr，最小高 16px）
├── 面板 2：32-bit 位图面板（panel-shell）
│   ├── panel-shell-header：「32-bit 位图」标题 + 副标题
│   └── panel-shell-body（smc-bitwrap，overflow-x: auto）
│       ├── smc-grid（32列网格，3行：字段带/位格/位号尺）
│       └── smc-legend（字段色彩图例，flex-wrap）
├── 面板 3：字段拆解面板（panel-shell）
│   ├── panel-shell-header：「字段拆解 · 双向编辑」标题 + 副标题
│   └── panel-shell-body
│       ├── smc-frow r1（2列 6fr:16fr）：Function 卡 + Command 卡
│       └── smc-frow r2（3列 1fr:1fr:2fr）：MS 卡 + RW 卡 + Param 卡
└── 面板 4：历史面板（panel-shell panel-shell-quiet）
    ├── panel-shell-header：「最近 10 次计算」+ Ctrl+S 提示 + 清空按钮
    └── panel-shell-body：smc-hlist（<ul>，flex-wrap）
        └── [recent-chip 按钮列表 / 空态文案]

Toast（fixed，bottom: 26px，居中，z-index: 50，page 之外独立定位）
```

### 1.2 间距系统

| 用途 | 值 |
|------|----|
| 外层容器 padding（水平 + 垂直） | `--space-4`（16px）四边，底部 `--space-6`（24px） |
| 页面各区块间距（smc-stack gap） | `--space-4`（16px） |
| panel-shell-header padding | `var(--panel-shell-header-padding)`（约 12px 16px） |
| panel-shell-body padding | 约 16px（panel-shell-body class） |
| 字段卡网格间距 | `--space-3`（12px） |
| 两行字段卡间距 | `--space-3`（12px） |
| 字段卡内边距 | `--space-3`（12px） |
| 偏移量输入区 grid gap | `--space-3`（12px） |
| smc-owrap 内 padding | `--space-2` `--space-3`（8px 12px） |
| 历史 chip 间距 | `--space-2`（8px） |
| legend 项间距 | `--space-3`（12px） |

---

## 二、组件清单

### 2.1 顶部页头（layout-header）

```
尺寸：宽 100%，高 auto（内容撑开）
背景：透明（无 background）
边框：无（PTO chrome 基线，无填充底）
padding: 0（覆盖 layout-header 默认 padding）
```

**内部结构（左右布局）：**
1. **左侧（layout-header-left）**
   - 品牌标题：`layout-header-brand`（含 `layout-header-dot` 色点）
   - 副标题：12px，rgba(255,255,255,0.60)，max-width: 560px
2. **右侧（layout-header-right）**
   - 「重置」：`btn btn-ghost`
   - 「载入示例」：`btn`（默认次级按钮）

**交互热点：**
- 重置按钮：hover → `--state-hover` 背景；click → 清空所有字段 + 刷新 UI
- 载入示例按钮：click → 填入 `0x18040600`，触发顶部解析

---

### 2.2 偏移量输入框（smc-owrap）

```
尺寸：宽 100%（响应式），高 auto（2行结构）
背景：var(--input-bg) = #161616（surface-1）
边框：1px solid rgba(255,255,255,0.10)，圆角 8px（radius-md）
padding：8px 12px
```

**内部结构（从上到下）：**
1. **标签行（smc-otag）**：`font-family: mono`，11px，rgba(255,255,255,0.40)，uppercase
   - 左侧：「HEX · 0x…」或「DEC · 0–4294967295」
   - 右侧：同步指示符 `●`（默认 rgba(255,255,255,0.40)；synced 态 `--primary` #4369EF）
2. **输入字段**：`font-family: mono`，19px，semibold，rgba(255,255,255,0.90)；background transparent

**变体：**
| 变体 | 样式 |
|------|------|
| 默认 | 背景 #161616，边框 rgba(255,255,255,0.10) |
| focus-within（聚焦） | 边框 `--primary` #4369EF，box-shadow `0 0 0 3px rgba(67,105,239,0.42)` |
| invalid（解析错误） | 边框 `--danger` #FF4B7B，box-shadow `0 0 0 3px rgba(255,75,123,0.14)` |
| synced（与字段联动中） | smc-osync 色点变为 #4369EF |

---

### 2.3 复制按钮组（smc-split · split-button pattern）

```
布局：flex row，stretch 对齐
```

**内部结构：**
1. `#copyAll`：`btn btn-solid`，文字「复制偏移量」，disabled = !anySet()
2. `#fmBtn`：`btn btn-solid smc-fmt`，文字「▾」，border-left 分隔线，disabled = !anySet()
3. `#menu`：`graph-menu`（绝对定位，top: 100%，z-index: 100），默认隐藏，`.open` 时显示

**btn-solid 视觉：**
- 背景：rgba(255,255,255,0.90)（近白色）
- 文字色：#101010
- hover：rgba(255,255,255,0.88) translateY(-1px)
- active：rgba(255,255,255,0.80) translateY(0)
- disabled：opacity 0.4，cursor not-allowed（PTO 默认）

**graph-menu 下拉：**
- 5 条格式项（仅 HEX / 仅 DEC / HEX+DEC / C字面量 / JSON）
- 每条右侧有当前值实时预览（`smc-mono`，`--foreground-muted` 色）
- 点击任意项 → 设置格式 + 触发 copyAll

---

### 2.4 32-bit 位图（smc-grid）

```
布局：grid，32列 minmax(18px, 1fr)，min-width: 660px
3行：row-1 字段带（smc-band）/ row-2 位格（smc-cell）/ row-3 位号（smc-pos）
```

**行 1 — 字段带（smc-band）：**
- 5个色块，按列跨度：func(col 1-6) / cmd(col 7-22) / ms(col 23) / rw(col 24) / param(col 25-32)
- 背景：对应字段 hue token（func=--warning, cmd=--primary, ms=--accent, rw=--success, param=--danger）
- 文字：白色，bold，含字段名 + 位区间（`[31:26]` 等，mono 字体，opacity 0.75）
- 圆角：`--radius-sm`（6px）顶部两角

**行 2 — 位格（smc-cell）：**
- 28px 高，border `1px solid rgba(255,255,255,0.06)`（border-subtle），右边框省略（最后格除外）
- 边界格（bit 26/25/10/9/8/7）：右边框加重 `rgba(255,255,255,0.16)`（border-strong）
- 内容：「0」（灰色）/ 当字段值使该位=1 时：`on` class → 背景 `color-mix(in srgb, var(--cell-hue) 22%, transparent)` + 边框 `color-mix(in srgb, var(--cell-hue) 50%, transparent)` + 文字白色
- 数字字体：mono，12px，semibold

**行 3 — 位号尺（smc-pos）：**
- 文字：mono，11px，rgba(255,255,255,0.40)（muted）
- 边界位（31/26/25/10/9/8/7/0）：white bold

**legend：**
- flex-wrap，每项=10×10px 色块（smc-sw）+ 字段名 + 位区间
- 字体：label，mono，rgba(255,255,255,0.60)

---

### 2.5 字段卡（smc-fc）

```
背景：var(--surface-2) = #1c1c1c
边框：1px solid rgba(255,255,255,0.06)（border-subtle），圆角 12px（radius-lg）
padding：12px（space-3）
```

**内部结构（从上到下）：**
1. **头部（smc-fhead）**：flex，justify space-between
   - 左：字段标签（smc-flabel），14px semibold，白色；含色块 swatch（10×10px，2px radius，inline-block）；func 标签有 hint 浮层（dotted underline，cursor help）
   - 右：位区间元数据（smc-fmeta），11px，mono，rgba(255,255,255,0.40)，如「[31:26] · 6b · 0–0x3F」
2. **输入区**：
   - 数字字段（func/cmd/param）：`smc-fin`（monospace 输入框）+ `⧉` 复制按钮
   - 1-bit 字段（ms/rw）：`segmented-control`（两选项按钮组）
3. **足部（smc-ffoot）**：flex，space-between
   - 左：`stat-chip` 双读数（DEC N + HEX 0xXX，仅位宽>1时显示 HEX）
   - 右：语义注记（smc-sem，14px，斜体灰色；warn=橙色，err=红色）

**focus 态（:focus-within）：** 背景升 → `--surface-3` = #262626

**smc-fin（数字输入框）：**
- 背景：`--input-bg` = #161616，边框：rgba(255,255,255,0.10)，圆角 8px
- 字体：mono，14px，semibold
- focus：border `--primary`，focus-ring 3px
- invalid：border `--danger`，glow `rgba(255,75,123,0.14)`

**segmented-control（MS/RW）：**
- 容器背景：rgba(255,255,255,0.04)，边框：rgba(255,255,255,0.06)，圆角 8px（radius-md）
- 选中项（is-selected）：背景 rgba(255,255,255,0.90)，文字 #101010
- 未选中项 hover：背景 rgba(255,255,255,0.06)

---

### 2.6 历史列表（smc-hlist + recent-chip）

```
容器：ul，list-style none，flex-wrap，gap 8px
```

**recent-chip 按钮：**
- 背景：rgba(255,255,255,0.05)，边框：rgba(255,255,255,0.10)，圆角 pill（999px）
- 内容：序号（02位）+ HEX值 + 时间戳（HH:MM，`--foreground-muted` 色）
- hover：背景 rgba(255,255,255,0.09)，边框 rgba(255,255,255,0.18)

**空态：**
- `<li class="smc-hempty">尚无历史记录 · 复制即自动收藏</li>`
- 12px，rgba(255,255,255,0.40)，padding: 12px 0

---

### 2.7 Toast 通知（smc-toast）

```
位置：fixed，bottom: 26px，水平居中（translateX -50%），z-index: 50
背景：var(--background-elevated) = #141414
边框：1px solid rgba(255,255,255,0.10)，圆角 12px
padding：8px 16px（space-2 space-4）
```

**状态：**
- 隐藏：opacity 0，translateY 10px，pointer-events none
- 显示（.show）：opacity 1，translateY 0，1.6s 后自动隐藏

---

## 三、色彩 Token

| Token 名 | 值（dark 主题） | 用途 |
|---------|----------------|------|
| `--background` | #101010 | 页面底色 |
| `--background-elevated` | #141414 | panel-shell 背景、toast 背景 |
| `--surface-1` | #161616 | input 背景、smc-owrap 背景 |
| `--surface-2` | #1c1c1c | 字段卡背景（默认） |
| `--surface-3` | #262626 | 字段卡背景（focus-within） |
| `--surface-4` | #313131 | segmented-control is-selected |
| `--surface-disabled` | rgba(255,255,255,0.04) | segmented-control 容器背景 |
| `--foreground` | rgba(255,255,255,0.90) | 主文字、输入值、按钮文字 |
| `--foreground-secondary` | rgba(255,255,255,0.60) | 次级文字（副标题等） |
| `--foreground-muted` | rgba(255,255,255,0.40) | 辅助标签、时间戳、占位前缀 |
| `--foreground-disabled` | rgba(255,255,255,0.25) | 输入框 placeholder |
| `--border-subtle` | rgba(255,255,255,0.06) | panel 边框、位格边框、字段卡边框 |
| `--border-default` | rgba(255,255,255,0.10) | 输入框边框、格式菜单分隔线 |
| `--border-strong` | rgba(255,255,255,0.16) | 位图字段边界线 |
| `--primary` | #4369EF | cmd 字段色；sync 指示符激活色；输入框 focus |
| `--accent` | #7c8db8 | ms 字段色 |
| `--success` | #04D793 | rw 字段色；copy 成功后字段复制按钮色 |
| `--warning` | #FFAA3B | func 字段色；Reserved/OEM 语义注记色；hint 浮层 key 色 |
| `--danger` | #FF4B7B | param 字段色；错误边框、错误文字 |
| `--state-hover` | rgba(255,255,255,0.06) | 按钮 hover 背景 |
| `--focus-ring` | rgba(67,105,239,0.42) | 所有可聚焦元素的 focus 光晕 |

---

## 四、字体规格

| 用途 | 字号 | 字重 | 字族 | 颜色 |
|------|------|------|------|------|
| 品牌/页头标题 | 约 14px（layout-header-brand） | semibold | Inter（sans） | rgba(255,255,255,0.90) |
| 副标题描述 | 12px | normal | Inter（sans） | rgba(255,255,255,0.60) |
| panel-shell 标题 | 约 14px semibold（text-title-2） | semibold | Inter（sans） | rgba(255,255,255,0.90) |
| 偏移量输入值 | 19px | semibold | JetBrains Mono | rgba(255,255,255,0.90) |
| 字段输入值 | 14px | semibold | JetBrains Mono | rgba(255,255,255,0.90) |
| 字段标签 | 14px | semibold | Inter（sans） | rgba(255,255,255,0.90) |
| 元数据标签 | 11px | normal | JetBrains Mono | rgba(255,255,255,0.40) |
| DEC/HEX 读数（stat-chip） | 12px | medium | JetBrains Mono | rgba(255,255,255,0.90) |
| 语义注记 | 14px | normal | Inter | rgba(255,255,255,0.40) 或字段色 |
| 位格数字（0/1） | 12px | semibold | JetBrains Mono | 亮位白色；暗位 muted |
| 位号尺数字 | 11px | normal（边界bold） | JetBrains Mono | muted / white（边界） |
| 历史 chip | 约 12px | medium | JetBrains Mono | rgba(255,255,255,0.60) |

---

## 五、非静态区域

| 区域 | 组件 | 类型 | 空状态处理 |
|------|------|------|----------|
| HEX/DEC 输入框值 | smc-owrap input | 实时计算输入 | 空值清空字段，占位符 `0x00000000` / `0` |
| 32-bit 位格内容 | smc-grid .smc-cell | 动态渲染，随字段变化 | 全部显示「0」（灰色），无高亮 |
| 字段卡 stat-chip 读数 | smc-ffoot .smc-pair | 字段值的格式化输出 | 「DEC —」/ 「HEX —」（muted dash） |
| 语义注记 | smc-sem | 功能码的语义标签 | 空字符串（非 func 字段）|
| 格式菜单预览 | pv-* span | 当前值格式化结果 | 显示 `0x00000000` / `0` / `…` 占位文字 |
| 历史列表 | smc-hlist | localStorage 持久化列表 | `<li class="smc-hempty">尚无历史记录…</li>` |
| Toast | smc-toast | 临时通知 | 透明隐藏 |

---

## 六、数据 Schema

```javascript
// state — 单一数据源
const state = {
  fields: {
    func:  number | null,  // 0–63，功能码，[31:26] 6-bit
    cmd:   number | null,  // 0–65535，命令码，[25:10] 16-bit
    ms:    number | null,  // 0或1，读取方式（0=多读/1=单读），[9] 1-bit
    rw:    number | null,  // 0或1，读写方向（0=写入/1=读取），[8] 1-bit
    param: number | null,  // 0–255，参数，[7:0] 8-bit
  },
  history: HistoryEntry[], // 最多10条，localStorage KEY='pto.smc.history.v1'
  fmt: 'hex' | 'dec' | 'both' | 'c' | 'json', // 当前复制格式
}

// HistoryEntry
interface HistoryEntry {
  word:  number;            // 32-bit unsigned integer（compose()结果）
  parts: Record<FieldKey, number | null>;  // 快照字段值
  ts:    number;            // Date.now()
}

// 编解码
compose(state.fields) → number   // 合成 32-bit word
decompose(word) → state.fields   // 分解为各字段值
```

数据来源：用户输入（HEX/DEC 顶部或字段卡）+ localStorage 历史  
加载时机：页面加载时从 localStorage 读取历史；其余为即时响应  
持久化：localStorage key `pto.smc.history.v1`，JSON 序列化

---

## 七、布局策略

本工具为表单工具，无图/拓扑结构，不需要布局引擎。

**字段卡布局约束（核心设计点）：**
- Row 1：`grid-template-columns: 6fr 16fr`（Function 6-bit : Command 16-bit，按位宽成比例）
- Row 2：`grid-template-columns: 1fr 1fr 2fr`（MS 1-bit : RW 1-bit : Param 8-bit，8比1:1:2等权非精确但保证 Param 更宽）
- 响应式：≤760px 时两行均变为 `1fr`（单列堆叠）

**位图布局约束（核心设计点）：**
- `grid-template-columns: repeat(32, minmax(18px, 1fr))`，32列等宽
- 字段带按 `grid-column: start/end` 跨列，跨度精确等于位宽：func(6列) + cmd(16列) + ms(1列) + rw(1列) + param(8列) = 32
- ⚠️ SMC 字段不对齐半字节（nibble = 4bit）：func 6bit + cmd 16bit 不能按 nibble 分组，必须逐位精确布局

---

## 八、交互操作规格 + 状态枚举

### 8.1 全局交互

| 操作 | 是否支持 | 说明 |
|------|---------|------|
| Ctrl+S | ✅ | 保存当前结果到历史，toast 确认 |
| 单一数据源联动 | ✅ | 任一处编辑（顶部HEX/DEC/字段卡）→ 全局刷新 |
| 页面刷新恢复历史 | ✅ | localStorage 读取恢复历史列表 |
| 载入示例 | ✅ | 填入 `0x18040600`，触发解析联动 |
| 全部重置 | ✅ | 清空所有字段、错误提示 |

---

### 8.2 逐组件状态枚举表

#### HEX 输入框（#hex / #dec）
| 状态 | 触发条件 | 视觉变化（精确值） | 行为约束 |
|------|---------|-----------------|---------|
| default | 页面加载 | 背景 #161616，边框 rgba(255,255,255,0.10)，值空 | placeholder 显示 |
| focus | 点击 / Tab | 边框 #4369EF，box-shadow 0 0 0 3px rgba(67,105,239,0.42) | 可输入 |
| synced（有效联动） | 字段或另一框输入触发 | smc-osync 点变 #4369EF，容器加 `.synced` class | 显示计算结果值 |
| invalid（解析错误） | 输入非法字符 | 边框 #FF4B7B，box-shadow 0 0 0 3px rgba(255,75,123,0.14)；oerr 显示「⚠ ...」 | 不更新字段值 |
| empty | 清空输入 | 恢复 default，所有字段清空 | copyAll 禁用 |

#### 字段输入框（smc-fin，func/cmd/param）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default | 无值 | 背景 #161616，边框 rgba(255,255,255,0.10)，placeholder「0x.. / dec」 | — |
| focus | 点击 / Tab | 边框 #4369EF，focus-ring | 可编辑 |
| valid + blurred | 输入有效，失焦 | 值格式化为 `0x${hex}` | 更新 state，触发 refresh |
| invalid | 输入越界或非法 | 边框 #FF4B7B，focus-ring red；sem span 显示「⚠ 超出 N-bit 范围」，橙色 | 不触发 refresh |
| disabled | 不适用 | — | — |

#### 分段控件（segmented-control，MS/RW）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default（null implied） | 页面加载 | 第一项（值 0）视觉高亮（is-selected），aria-pressed="true" | state.fields 为 null，逻辑贡献 0 |
| selected | 用户点击某项 | 点击项：背景 rgba(255,255,255,0.90)，文字 #101010；其他项恢复透明 | 更新 state，触发 refresh |
| hover（未选中项） | 鼠标移入 | 背景 rgba(255,255,255,0.06) | 非持久 |
| focus | Tab | box-shadow focus-ring | 键盘可见 |
| disabled | 不适用 | — | — |
| error | 不适用 | — | — |

#### 字段复制按钮（⧉）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| disabled | 字段值为 null | opacity 0.4，cursor not-allowed | 不响应点击 |
| default | 字段有值 | btn btn-ghost btn-icon 样式 | 可点击 |
| copied | 点击后 800ms | color `--success` #04D793，border-color `--success` | 800ms 后还原 |

#### 「复制偏移量」主按钮（#copyAll）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| disabled | anySet() = false | btn-solid opacity 0.4 | 不响应点击 |
| default | anySet() = true | 背景 rgba(255,255,255,0.90)，文字 #101010 | 可点击 |
| hover | 鼠标移入 | 亮度略高，translateY(-1px) | 非持久 |
| active | 点击按下 | 背景略暗，translateY(0) | 触发复制 + toast + saveHistory |

#### 格式选择下拉（#menu）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| closed | 默认 | display none（.open 不存在） | — |
| open | 点击 #fmBtn | .open class，菜单显示，绝对定位 | 点击外部关闭；选中项触发复制 |

#### 历史 recent-chip
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default | 列表渲染 | 背景 rgba(255,255,255,0.05)，边框 rgba(255,255,255,0.10)，圆角 999px | — |
| hover | 鼠标移入 | 背景 rgba(255,255,255,0.09)，边框 rgba(255,255,255,0.18) | 非持久 |
| focus | Tab / 点击 | focus-ring（PTO btn 基础） | 键盘可见 |
| active（回填中） | click | 字段联动更新，toast「已回填 0x…」 | 不持久状态 |

---

## 九、关键交互序列 + 数据流

### 9.1 输入偏移量 → 字段解析

1. **触发**：用户在 `#hex` 输入「0x18040600」（或 `#dec` 输入十进制）
2. **即时反馈**：`input` 事件触发 `onTop('hex')`；立即 `parseLoose(raw, 32)`
3. **本地计算**：`decompose(word)` → 5 字段值；< 1ms 无感知延迟
4. **成功响应**：`state.fields` 全部更新 → `refresh('hex')`：
   - `renderInputs`：字段卡输入框值同步
   - `renderFeet`：stat-chip DEC/HEX 读数更新
   - `renderTop`：DEC 框同步（反方向）；sync 指示符变蓝
   - `paintGrid`：位格着色
   - `renderPreviews`：格式菜单预览更新；copyAll 按钮解锁
5. **失败响应**：smc-owrap 加 `.invalid`；`#oerr` 显示「⚠ 超出 32-bit 范围」等；不更新字段
6. **逆操作**：清空输入框 → `onTop` 检测空字符串 → `state.fields` 全清空 → 恢复空态

```
用户输入（HEX/DEC）→ parseLoose(raw, 32) → decompose(word) → state.fields
→ renderInputs / renderFeet / renderTop / paintGrid / renderPreviews（全局刷新）
```

---

### 9.2 单字段编辑 → 回合成

1. **触发**：用户修改字段卡 `smc-fin`（如 func 输入「0x06」）
2. **即时反馈**：`input` 事件 → `parseLoose(inp.value, FIELDS[k].w)`
3. **本地计算**：解析成功 → `state.fields[k] = value` → `refresh('field:k')`
4. **成功响应**：顶部 HEX/DEC 框同步更新；位图对应位段重新着色；该字段的 stat-chip/语义注记更新
5. **失败响应**：输入框加 `.invalid`；`smc-sem` 显示「⚠ 超出 N-bit 范围」；其他字段不受影响
6. **失焦格式化**：`blur` 事件 → 有效值格式化为 `0x${hex}` 填回输入框；无效值保留用户输入

---

### 9.3 复制偏移量 → 历史保存

1. **触发**：用户点击「复制偏移量」（条件：anySet() = true）
2. **即时反馈**：无 loading 态（本地同步操作）
3. **本地处理**：`formatted(state.fmt)` → 根据当前格式生成文本 → `navigator.clipboard.writeText()`
4. **成功响应**：`toast('已复制 ...')` 1.6s；`saveHistory()` → 去重后 unshift，localStorage 持久化，历史列表更新
5. **失败响应**：clipboard API 失败时无 fallback（需要安全上下文，Webview 内通常可用）
6. **格式切换路径**：点击 `#fmBtn` → 打开 `#menu` → 点击格式项 → `state.fmt = f` → 触发 `#copyAll.click()`

---

### 9.4 历史回填

1. **触发**：用户点击 recent-chip
2. **即时反馈**：无（同步操作）
3. **本地处理**：`state.fields = { ...history[i].parts }` → `refresh()` 全局刷新
4. **成功响应**：所有字段卡/顶部输入框/位图同步更新；`toast('已回填 0x...')`
5. **逆操作**：无撤销；可再次点击不同历史项或手动修改

---

## ⚠️ 待设计师确认

1. [ ] MS/RW 分段控件初始 null 态显示策略（设计审查 D2：视觉暗示已选中但实际 null）
2. [ ] 历史时间戳跨日显示策略（D3：建议 >24h 显示日期，需确认格式）
3. [ ] 功能码 hint 浮层完整列表的展示方式（D1：11条 + OEM 范围，超出后是否滚动）
4. [ ] 字段单独复制的成功反馈（A5：建议触发 toast，是否与主复制的 toast 样式一致）
5. [ ] 格式下拉菜单的 ARIA 语义和键盘导航实现优先级（A1/A2：对工具用户重要性较高）
