# Skill 测试与调整报告

> 测试输入：`test-input/preview-smc-calculator.html`（SMC 偏移量计算器，单文件 HTML，VS Code Webview）
> 日期：2026-06-10 ｜ 对象：`phase1-requirement-analysis` + `phase2-demo-to-data`

## 1. 测了什么

用 SMC 偏移量计算器作为真实输入，**完整跑通两个阶段**，产出全部强制交付物：

### 阶段一（`test-output/phase1/`）
| 产物 | 状态 |
|------|------|
| `data-structure.md` / `interface-contract.md` / `business-logic.md` | ✅ 代码梳理三件套 |
| `product-doc.md` | ✅ 含第一轮设计审查结论 |
| `demo-prompt.md` | ✅ 优化模式（识别为已有 UI） |
| `smc-calculator-report.html` | ✅ 16:9 幻灯片，11 张 slide，含 synthesis SVG 连线 |
| `preview/index.html` | ✅ 审查对象（原 Demo） |

### 阶段二（`test-output/phase2/`）
| 产物 | 状态 |
|------|------|
| `design-review.md` / `accessibility-audit.md` | ✅ 设计 + 可访问性审查 |
| `design-structure.md` | ✅ 8 节 + 逐组件状态枚举 + 交互序列 |
| `tech-selection.md` | ✅ 原生 Web Component 选型 |
| `src/**` 工程代码 | ✅ 编解码纯函数 + 枚举常量 + 格式化 + `<smc-calculator>` |
| `test/smcCodec.test.js` | ✅ **9 用例 `node --test` 全通过** |
| `INTEGRATION.md` / `README.md` / `CHANGELOG.md` | ✅ |

### 验证证据
- 编解码正确性：`node --test` 9/9 通过（含 `0x30440100` 往返、占位示例 `809893888` 解码、字段位区间、溢出取低 32 位）。
- 工程 JS：4 个模块 `node --check` 语法全通过。
- 可视化报告：结构平衡（11×`section.slide`、`<section>`/`<div>` 配对、缩放与连线逻辑齐备）。

## 2. 发现 → 调整（7 条，均已改进 SKILL.md）

| # | 测试中暴露的问题 | 改进位置 |
|---|------------------|---------|
| F1 | 两 skill 都调用 `/design-critique`、`/accessibility-review`，本环境**未安装**，原文无兜底 | phase1 §1.2.2 / phase2 §2：补「未安装时按框架人工执行」 |
| F2 | `interface-contract` 模板默认 REST 后端；真实输入是**离线纯函数 + Webview 消息桥**，无 HTTP | phase1 §1.3.2：补「HTTP / 纯本地 / 宿主桥」三形态分支 |
| F3 | 优化模式 §B 嵌了**过时写死的 SMC 示例**（660px/🔍/空闲红错），与真实文件（650px/🧮/零值合法）冲突 | phase1 §B：补「示例数值仅格式示范，须从真实 artifact 重新测量」 |
| F4 | `bit-row` 组件**等宽**且按 nibble 分段；真实字段 6/16/1/1/8 **不对齐半字节** | phase1 组件速查：改为按位宽 `flex` 成比例 + 反例警告 |
| F5 | 「合法零值 `0x00000000` ≠ 空态」这一数值工具通用陷阱无提示 | phase1 实践笔记：新增「合法零值不是空值」 |
| F6 | phase2 Step 5 默认框架（.tsx/.vue/Redux/CSS Modules）；真实约束是**原生无框架** | phase2 §5.1：补「原生 Web Component / ESM」等价结构分支 |
| F7 | `src/services/*Api.ts` 列为无条件「必出」；纯本地功能无 API 层 | phase2 标准产出表 + §5.4：改为「有 HTTP 后端时必出，否则用事件/IPC 适配层」；§7：ESM 工程版需 http.server 打开 |

## 3. 总体结论

- **流水线本身成立**：两阶段在一个真实工程工具输入上端到端跑通，产物完整、工程代码经测试可运行。
- **skill 原本对「带 REST 后端的框架式 Web 应用」假设过强**；本次最有价值的调整是把它泛化到「离线/宿主桥 + 原生无框架」这一类 BMC/嵌入式场景——而这恰好是 skill 自身示例（SMC、cooling-web-config）所属的领域。
- 调整均为**向后兼容的补充分支**，未改变原有主路径。
