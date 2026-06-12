# 管道表达式批量评估器 · 设计结构文档
> 生成时间：2026-06-12 | Demo 版本：DEMO-优化版/index.html（v2，五镜走查版）  
> 数据来源：Demo HTML/CSS 代码反推 + PTO Design System token 文件

---

## 一、页面整体布局

### 1.1 分区结构（ASCII 树）

```
页面（最大宽 1440px，居中，背景 #101010，padding: 16px 四边，overflow-y: auto）
├── app-shell（flex-col，gap: 16px）
│   ├── 顶栏（.topbar）   固定高 44px，圆角 12px，背景 ~#0e0e0e，底 border 1px solid rgba(255,255,255,0.06)
│   │   ├── 左侧：SVG 图标（18×18，primary #4369EF）+ 产品名称 + BETA 标签
│   │   └── 右侧：主题切换 segmented control（dark/light/glass）
│   │
│   ├── 主内容区（.main-grid）   grid，55fr / 45fr，gap: 16px，align-items: start
│   │   │   ≤1024px → 单栏 1fr
│   │   │
│   │   ├── 左栏（.main-col #col-left）   flex-col，gap: 16px，55% 宽
│   │   │   ├── ① 表达式 panel（.panel）
│   │   │   │   ├── panel-title：步骤 chip ① + SVG + "管道表达式"
│   │   │   │   ├── expr-textarea（min-height: 52px，mono font，可 resize 纵向）
│   │   │   │   ├── #expr-msg（inline-msg，动态显示 err/ok，默认隐藏）
│   │   │   │   ├── .op-panel（操作符 Chip 折叠面板，默认展开）
│   │   │   │   │   ├── op-head：折叠控制（"▶ 操作符面板 · hover 签名 · 点击插入"）
│   │   │   │   │   └── op-body（输入组/字符串组/自定义组，各含 op-chips）
│   │   │   │   └── expr-actions（kbd-hint + 重置按钮 + 应用表达式按钮）
│   │   │   │
│   │   │   ├── 模式切换（.mode-toggle，role=tablist）   调试模式 / 用例模式
│   │   │   │
│   │   │   ├── [调试模式]
│   │   │   │   ├── ② 输入参数 panel（#dbg-inputs）
│   │   │   │   │   └── #inputs-container（动态渲染 input-row × N）
│   │   │   │   ├── 模板变量 panel（#dbg-tpl，折叠面板）
│   │   │   │   └── 历史表达式 panel（#dbg-history）
│   │   │   │
│   │   │   └── [用例模式]
│   │   │       └── ② 加载测试用例 panel（#tc-left）
│   │   │           └── load-textarea（min-height: 130px）+ action-bar
│   │   │
│   │   └── 右栏（.main-col #col-right）   flex-col，gap: 16px，45% 宽
│   │       ├── [调试模式·空态] 示例卡片区（#dbg-empty，.panel）
│   │       │   └── .ex-cards（3 个 .ex-card 按钮，flex-col，gap: 8px）
│   │       ├── [调试模式·有数据] ③ 管道处理 panel（#dbg-pipeline）
│   │       │   └── #pipeline-container（flow-input + flow-arrow + stage × N）
│   │       ├── [调试模式·有数据] ④ 最终结果 panel（#dbg-result）
│   │       │   └── .final-result + result-actions（复制按钮）
│   │       └── [用例模式]
│   │           ├── ③ 批量执行 panel（#tc-exec-section）
│   │           └── ④ 执行结果 panel（#tc-results-section）
│   │               ├── pass-badge + stats + filter-bar
│   │               └── vtable-header + virtual-container（虚拟滚动）
│   │
└── #toast（fixed，right: 20px，bottom: 20px，z-index: 400）
```

### 1.2 间距系统

| 用途 | 值 |
|------|----|
| 页面外边距（app-shell 外层 body） | 16px 四边（`--space-4`） |
| 主内容区各区块间距（app-shell gap） | 16px（`--space-4`） |
| 双栏网格列间距（main-grid gap） | 16px（`--space-4`） |
| 左/右栏内各 panel 间距（main-col gap） | 16px（`--space-4`） |
| panel 内边距（panel-padding） | 16px（`--space-4`） |
| panel 标题底部间距（margin-bottom） | 12px（`--space-3`） |
| panel-title 内元素间距（gap） | 8px（`--space-2`） |
| 操作符 chip 间距（op-chips gap） | 6px |
| 示例卡片间距（ex-cards gap） | 8px（`--space-2`） |
| input-row 垂直 padding | 8px 0（`--space-2 0`） |
| input-row 各元素间距 | 12px（`--space-3`） |
| 历史列表项间距 | 8px（`--space-2`） |
| 统计格间距（stats gap） | 8px（`--space-2`） |
| 筛选 chip 间距（filter-bar gap） | 8px（`--space-2`） |
| 表格行高 | 36px（`--table-row-height`） |
| 表格 header 高 | 36px（`--table-header-height`） |

---

## 二、组件清单

### 2.1 顶栏（.topbar）

```
尺寸：宽 100%，高 44px（comp-toolbar-height）
背景：~#0e0e0e（color-mix(in srgb, #101010 92%, black)）
边框：1px solid rgba(255,255,255,0.06)，圆角 12px（radius-lg）
内边距：0 16px
```

**内部结构（从左到右）：**
1. **品牌图标**（tb-icon，18×18 SVG，颜色 #4369EF）— `aria-hidden="true"`
2. **产品名称**（tb-title）：16px / 600 / rgba(255,255,255,0.90)，`var(--text-title-2)`
3. **BETA 标签**（tb-beta）：11px / uppercase / rgba(255,255,255,0.40)，背景 rgba(255,255,255,0.06)，边框 rgba(255,255,255,0.10)，圆角 999px，padding 2px 8px
4. **弹性空间**（tb-spacer，flex:1）
5. **主题切换**（theme-seg，segmented control）：见 2.2

**交互热点：**
- 主题切换按钮：click → `setTheme(val)` → `document.documentElement.setAttribute('data-theme', val)`

---

### 2.2 主题切换 Segmented Control（.theme-seg）

```
尺寸：自适应宽，高 ~28px
背景：rgba(255,255,255,0.065)（segmented-control-bg）
边框：1px solid rgba(255,255,255,0.14)，圆角 10px（segmented-control-radius）
内边距：3px（segmented-control-padding）
按钮间距：3px（segmented-control-gap）
```

**按钮变体：**
| 状态 | 背景 | 文字色 | 圆角 |
|------|------|--------|------|
| default | transparent | rgba(255,255,255,0.60) | 6px（radius-sm） |
| hover | rgba(255,255,255,0.06) | rgba(255,255,255,0.90) | 6px |
| active | #4369EF（primary） | #ffffff（primary-foreground） | 6px |

**状态枚举：** 见 §八 2.2 状态表

---

### 2.3 主按钮变体（.btn）

```
高度：30px（button-height-sm）
圆角：12px（button-radius = radius-lg）
字体：500 12px / 1 var(--font-sans)（button-font）
内边距：0 12px（button-padding-x-md）
图标：13×13，gap 6px
```

| 变体 | 背景 | 文字色 | 边框 | hover 背景 |
|------|------|--------|------|-----------|
| btn-solid | rgba(255,255,255,0.90) | #101010 | transparent | rgba(255,255,255,0.79) |
| btn-secondary | ~#1a1a1a | rgba(255,255,255,0.90) | rgba(255,255,255,0.06) | #262626 |
| btn-primary | #4369EF | #ffffff | transparent | #5a92e6 |
| btn-ghost | transparent | rgba(255,255,255,0.60) | — | rgba(255,255,255,0.06) |

**共有状态：**
- focus-visible：`box-shadow: 0 0 0 3px rgba(67,105,239,0.42)`
- disabled：`opacity: 0.42; cursor: not-allowed`
- active（btn-primary）：background `#5a92e6`，transform 无

---

### 2.4 表达式输入区（.expr-textarea）

```
尺寸：宽 100%，min-height 52px，resize: vertical
字体：500 12px / 1.40 var(--font-mono)（text-mono）
背景：#161616（input-bg = surface-1）
边框：1px solid rgba(255,255,255,0.10)，圆角 8px（input-radius = radius-md）
内边距：12px（space-3）
```

| 状态 | 触发条件 | 视觉变化（精确 hex/px） | 行为约束 |
|------|---------|----------------------|---------|
| default | 页面加载 | 边框 rgba(255,255,255,0.10) | — |
| focus | 点击 / Tab | border-color #4369EF；box-shadow 0 0 0 3px rgba(67,105,239,0.42) | — |
| invalid | 300ms debounce 解析失败 | border-color #FF4B7B；box-shadow 0 0 0 3px rgba(255,75,123,0.14)（tone-critical-bg） | inline-msg err 同时显示 |
| valid-applied | applyExpr() 成功 | 边框恢复默认；inline-msg ok 显示 3s 后自动隐藏 | — |
| hover | 不适用 | — | — |
| disabled | 不适用 | — | — |
| loading | 不适用 | — | — |
| empty | 不适用 | — | 允许空值（表示无表达式） |

---

### 2.5 内联消息（.inline-msg）

```
尺寸：宽 100%，高 auto
字体：12px（text-body-sm）
内边距：6px 12px（6px space-3）
圆角：6px（radius-sm）
图标：14×14 SVG，flex-shrink 0，margin-top 2px
```

| 变体 | 背景 | 文字色 | 触发 |
|------|------|--------|------|
| err | rgba(255,75,123,0.14) | #FF4B7B | 解析失败 / 参数空 |
| ok | rgba(4,215,147,0.22) | #04D793 | 应用成功 |

---

### 2.6 操作符 Chip 面板（.op-panel）

```
背景：#161616（surface-1）
边框：1px solid rgba(255,255,255,0.06)，圆角 8px（radius-md）
margin-top：12px（space-3）
```

**内部结构：**
1. **op-head**（折叠控制）：flex，gap 8px，padding 8px 12px，cursor pointer
   - caret SVG（12×12，rotate(90deg) when open）
   - 文案：12px / rgba(255,255,255,0.40)
2. **op-body**（展开内容）：flex-col，gap 8px，padding 0 12px 12px
   - 每个 op-group：flex，gap 8px，padding-top 8px，border-top 1px dashed rgba(255,255,255,0.06)
   - 组色点（op-dot）：6px × 6px 圆，各组不同颜色
   - 组名（op-gname）：11px / 500 / rgba(255,255,255,0.60)，宽 44px，letter-spacing 0.5px
   - op-chips（flex-wrap，gap 6px）

**op-chip 状态枚举：**

| 状态 | 背景 | 文字色 | 边框 | transform |
|------|------|--------|------|-----------|
| default | rgba(255,255,255,0.06) | rgba(255,255,255,0.60) | rgba(255,255,255,0.10) | — |
| hover | rgba(255,255,255,0.09) | rgba(255,255,255,0.90) | rgba(255,255,255,0.16) | translateY(-1px) |
| active（click） | — | — | — | 插入到 textarea 光标位置 |
| focus-visible | 继承 hover | 同上 | 2px solid rgba(67,105,239,0.42) | — |
| disabled | 不适用 | — | — | — |

**操作符分组：**
| 组 | 色点颜色 | 操作符 |
|----|---------|--------|
| 输入 | #4369EF | `$1`，`;$2`，`\|>` |
| 字符串 | #04D793 | `string.format`，`string.upper`，`string.lower`，`string.sub`，`string.gsub`，`string.cmp` |
| 自定义 | #FFAA3B | `expr(…)` |

---

### 2.7 示例卡片（.ex-card）

```
背景：#161616（card-bg = surface-1）
边框：1px solid rgba(255,255,255,0.10)（card-border = border-default）
圆角：12px（card-radius = radius-lg）
内边距：12px（space-3）
布局：flex-col，gap 6px，text-align left，宽 100%
```

**内部结构：**
1. **ex-title**：12px / 600 / rgba(255,255,255,0.90)（示例名称）
2. **ex-expr**：11px / mono / #4369EF（primary，表达式文本，word-break: break-all）
3. **ex-io**：12px / rgba(255,255,255,0.40)；预期输出用 `<b>` 颜色 #04D793 / 600

**状态枚举：**
| 状态 | 背景 | 边框 | transform |
|------|------|------|-----------|
| default | #161616 | rgba(255,255,255,0.10) | — |
| hover | rgba(255,255,255,0.06) 叠加 | rgba(255,255,255,0.16)（card-hover-border = border-strong） | translateY(-1px) |
| focus-visible | 同 default | 2px solid rgba(67,105,239,0.42)，offset 1px | — |
| active（点击） | 按钮 pressed | — | 触发 `useExample(i)` → 填入 textarea + 输入值 + applyExpr + updateDebugResults |
| loading | 不适用 | — | — |
| empty | 不适用 | — | — |

---

### 2.8 管道阶段（.stage）数据流组件

```
布局：flex-col，margin-bottom 8px；最后一个 stage margin-bottom 0
背景：#1c1c1c（surface-2）
边框：1px solid rgba(255,255,255,0.06)（border-subtle），左侧 3px solid #4369EF（primary accent）
圆角：8px（radius-md）
内边距：12px（space-3）
```

**子元素：**
- **.flow-input**（输入行）：mono 12px / rgba(255,255,255,0.60)；background #161616（surface-1）；border 1px dashed rgba(255,255,255,0.10)；圆角 8px；padding 8px 12px
- **.flow-arrow**：flex-col，align-items center，margin 2px 0；color rgba(255,255,255,0.40)
  - `.bar`：宽 2px，高 10px，background rgba(255,255,255,0.16)（border-strong）
  - `.tip`：9px，line-height 1，下箭头 ▼
- **.stage-head**：flex，gap 8px，margin-bottom 6px
  - `.stage-idx` badge：11px / rgba(255,255,255,0.40)；background rgba(255,255,255,0.06)；边框 rgba(255,255,255,0.10)；圆角 999px；padding 1px 8px
  - 阶段表达式文本：`.stage-expr`，mono，rgba(255,255,255,0.60)，word-break break-all
- **.stage-io**：flex，align-items center，gap 8px，flex-wrap wrap
  - `.io-in`：mono 12px / rgba(255,255,255,0.60)（入值）
  - `.io-arr`：rgba(255,255,255,0.40)，`→`
  - `.io-out`：mono 12px / 600（出值，颜色随类型 chip 类型）
  - `.type-chip`：11px，圆角 999px，padding 1px 7px（见 2.9）
  - `.io-out.waiting`：rgba(255,255,255,0.40) / italic / 400

**阶段状态枚举：**
| 状态 | 触发条件 | 视觉变化（精确 hex/px） | 行为约束 |
|------|---------|----------------------|---------|
| default | 正常计算 | 左边框 3px solid #4369EF；opacity 1 | — |
| waiting | 参数未输入 | io-out 显示「等待输入…」italic | — |
| errored | 该阶段计算失败 | border-color #FF4B7B（border-left + border） | 后续阶段进入 skipped 态 |
| skipped | 前置阶段失败 | opacity 0.45 | 不展示 io-in/io-out 真实值 |
| hover | 不适用 | — | — |
| loading | 不适用 | — | — |
| empty | 不适用 | — | — |
| disabled | 不适用 | — | — |

---

### 2.9 类型 Chip（.type-chip）

```
字体：11px / 1.20（text-label）
圆角：999px（tag-radius）
内边距：1px 7px
```

| 类型 | 背景 | 文字色 |
|------|------|--------|
| number | rgba(67,105,239,0.16)（tone-info-bg） | #4369EF（primary） |
| string | rgba(4,215,147,0.22)（tone-green-strong） | #04D793（success） |
| boolean | rgba(255,170,59,0.16)（tone-warning-bg） | #FFAA3B（warning） |
| null / other | rgba(255,255,255,0.06) | rgba(255,255,255,0.40) |

---

### 2.10 最终结果区（.final-result）

```
背景：#1c1c1c（surface-2）
边框：1px solid #4369EF（primary，成功态）/ 1px solid #FF4B7B（danger，错误态）
圆角：8px（radius-md）
内边距：16px（space-4）
字体：600 20px / 1.30（text-title-1），text-align center，word-break break-all
```

| 状态 | 边框颜色 | 文字颜色 | 字体 |
|------|---------|---------|------|
| waiting | `#4369EF` | rgba(255,255,255,0.40) | 14px italic |
| success | `#4369EF` | rgba(255,255,255,0.90) | 600 20px |
| error | `#FF4B7B` | #FF4B7B | 14px normal |

---

### 2.11 参数输入行（.input-row）

```
布局：flex，align-items center，gap 12px，padding 8px 0，flex-wrap wrap
```

**子元素：**
- **.input-label**（min-width 220px，flex，gap 8px，12px）
  - `.pname`：mono / rgba(255,255,255,0.90)（如 `$1`）
  - `.phint`：rgba(255,255,255,0.40)（描述文字）
  - badge-select 下拉（类型选择器）
- **.input-field**（flex:1，min-width 200px，height 34px，mono font，surface-1 background）
- **.param-msg**（flex-basis 100%，11px，warning 色 #FFAA3B，显示空值警告）

**input-row warn 态：**
- `.input-row.warn .input-field`：border-color #FFAA3B（warning）
- `.param-msg`：display block

---

### 2.12 通过率 Badge（.pass-badge）

```
字体：11px / 700 / letter-spacing 0.3px（text-label + bold）
圆角：999px（tag-radius）
内边距：3px 10px
cursor：pointer，border none，margin-left auto
```

| 变体 | 背景 | 文字色 | 触发条件 |
|------|------|--------|---------|
| ok（全部通过） | #04D793（success） | #08111f（近黑，高对比） | matched === total |
| bad（有失败） | #FF4B7B（danger） | #ffffff | matched < total |

点击行为：`setFilter('mismatch')` → 筛选显示不匹配行

---

### 2.13 历史记录项（.history-item）

```
布局：flex，align-items center，gap 8px，padding 8px 12px
背景：~rgba(28,28,28,0.80)（inspector-soft-card-bg）
边框：1px solid rgba(255,255,255,0.06)（border-subtle）
圆角：8px（inspector-soft-card-radius = radius-md）
```

| 状态 | 背景 | 边框 | 行为 |
|------|------|------|------|
| default | ~rgba(28,28,28,0.80) | rgba(255,255,255,0.06) | — |
| hover | ~rgba(38,38,38,0.62) | rgba(255,255,255,0.10) | — |
| click | — | — | `restoreHistory(i)` → 恢复表达式 + applyExpr |

**子元素：**
- `.hi-expr`：mono / flex:1 / overflow ellipsis / rgba(255,255,255,0.60)
- `.hi-time`：11px / rgba(255,255,255,0.40) / flex-shrink 0（格式：HH:MM）

---

### 2.14 批量结果虚拟表格

**容器（.virtual-container）：**
```
max-height：calc(100vh - 420px)，min-height：160px
overflow：auto；position：relative
边框：1px solid rgba(255,255,255,0.06)（border-subtle），border-top none
```

**行（.vrow）：**
```
height：36px（table-row-height）
display：flex；min-width fit-content；align-items center
border-bottom：1px solid rgba(255,255,255,0.06)
```

| 状态 | 背景 | 触发条件 |
|------|------|---------|
| default（match） | transparent | 实际 = 期望 |
| hover | rgba(255,255,255,0.06) | 鼠标悬停 |
| mismatch | rgba(255,75,123,0.14)（tone-critical-bg） | 实际 ≠ 期望 |
| errored | rgba(255,170,59,0.16)（tone-warning-bg） | 求值抛异常 |

**状态圆圈（.mic）：**
```
宽高：20×20，圆角 999px，font-size 11px / 700，text-align center
```
| 变体 | 背景 | 文字色 | 含义 |
|------|------|--------|------|
| mic-ok | #04D793（success） | #101010（background） | 匹配 |
| mic-fail | #FF4B7B（danger） | #ffffff | 不匹配 |
| mic-err | #FFAA3B（warning） | #101010 | 执行错误 |

---

## 三、色彩 Token（来自 PTO Design System，dark 主题下的 hex 值）

| Token 名 | hex / 值 | 用途 |
|---------|---------|------|
| `--background` | `#101010` | 页面背景 |
| `--surface-1` | `#161616` | 输入框、示例卡背景 |
| `--surface-2` | `#1c1c1c` | panel、stage、stats 背景 |
| `--surface-3` | `#262626` | hover 态叠加 |
| `--surface-4` | `#313131` | toast 背景 |
| `--foreground` | `rgba(255,255,255,0.90)` | 主文字 |
| `--foreground-secondary` | `rgba(255,255,255,0.60)` | 次级文字、表达式 |
| `--foreground-muted` | `rgba(255,255,255,0.40)` | 辅助说明、占位 |
| `--foreground-disabled` | `rgba(255,255,255,0.25)` | 禁用态 |
| `--primary` | `#4369EF` | 品牌蓝，主按钮、激活态、步骤 chip |
| `--primary-hover` | `#5a92e6` | 蓝色 hover |
| `--success` | `#04D793` | 绿色，匹配/成功/string 类型 |
| `--warning` | `#FFAA3B` | 橙色，警告/boolean 类型 |
| `--danger` | `#FF4B7B` | 红色，错误/不匹配 |
| `--accent` | `#7c8db8` | 辅助蓝灰 |
| `--highlight-l0a-violet-source` | `#A855F7` | REF 徽章 violet |
| `--border-subtle` | `rgba(255,255,255,0.06)` | 默认边框 |
| `--border-default` | `rgba(255,255,255,0.10)` | 次级边框 |
| `--border-strong` | `rgba(255,255,255,0.16)` | hover 边框 |
| `--focus-ring` | `rgba(67,105,239,0.42)` | 焦点轮廓 |
| `--tone-critical-bg` | `rgba(255,75,123,0.14)` | 错误行背景 |
| `--tone-warning-bg` | `rgba(255,170,59,0.16)` | 警告行背景 |
| `--tone-info-bg` | `rgba(67,105,239,0.16)` | number 类型 chip 背景 |
| `--tone-green-strong` | `rgba(4,215,147,0.22)` | string 类型 chip 背景 |

---

## 四、字体规格

| 用途 | 字号 | 字重 | 颜色 | 行高 |
|------|------|------|------|------|
| 产品标题（tb-title） | 16px | 600 | rgba(255,255,255,0.90) | 1.30 |
| panel 标题（panel-title） | 16px | 600 | rgba(255,255,255,0.90) | 1.30 |
| 最终结果值（final-result） | 20px | 600 | rgba(255,255,255,0.90) | 1.30 |
| 正文（body-md） | 14px | 400 | rgba(255,255,255,0.90) | 1.50 |
| 次级文字（body-sm） | 12px | 400 | rgba(255,255,255,0.60) | 1.50 |
| 标签 / badge（label-xs） | 11px | 500 | rgba(255,255,255,0.40) | 1.20 |
| 代码 / 表达式（mono） | 12px | 500 | rgba(255,255,255,0.60) | 1.40 |
| 参数名（.pname mono） | 12px | 500 | rgba(255,255,255,0.90) | 1.40 |
| 统计数字（stat-v） | 20px | 600 | 随状态（green/red/orange） | 1.30 |
| BETA 标签（tb-beta） | 11px | 500 | rgba(255,255,255,0.40) | — |

字体族：
- 默认 sans：Inter / Source Han Sans SC / PingFang SC / Noto Sans SC
- 等宽 mono：JetBrains Mono / Fira Code / Consolas

---

## 五、非静态区域

| 区域 | 组件 | 类型 | 空状态处理 |
|------|------|------|----------|
| `#inputs-container` | input-row 列表 | 动态渲染（依据表达式参数数量） | 显示「此表达式无需输入参数」muted note |
| `#pipeline-container` | flow-input + stage 列表 | 动态渲染（依据 stages 数量） | waiting 占位 |
| `#ex-cards` | ex-card × 3 | 静态渲染（3 张固定示例） | — |
| `#history-list` | history-item 列表 | localStorage 读取 | 显示「暂无历史」空态文案 |
| `#tpl-rows` | tpl-row 列表 | 用户手动增删 | 空时无行，添加按钮可见 |
| `#vc / #vcon` | vrow 虚拟滚动 | JS 滚动监听 + 窗口渲染 | 加载用例前区域隐藏 |
| `#tc-stats` | stat 格 × 4 | 批量执行后渲染 | 执行前隐藏 |
| `#tc-filter` | filter-chip 行 | 动态渲染（4 种筛选项） | 执行前隐藏 |

---

## 六、数据 Schema

```typescript
// 管道表达式（解析结果）— 来源：parsePipeExpr() 本地解析
interface ParsedPipeExpr {
  ok: boolean
  error?: string
  inputs: Array<{
    idx: number
    placeholder: string   // e.g., "$1"
    desc: string          // e.g., "参数 $1"
  }>
  stages: Array<{
    fn: string            // e.g., "expr", "string.format", "string.upper"
    args: string[]        // 参数列表（含 $N 占位符）
    raw: string           // 原始阶段字符串
  }>
}

// 单条测试用例 — 来源：parseTestCaseLine() 解析用户输入文本
interface TestCase {
  id: string                    // Math.random 生成
  inputs: (number | string)[]  // 除最后一列外的全部列
  expectedOutput: string        // 最后一列
  actualOutput: string | null
  executionStatus: 'pending' | 'match' | 'mismatch' | 'error'
  lineNumber: number
  createdAt: number             // Date.now()
}

// 批量执行结果摘要 — 来源：executeBatch() 计算
interface BatchStats {
  total: number
  matched: number
  mismatched: number
  errored: number
}

// 历史记录项 — 来源：localStorage key "pipe-eval-history"
interface HistoryItem {
  expr: string       // 表达式字符串
  time: number       // Date.now() 时间戳
}

// 模板变量 — 来源：用户 UI 填写 / postMessage 注入
interface TemplateVar {
  key: string        // ${VarName} 中的 VarName
  val: string
}

// 示例卡片数据 — 来源：EXAMPLES 常量
interface Example {
  title: string
  expr: string
  vals: string[]     // 对应各输入参数的预填值
  out: string        // 预期输出（字符串形式）
}
```

数据来源：全部为**纯本地计算**，无 HTTP 接口。宿主通过 `postMessage` 通道注入模板变量。  
加载时机：表达式由用户手动输入或历史恢复；用例由用户粘贴文本后点击「加载用例」触发解析。  
更新策略：用户交互驱动，无轮询，无 WebSocket。

---

## 七、布局策略

本工具为表单+列表布局，无拓扑图/流程图/树形结构。布局算法使用 CSS Grid：

| 项目 | 规格 |
|------|------|
| 主内容区布局 | CSS Grid，双列（55fr / 45fr），gap 16px |
| 响应式断点 | ≤1024px → 1fr（单栏堆叠） |
| 右栏内容排列 | flex-col，gap 16px，align-items stretch |
| 批量结果表格 | 虚拟滚动（absolute position + JS 窗口计算） |
| 虚拟滚动算法 | 行高固定 36px；根据 `scrollTop / ROW_H` 计算 startIdx/endIdx（±10 buffer） |

---

## 八、交互操作规格 + 状态枚举

### 8.1 模式切换（调试 ↔ 用例）

| 操作 | 是否支持 | 约束 |
|------|---------|------|
| 点击「调试模式」按钮 | ✅ | 显示 dbg-inputs/tpl/history/pipeline/result/empty；隐藏 tc-left/tc-right |
| 点击「用例模式」按钮 | ✅ | 显示 tc-left/tc-right；隐藏 dbg-inputs/tpl/history/pipeline/result/empty |
| 键盘 Tab 选择 | ✅ | role="tab" 原生支持 |

### 8.2 快捷键

| 快捷键 | 作用 | 约束 |
|--------|------|------|
| Ctrl/Cmd + Enter | 应用表达式（applyExpr） | 焦点在 expr-textarea 内时 |
| F5 | 执行批量用例（executeBatch） | 用例模式下，需先加载用例 |

### 8.3 逐组件状态枚举表

#### 表达式输入框（expr-textarea）
见 §二 2.4 完整状态表。

#### 应用表达式按钮（.btn-primary #apply-btn）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default | 正常 | background #4369EF，文字 #fff | — |
| hover | 鼠标移入 | background #5a92e6 | — |
| focus | Tab / 点击 | box-shadow 0 0 0 3px rgba(67,105,239,0.42) | 键盘可见 |
| active | 鼠标按下 | background #5a92e6 | 松开触发 applyExpr |
| disabled | 不适用 | — | 未限制（可随时应用） |
| loading | 不适用 | — | — |
| error | 不适用 | — | — |
| empty | 不适用 | — | — |

#### 示例卡片（.ex-card）
见 §二 2.7 状态枚举表。

#### 操作符 Chip（.op-chip）
见 §二 2.6 状态枚举表。

#### 管道阶段（.stage）
见 §二 2.8 状态枚举表。

#### 参数类型选择器（.badge-select）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default | 加载 | 边框 rgba(255,255,255,0.10)，色 rgba(255,255,255,0.60) | 默认选中 LITERAL |
| focus | 点击 / Tab | border-color #4369EF，outline none | 键盘可选 |
| selected | 用户选择 | 显示所选选项文字 | 不触发重新计算（仅类型标注） |
| disabled | 不适用 | — | — |
| error | 不适用 | — | — |
| loading | 不适用 | — | — |
| empty | 不适用 | — | — |
| hover | 不适用 | 系统原生 select hover | — |

#### 历史记录项（.history-item）
见 §二 2.13 状态枚举表。

#### 通过率 Badge（.pass-badge）
见 §二 2.12 状态枚举表。

#### 筛选 Chip（.filter-chip）
| 状态 | 触发条件 | 视觉变化 | 行为约束 |
|------|---------|---------|---------|
| default（inactive） | 初始 | background rgba(255,255,255,0.06)，border rgba(255,255,255,0.08)，色 rgba(255,255,255,0.60) | — |
| active | 用户点击 | background rgba(67,105,239,0.14)（state-selected），border #4369EF，色 rgba(255,255,255,0.90) | 筛选表格行 |
| hover | 鼠标移入 | 系统默认 | — |
| disabled | 不适用 | — | — |

#### 批量结果虚拟表格行（.vrow）
见 §二 2.14 状态枚举表。

---

## 九、关键交互序列 + 数据流

### 9.1 应用表达式（主流程）

1. **触发**：用户在 expr-textarea 输入表达式后，点击「应用表达式」按钮或按 Ctrl+Enter
2. **即时反馈**：`parsePipeExpr(raw)` 同步解析（< 1ms）；若失败 → inline-msg 显示错误文案（err 态）；若成功 → inline-msg 显示「✓ 已应用」（ok 态，3s 后隐藏）
3. **本地计算**：`renderInputFields()` 重新渲染参数行（依据 parsedExpr.inputs）；`renderPipelineSlots()` 渲染管道骨架
4. **成功响应**：参数行出现，右栏管道轨迹更新占位结构；历史记录写入 localStorage（去重判断）
5. **失败响应**：inline-msg err 显示具体错误（如「期望 ')'，但得到 null」）；textarea 边框变 #FF4B7B；pipeline 不更新
6. **逆操作**：点击「重置」→ 恢复到 DEFAULT_EXPR，清空历史当次状态

```
用户输入 → parsePipeExpr() → {ok, inputs, stages}
  → renderInputFields() → DOM input-row × N
  → renderPipelineSlots() → DOM stage × N
  → saveHistory(expr)   → localStorage
```

### 9.2 实时参数计算（输入驱动）

1. **触发**：用户在 input-field 输入值（300ms debounce）
2. **即时反馈**：无显式 loading（本地计算 < 5ms），直接更新
3. **本地计算**：`updateDebugResults()` → 逐阶段调用 `_evalStage()` → 收集 intermediates
4. **成功响应**：
   - flow-input 行更新为实际输入值
   - 各 stage-io 显示 in → out + type-chip
   - final-result 显示最终值（success 态）
   - 右栏空态卡片隐藏，pipeline + result 显示
5. **失败响应**：
   - 失败阶段 `.stage.errored`（红色左边框）
   - 后续阶段 `.stage.skipped`（opacity 0.45）
   - final-result 显示错误信息（error 态，红色边框）
6. **参数为空**：input-row 进入 warn 态（边框 orange）+ param-msg 显示警告

```
inputValues 数组 → evaluator.evaluate(parsedExpr, inputValues, templateVarsMap)
  → { success, result, intermediates }
  → updateFlowInput(inputValues) + updateStageIO(intermediates)
  → updateFinalResult(result)
```

### 9.3 批量用例执行

1. **触发**：用例模式下，用户粘贴文本 → 点击「加载用例」或按 F5
2. **加载阶段**：`parseTestCaseText(text)` → `{cases, errors}`；若有解析错误 → tc-load-err errbox 显示
3. **执行**：`executeBatch()` → 遍历 testCases，每条调用 `evaluator.evaluate()`，比较 `String(result)` vs `expectedOutput`；更新 executionStatus
4. **成功响应**：
   - stats 格（总计/通过/不匹配/错误）渲染
   - filter-bar 筛选 chip 渲染（含各类计数）
   - pass-badge 显示（ok/bad）
   - 虚拟表格渲染（默认 filter: all）
5. **失败响应（解析错误）**：errbox 显示行号 + 错误文案；testCases 不更新
6. **逆操作**：点击「清空」→ clearTestCases()，重置所有状态

```
文本输入 → parseTestCaseText() → testCases[]
  → executeBatch(): testCases.forEach → evaluator.evaluate()
  → 比对 actualOutput vs expectedOutput → executionStatus
  → renderBatchStats() + renderFilterBar() + renderBatchResults()
  → 虚拟滚动：scroll event → renderVirtualRows(startIdx, endIdx)
```

### 9.4 示例卡片一键填入

1. **触发**：用户点击任意 `.ex-card` 按钮
2. **即时反馈**：`useExample(i)` 同步执行（< 5ms）
3. **处理**：填入 textarea.value = EXAMPLES[i].expr；设置 inputValues；调用 applyExpr()；调用 updateDebugResults()
4. **结果**：右栏从空态（示例卡片）切换到有数据态（管道轨迹 + 最终结果）
5. **失败**：不适用（示例卡片数据经 node 验证，必然求值成功）

### 9.5 postMessage 模板变量注入

宿主环境（如 BMC Studio Webview）通过 `postMessage` 向工具注入模板变量：

```javascript
// 宿主发送
window.postMessage({ type: 'TEMPLATE_VARS_UPDATE', vars: { DeviceName: 'bmc-01', Slot: '2' } }, '*')

// 工具接收（src/services/pipeEvalBridge.js）
window.addEventListener('message', evt => {
  if (evt.data?.type === 'TEMPLATE_VARS_UPDATE') {
    updateTemplateVars(evt.data.vars)   // 更新 templateVars state → 重新计算
  }
})
```

---

## ⚠️ 待设计师确认

1. [ ] **阶段切换动画**：调试模式下，空态 → 有数据时右栏的 opacity/transform 过渡时长与缓动（建议 200ms easing-out）
2. [ ] **表达式应用 vs 未应用状态**：用户修改 textarea 后是否立即清除「已应用」态（当前行为：3s 自动消失）；是否需要「已修改未应用」的持续提示
3. [ ] **历史记录条数上限**：当前实现未限制（localStorage 可无限追加）；建议设上限（如 20 条）并 FIFO 淘汰
4. [ ] **参数类型标注的联动行为**：改变 badge-select 是否应触发重新计算（当前不触发）；SYNC/REF 类型的语义定义（需产品确认是否需要真实宿主联动）
5. [ ] **超长表达式截断**：history-item 用 ellipsis 截断，截断前几个字符；tooltip 显示完整表达式的方案

---

## 十、机会点 → uxspec 落地对照（产品验收视角）

> 来源：阶段一 PROMPT-Demo优化提示词.md §B/§C/§E 机会点，对照本轮 Demo v2 + uxspec 兑现情况。

| 机会点 / 原始问题（阶段一 §B） | 优先级 | 落地状态 | 在 uxspec 的落点 | 未落地原因 |
|-------------------------------|--------|---------|-----------------|----------|
| B11：首屏 ~50% 空白，无引导 → 3 张可点击示例卡片 | P0 | ✅ 已落地 | §二 2.7 示例卡片 + §九 9.4 交互序列 | — |
| B12：20+ 操作符一行挤压 → 分类 Chip 组（输入/字符串/自定义） | P0 | ✅ 已落地 | §二 2.6 op-panel + 操作符分组表 | — |
| B13：宽屏内容孤岛 → 双栏布局（55/45） | P0 | ✅ 已落地 | §一 1.1 ASCII 树 + §七 布局策略 | — |
| B14：管道阶段纯文本堆叠 → 箭头 + in→op→out + 类型 chip | P1 | ✅ 已落地 | §二 2.8 stage + §二 2.9 type-chip + §九 9.2 | — |
| B15：无通过率摘要 → pass-badge + 行级状态色 | P1 | ✅ 已落地 | §二 2.12 pass-badge + §二 2.14 vrow 状态 | — |
| B1/F2：alert() → inline 实时校验（300ms debounce） | P0 | ✅ 已落地 | §二 2.5 inline-msg + §九 9.1 | — |
| B2：参数为空 alert → 行内 warning | P0 | ✅ 已落地 | §二 2.11 input-row warn 态 | — |
| C1：Ctrl+Enter / F5 快捷键 | P0 | ✅ 已落地 | §八 8.2 快捷键表 | — |
| F1：英文字符串中文化 | P1 | ✅ 已落地 | 全文 UI 文案已中文化 | — |
| F5/B5：参数徽章动态类型 | P1 | ✅ 已落地 | §二 2.11 badge-select | — |
| C2：表达式历史 localStorage | P1 | ✅ 已落地 | §二 2.13 + §六 HistoryItem schema | — |
| C3：批量结果筛选 chip | P1 | ✅ 已落地 | §八 8.3 filter-chip 状态枚举 | — |
| F4/B10：全面 token 化（零硬编码颜色） | P1 | ✅ 已落地 | §三 色彩 Token 表（全 PTO 语义 token） | — |
| C5/B3：模板变量折叠面板 + postMessage 通道 | P0 | ✅ 已落地 | §九 9.5 postMessage 序列 | — |
| F3/B8：顶栏 56px → 44px 紧凑 toolbar | P1 | ✅ 已落地 | §二 2.1 topbar | — |
| F6/B9：章节标题 Emoji → SVG 图标 | P2 | ✅ 已落地 | §二 panel-title（各 SVG） | — |
| 可访问性修复（A1-A12） | 工程必修 | ⛔ Demo 未修 | 已列入 accessibility-audit.md；工程版 Step 5 修复 | Demo 阶段不修 a11y；工程代码需全修 |
| D1-D8 设计改进点 | 迭代改进 | ◑ 部分规划 | 已列入 design-review.md；D1-D5 工程版修复 | D6-D8 移交下一迭代 |

> P0 全部已落地；P1 全部已落地；P2 全部已落地。可访问性问题为工程版必修项，已逐条列明修复方案。
