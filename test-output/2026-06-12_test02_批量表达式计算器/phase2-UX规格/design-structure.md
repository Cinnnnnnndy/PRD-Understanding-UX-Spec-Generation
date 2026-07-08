# 管道表达式批量评估器 · 设计结构文档
> 生成时间：2026-07-08 | Demo 版本：DEMO-优化版/index.html（PTO Design System 内联版）  
> 数据来源：Demo HTML/CSS/JS 代码反推 + PTO Design System token 定义

---

## 一、页面整体布局

### 1.1 分区结构（ASCII 树）

```
页面（max-width:1440px，居中，padding:16px，背景 var(--app-background)）
├── TopBar                  高 44px，背景 var(--comp-toolbar-bg)，border-radius:12px
│   ├── 左侧：图标 · 标题（16px/600）· Beta pill
│   └── 右侧：主题 segmented control（3 选项）
│
└── main-grid               display:grid, columns: 55fr 45fr，gap:16px
    ├── 左栏（操作区）       flex-column, gap:16px
    │   ├── ① 管道表达式面板  textarea + 操作符 Chip 面板 + 应用按钮
    │   ├── 模式切换          segmented control（调试/用例），高 40px
    │   ├── [调试模式]
    │   │   ├── ② 输入参数面板
    │   │   ├── 模板变量面板（折叠）
    │   │   └── 历史表达式面板
    │   └── [用例模式]
    │       └── ② 加载测试用例面板
    │
    └── 右栏（反馈区）       flex-column, gap:16px
        ├── [调试模式 · 未填参数]
        │   └── 空态示例卡片（3 张）
        ├── [调试模式 · 已填参数]
        │   ├── ③ 管道处理面板（数据流轨迹）
        │   └── ④ 最终结果面板
        └── [用例模式]
            ├── ③ 批量执行面板
            └── ④ 执行结果面板（虚拟滚动表格 + 统计）

@media (max-width:1024px) → 单栏，columns:1fr
```

### 1.2 间距系统

| 用途 | 值 | Token |
|------|----|-------|
| 页面内边距 | 16px | `--space-4` |
| 栏间 gap | 16px | `--space-4` |
| 面板内边距 | 16px / 20px | `--panel-padding` / `--panel-padding-lg` |
| 组件间 gap | 16px | `--space-4` |
| 面板标题底部间距 | 12px | `--space-3` |
| 操作符 chip 间距 | 6px | 内联 |
| 历史记录行间距 | 8px | `--space-2` |
| 输入行行高 | 34px | `--input-height-md` |
| 表格行高 | 36px | `--table-row-height` |

---

## 二、组件清单

### TopBar（工具栏）
```
尺寸：100%宽，高 44px（--comp-toolbar-height）
背景：--comp-toolbar-bg（= color-mix(background 92%, black)）
边框：1px solid --comp-toolbar-border（= --border-subtle）
圆角：12px（--radius-lg）
布局：flex, align-items:center, gap:12px, padding: 0 16px
```
**内部结构（左→右）：**
1. **图标** 18×18px SVG，`color:var(--primary)`（蓝色）
2. **标题** font: 600 16px var(--font-sans)，color: var(--foreground)
3. **Beta pill** `height:20px`，背景 `--comp-tag-bg`，边框 `--comp-tag-border`，font: 11px 500，color: `--foreground-muted`，radius: pill
4. **弹性空间** `flex:1`
5. **主题 segmented control** 见下方组件

**变体：** 无变体，单一形态  
**交互热点：** 无（工具栏本身不可点击）

---

### Panel（通用面板容器）
```
背景：--panel-bg（= --surface-2: #1c1c1c dark / #F2F2F2 light）
边框：1px solid --panel-border（= --border-subtle）
圆角：12px（--panel-radius）
内边距：16px（--panel-padding）
```
**面板标题行：** `display:flex; align-items:center; gap:8px; margin-bottom:12px`
- 步骤编号 chip：20×20px，圆形，边框 `1.5px solid --primary`，color: `--primary`，font: 11px 500
- SVG 图标：15×15px，`color: --foreground-secondary`
- 标题文字：600 16px
- `.pt-hint`：12px 400，`--foreground-muted`，`margin-left:auto`

---

### ExpressionEditor（管道表达式编辑器）
```
textarea 尺寸：100%宽，最小高 52px，padding:12px，resize:vertical
字体：var(--text-mono)（12px/500/JetBrains Mono）
背景：--input-bg（= --surface-1: #161616 dark）
边框：1px solid --input-border（= --border-default: rgba(255,255,255,0.10)）
圆角：8px（--input-radius）
```
**状态枚举见 §八.4.1**

**下方 inline 校验区（#expr-msg）：**
```
padding: 6px 12px，圆角 6px，font: 12px，margin-top:8px
```
- 成功态：背景 `--tone-green-strong`，color `--success`（#04d793），图标 ✓ SVG
- 错误态：背景 `--tone-critical-bg`，color `--danger`（#ff4b7b），图标 ⚠ SVG

**底部操作栏（expr-actions）：** `display:flex; gap:8px; justify-content:flex-end; margin-top:12px`
- `kbd-hint`：`margin-right:auto`，font: 11px，color `--foreground-muted`
  - `kbd` 元素：背景 `--surface-3`，边框 `--border-default`，圆角 6px，padding: 1px 5px
- 重置按钮（btn-secondary）
- 应用表达式按钮（btn-primary）

---

### OperatorChipPanel（操作符面板，折叠）
```
外框：1px solid --border-subtle，圆角 8px，背景 --surface-1，margin-top:12px
折叠头：display:flex, padding: 8px 12px，font:12px，color:--foreground-muted
  ▶ 折叠时：SVG caret 0deg；展开时：rotate(90deg)
折叠体：padding: 0 12px 12px；display:flex，flex-direction:column，gap:8px
```
**三组分类：**

| 组名 | 圆点颜色 | 内容 |
|------|---------|------|
| 输入 | `--primary`（蓝）| `$1`、`;$2`、`|>` |
| 字符串 | `--success`（绿）| `string.format`、`string.upper`、`string.lower`、`string.sub`、`string.gsub`、`string.cmp` |
| 自定义 | `--warning`（橙）| `expr()` |

**Chip 样式：**
```
font: 11px/500/monospace，padding: 3px 8px，圆角 6px
背景 --comp-tag-bg，边框 --comp-tag-border，color --foreground-secondary
hover: translateY(-1px)，border-color --border-strong，bg --state-hover，color --foreground
```
**状态枚举见 §八.4.2**

---

### ModeToggle（模式切换 segmented control）
```
layout: display:flex，gap:3px，padding:3px，圆角 10px
背景：--segmented-control-bg（= --surface-disabled）
边框：1px solid --segmented-control-border（= --border-subtle）
```
每个 mode-btn：
```
height: ~34px（flex:1），padding: 8px 16px，圆角 6px
font: 12px，间距: 6px（icon 14×14 + 文字）
default: 透明背景，color --foreground-secondary
active: 背景 --primary，color --primary-foreground（#fff）
hover（非active）: 背景 --state-hover，color --foreground
```

---

### ParameterRow（输入参数行）
```
layout: display:flex，align-items:center，gap:12px，padding: 8px 0，flex-wrap:wrap
warn 态: .input-row.warn .input-field { border-color: --warning }
```
**内部结构（左→右）：**
1. **标签区** `min-width:220px，display:flex，gap:8px`
   - **Badge chip**：高 20px，padding 0 8px，pill 圆角，font: 11px 500，uppercase
   - **Badge select**：`appearance:none`，透明背景，边框 `--border-default`，font: 11px，圆角 6px
   - `$N` 名称：mono 14px，`--foreground`
   - 描述：12px，`--foreground-muted`
2. **输入框** `flex:1，min-width:200px`，高 34px，mono 字体
3. **参数警告** `flex-basis:100%`，font: 11px，color `--warning`，`padding-left:232px`

**Badge 类型色系：**

| 类型 | 背景 | 文字色 | 边框 |
|------|------|--------|------|
| SYNC | `--tone-info-bg` | `--primary` | primary 40% |
| REF | violet 16% | `#A855F7` | violet 40% |
| CONST | `--tone-green-strong` | `--success` | success 40% |
| LITERAL | `--state-muted` | `--foreground-secondary` | `--border-default` |
| TEMPLATE | `--tone-warning-bg` | `--warning` | warning 40% |

---

### TemplatVariablePanel（模板变量，折叠）
折叠头同操作符面板；折叠体为键值对行列表：
```
tpl-row: display:flex，gap:8px
  tpl-key: width:200px，height:34px，mono，bg --input-bg，border --input-border
  tpl-val: flex:1，height:34px，mono
  icon-btn（删除）: 28×28px，border 1px solid --border-default，圆角 6px
```

---

### ExampleCards（空态示例卡片）
```
ex-card: display:flex，flex-direction:column，gap:6px，padding:12px
  背景 --card-bg（= --surface-1），边框 --card-border，圆角 12px
  hover: translateY(-1px)，border-color --card-hover-border，bg --state-hover
  focus-visible: outline 2px solid --focus-ring，offset 1px
内部（上→下）：
  ex-title: 12px/600，--foreground
  ex-expr: 11px mono，color --primary（蓝）
  ex-io: 12px，--foreground-muted，期望输出 b 标签用 --success
```

---

### PipelineStage（管道阶段轨迹）
```
stage: padding:12px，bg --surface-2，边框 1px solid --border-subtle
  border-left: 3px solid --primary，圆角 8px，margin-bottom:8px
stage.errored: border-color --danger
stage.skipped: opacity:0.45
```
**阶段标题行：** `stage-head`：stage-idx chip + 阶段表达式（mono 12px，`--foreground-secondary`）

**I/O 行（stage-io）：**
- `io-in`：12px mono，`--foreground-secondary`，前缀「入」
- `io-arr`：`→`，`--foreground-muted`
- `io-out`：12px mono bold
  - waiting：`--foreground-muted`，italic
  - error：`color:--danger`，前缀 `✗`
- `type-chip`：11px，pill 圆角，padding 1px 7px
  - number：`--tone-info-bg` / `--primary`
  - string：`--tone-green-strong` / `--success`
  - boolean：`--tone-warning-bg` / `--warning`

**阶段间箭头（flow-arrow）：**
- `bar`：2px 宽，10px 高，背景 `--border-strong`
- `tip`：▼，9px，`--foreground-muted`

---

### FinalResult（最终结果区）
```
padding:16px，bg --surface-2，边框 1px solid --primary，圆角 8px
font: 600 20px，text-align:center，word-break:break-all
```
- waiting：`--foreground-muted`，italic，12px 400
- error：`border-color:--danger`，`color:--danger`，12px 400

---

### VirtualScrollTable（虚拟滚动结果表格）
```
表头：高 36px，bg color-mix(--surface-2 80%, transparent)
  边框 --table-border，圆角 top 8px
  列标签：11px uppercase，letter-spacing 0.5px，--foreground-muted
虚拟容器：max-height calc(100vh - 420px)，min-height 160px
  position:relative，overflow:auto
每行（vrow）：高 36px，display:flex，border-bottom 1px solid --border-subtle
  hover：bg --state-hover
  mismatch：bg --tone-critical-bg（淡红）
  errored：bg --tone-warning-bg（淡橙）
状态图标（mic）：20×20px，圆形，font 11px bold
  mic-ok：bg --success，color --background（深色文字）
  mic-fail：bg --danger，color --primary-foreground（白）
  mic-err：bg --warning，color --background
```
列宽：`#`列52px fixed；输入/期望/实际各 `flex:1 min-width:120px`；状态列 64px fixed

---

### PassRateBadge（通过率徽章）
```
高 ~24px，padding: 3px 10px，pill 圆角
font: 11px/700，letter-spacing 0.3px
ok：bg --success（#04d793），color #08111f
bad：bg --danger（#ff4b7b），color #ffffff
```
文字格式：`✓/✗ 通过 N/M`

---

### StatCards（统计卡片组）
```
grid: auto-fit, min-width 96px
每格：padding 12px 8px，bg --surface-2，边框 --border-subtle，圆角 8px，text-align:center
stat-v：600 20px
  s-ok：--success；s-fail：--danger；s-warn：--warning
stat-l：11px uppercase，letter-spacing 0.5px，--foreground-muted
```

---

### FilterChips（结果筛选 chip 组）
```
display:flex，gap:8px，flex-wrap:wrap
每个 filter-chip：
  高 22px，padding 0 8px，pill 圆角
  bg --stat-chip-bg，border --stat-chip-border
  color --foreground-secondary，font 11px
  active：bg --state-selected，border --primary，color --foreground
  数字 .fc-count：--foreground-muted
```

---

### HistoryItem（历史记录条目）
```
display:flex，gap:8px，padding: 8px 12px
bg --inspector-soft-card-bg，border --border-subtle，圆角 8px
hover：bg --inspector-soft-card-bg-hover，border --border-default
hi-expr：mono flex:1，overflow:hidden，ellipsis，--foreground-secondary
hi-time：11px，--foreground-muted，flex-shrink:0
```

---

### Toast（通知浮层）
```
position:fixed，bottom:20px，right:20px
bg --surface-4，color --foreground
边框 --border-strong，padding: 8px 16px，圆角 8px
font: 12px，box-shadow --shadow-md，z-index --z-toast（400）
show：opacity:1，translateY(0)；hide：opacity:0，translateY(8px)
duration：200ms，easing: cubic-bezier(0.4,0,0.2,1)
自动消失：1800ms
```

---

## 三、色彩 Token

| Token 名 | Dark hex（近似） | 用途 |
|---------|----------------|------|
| `--background` | `#101010` | 页面背景 |
| `--surface-1` | `#161616` | input/card 背景 |
| `--surface-2` | `#1c1c1c` | panel/stage 背景 |
| `--surface-3` | `#262626` | surface-3 / kbd 背景 |
| `--surface-4` | `#313131` | toast 背景 |
| `--foreground` | `rgba(255,255,255,0.90)` | 主文字 |
| `--foreground-secondary` | `rgba(255,255,255,0.60)` | 次级文字 |
| `--foreground-muted` | `rgba(255,255,255,0.40)` | 辅助文字（⚠️ 对比度偏低，见 A2） |
| `--border-subtle` | `rgba(255,255,255,0.06)` | 分隔线 / panel border |
| `--border-default` | `rgba(255,255,255,0.10)` | input 边框 |
| `--border-strong` | `rgba(255,255,255,0.16)` | 强调边框 |
| `--primary` | `#4369ef` | 主色（蓝）|
| `--primary-hover` | `#5a92e6` | hover 蓝 |
| `--success` | `#04d793` | 绿色（匹配/成功/string 类型）|
| `--warning` | `#ffaa3b` | 橙色（警告/boolean 类型）|
| `--danger` | `#ff4b7b` | 红色（错误/不匹配）|
| `--highlight-l0a-violet-source` | `#A855F7` | REF badge 紫色 |
| `--tone-info-bg` | primary 16% mix | SYNC badge 背景 |
| `--tone-green-strong` | success 22% mix | CONST badge 背景 / 成功消息背景 |
| `--tone-warning-bg` | warning 16% mix | TEMPLATE badge 背景 |
| `--tone-critical-bg` | danger 14% mix | 错误行背景 / 参数 invalid 背景 |
| `--state-hover` | `rgba(255,255,255,0.06)` | hover 态背景 |
| `--state-selected` | `rgba(67,105,239,0.14)` | 选中态背景（active filter chip）|
| `--focus-ring` | `rgba(67,105,239,0.42)` | 聚焦环颜色 |

---

## 四、字体规格

| 用途 | Token | 字号 | 字重 | 字体族 |
|------|-------|------|------|-------|
| 面板标题 | `--text-title-2` | 16px | 600 | sans |
| 正文 | `--text-body` | 14px | 400 | sans |
| 正文小 | `--text-body-sm` | 12px | 400 | sans |
| 标签 / Badge | `--text-label` | 11px | 500 | sans |
| 代码 / 表达式 | `--text-mono` | 12px | 500 | mono |
| 最终结果 | `--text-title-1` | 20px | 600 | sans |

---

## 五、数据 Schema

```javascript
// ParsedExpr — parsePipeExpr() 的成功输出
// @typedef {{ ok: true, inputs: InputDef[], stages: StageDef[] }
//          | { ok: false, error: string }} ParsedExpr

// InputDef — 输入声明
// @typedef {{ idx: number, placeholder: string, desc: string }} InputDef

// StageDef — 管道阶段
// @typedef {{ fn: string, args: string[], raw: string }} StageDef

// TestCase — 单条测试用例
// @typedef {{
//   id: string,
//   inputs: (string|number)[],
//   expectedOutput: string,
//   actualOutput: string|null,
//   executionStatus: 'pending'|'success'|'error',
//   matchStatus: 'match'|'mismatch'|null,
//   lineNumber: number,
//   errorMessage?: string
// }} TestCase

// ExecSummary — 批量执行汇总
// @typedef {{ total:number, success:number, failed:number, matched:number, mismatched:number }} ExecSummary

// HistoryItem — 历史记录条
// @typedef {{ expr: string, ts: number }} HistoryItem

// TemplateVar — 模板变量
// @typedef {{ key: string, val: string }} TemplateVar
```

数据来源：内存（运行时状态）| 持久化：localStorage（历史记录、面板折叠状态、主题）

localStorage Keys：
| Key | 类型 | 说明 |
|-----|------|------|
| `pipe-eval-history` | `HistoryItem[]` JSON | 表达式历史（最多 20 条）|
| `pipe-eval-tpl-open` | `'0'/'1'` | 模板变量面板折叠状态 |
| `pipe-eval-op-open` | `'0'/'1'` | 操作符面板折叠状态 |
| `pipe-eval-theme` | `'dark'/'light'/'glass'` | 主题偏好 |

---

## 六、布局策略

无拓扑图/流程图/树形布局。管道轨迹为线性垂直流，使用 flex-column 自然排列，无需布局引擎。

虚拟滚动布局参数：
| 参数 | 值 |
|------|-----|
| 行高 | 36px（`ROW_H`）|
| 缓冲行数 | 10（`BUF`）|
| 可见行计算 | `ceil((scrollTop + clientHeight) / ROW_H) + BUF` |
| spacer 策略 | 绝对定位 `virtual-spacer { height: total*ROW_H }`；内容 `position:absolute; top: start*ROW_H` |

---

## 七、交互操作规格 + 状态枚举

### 7.1 全局交互

| 快捷键 | 条件 | 动作 |
|--------|------|------|
| `Ctrl/Cmd+Enter` | 任意模式 | `applyExpr()` |
| `F5` | 用例模式 + 有用例 | `executeBatch()` |

---

### 7.2 组件状态枚举表

#### 7.2.1 管道表达式 textarea

| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default | 页面加载 | 背景 `#161616`，边框 `rgba(255,255,255,0.10)` | — |
| focus | 点击/Tab | `border-color: #4369ef`，`box-shadow: 0 0 0 3px rgba(67,105,239,0.42)` | 显示输入光标 |
| invalid | 校验失败 | `border-color: #ff4b7b`，`box-shadow: 0 0 0 3px tone-critical-bg` | class `invalid` 加入 |
| valid（debounce 后）| 校验通过 | 移除 invalid 样式，下方 inline-msg 显示绿色成功 | — |

#### 7.2.2 操作符 Chip（op-chip）

| 状态 | 视觉变化 |
|------|---------|
| default | 背景 `--comp-tag-bg`，边框 `--comp-tag-border`，color `--foreground-secondary` |
| hover | `translateY(-1px)`，`border-color: --border-strong`，bg `--state-hover`，color `--foreground` |
| focus-visible（需修复 A11）| 应加 `outline: 2px solid --focus-ring, offset 2px` |
| active | — |
| disabled | 不适用 |

#### 7.2.3 应用按钮（btn-primary）

| 状态 | 视觉变化 | 行为约束 |
|------|---------|---------|
| default | 背景 `#4369ef`，color `#ffffff` | — |
| hover | 背景 `#5a92e6` | — |
| focus-visible | `box-shadow: 0 0 0 3px --focus-ring` | 键盘可见 |
| active | 背景 press 态（CSS var） | — |
| disabled | opacity 0.42，cursor not-allowed | 校验错误时自行拦截，按钮本身不 disabled |
| loading | 不适用 | 点击触发 `applyExpr()`，同步执行 |

#### 7.2.4 参数输入框（input-field）

| 状态 | 视觉变化 | 行为约束 |
|------|---------|---------|
| default | 背景 `#161616`，边框 `rgba(255,255,255,0.10)` | — |
| focus | `border-color: #4369ef`，`box-shadow: 0 0 0 3px rgba(67,105,239,0.42)` | — |
| warn（touched + empty）| 行 `.input-row.warn` → input `border-color: #ffaa3b` + 下方警告文字显示 | 仅在 `_touched=true` 后显示 |
| disabled | 不适用（当前无禁用状态） | — |

#### 7.2.5 Badge Select（badge-select）

| 状态 | 视觉变化 |
|------|---------|
| default | 透明背景，边框 `--border-default`，color `--foreground-secondary` |
| focus | `border-color: --primary` |
| change | badge chip 联动更新 class 和文字 |

#### 7.2.6 示例卡片（ex-card）

| 状态 | 视觉变化 |
|------|---------|
| default | 背景 `#161616`，边框 `rgba(255,255,255,0.10)` |
| hover | `translateY(-1px)`，border `rgba(255,255,255,0.16)`，bg `--state-hover` |
| focus-visible | `outline: 2px solid --focus-ring，offset 1px` |
| active | — |
| 隐藏时机 | 所有参数均填写 + parsedExpr.ok 时，`#dbg-empty` 加 `.hidden` |

#### 7.2.7 历史记录条（history-item）

| 状态 | 视觉变化 | 行为约束 |
|------|---------|---------|
| default | 背景 `--inspector-soft-card-bg`，边框 `--border-subtle` | — |
| hover | 背景 `--inspector-soft-card-bg-hover`，边框 `--border-default` | — |
| 可访问性缺陷（需修复 A3）| 当前为 `div[onclick]`，Tab 无法聚焦 | 需改为 `<button>` |

#### 7.2.8 通过率 Badge（pass-badge）

| 状态 | 触发条件 | 视觉变化 |
|------|---------|---------|
| ok | matched === total | 背景 `#04d793`，color `#08111f`，文字 `✓ 通过 N/N` |
| bad | matched < total | 背景 `#ff4b7b`，color `#ffffff`，文字 `✗ 通过 N/M` |
| focus-visible | Tab | `box-shadow: 0 0 0 3px --focus-ring` |
| 点击 | — | 当前仅 `setFilter('mismatch')`（需修复 R6：增加切换逻辑）|

#### 7.2.9 筛选 Chip（filter-chip）

| 状态 | 视觉变化 |
|------|---------|
| default | 背景 `--stat-chip-bg`，border `--stat-chip-border`，color `--foreground-secondary` |
| active | 背景 `--state-selected`，border `--primary`，color `--foreground` |
| focus-visible（需修复 A12）| 需加 `outline: 2px solid --focus-ring，offset 2px` |

#### 7.2.10 模式切换按钮（mode-btn）

| 状态 | 视觉变化 |
|------|---------|
| default | 透明背景，color `--foreground-secondary` |
| hover（非 active）| 背景 `--state-hover`，color `--foreground` |
| active | 背景 `--primary`，color `#ffffff` |
| focus-visible | `box-shadow: 0 0 0 3px --focus-ring`（继承 `.btn:focus-visible`）|

---

## 八、关键交互序列 + 数据流

### 8.1 应用表达式（applyExpr）

1. **触发**：用户点击「应用表达式」按钮 或 `Ctrl+Enter`
2. **即时反馈**：`validateExpr(raw)` 同步执行
   - 失败：`showExprMsg('err', msg)` → inline-msg 显示红色错误，textarea 加 `.invalid`；流程终止
   - 成功：`showExprMsg('ok', msg)` → inline-msg 显示绿色成功
3. **状态更新**：`parsedExpr` 更新，`inputValues`/`badgeTypes`/`_touched` 重置
4. **界面重渲染**：`renderInputFields()` → 参数行按新解析结果生成；`renderPipelineSlots()` → 管道轨迹槽位按阶段数生成
5. **历史推送**：`pushHistory(raw)` → 去重 + 压入 localStorage，最多 20 条（当前 Bug R1：8条）
6. **成功响应**：输入参数区等待用户填写；管道轨迹显示「等待输入…」

```
用户输入 → validateExpr() → [失败] → inline-msg 错误
                           → [成功] → parsedExpr 更新
                                    → renderInputFields() + renderPipelineSlots()
                                    → pushHistory()
                                    → updateDebugResults()（等待参数填写）
```

**逆操作：** 重置按钮（resetExpr）→ 恢复 `originalExprText` 并重新 apply

### 8.2 填写参数（调试模式实时求值）

1. **触发**：用户在任意参数输入框输入值（`oninput`）
2. **即时反馈**：`_touched = true`；`inputValues[idx]` 更新
3. **计算处理**：`updateDebugResults()` 同步执行（纯 JS，无异步）
   - 检查所有参数是否填写：未填 → 显示「等待输入…」
   - 全部填写 → `evaluator.evaluate(parsedExpr, inputValues, templateVars)`
4. **成功响应**：各阶段 `sio-${i}` 更新 in/out 值；`final-result` 显示最终值
5. **失败响应**：出错阶段 `border-color:--danger`；后续阶段 `opacity:0.45`；`final-result` 显示红色错误文字
6. **逆操作：** 清空输入框 → 回到「等待输入…」状态

### 8.3 使用示例卡片（useExample）

1. **触发**：点击右栏示例卡片
2. **处理**：填入表达式 → `applyExpr()` → 填入参数 input value → `updateDebugResults()`
3. **反馈**：管道轨迹更新；`showToast('示例已填入，轨迹见右侧')`
4. **示例卡片隐藏**：参数填满后 `#dbg-empty.hidden`

### 8.4 批量执行（executeBatch）

1. **触发**：「执行全部」按钮 或 F5（用例模式 + 有用例）
2. **即时反馈**：按钮 disabled，文字改为「⏳ 执行中…」
3. **处理**：`await new Promise(r => setTimeout(r, 0))` 让出一帧 → 同步遍历 testCases 执行
4. **成功响应**：统计 summary，渲染 pass-badge、stat cards、filter chips、虚拟滚动表格
5. **失败响应**：单条 error 不终止，executionStatus='error'，红橙行显示
6. **导出**：结果可通过「导出结果」复制为 TSV 到剪贴板

```
数据流：testCases[i].inputs → evaluator.evaluate() → actualOutput
       → normOut(actual) vs normOut(expected) → matchStatus
       → summary → renderBatchResults()
```

### 8.5 postMessage 宿主注入

1. **触发**：宿主（VS Code 扩展）调用 `webviewPanel.webview.postMessage({type, payload})`
2. **setTemplateVars**：templateVars 数组更新 + 面板自动展开 + `updateDebugResults()`
3. **setExpression**：textarea 赋值 + `applyExpr()`
4. **setBadgeTypes**：badgeTypes 数组更新 + `renderInputFields()` + `updateDebugResults()`

---

## ⚠️ 待设计师确认

1. [ ] **foreground-muted 对比度提升方案**：将 `rgba(255,255,255,0.40)` 提升到 `0.52`，是否影响视觉层次感？需要视觉回归检查（含玻璃主题）
2. [ ] **历史记录恢复交互**：点击历史记录后是否需要二次确认（会覆盖当前表达式）？还是直接恢复？当前无确认
3. [ ] **通过率 badge 点击切换行为**：点击「不匹配」筛选后，再次点击 badge 应切回「全部」还是无操作？
4. [ ] **批量执行卡顿阈值**：超过多少条用例显示「数据量较大」警告？产品侧确认典型用例规模
5. [ ] **模板变量面板默认折叠**：初次使用时是否显示引导提示说明 `${VarName}` 语法？
6. [ ] **玻璃主题下分隔线箭头**：`bar` 2px 宽度在玻璃主题几乎不可见，是否需要加宽至 3px？

---

## 九、机会点 → uxspec 落地对照（产品验收视角）

> 回填阶段一 product-doc.md §E 机会点 + §H 商业价值，核对本轮 Demo 兑现情况

| 机会点（阶段一 §E） | 商业权重/优先级（§H） | 落地状态 | 在 uxspec 的落点 | 未落地原因 / 移交 |
|--------------------|---------------------|---------|-----------------|-----------------|
| E1 inline 表达式校验（替换 alert） | 高 / P0 | ✅ 已落地 | §二 ExpressionEditor；§八.1 applyExpr 序列；§七.2.1 textarea 状态枚举 | — |
| E2 批量模式全中文化 | 高 / P0 | ✅ 已落地 | 全文无英文标签（Input/Expected/Execute All 均已中文化）| — |
| E3 空状态示例引导卡片 | 高 / P0 | ✅ 已落地 | §二 ExampleCards；§八.3 useExample 序列 | — |
| E4 参数 badge 动态可选 | 中 / P2 | ✅ 已落地 | §二 ParameterRow；badge 类型色系表 | — |
| E5 gsub 量词 bug 修复 | 高 / P0 | ⛔ **未修复** | — | Demo 中 `_luaPatToRegex` magic 集仍含 `+`，bug 未解决（见 R3）。工程阶段必须修复 |
| E6 历史记录（最多 20 条）| 高 / P1 | ◑ **部分** | §二 HistoryItem；§五 localStorage HIST_KEY | Demo 中 `h.slice(0, 8)` 最多保存 8 条，非 20 条（见 R1）。工程阶段修复 |
| E7 模板变量注入面板 | 高 / P1 | ✅ 已落地 | §二 TemplatVariablePanel；§八.5 postMessage 序列 | postMessage 协议三通道均实现 |
| E8 操作符快捷插入面板 | 中 / P1 | ✅ 已落地 | §二 OperatorChipPanel；三组分类 + hover 签名 + 光标插入 | — |
| E9 键盘快捷键 | 中 / P1 | ✅ 已落地 | §七.1 全局交互；Ctrl+Enter / F5 | — |
| E10 通过率 badge | 高 / P0 | ✅ 已落地 | §二 PassRateBadge；§七.2.8 状态枚举 | 点击切换逻辑有 Bug（R6），工程修复 |
| E11 结果筛选 chip | 高 / P0 | ✅ 已落地 | §二 FilterChips；§七.2.9 状态枚举 | — |
| E12 数据流可视化（箭头+类型标注）| 中 / P1 | ✅ 已落地 | §二 PipelineStage；flow-arrow；type-chip 色系 | 玻璃主题箭头可见性问题待确认（§⚠️ 6） |
| E13 双栏布局 | 中 / P1 | ✅ 已落地 | §一 整体布局；55fr/45fr grid | — |

**P0 未落地说明：**
- E5（gsub bug）：Demo 阶段未修复，属于阶段一 Prompt 明确要求的修复项。工程代码阶段必须在 `_luaPatToRegex` 中移除 `+`/`-`/`*` 出 magic 集。

**总结：** 13 个机会点中，✅ 已落地 10 个，◑ 部分落地 1 个（E6 历史条数），⛔ 未落地 1 个（E5 bug 修复）。P0 级别中有 1 个未修复（E5），工程阶段为强制修复项。
