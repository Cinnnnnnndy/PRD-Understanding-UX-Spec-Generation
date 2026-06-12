# 管道表达式批量评估器 · 项目总览

管道表达式批量评估器是 openUBMC Studio 的配置工具之一，允许工程师编写多阶段管道表达式（如 `$1;$2 |> expr($1+$2) |> string.format("%.2f",$1)`），实时观察每个阶段的中间结果，并批量对比测试用例的预期输出与实际输出。

---

## 产物清单

### 阶段一（需求分析）
| 文件 | 说明 |
|------|------|
| `phase1-需求分析/REPORT-分析报告.html` | 可视化需求分析报告（10 张幻灯片，含五镜走查与同源 B-ID） |
| `phase1-需求分析/PROMPT-Demo优化提示词.md` | Demo 优化提示词 v2（含同源 B11–B15 五镜问题 + §C 目标状态） |

### 阶段二（UX 规格 + 工程代码）
| 文件 | 说明 |
|------|------|
| `phase2-UX规格/design-review.md` | 设计审查报告（D1–D8，8 个改进点 + 8 个设计亮点） |
| `phase2-UX规格/accessibility-audit.md` | 可访问性审查报告（WCAG 2.1 AA，A1–A12） |
| `phase2-UX规格/design-structure.md` | 设计结构文档（9 节：布局/间距/组件/Token/Schema/交互序列） |
| `phase2-UX规格/REPORT-UX规格报告.html` | UX 规格可视化报告（1280×720 幻灯片，9 张） |
| `phase2-UX规格/tech-selection.md` | 技术选型（Demo vs 工程，迁移路径） |
| `phase2-UX规格/INTEGRATION.md` | 工程接入指南（postMessage 协议 / 文件放置 / 联调待确认） |
| `phase2-UX规格/README.md` | 本文件 |
| `phase2-UX规格/CHANGELOG.md` | 版本变更日志 |
| `phase2-UX规格/src/constants/enums.js` | 枚举常量（参数类型/状态/存储 key/示例数据） |
| `phase2-UX规格/src/utils/pipeEvalLogic.js` | 求值核心纯函数（SafeExpressionParser / PipeEvaluator / parsers） |
| `phase2-UX规格/src/utils/formatters.js` | 格式化工具（时间/状态/值展示） |
| `phase2-UX规格/src/utils/validators.js` | 校验工具（表达式/参数/模板变量名） |
| `phase2-UX规格/src/components/PipeBatchEvaluator/index.js` | 工程级 Web Component（Custom Element + Shadow DOM） |
| `phase2-UX规格/src/test/pipeEvalLogic.test.js` | 单元测试（34 个，全部通过，`node:test` 零依赖） |

### Demo 产物
| 文件 | 说明 |
|------|------|
| `DEMO-优化版/index.html` | 优化版 Demo v2（PTO Design System 内联，单文件自包含，五镜全落地） |
| `DEMO-优化版/design-system/` | PTO Design System CSS 快照（工程接入参考） |

---

## 如何打开 Demo

Demo 单文件 HTML，零外链，可直接双击打开：

```bash
# 方式一：双击打开（推荐）
open test-output/2026-06-12_test02_批量表达式计算器/DEMO-优化版/index.html

# 方式二：HTTP 服务器（如需调试 ES Module 相关）
python3 -m http.server 8080
# 访问 http://localhost:8080/DEMO-优化版/index.html
```

---

## 如何接入工程（Web Component 方式）

1. 复制 `phase2-UX规格/src/` 到目标工程
2. 引入 PTO Design System CSS（或使用已有的 CSS 变量定义）
3. 在 HTML 中注册并使用组件：

```html
<link rel="stylesheet" href="/design-system/foundation.css">
<link rel="stylesheet" href="/design-system/semantic.css">
<script type="module" src="/src/components/PipeBatchEvaluator/index.js"></script>

<html data-theme="dark">
<body>
  <pipe-batch-evaluator></pipe-batch-evaluator>
</body>
</html>
```

> ⚠️ 工程版使用 ES Modules，不能通过 `file://` 双击打开，需要 HTTP 服务。

详见 [INTEGRATION.md](./INTEGRATION.md)。

---

## 如何运行单元测试

```bash
cd phase2-UX规格
node --test src/test/pipeEvalLogic.test.js
# 输出：34 tests pass, 0 fail
```

---

## 文档索引

| 文档 | 读者 | 用途 |
|------|------|------|
| `design-structure.md` | 前端开发工程师 | 精确视觉规格（hex/px/状态枚举）+ 数据 Schema |
| `design-review.md` | 体验设计师 / 前端 | 设计问题清单 + 已验证的设计决策 |
| `accessibility-audit.md` | 前端开发工程师 | WCAG 2.1 AA 审查，修复清单（A1–A12） |
| `INTEGRATION.md` | 前端 / 后端 / 宿主对接工程师 | postMessage 协议 + 接入步骤 + 联调待确认 |
| `REPORT-UX规格报告.html` | 产品经理 / 设计评审 | 可视化规格幻灯片（机会点落地验收） |
| 阶段一 `REPORT-分析报告.html` | 产品经理 / 项目负责人 | 需求背景 + BUTP 分析 + 五镜走查原始问题 |

---

## 设计系统

本项目使用 [PTO Design System](https://github.com/yinyucheng0601/pto-design-system)（ArkUI 风格，dark/light/glass 三主题）。  
所有颜色、间距、圆角、字体均通过 PTO 语义 token，零硬编码颜色。
