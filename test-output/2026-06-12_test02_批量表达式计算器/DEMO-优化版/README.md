# 管道表达式批量评估器 · 优化版 Demo

> 输入：`86234586-previewbatchevaluator.html`（存量优化模式）
> 设计系统：[PTO Design System](https://github.com/yinyucheng0601/pto-design-system)（ArkUI 风格，dark/light/glass 三主题）
> 实现范围：P0 + P1 + P2 全量

## 文件结构

```
optimized-demo/
├── index.html                    优化版 Demo（CSS 全内联·单文件自包含·求值核心逐字移植）
├── design-system/                ← 仅工程参考快照，不被 index.html 引用
│   ├── foundation.css            原子 token（颜色/字体/间距/圆角/阴影/动效）
│   ├── semantic.css              语义 token（background/surface/foreground/primary…，三主题）
│   └── components.css            组件 token（button/input/card/table/badge/segmented…）
└── README.md
```

> **⚠ 自包含说明**：`index.html` 已把 PTO 三层 token CSS **全部内联进 `<style>` 块**，零外链、可独立双击/预览打开。早期版本曾用 `<link href="design-system/*.css">` 外链，导致文件被单独预览时 CSS 404、整页裸奔——现已修复。`design-system/` 目录仅保留作为工程接入时的 token 源参考。

## 求值核心：逐字移植，零行为改动

`SafeExpressionParser` / `PipeEvaluator` / `parsePipeExpr` / `parseTestCaseText` 全部从原 Demo 逐字移植，**未改动任何求值逻辑**。通过 node 运行验证门复算 10 组用例确认行为一致（详见 `../business-logic.md` 第九节）。

> ⚠ 验证中发现原 Demo 的 `string.gsub` Lua 量词缺陷（`%d+` 失效），移植版**刻意保持一致**，缺陷修复另立工单。

## 改了什么（对照 demo-prompt.md）

| 优先级 | ID | 改动 | 状态 |
|--------|-----|------|------|
| P0 | B1/F2 | 表达式 inline 实时校验（300ms debounce），替换 `alert()` | ✅ |
| P0 | B2 | 参数为空时行内 warning 提示，替换 `alert()` | ✅ |
| P0 | C1 | `Ctrl/Cmd+Enter` 应用表达式 · `F5` 执行批量 | ✅ |
| P0 | C5/B3 | 模板变量折叠面板（可视化 `${VarName}` 注入）+ postMessage 通道 | ✅ |
| P1 | F1 | 11 处英文字符串全部中文化（表头/按钮/统计） | ✅ |
| P1 | F5/B5 | 参数徽章动态类型（SYNC/REF/CONST/LITERAL/TEMPLATE 可选） | ✅ |
| P1 | C2 | 表达式历史（localStorage，点击恢复） | ✅ |
| P1 | C3 | 批量结果筛选（全部/匹配/不匹配/错误 chips） | ✅ |
| P1 | F3/B8 | 顶栏重构：56px 蓝色横幅 → 44px 紧凑 toolbar | ✅ |
| P1 | F4/B10 | 全面 token 化：约 30 处硬编码颜色 → PTO 语义 token（零硬编码） | ✅ |
| P2 | F6/B9 | 章节标题 Emoji → 线性 SVG 图标 | ✅ |
| P2 | — | 间距统一为 `--space-1..6` 体系 | ✅ |
| 额外 | — | dark/light/glass 三主题切换（设计系统原生支持） | ✅ |

### v2 · 首用 30 秒走查五镜（B11–B15，对照 PROMPT v2）

| 优先级 | ID | 改动 | 状态 |
|--------|-----|------|------|
| P0 | B11 | 空态示例卡片 ×3（表达式+预填值+预期结果，一键填入演示），参数填齐自动隐藏 | ✅ |
| P0 | B12 | 操作符 Chip 面板（输入/字符串/自定义 分组，hover 签名 tooltip，点击插入光标处，折叠态持久化） | ✅ |
| P0 | B13 | 双栏布局：左 55%（表达式+参数+历史 = 操作），右 45%（管道轨迹+结果 = 反馈）；步骤编号 ①②③④；≤1024px 退化单栏 | ✅ |
| P1 | B14 | 数据流轨迹：输入行 + 阶段间竖线箭头 + 每阶段「入→操作→出」+ 类型 chip（number/string/boolean）；出错阶段红框、后续置灰「未执行」 | ✅ |
| P1 | B15 | 通过率摘要 badge「✓ 通过 m/t」（全过绿/有失败红），点击即筛选不匹配 | ✅ |

> 三张示例卡片的预期结果已用 node 复算求值核心验证（GATE PASS），与卡片标注一致。

## 状态覆盖（对照 §F 清单）

S01 空态 · S02 语法错误 inline · S03 已应用 · S04 实时计算 · S05 参数空警告 · S06 中间步骤展开 · S07 模板变量面板 · S08 用例加载 · S09 解析错误 · S10 执行 loading · S11 match/mismatch · S13 虚拟滚动 · S14 三主题 —— 均已覆盖。

## 验证方式

```bash
# 1) 自包含门禁：零外链 + token 闭环（必过）
grep -c 'rel="stylesheet"' index.html                      # → 0
comm -23 <(grep -oE 'var\(--[a-z0-9-]+' index.html | sed 's/var(//' | sort -u) \
         <(grep -oE '^\s*--[a-z0-9-]+' index.html | sed 's/[: ]//g' | sort -u)  # → 空
# 2) 静态检查：零硬编码颜色、零英文残留、结构完整
# 3) 运行验证门：node 复算求值核心 10 组用例（GATE: PASS）
# 浏览器中直接双击 index.html 即可交互（CSS 已内联，无需 server）
```

> 注：`design-system/*.css` 取自 PTO Design System 仓库 main 分支快照，仅作工程接入参考；index.html 本身不依赖它们。
