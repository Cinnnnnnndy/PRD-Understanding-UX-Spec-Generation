# 管道表达式批量评估器

openUBMC Studio 配置工具之一。允许工程师编写多阶段管道表达式（`$1;$2 |> expr($1+$2) |> string.format("%.2f",$1)`），实时观察每个阶段的中间结果，并批量对比测试用例的预期输出与实际输出。

---

## 快速开始

### 打开 Demo（单文件，可直接双击）

```
DEMO-优化版/index.html
```

浏览器直接用 `file://` 打开即可。Demo 是单文件、CSS 全内联、无外部依赖，适合快速预览设计。

### 运行工程版（需要 HTTP 服务器）

工程版使用 ES Modules，浏览器对 `file://` 有模块 CORS 限制，必须通过 HTTP 服务器打开：

```bash
# 进入 phase2-UX规格 目录（或工程目标目录）
cd test-output/2026-06-12_test02_批量表达式计算器/phase2-UX规格

# 启动本地 HTTP 服务器（任选其一）
python3 -m http.server 8080
# 或：npx serve .
# 或：npx http-server . -p 8080
```

然后访问：`http://localhost:8080`（需要自建 `index.html`，参见 `INTEGRATION.md`）

### 运行单元测试

```bash
node --test src/test/pipeEvalLogic.test.js
```

要求 Node.js 18+（使用内置 `node:test`，零额外依赖）。

---

## 目录结构

```
2026-06-12_test02_批量表达式计算器/
│
├── DEMO-优化版/
│   └── index.html                   ← 阶段一产物：优化后 Demo（单文件，双击可开）
│
├── phase1-分析报告/                  ← 阶段一产物
│   ├── REPORT-分析报告.html           ← 可视化分析报告（16:9 幻灯片）
│   ├── PROMPT-Demo优化提示词.md       ← 用于生成/精调 Demo 的提示词
│   ├── product-doc.md               ← 完整产品文档（含 BUTP 四维分析 + A-H 展开）
│   ├── data-structure.md            ← 数据结构梳理
│   ├── interface-contract.md        ← 接口契约（纯本地工具 → 函数契约 + postMessage 协议）
│   └── business-logic.md            ← 业务逻辑梳理
│
└── phase2-UX规格/                   ← 阶段二产物（本目录）
    ├── design-review.md             ← 设计审查报告（10 个问题，含 3 个 Critical）
    ├── accessibility-audit.md       ← 可访问性审查（WCAG 2.1 AA，13 个问题）
    ├── design-structure.md          ← 精确视觉规格 + 交互规格 + 状态枚举
    ├── tech-selection.md            ← 技术选型（Web Components + ES Modules）
    ├── REPORT-UX规格报告.html        ← UX 规格可视化报告（16:9 幻灯片）
    ├── INTEGRATION.md               ← 工程接入指南
    ├── README.md                    ← 本文件
    ├── CHANGELOG.md                 ← 版本日志
    └── src/
        ├── components/
        │   └── PipeBatchEvaluator/
        │       └── index.js         ← Web Component 主体（Custom Element + Shadow DOM）
        ├── utils/
        │   ├── pipeEvalLogic.js     ← 管道解析 + 求值引擎（含 R3/G3 bug 修复）
        │   ├── formatters.js        ← 值展示工具（fmtVal / normOut / relTime / esc）
        │   └── validators.js        ← 表达式校验
        ├── constants/
        │   └── enums.js             ← 枚举常量（KNOWN_FUNCTIONS / HISTORY_MAX=20 / …）
        └── test/
            └── pipeEvalLogic.test.js ← 单元测试（含 R3 bug 修复验证）
```

---

## 主要特性

| 功能 | 说明 |
|------|------|
| 管道表达式 | `$1;$2 \|> fn($1, $2) \|> fn2($1)` 多阶段串联求值 |
| 支持函数 | `expr`、`string.format`、`string.upper/lower`、`string.sub`、`string.gsub`、`string.cmp` |
| 批量测试 | 每行一组用例（输入 + 期望输出），自动比对并统计通过率 |
| 虚拟滚动 | 大量结果时保持流畅（ROW_H=36px，BUF=10 行缓冲） |
| 历史记录 | 最多 20 条（按 history 图标查看），localStorage 持久化 |
| 模板变量 | `${varName}` 占位符，可从宿主 postMessage 注入值 |
| 主题切换 | Dark / Light / Glass 三主题，本地存储偏好 |
| 键盘快捷键 | `Ctrl+Enter` 调试执行，`F5` 批量执行，`Esc` 关闭历史面板 |
| VS Code Webview | 通过 postMessage 与宿主双向通信 |

---

## 管道表达式语法

```
$1;$2;$3 |> fn1($1, $2) |> fn2($1)
│           │              │
输入声明     第一阶段       第二阶段（$1 指向上一阶段输出）
```

- **输入声明**：`$1`（单输入）或 `$1;$2;$3`（多输入），分号分隔
- **管道连接**：` |> `（两侧必须有空格）
- **参数引用**：每个阶段内 `$1` 始终指向该阶段的第一个有效输入；首段 `$1/$2…` 指向对应用户输入
- **模板变量**：`${varName}` 在求值前被替换为对应值

---

## 文档索引

| 文档 | 用途 |
|------|------|
| `design-review.md` | 设计问题清单（信息架构/一致性/反馈，含优先级） |
| `accessibility-audit.md` | WCAG 2.1 AA 可访问性问题（含修复建议） |
| `design-structure.md` | 精确视觉规格（hex/px）+ 组件状态枚举 + 交互序列 |
| `REPORT-UX规格报告.html` | UX 规格可视化报告（供评审/汇报） |
| `INTEGRATION.md` | 工程接入指南（接口/postMessage/测试/已知限制） |
| `CHANGELOG.md` | Demo → 工程的完整变更记录 |
| `阶段一/REPORT-分析报告.html` | 需求分析可视化报告（BUTP 四维 + A-H 展开） |
