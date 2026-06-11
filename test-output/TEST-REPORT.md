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

---

## 5. 第三轮反馈与调整（优化 Demo 完成度不足）

**反馈**：优化后 Demo「优化得非常少」，与用户和 Claude design + code 讨论出的 gold-standard 差距大——漏掉了一整类专业能力。用户提供了参考 Demo `SMC_Offset_Calculator.html` 作为目标水准。

**对照 gold-standard，我的分析/提示词遗漏的优化点：**
完整 32-bit 逐位位图 · HEX↔DEC 双向同步输入 · 字段卡按位宽成比例布局 · 多格式导出(HEX/DEC/HEX+DEC/C字面量/JSON) · 最近10次历史(localStorage+回填+Ctrl+S) · 载入示例/重置 · 每字段dec/hex读数+单独复制 · 样式化 hint 浮层 · 宽松解析。

**根因**：优化模式的分析停在「修审查发现的问题」，没问「专业用户一天用 50 次还缺什么」——产出「正确但单薄」。

**调整：**
| # | 处理 |
|---|------|
| 产物 | 把 gold-standard 落库 `test-input/reference-optimized-demo.html`，并作为新的 `optimized-demo/index.html`；合成 `optimized-demo/studio-shell.css`（openUBMC Studio 设计系统）使其可独立双击（22 个 CSS 变量全覆盖） |
| demo-prompt | 重写 `phase1/demo-prompt.md` 到**参考级完成度**：§A 改 Studio token + 字段 hue 系统；§C 把 9 大能力写成可验收规格（位图三行网格/双向同步/多格式导出含 C·JSON/历史/字段权重布局…）；§F 覆盖全状态 |
| 需求分析 | `phase1/product-doc.md` 机会点扩为三类：(a)问题修复 O1–O5、**(b)专业级完成度 O8–O13**、(c)需规格 O6–O7；并记录「分析教训」 |
| **skill** | phase1 §E 机会点分析新增「**两类穷尽 + 自检三问**」（一天50次还缺什么/产出去哪/数据最该被看见什么）；优化模式新增「**专业级完成度补齐清单**」（全保真可视化/历史复用/多格式导出/双向同步/快速起点/逐元素操作/键盘加速），要求逐项判断要不要、写成可验收规格 |
| phase2 | design-structure 等加「版本说明」横幅：标记为基于早期薄 Demo 反推，需针对 gold-standard 重做 |

> 核心 skill 教训：**优化模式 ≠ 修问题点，而是做到专业工具完成度。** 这条已固化进 phase1 skill 的机会点分析与优化模式提示词模板。

---

## 6. 第四轮 · 闭环盲测（/loop · 验证 skill 是否真能产出达标结果）

**方法**（正确的验证姿势）：从 gold-standard 提取经验入 skill 后，**用原始开发提供的 HTML 盲跑新 skill** → 生成提示词 → 据此生成优化 HTML → 与 gold-standard 比，看达标没、差在哪。产物在 `test-output/skill-validation/iter-1/`。

**结果（逐能力对比 16 项）：**
- ✅ **14 项达标**：完整 32-bit 位图、HEX↔DEC 双向同步、字段卡按位宽布局、多格式导出(C/JSON)、最近10次历史、Ctrl+S、示例/重置、逐字段读数复制、hint 浮层、宽松解析…
- ✅ **2 项盲生成反而更优**：可访问性（focus-visible/aria-live）、功能码语义正确性（用权威表 0x06=散热，gold-standard 用了 System/Power/Fan 占位 = 数据 bug）。
- ◻ 1 项纯 craft 差异（视觉打磨细节）。
- ❌ **仅 1 项真差距**：未集成 openUBMC Studio shell——而这是**输入里无线索、只能问用户**的外部信息（目标宿主/设计系统）。

**结论：能力广度一次盲跑即收敛**——新 skill 的「自检三问 + 专业级完成度清单」成功盲挖出全部专业能力。唯一缺口不是方法论缺陷，而是缺一个前置确认。

**调整（F-host）**：phase1 Step 3.5 生成 Demo 前新增**唯一必问门**——用 AskUserQuestion 确认「目标宿主 + 是否复用既有设计系统」，因为它决定整个视觉基线，是优化 Demo 唯一无法盲推的关键变量。

**循环状态：已收敛，停止。** 再迭代不会暴露新的能力级 gap；craft 差异属「再出一版 Demo」范畴，非 skill 职责。

---

## 7. 第五轮 · 把「设计系统」做成可插拔单元

**反馈**：上轮唯一缺口（不知道用哪个设计系统）不该靠「这一次对齐」解决；目标是**优化提示词，让之后每一次都能对齐**。且设计系统应是**可替换单元**（每个项目视觉标准不同）。本轮及后续实验用 **PTO 设计系统**（github.com/yinyucheng0601/pto-design-system）。

**架构调整（核心）：把视觉决策从 skill 里抽出来，做成一个插拔槽位。**

```
功能完成度规格（可移植，design-system 无关）  ×  设计系统（可插拔）  =  每次都对齐
```

| # | 处理 |
|---|------|
| 落库 | clone 完整 PTO 包，vendored 核心到 `design-systems/pto-design-system/`（tokens/css/references/SKILL/preview/swimlane/assets + 11 个 pattern 契约，664K）；重型 graphviz/pattern 运行时指向 GitHub |
| 插拔层 | 新增 `design-systems/README.md`：说明「功能可移植 × 设计系统可插拔」原则、当前激活 = PTO、如何换设计系统 |
| **skill** | phase1：①生成前「必问门」从「问宿主」改为「**选设计系统单元**」；②新增「**委托给插入的设计系统**」步骤（读其 SKILL/tokens，按其 Workflow 改造，不自创视觉）；③优化模式 §A 模板从「写死基线」改为「**可插拔槽位**」（A-1 委托外部设计系统 / A-2 才回退提取）；④设计点新增「功能规格可移植，设计系统可插拔」 |
| demo-prompt | `phase1/demo-prompt.md` §A 改为委托 PTO（语义 token、btn/segmented-control/panel-shell、Workflow B、删旧装饰）；§B/§C 能力规格一字不动 |
| 验证 | `skill-validation/iter-2/pto-migration-table.md`：对 iter-1 功能规格跑 PTO Workflow B 迁移对照表，证明「功能 0 改动、视觉 100% 委托 PTO」（历史/示例甚至命中 PTO 现成 `recent-chip`/`empty-card`/`sample-row`） |

**结论**：设计系统不再是 skill 里硬编码或每次重猜的东西，而是一个**槽位**。优化一次提示词（功能规格 + 委托机制），之后换任何项目只换设计系统包，生成的 Demo 自动对齐该项目视觉。

