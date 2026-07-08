# Demo 优化提示词 · 管道表达式批量评估器

> 模式：**优化已有 Demo**（原始 VS Code Webview Demo → 专业级 PTO Design System 版本）  
> 输入：`previewbatchevaluator.html`（原始版本）  
> 产出：单文件 HTML，CSS 全内联零外链，可双击预览，可在 VS Code Webview 中运行

---

## 一、产品定位与目标用户

**是什么**：管道表达式调试与批量验证工具。用户写一条管道表达式（`$1;$2 |> expr($1 + $2) |> string.format("%.2f", $1)`），填入参数值，右侧实时展示每个管道阶段的中间输出。也可切换到「用例模式」，批量粘贴 CSV 测试数据并执行，查看通过率和差异对比。

**给谁用**：BMC 固件/嵌入式工程师，技术背景高（熟悉 Lua 语法、位运算、正则）。日常在 VS Code 里工作。

**嵌入约束**：单文件 HTML，零外链（CSS/JS 全内联），能在 VS Code Webview 里运行，也能双击浏览器预览。

---

## 二、设计系统规格（PTO Design System）

用以下三层 CSS token 体系替换原始 VS Code 主题变量：

### Foundation tokens（基础层）

```css
:root {
  /* Neutral */
  --ark-neutral-0: #0b0b0b; --ark-neutral-1: #101010;
  --ark-neutral-2: #141414; --ark-neutral-3: #1a1a1a;
  --ark-neutral-4: #343434;
  /* Accent */
  --ark-blue-500: #4369ef; --ark-blue-600: #5a92e6;
  --ark-domain-aux: #7c8db8;
  --ark-green-500: #04d793; --ark-orange-500: #ffaa3b; --ark-red-500: #ff4b7b;
  --highlight-l0a-violet-source: #A855F7;
  /* Typography */
  --font-sans: 'Inter','Source Han Sans SC','PingFang SC',sans-serif;
  --font-mono: 'JetBrains Mono','Fira Code','Consolas',monospace;
  /* Spacing: --space-1:4px to --space-6:24px */
  /* Radius: --radius-sm:6px --radius-md:8px --radius-lg:12px --radius-pill:999px */
  /* Motion: --duration-fast:100ms --duration-base:200ms */
}
```

### Semantic tokens（语义层，三主题）

```css
/* dark（默认） */
:root, :root[data-theme='dark'] {
  --background: var(--ark-neutral-1);
  --surface-1: #161616; --surface-2: #1c1c1c; --surface-3: #262626; --surface-4: #313131;
  --foreground: rgba(255,255,255,.90);
  --foreground-secondary: rgba(255,255,255,.60);
  --foreground-muted: rgba(255,255,255,.40);
  --border-subtle: rgba(255,255,255,.06);
  --border-default: rgba(255,255,255,.10);
  --border-strong: rgba(255,255,255,.16);
  --primary: var(--ark-blue-500); --primary-hover: var(--ark-blue-600);
  --success: var(--ark-green-500); --warning: var(--ark-orange-500); --danger: var(--ark-red-500);
  --tone-critical-bg: color-mix(in srgb,var(--danger) 14%,transparent);
  --tone-warning-bg: color-mix(in srgb,var(--warning) 16%,transparent);
  --tone-info-bg: color-mix(in srgb,var(--primary) 16%,transparent);
  --tone-green-strong: color-mix(in srgb,var(--success) 22%,transparent);
  --state-hover: rgba(255,255,255,.06);
  --state-selected: rgba(67,105,239,.14);
  --focus-ring: rgba(67,105,239,.42);
}
/* light */
:root[data-theme='light'] {
  --background: #F5F5F5; --surface-1: #FFFFFF; --surface-2: #F2F2F2; --surface-3: #E6E6E6;
  --foreground: rgba(0,0,0,.90); --foreground-secondary: rgba(0,0,0,.55);
  --foreground-muted: rgba(0,0,0,.42);
  --border-subtle: rgba(0,0,0,.07); --border-default: rgba(0,0,0,.12);
  --state-hover: rgba(0,0,0,.05); --state-selected: rgba(67,105,239,.10);
}
/* glass：深色背景 + backdrop-filter 毛玻璃，参考 PTO glass 主题实现 */
```

### Component tokens

```css
:root {
  --comp-toolbar-height: 44px;
  --comp-toolbar-bg: color-mix(in srgb,var(--background) 92%,black);
  --button-height-sm: 30px; --button-radius: var(--radius-lg);
  --input-height-md: 34px; --input-radius: var(--radius-md);
  --panel-radius: var(--radius-lg); --panel-bg: var(--surface-2);
  --table-row-height: 36px;
  --tag-height: 20px; --tag-radius: var(--radius-pill);
  --stat-chip-height: 22px;
}
```

**约束**：所有颜色引用 semantic token，禁止硬编码颜色（除 SVG icon `currentColor` 外）。

---

## 三、布局规格

### 顶栏（替换原 56px 蓝色横幅）

- 高 44px，背景 `--comp-toolbar-bg`，`border-radius: var(--radius-lg)`，1px border
- 从左到右：SVG 图标（`color:var(--primary)`）· 「管道表达式批量评估器」· Beta pill tag · 弹性空间 · 主题 segmented control（暗色/亮色/玻璃）

### 主体双栏布局

```css
.main-grid {
  display: grid;
  grid-template-columns: minmax(0,55fr) minmax(0,45fr);
  gap: var(--space-4); align-items: start;
}
@media (max-width:1024px){ .main-grid{ grid-template-columns:1fr; } }
```

- **左栏 55%（操作区）**：① 管道表达式（含操作符面板）· ② 输入参数 · 模板变量（折叠）· 历史记录（调试模式）；加载测试用例（用例模式）
- **右栏 45%（反馈区）**：空态示例卡片（引导） · ③ 管道处理 · ④ 最终结果（调试模式）；③ 批量执行 · ④ 执行结果（用例模式）

步骤编号 chip（圆形，20×20，`border:1.5px solid var(--primary)`）用于标注每个面板的步骤序号。

---

## 四、功能规格（逐条实现要求）

### B1 — 内联校验（替换 alert）

textarea 下方紧跟 `.inline-msg` 区域，用户停止输入 300ms 后触发（debounce）：
- 成功：绿色 ✓ + `解析成功 · N 个输入 · M 个阶段`
- 失败：红色 ⚠ + 错误详情；textarea 加 `border-color:var(--danger)`
- 点「应用」按钮再次校验，通过才更新 `parsedExpr`
- 验证规则：①不能为空 ②至少声明 `$1` ③函数名在已知列表内

### B2 — 参数警告（替换 alert 中断）

参数未填时：对应行加 warning border，行下方 `.param-msg` 显示橙色小字 `参数 $N 未提供`（inline，不弹 alert）。只在用户已触碰（touched）输入框后才显示。

### B3 — 模板变量面板

折叠面板（默认折叠，localStorage `pipe-eval-tpl-open` 记忆）。展开显示键值对列表：
```
[变量名]  [值]  [× 删除]
```
「+ 添加变量」按钮。任意字段修改立即重新求值。

监听 `window.message` 宿主桥：
- `{type:'setTemplateVars', payload:{key:value,...}}` → 填入面板 + 自动展开 + 重算
- `{type:'setExpression', payload:string}` → 填入表达式框 + apply
- `{type:'setBadgeTypes', payload:string[]}` → 更新参数 badge 类型

### B5 — 参数 badge 动态选择

每个参数行含一个 `<select class="badge-select">`，选项：SYNC/REF/CONST/LITERAL/TEMPLATE。切换后 badge chip 颜色联动：
- SYNC：蓝色（`--tone-info-bg`）
- REF：紫色（`--highlight-l0a-violet-source` 系）
- CONST：绿色（`--tone-green-strong`）
- LITERAL：灰色（`--state-muted`，默认）
- TEMPLATE：橙色（`--tone-warning-bg`）

### B8 — 操作符 Chip 面板

折叠面板（默认展开，localStorage `pipe-eval-op-open` 记忆）。三组分类：
- **输入**（蓝色点）：`$1`、`;$2`、` |> `
- **字符串**（绿色点）：`string.format`、`string.upper`、`string.lower`、`string.sub`、`string.gsub`、`string.cmp`
- **自定义**（橙色点）：`expr()`

chip 样式：`font-family:mono`，11px，hover 上浮 1px + border 加深。点击插入到 textarea 光标位置（`selectionStart/End`）。hover title 显示函数签名说明。

### B9 — SVG 图标（替换 emoji）

所有按钮/面板标题使用 `<svg>` inline 图标，`stroke:currentColor`，无 emoji。具体图标：
- 管道（表达式面板）、下载箭头（输入参数）、闪电（管道处理）、星星（最终结果）、时钟（历史）、变量符（模板变量）、播放（执行）、重置弧线（重置）

### B10 — PTO token 全面使用

所有颜色引用 semantic token，零硬编码颜色（border、background、text 全部用变量）。

### B11 — 空态示例卡片

右栏，参数未填时显示（填满后自动隐藏）。3 张可点击卡片，每张含：标题、表达式（mono font，主色）、预填值和预期输出。

点击：自动 apply 表达式 → 填入参数 → 显示管道轨迹 → showToast「示例已填入，轨迹见右侧」。

```
示例 1：两数求和并格式化
  $1;$2 |> expr($1 + $2) |> string.format("%.2f", $1)
  预填: 3, 4 → "7.00"

示例 2：去空格并转大写
  $1 |> string.gsub($1, " ", "") |> string.upper($1)
  预填: bmc studio → "BMCSTUDIO"

示例 3：条件判断（Lua 风格 ?:）
  $1 |> expr($1 > 0 ? "正数" : "非正数")
  预填: 5 → "正数"
```

### B12 — 操作符面板（同 B8，加 hover tooltip）

### B13 — 双栏布局（同布局规格章节）

### B14 — 管道数据流轨迹（强化原有管道视图）

每个阶段区块：
```
[阶段 N chip]  [表达式原文]
入 {上一输出}  →  出 {本阶段输出}  [类型 chip]
```
类型 chip：number=蓝、string=绿、boolean=橙。阶段间竖向箭头（bar + ▼）。

出错阶段：border 变红，显示错误消息。后续阶段：`opacity:.45`，显示「未执行」。

### B15 — 通过率 badge + 结果筛选

执行结果标题右侧：pill 形 badge（全通过=绿 `✓ 通过 N/N`；有失败=红 `✗ 通过 N/M`）。点击 badge 筛选到不匹配视图。

筛选 chip 行（表格上方）：`[全部 N]  [匹配 N]  [不匹配 N]  [错误 N]`，active chip 高亮。

### C1 — 键盘快捷键

- 调试模式：`Ctrl/Cmd+Enter` → applyExpr
- 用例模式：`F5` → executeBatch（仅在有用例时）
- 表达式框底部显示快捷键提示（muted 小字）

### C2 — 历史记录

左栏最下方，panel 标题「历史表达式 · 本地保存，点击恢复」。每次 apply 成功后推入（去重，最新在前，最多 20 条）。localStorage key `pipe-eval-history`。显示表达式（省略）+ 相对时间。点击恢复：填入表达式 + apply + 切换调试模式。

### C3 — 结果筛选（同 B15）

### C5 — postMessage 宿主桥（同 B3）

### F1 — 全中文化

原始 Demo 中所有英文 UI 标签替换为中文（Execute All→执行全部，Export Results→导出结果，Showing X→显示 X–Y / 共 Z，Total/Success/Failed/Matched/Mismatched→合计/成功/失败/匹配/不匹配，Input/Expected/Actual/Status→输入/期望输出/实际输出/状态）。

### F3 — 紧凑 toolbar（44px）

替换原 56px 蓝色大横幅，采用 `--comp-toolbar-height: 44px` 样式，视觉轻量。

### F4 — PTO token 系统（同 B10）

### F5 — badge 类型系统（同 B5）

### F6 — SVG 图标（同 B9）

---

## 五、求值核心（保持原样，零改动）

以下从原始 Demo 逐字移植，求值逻辑零改动：
- `SafeExpressionParser`
- `PipeEvaluator`（含所有 `string.*` 实现）
- `parsePipeExpr`、`splitArgs`、`parseTestCaseText`、`tokenizeLine`

**唯一允许的求值层改动**：修复 `_luaPatToRegex` 中 `+` 被转义的 bug（`+` 在 magic 集导致 `%d+` 量词失效，改为：`+` 和 `*` 和 `?` 在不被 `%` 引导的情况下保持原 regex 量词语义而非转义）。

---

## 六、交付门禁

- [ ] 单文件 HTML，零外部 `<script src>` 或 `<link>`
- [ ] 三主题（暗色/亮色/玻璃）可切换，视觉正确
- [ ] 调试模式：参数填写后管道轨迹实时更新，含类型 chip 和阶段间箭头
- [ ] inline 校验：空表达式/未知函数显示 inline 错误，不使用 alert
- [ ] 参数 badge 可选，5 种类型，颜色联动
- [ ] 操作符面板：三组 chip，点击插入光标处
- [ ] 示例卡片：3 张，点击一键填入并展示轨迹
- [ ] 历史记录：apply 成功后自动保存，最多 20 条，点击恢复
- [ ] 模板变量面板：手动添加 + postMessage 注入
- [ ] 全部文字标签为中文（无英文混用）
- [ ] `Ctrl+Enter` 应用，`F5` 执行批量
- [ ] 通过率 badge + 4 个筛选 chip
- [ ] 虚拟滚动：不匹配行淡红、错误行淡橙、状态图标圆形 badge
