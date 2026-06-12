# 管道表达式批量评估器 · 优化版 Demo Prompt
> 模式：**存量优化**（基于 `86234586-previewbatchevaluator.html` 改进）
> 目标平台：VS Code WebView（Electron Chromium）

---

## §A — VS Code 设计系统基线

使用以下 CSS token 替换所有硬编码颜色值；在 WebView 内 `document.documentElement` 上这些变量由 VS Code 宿主自动注入，支持亮/暗主题自动切换。

### 颜色 Token（必须使用）

| 语义                  | CSS 变量                                     | 亮主题参考值  | 暗主题参考值  |
|-----------------------|----------------------------------------------|--------------|--------------|
| 主背景                | `--vscode-editor-background`                 | `#ffffff`    | `#1e1e1e`    |
| 侧边栏背景            | `--vscode-sideBar-background`                | `#f3f3f3`    | `#252526`    |
| 主文字                | `--vscode-editor-foreground`                 | `#000000`    | `#d4d4d4`    |
| 次要文字              | `--vscode-descriptionForeground`             | `#717171`    | `#8a8a8a`    |
| 输入框背景            | `--vscode-input-background`                  | `#ffffff`    | `#3c3c3c`    |
| 输入框边框            | `--vscode-input-border`                      | `#bebebe`    | `#3c3c3c`    |
| 输入框聚焦边框        | `--vscode-focusBorder`                       | `#0090f1`    | `#007fd4`    |
| 主按钮背景            | `--vscode-button-background`                 | `#0078d4`    | `#0e639c`    |
| 主按钮文字            | `--vscode-button-foreground`                 | `#ffffff`    | `#ffffff`    |
| 主按钮悬停            | `--vscode-button-hoverBackground`            | `#026ec1`    | `#1177bb`    |
| 次要按钮背景          | `--vscode-button-secondaryBackground`        | `#5f6a79`    | `#3a3d41`    |
| 列表悬停背景          | `--vscode-list-hoverBackground`              | `#e8e8e8`    | `#2a2d2e`    |
| 列表选中背景          | `--vscode-list-activeSelectionBackground`    | `#0060c0`    | `#094771`    |
| 成功色                | `--vscode-testing-iconPassed`                | `#388a34`    | `#73c991`    |
| 失败色                | `--vscode-testing-iconFailed`                | `#f14c4c`    | `#f48771`    |
| 警告色                | `--vscode-editorWarning-foreground`          | `#bf8803`    | `#cca700`    |
| 边框（通用）          | `--vscode-panel-border`                      | `#e5e5e5`    | `#3c3c3c`    |
| 标签激活背景          | `--vscode-tab-activeBackground`              | `#ffffff`    | `#1e1e1e`    |
| 标签非激活背景        | `--vscode-tab-inactiveBackground`            | `#ececec`    | `#2d2d2d`    |
| 徽章背景              | `--vscode-badge-background`                  | `#c4c4c4`    | `#4d4d4d`    |
| 徽章前景              | `--vscode-badge-foreground`                  | `#333333`    | `#ffffff`    |
| 滚动条滑块            | `--vscode-scrollbarSlider-background`        | `#64646464`  | `#79797966`  |

### 字体 Token

```css
font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
font-size:   var(--vscode-font-size, 13px);
font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Consolas', monospace); /* 代码区 */
font-size:   var(--vscode-editor-font-size, 13px);
```

### 间距规范（VS Code 习惯）

| 用途             | 值      |
|-----------------|---------|
| 面板内边距       | `16px`  |
| 行间距（列表行） | `22px`  |
| 元素间距         | `8px`   |
| 紧凑间距         | `4px`   |
| 圆角（输入框）   | `2px`   |
| 圆角（按钮）     | `2px`   |

---

## §B — 现有 UI 问题（量化描述）

按优先级从高到低列出，每项均有截面 + 性质标注：

### P0 — 阻碍核心功能

| # | 位置 | 问题 | 量化描述 |
|---|------|------|---------|
| B1 | 表达式输入区 | **无实时语法校验**：表达式错误只在点击"应用"后才通过 `alert()` 报错 | 用户需要切换焦点→等待→alert→确认→回焦点，共 5 步操作才能获得错误反馈 |
| B2 | 调试区参数输入 | **参数未提供错误**通过 `alert()` 弹出，打断输入流 | 单次失误导致全屏焦点离开，无法就地修复 |
| B3 | 模板变量注入 | **${VarName} 无法在 Demo 中赋值**，替换逻辑存在但不生效 | 整个 templateVars 通道为空 Map，功能对用户完全不可见 |

### P1 — 影响专业度 / 可扩展性

| # | 位置 | 问题 | 量化描述 |
|---|------|------|---------|
| B4 | 批量结果表格 | **表头/按钮英文**（"Input"、"Expected"、"Actual"、"Status"、"Execute All"、"Export Results"、"Total"、"Success"、"Failed"、"Matched"、"Mismatched"）与其余中文 UI 不一致 | 共 11 处英文字符串混入中文界面 |
| B5 | 参数徽章 | **全部硬编码为 `.badge-sync`**，badge-ref/const/literal/template 已定义但从未使用 | 5 种语义徽章中仅 1 种被启用，参数类型信息无法区分 |
| B6 | 键盘操作 | **无键盘快捷键**：Ctrl+Enter 无法提交表达式，Tab 顺序未优化，无法完全脱离鼠标 | 典型开发者操作流中需要在键盘↔鼠标间切换 3+ 次 |
| B7 | 测试用例历史 | **无历史/收藏**：每次刷新都要重新输入表达式和测试用例 | 无持久化机制 |

### P2 — 视觉/品牌一致性

| # | 位置 | 问题 | 量化描述 |
|---|------|------|---------|
| B8 | 顶部标题区 | **全宽蓝色横幅**（`#0078d4` 背景）在 VS Code 中视觉突兀；硬编码颜色无法跟随主题切换 | 横幅高度 ~56px，占 WebView 初始可见区域约 12% |
| B9 | 章节标题 | **Emoji 前缀**（🔬 ⚡ 📋）与 VS Code 原生 Outline 风格不符 | 4 个章节标题均含 Emoji |
| B10 | 暗主题 | **硬编码颜色不支持 VS Code 暗主题** | 共计约 30 处 `#xxxxxx` 硬编码颜色 |

---

## §C — 目标状态映射

每个问题对应的期望改后状态：

| 问题 | 目标状态 |
|------|---------|
| B1 无实时校验 | 输入框下方出现 inline 错误提示文字（红色，使用 `--vscode-inputValidation-errorBorder`），延迟 300ms debounce 触发；不使用 alert() |
| B2 参数 alert | 参数输入框右侧/下方出现 inline 提示，参数行变 warning 样式；不弹 alert() |
| B3 模板变量不可见 | 在调试区增加"模板变量"折叠面板，可手动添加 key-value 对；同时接受 postMessage 注入 |
| B4 英文字符串 | 全部替换为中文：输入/期望/实际/状态/执行全部/导出结果/合计/成功/失败/匹配/不匹配 |
| B5 徽章硬编码 | 根据参数来源类型（同步/引用/常量/字面量/模板）动态选择徽章类，默认 literal |
| B6 无快捷键 | Ctrl+Enter 应用表达式；Tab 在参数输入框间跳转；F5 / Ctrl+R 执行批量 |
| B8 蓝色横幅 | 改为紧凑顶栏（高度 ≤ 32px），背景使用 `--vscode-titleBar-activeBackground`；移除硬编码颜色 |
| B9 Emoji 标题 | 移除 Emoji，改用 VS Code 原生 Codicons 图标（`$(beaker)` `$(play)` `$(list-unordered)`） |
| B10 暗主题 | 全部替换为 `--vscode-*` token；不保留任何 `#xxxxxx` 硬编码颜色（Logo 除外） |

---

## §D — 跨视图一致性要求

1. **语言一致**：所有 UI 文本统一为中文；仅技术标识符（如函数名 `expr`、`string.format`）保持英文。
2. **主题跟随**：所有颜色均通过 CSS token，不存在 hardcoded 颜色值（背景、边框、文字、图标色全部使用 `--vscode-*`）。
3. **间距规范**：统一使用 §A 定义的间距值；按钮高度统一 `28px`，与 VS Code 工具栏一致。
4. **字体规范**：UI 文本使用 `--vscode-font-family`；表达式/代码区使用 `--vscode-editor-font-family`。
5. **聚焦状态**：所有可交互元素 `:focus-visible` 使用 `outline: 1px solid var(--vscode-focusBorder)`。

---

## §E — 各视图设计要求

### E1 — 顶栏（替换蓝色横幅）

```
┌─────────────────────────────────────────────────────────┐
│ [$(beaker)] 管道表达式批量评估器     [调试] [批量测试]   │  ← 32px
└─────────────────────────────────────────────────────────┘
```
- 背景：`--vscode-titleBar-activeBackground`
- 文字：`--vscode-titleBar-activeForeground`
- 模式切换按钮为 `<button>` tab 样式，激活态用 `--vscode-tab-activeBackground`

### E2 — 表达式输入区

```
管道表达式
┌──────────────────────────────────────────────────────┐
│ $1;$2 |> expr($1 + $2) |> string.format("%.2f", $1) │
└──────────────────────────────────────────────────────┘
  ← inline 错误区（仅在有错误时展示，不占位）
[应用表达式]  Ctrl+Enter
```
- textarea 字体使用 monospace token
- 错误提示颜色：`--vscode-inputValidation-errorForeground`，边框：`--vscode-inputValidation-errorBorder`
- debounce: 300ms（先做语法高亮，500ms 后做完整解析校验）

### E3 — 调试模式参数区

```
参数 $1  [LITERAL ▾]  ┌──────────┐  →  结果：42
参数 $2  [LITERAL ▾]  └──────────┘
                       ↑ 此处出错时行变 warning 样式（不弹 alert）
```
- 徽章类型下拉（仅 UI 预留，值暂存本地；通过 postMessage 覆盖）
- 实时计算结果（无需点击，输入后 debounce 200ms）

### E4 — 模板变量面板（新增）

```
▶ 模板变量  [+ 添加]
  ${ServerAddr}  ┌─────────────────┐  [×]
                 └─────────────────┘
```
- 折叠/展开状态持久化（localStorage）
- 变量值更改后自动触发 `updateDebugResults()`

### E5 — 批量测试区

**测试用例输入：**
- 标签改为"测试用例输入"
- placeholder 改为中文说明

**结果表格（全中文化）：**

| 列名     | 原英文       | 改后中文 |
|----------|-------------|---------|
| 输入     | Input       | 输入     |
| 期望输出 | Expected    | 期望输出 |
| 实际输出 | Actual      | 实际输出 |
| 状态     | Status      | 状态     |

**操作按钮：**
- "Execute All" → "执行全部"（快捷键标注 F5）
- "Export Results" → "导出结果"

**统计行：**
- Total → 合计，Success → 成功，Failed → 失败，Matched → 匹配，Mismatched → 不匹配

---

## §F — 状态覆盖清单

优化后的 Demo 必须覆盖以下所有状态，每种状态均有对应 UI 呈现：

| 状态 ID | 描述                             | 触发方式                          |
|---------|----------------------------------|-----------------------------------|
| S01     | 初始空态（无表达式）              | 页面加载                          |
| S02     | 表达式输入中（语法错误，实时提示）| 输入残缺表达式                    |
| S03     | 表达式已应用（无参数）            | 输入 `$1 |> expr($1 * 2)` 后应用  |
| S04     | 参数输入中，结果实时更新          | 调试模式下修改参数值              |
| S05     | 参数为空，inline 警告             | 清空某参数后触发                  |
| S06     | 管道中间步骤展开                  | 点击展开 intermediates            |
| S07     | 模板变量面板展开，已有变量        | 展开面板后添加变量                |
| S08     | 批量用例加载完成（N 条，无错误）  | 粘贴合法用例文本                  |
| S09     | 批量用例有解析错误                | 含非法行的用例文本                |
| S10     | 批量执行中（loading）             | 点击"执行全部"后 UI 刷新前        |
| S11     | 批量执行完成，有 match / mismatch | 执行完成                          |
| S12     | 单条用例展开详情                  | 点击某行                          |
| S13     | 虚拟滚动（100+ 条结果）           | 提供大量测试用例                  |
| S14     | 暗主题下全部状态正常              | 切换 VS Code 主题                 |

---

## 实现优先级说明

严格按照 P0 → P1 → P2 顺序实现；P2 在代码结构完整的情况下一并完成：

- **必须实现（P0）**：B1（inline 语法校验）、B6（Ctrl+Enter 快捷键）
- **应当实现（P1）**：B4（中文化）、B8（顶栏重构）、B10（主题 token）
- **尽量实现（P2）**：B5（徽章动态）、B9（移除 Emoji）、B3（模板变量面板）

> B7（历史持久化）属于新功能，超出本次优化范围，**不在本次 Demo 实现**。
