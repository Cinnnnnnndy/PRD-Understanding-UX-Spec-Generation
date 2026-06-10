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

---

## 4. 第二轮反馈与调整（用户复盘后）

| # | 反馈 | 处理 |
|---|------|------|
| R1 | `/design-critique`、`/accessibility-review` 是 Claude 自带 skill，应把**思路内嵌**进两 skill，保证换工具/换环境都能跑 | 两 skill 把审查从「调用外部 skill」改为「**内置方法 + 自带清单，工具无关**」：phase1 §1.2.2 加内置设计审查四维度清单；phase2 §2 改为「环境有就叠加调用、没有就用内置清单」。外部 skill 降级为可选实现 |
| R2 | 第一阶段缺「优化后 Demo」——提示词应产出一个可见的优化后 Demo | 补产物 `optimized-demo/index.html`（单文件可双击，落实 demo-prompt 的 O1–O5 + a11y + 窄屏降级 + `smc-apply` 事件）；phase1 新增 **Step 3.5 用提示词产出优化后 Demo**，并列入标准产出（必出） |
| R3 | 第二阶段应针对**优化后 Demo**做审查 + uxspec | phase2 输入与 `design-review.md`/`accessibility-audit.md` 全部重新指向优化后 Demo（第二轮：确认 R1 修复 + 残留 R2-x）；design-structure 反推对象改为优化后 Demo |
| R4 | uxspec 可否用**可视化报告**形式给出 | 新增 `uxspec-report.html`（16:9 幻灯片，8 张：布局/Token/组件/状态矩阵/交互序列/复审/交付）；phase2 新增 **§3.9 uxspec 可视化报告形态**，并列入标准产出（推荐）。md 为精确源、report 为评审窗 |

### 新增/更新产物
- `optimized-demo/index.html`（新，单文件优化后 Demo，编解码往返经校验）
- `phase2/uxspec-report.html`（新，8 slide，结构平衡）
- `phase2/design-review.md` · `accessibility-audit.md`（重写为针对优化后 Demo 的第二轮）
- `phase2/design-structure.md`（反推对象更新 + 指向可视化报告）

### 流水线形态（更新后）
```
需求 →[阶段一]→ 分析 + 可视化报告 + demo-prompt → ★优化后 Demo★
                                                      │
       ★优化后 Demo★ →[阶段二]→ 审查(R2) + uxspec(md + 可视化报告) + 工程代码 + 接入交付
```

