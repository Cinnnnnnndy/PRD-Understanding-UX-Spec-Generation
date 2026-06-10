---
name: 阶段二 · Demo 精调产物 → 设计审查 · 工程代码 · 接入交付
description: |
  两阶段「需求 → 工程」流水线的第二阶段。输入是「用阶段一产出的 Demo 提示词，
  生成或精调后得到的 Demo 产物」。本阶段对该产物完成：①/design-critique 设计审查 +
  /accessibility-review 可访问性审查（WCAG 2.1 AA）；②反推 design-structure.md
  （精确视觉规格·布局算法·交互规格·状态枚举·交互序列·待确认清单）；③可选 tech-selection.md
  （技术选型，Demo 与工程各一套）；④生成符合后端数据结构的工程级前端代码；⑤接入说明
  （接口定义·业务逻辑·前后端边界·联调待确认）；⑥README 与新增/修改日志 CHANGELOG。
  当用户已经有一个 Demo（HTML 原型或单文件页面），要求「工程化」「转成组件」「接入项目」
  「做可访问性审查」「生成接入说明/README/日志」「输出工程代码」时触发此 skill。
  中文触发词：工程化这个demo / 把demo转成工程代码 / 生成可接入的组件 / 接入现有项目 /
  对demo做可访问性审查 / 对精调后的demo做设计审查 / 生成readme和修改日志 /
  生成接入说明 / 反推设计规格 / 第二阶段 / demo到工程代码。
  English triggers: "engineer this demo", "turn demo into production code", "make integration-ready components",
  "accessibility audit this demo", "generate readme and changelog", "phase 2", "demo to engineering".
  只要存在「已有 Demo/原型」+「审查/工程化/接入/交付文档」的意图，就调用此 skill。
  前置：通常由阶段一 skill（phase1-requirement-analysis）的 demo-prompt.md 驱动 Demo 生成后进入本阶段。
---

# 阶段二 · Demo 精调产物 → 设计审查 · 工程代码 · 接入交付

本 skill 是「需求 → 工程」两阶段流水线的**第二阶段**，提炼并重构自 openUBMC Studio
三个前置实践（高保真→Demo→工程代码、后端代码→设计反向分析、代码→产品文档）。

核心理念：
> **Demo 是验证工具，不是最终交付物。** 设计意图通过 Demo 对齐之后，工程代码才是真正能进仓库的资产。
> Demo 是便宜的实验，工程代码是昂贵的承诺——所以审查、反推规格、对齐方向都要在写工程代码之前完成。

整条流水线回顾：

```
【阶段一 · phase1-requirement-analysis】
需求输入 → 分析 → 可视化报告 + demo-prompt.md (+ 代码梳理三件套)

         ⬇ 用户把 demo-prompt.md 输入到「生成 Demo / 精调已有 Demo」环节，得到 Demo 产物

【阶段二 · 本 skill】
精调后的 Demo 产物
  → Step 1 接收 + 交叉校验
  → Step 2 /design-critique + /accessibility-review（WCAG 2.1 AA）
  → Step 3 反推 design-structure.md（视觉规格·布局算法·交互规格·状态枚举·交互序列·待确认清单）
  → Step 4 tech-selection.md（可选；Demo + 工程各一套）
  → Step 5 工程级前端代码（符合后端数据结构）
  → Step 6 接入说明 INTEGRATION.md（接口定义·业务逻辑·前后端边界·联调待确认）
  → Step 7 README + CHANGELOG（新增/修改日志）
```

> **⚠️ 强制执行规则 — 必须通读后遵守：**
>
> 1. **Steps 1–7 全部顺序执行，不得中途停下询问是否继续。**  
>    完成 Step 4 的优先级清单后，立即进入 Step 5 生成工程代码，不得输出「需要我继续吗？」「要开始写代码吗？」之类的确认请求。
> 2. **标注「必出」的产物是强制交付项，不可省略：**  
>    `design-review.md` / `accessibility-audit.md` / `design-structure.md` / 工程代码 / `INTEGRATION.md` / `README.md` / `CHANGELOG.md` ——缺少任意一项视为本次执行未完成。
> 3. **唯一合法的中途暂停**：Step 1 的目标工程信息询问（目录结构、状态管理方案等），其余不得暂停。
> 4. Step 4（tech-selection.md）是「可选」，可快速跳过；但 Step 5–7 是「必出」，不能因跳过 Step 4 而漏掉 Step 5–7。

---

## 需求分析

### 用户

| 角色 | 使用场景 | 关注点 |
|------|---------|--------|
| 体验设计师 | 把精调后的 Demo 沉淀为规格与工程资产 | 设计意图被准确还原；交互细节不被遗漏 |
| 前端开发工程师 | 接收工程代码，直接集成进项目 | 代码规范一致；类型完整；字段与后端数据结构严格对齐；能直接跑 |
| 后端工程师 | 查看可访问性与设计问题反馈、接口契约 | 问题描述精准；能明确哪些需后端配合改 |
| 交互设计师 | 审阅交互规格，补充确认清单 | 状态枚举完整；边缘情况有明确提案 |
| 项目负责人 | 评估交付质量与接入成本 | 文档齐全；接入风险可见 |

### 场景

1. **设计交付开发**：Demo 方向已对齐，开发需要能直接集成的组件代码——工程阶段，类型完整、状态覆盖。
2. **质量守门**：Demo/原型已有现成实现，作为质量守门员介入，找设计与可访问性问题、提改进方向，而非全部推翻重做。
3. **设计资产沉淀**：不只是代码，还有结构文档、交互说明、质量报告、README/CHANGELOG，形成可复用协作资产。
4. **工程工具交付**：面向专业用户的配置工具、管理后台，没有消费端那样的视觉规范，但有更严格的可访问性和效率要求。

### 解决的问题

- **Demo 代码进工程留技术债**：Demo 将就、无类型、Mock 硬编码，直接进工程会留债。本阶段明确把它升级到工程质量标准。
- **设计-开发鸿沟**：Demo 是会动的图，但隐式假设没说清。`design-structure.md` + `interaction-spec` 把设计意图结构化，消除歧义。
- **可访问性问题后期才暴露**：字号 11px、对比不足、Canvas 无键盘支持——在交付前一轮 `/accessibility-review` 比上线后再改成本低得多。
- **接入卡在最后一公里**：`INTEGRATION.md` 写不清楚，开发会在环境、依赖版本、字段映射上卡很久。

### 设计点

- **两阶段分离**：Demo 优化「能不能看」，工程代码优化「能不能用」，目标不同、标准不同。
- **Mock 数据即 API 契约**：Demo 的字段命名从阶段一就对齐后端，本阶段 API 层是替换而非重写。
- **魔法值是 UI 层的责任**：`32768` 是后端内部约定，UI 绝不能直接展示；转换集中在 `formatters` 统一处理。
- **可访问性先于视觉打磨**：对工程工具，可访问性是基础要求——专业用户长时间使用，字号和对比度问题会在每天 8 小时里持续伤害效率。
- **分层推进，不全推翻**：区分「前端独立实现」「需后端配合」「需产品决策」三类机会点，让改进可落地。
- **文档是协作界面**：README / CHANGELOG / INTEGRATION / design-structure 不是形式主义，是设计侧产出与开发侧接收之间的契约文件。

---

## 输入

| 类型 | 说明 |
|------|------|
| **精调后的 Demo 产物**（必需） | 单文件 HTML 原型 / 一组页面 / 截图 + 代码。由阶段一 demo-prompt.md 驱动生成或精调 |
| 阶段一产物（强烈建议带上） | `demo-prompt.md`、`product-doc.md`、`data-structure.md`、`interface-contract.md`、`business-logic.md`、可视化报告 |
| 目标工程信息（建议先问） | 目标开发栈、目录结构约定、状态管理方案、CSS 方案、测试框架、TypeScript 严格度 |

> 若阶段一产物缺失（例如用户直接拿一个 Demo 进来），先快速补一轮数据结构/业务逻辑的反向理解，再进入审查与工程化。字段命名以已有接口定义为准，不要从 Demo 猜测。

---

## 标准产出

| # | 文件 | 条件 | 用途 |
|---|------|------|------|
| 1 | `design-review.md` | 必出 | /design-critique 设计审查报告（信息架构·一致性·层级·反馈） |
| 2 | `accessibility-audit.md` | 必出 | /accessibility-review 可访问性审查报告（WCAG 2.1 AA + 工程侧建议） |
| 3 | `design-structure.md` | 必出 | 精确视觉规格 · 布局算法 · 交互规格 · 状态枚举 · 交互序列 · 待确认清单 |
| 4 | `tech-selection.md` | 可选（看复杂度） | 技术选型，Demo 与工程各一套 + 迁移路径 |
| 5 | `src/components/...` | 必出 | 工程级前端代码，符合后端数据结构，可直接接入 |
| 6 | `src/services/[feature]Api.ts` | 有 HTTP 后端时必出 | API 集成层，Mock 字段映射真实接口；**纯本地功能/宿主桥**则改为事件或 IPC 适配层（如 `CustomEvent`/`postMessage`），不强造空 API 层 |
| 7 | `src/utils/[feature]Logic.ts` | 视情况 | 业务规则纯函数，与 UI 解耦 |
| 8 | `INTEGRATION.md` | 必出 | 接入说明：接口定义 · 业务逻辑 · 前后端边界 · 联调待确认 |
| 9 | `README.md` | 必出 | 项目总览（覆盖两阶段） |
| 10 | `CHANGELOG.md` | 必出 | 新增/修改日志（区分 Demo 版与工程版） |
| 11 | `[Name].test.ts` | 视情况 | 单元测试桩，覆盖核心状态分支 |
| 12 | `learning/[库名].md` | 条件 | 仅在参考开源代码时生成 |

---

## 工作流

### Step 1 — 接收 Demo 产物 + 交叉校验

接收精调后的 Demo，先做一轮交叉核验，避免基于过期假设工程化：
- 比对 Demo 实际像素值与 `demo-prompt.md` / 阶段一 `data-structure.md`，有偏差以 Demo（最新对齐结果）为准并记录
- 检查交互序列是否与 Demo 的状态流转一致
- 确认是否参考了开源代码（若是，记录库名，后续生成 `learning/` 笔记）
- 确认是否团队协作项目（若是，确认分支命名规范偏好）

进入工程化前，主动了解目标工程：
- 目标仓库目录结构约定（`components/` 在哪？API 层在哪？）
- 状态管理方案（Redux / Pinia / Zustand / 无）
- CSS 方案（CSS Modules / Tailwind / styled-components / BEM）
- 测试框架（Vitest / Jest / 无）
- TypeScript 严格度（strict / 宽松 / 纯 JS）

---

### Step 2 — 设计审查 + 可访问性审查

#### 2.1 设计审查（/design-critique）→ `design-review.md`

> **若 `/design-critique` 或 `/accessibility-review` 未安装**：不要跳过这两步，按 2.1 / 2.2 列出的维度与 WCAG 2.1 AA 清单**人工执行**，并在报告里注明「按对应框架人工执行」。审查是必出项，外部 skill 只是其一种实现方式。

带上阶段一的产品上下文模板调用 `/design-critique`：

```
请基于以下产品背景进行审查：
- 产品类型 / 核心用户（职业+技术背景+频率+环境）/ 核心任务流 / 已知约束 / 特殊数据格式
精调后的 Demo：[附产物]
```

**检查维度：**

**信息架构**：内容分组是否符合用户心智模型；导航深度是否合理（工程工具一般不超过 3 层）；关联实体的配置是否在同一视图内可访问。
**视觉一致性**：同类操作是否一致；主次操作视觉权重是否明确；数据密集区（表格、曲线、代码块）信息密度是否适当。
**反馈与状态**：加载/空/错误状态是否都有处理；保存中/生成中进度是否可感知；多步骤配置是否有完成度指示。
**工程工具特定检查**：魔法值（`32768`）是否在 UI 层转为人类可读；枚举整数（`pid_control_mode: 1`）是否有标签映射；技术字段名是否有说明/tooltip；数组类型字段编辑体验是否友好。

真实案例发现（cooling-web-config 设计问题）：
```
❌ CSR 输出面板 max-height: 160px — 主要输出区却极局促
❌ 曲线表格 max-height: 200px — 27 行数据在 200px 内滚动，难以全局观察
❌ YAML 编辑器与表单各占 50% — 用户倾向只用其中一种，比例应可调
⚠️ 表单网格 1fr 1fr — 小屏下字段过窄，数字输入框宽度不足
⚠️ 「生成CSR」结果直接覆盖输出区 — 无历史，无法对比前后差异
```

输出格式：
```markdown
## 问题清单
| # | 维度 | 位置/组件 | 问题描述 | 优先级 🔴/🟡/🟢 | 建议方案 |
## 设计亮点
[记录现有实现中值得保留的设计决策]
```

#### 2.2 可访问性审查（/accessibility-review）→ `accessibility-audit.md`

对照 WCAG 2.1 AA。重点关注工程工具类界面（用户是专业人员，但更长时间使用）。

| 维度 | 检查项 |
|------|--------|
| 可感知性 | 色彩对比度 ≥ 4.5:1（正文）/ 3:1（大字体和 UI 组件）；错误状态是否仅依赖颜色 |
| 可操作性 | 所有功能是否可键盘完成；Canvas 类组件（曲线编辑器）是否提供键盘/表格替代 |
| 可理解性 | 错误提示是否说明「什么错了」和「如何修复」；技术字段名是否有人类可读标签 |
| 鲁棒性 | 是否语义化 HTML；ARIA 是否正确；表单 label 是否与 input 关联 |

真实案例发现（cooling-web-config 可访问性问题）：
```
❌ font-size: 12px 用于表单 label（低于 WCAG 建议的 14px 等效最小值）
❌ font-size: 11px 用于字段错误消息（几乎不可读）
❌ .field-error 仅用红色边框+背景区分，无图标，对色觉障碍用户不友好
❌ Canvas 曲线编辑器无键盘操作支持，仅靠鼠标拖拽
❌ 错误列表 #error-list 没有 role="alert" 或 aria-live，屏幕阅读器无法感知
⚠️ cursor: crosshair 用于曲线画布 — 暗示「绘制」而非「数据编辑」，语义不准确
```

输出格式：
```markdown
## 问题清单
| # | 维度 | 位置/组件 | 问题描述 | 严重程度 | 受影响用户 | 修复建议 | 需后端配合 |
## 已符合项
[记录已做好的实践，避免后续迭代破坏]
## 待后端配合项
[需要后端增加字段（如人类可读枚举标签）的项]
```

> 审查结论同时是 Step 5 工程代码的修复清单：能在前端独立修的，在工程代码里直接修；需后端配合的，进 INTEGRATION.md 的待联调。

---

### Step 3 — 反推设计结构 → `design-structure.md`

从 Demo 反推出精确的设计规格文档。**两条核心原则，缺一不可：**
- **视觉规格要精确**：所有颜色用 hex，所有尺寸用 px，不写「约」「大概」。不确定标「待确认」，不用近似值蒙混。
- **数据与布局不要写死**：节点/列表的具体实例（x/y 坐标、硬编码数组、写死的 id）不属于设计文档——那是运行时数据。文档只写「数据从哪来、结构长什么样、布局用什么算法」。

> 区分两类内容：
> - ✅ 应写入：组件视觉规格、数据 Schema（字段+类型）、布局策略（算法+约束）、交互行为规格、状态枚举、交互序列
> - ❌ 不写入：具体节点 x/y 坐标、hardcode 节点数组、写死的 Mock 实例（那是代码和接口契约的事）

`design-structure.md` 必须覆盖以下八节（完整模板见文末 Artifact 模板）：

1. **页面整体布局** — ASCII 树描述分区、每区固定尺寸与背景色
2. **间距系统** — 组件间/内边距/行高/图标文字间距
3. **组件清单** — 每个组件：精确尺寸 + 精确颜色(hex) + 内部层叠结构 + 变体表 + 交互热点 + 空/加载状态
4. **色彩 Token / 字体规格** — 提取所有 hex 值与字号字重，注明用途
5. **数据 Schema** — 只写字段结构，不写实例；字段命名与数据源严格一致；标数据来源
6. **布局策略** — 有拓扑/流程图/树形结构时必填：布局算法选型（dagre / ELK.js / d3-force / 手动）+ 约束，不写 x/y 坐标
7. **交互操作规格 + 状态枚举（必须逐组件展开）**  
   每个**可交互组件**必须有独立状态枚举表——不能只写「见组件清单」或合并描述，必须单独列出：

   ```markdown
   ### [组件名] 状态枚举
   | 状态 | 触发条件 | 视觉变化（精确 hex/px） | 行为约束 |
   |------|---------|----------------------|---------|
   | 默认 (default) | 页面加载后 | 背景 #XXXXXX，边框 1px solid #XXXXXX | — |
   | hover | 鼠标移入 | 背景 #XXXXXX，border-color #XXXXXX | 无点击时不保持 |
   | focus | Tab 聚焦 / 点击 | outline 2px solid #XXXXXX，offset 2px | 键盘可见性要求 |
   | active / pressed | 鼠标按下 | 背景 #XXXXXX，transform scale(0.98) | 松开恢复 hover |
   | disabled | 权限不足 / 前置条件未满足 | 背景 #XXXXXX，opacity 0.4，cursor not-allowed | 不响应任何交互 |
   | error | 校验失败 / 接口报错 | 边框 #XXXXXX（红），下方展示错误文本 | 修正后清除 |
   | empty | 无数据 / 未输入 | [空状态插图 + 说明文字] | — |
   | loading | 数据请求中 | [skeleton / spinner] | 禁止重复触发 |
   ```

   > **哪些组件需要独立状态枚举表：** 按钮（所有变体）、输入框、下拉选择器、开关/复选框、单选组、表格行、可点击卡片/列表项、模态框、画布节点——凡用户能操作的都要展开。  
   > **不够用的检查标准：** 把 Step 2 审查发现的所有 Critical / Major 问题逐一核对：每条问题在状态表里都有对应的「修复后状态」描述。

8. **交互序列 + 数据流 + 待确认清单（必须逐流程展开）**  
   每条关键交互序列格式：

   ```markdown
   ### [操作名称]（如：提交表单 / 切换模式 / 删除节点）
   1. **触发**：用户 [动作，如点击「生成」按钮]（条件：[前置状态]）
   2. **即时反馈**：[组件] 进入 loading 态，[按钮] disabled；出现 [进度条/spinner]
   3. **后端/计算处理**：[接口调用 / 本地计算] → 预计耗时 [范围]
   4. **成功响应**：[组件] 展示 [结果]；[状态] 从 loading → [新状态]；[Toast/Banner] 显示「[成功文案]」
   5. **失败响应**：[错误类型] → [错误展示位置] 显示「[错误文案]」；[组件] 回到 error 态；[提供修复入口]
   6. **逆操作路径**：[可撤销 → Ctrl+Z 恢复；/ 不可撤销 → 操作前需二次确认弹窗]
   ```

   文件末尾单列「⚠️ 待设计师确认」（动画时长与缓动、错误文案与时机、边缘状态视觉、多步骤回退规则）

**布局策略选型参考：**

| 布局类型 | 推荐算法 | 约束说明 |
|---------|---------|---------|
| 层次树 / 流程图 | dagre（rankdir: LR/TB） | 节点间距 Xpx，层间距 Xpx |
| 拓扑网络 | ELK.js（layered 模式） | 边距 Xpx，端口对齐方式 |
| 力导向图 | d3-force | 排斥力 X，中心引力 X |
| 手动布局（可拖拽后持久化） | 无自动布局 | 初始位置从数据源读取 |

---

### Step 4 — 技术选型（可选）→ `tech-selection.md`

> 何时生成：组件涉及图/拓扑可视化、数据密集 Dashboard、复杂状态管理，或目标栈尚未确定时。简单页面可跳过，直接对齐用户已确认的目标栈。

分别记录两套：

**Demo 选型原则**：单文件、零安装、双击即开。CDN 引入框架，Mock 内联，不依赖构建工具。
**工程选型原则**：对齐用户确认的目标开发栈。

| 产品类型 | 推荐工程技术栈 |
|---------|--------------|
| 图 / 拓扑可视化 | Vue 3 + ReactFlow 或 Cytoscape.js + ELK/dagre |
| 数据密集型 Dashboard | React + shadcn/ui + Recharts + TanStack Query |
| 表单密集型企业工具 | Vue 3 + Element Plus + Pinia |
| 移动端消费者应用 | React + Tailwind CSS + React Query |
| SaaS 管理后台 | React + Tailwind CSS + Zustand |
| BMC / 嵌入式管理界面 | 原生 HTML + CSS + JS（无框架，保持轻量） |

记录：Demo→工程的迁移路径、被排除的方案及原因。

> **openUBMC 约束**：若数据结构梳理显示目标是纯 HTML + CSS + JS（如 `cooling-web-config` 用 `js-yaml` CDN + Canvas，无构建工具），工程代码也必须保持同样的轻量约束，不引入额外依赖。

> **⚠️ 完成 Step 4（或确认跳过）后，立即进入 Step 5，不要询问用户是否继续。**

---

### Step 5 — 生成工程级前端代码

> 前提：Demo 经评审、设计方向确认、目标开发栈确认。

#### 5.1 组件拆分与工程结构规划

根据 Demo 和目标仓库约定规划组件树，**写代码前先把结构告诉用户确认**（这一步返工成本最高）。

> **先按目标栈选结构，别默认 React/Vue。** 下面的 `.tsx`/`.vue` 树是「有框架」时的形态；若 Step 1/4 确认目标是**原生 HTML+CSS+JS（BMC/Webview 轻量约束）**，改用框架中立的等价结构：
> - 组件 → **原生 Web Component（Custom Element + Shadow DOM）**，样式写在 shadow root 内（天然 scoped，不需要 CSS Modules）。
> - 纯逻辑 → ES Module 纯函数（`utils/*.js`），用 JSDoc `@typedef` 替代 TS 类型；测试用 `node:test` 零依赖。
> - 目录仍是 `components/ utils/ constants/`，只是文件是 `.js` 而非 `.tsx/.vue`。



```
src/
├── components/
│   └── [FeatureName]/
│       ├── index.tsx / index.vue   # 组件入口
│       ├── types.ts                # Props / Events / 共享类型
│       ├── [SubComponent].tsx
│       └── [FeatureName].test.ts
├── services/
│   └── [feature]Api.ts             # API 集成层
├── utils/
│   ├── formatters.ts               # 魔法值转换、单位格式化
│   ├── validators.ts               # 字段校验（复用后端规则）
│   └── [feature]Logic.ts           # 业务规则纯函数
└── constants/
    └── enums.ts                    # 所有枚举映射，统一维护
```

#### 5.2 工程组件质量标准

- **TypeScript 严格**：Props 类型完整，无 `any`，Emits/Events 有类型声明
- **无硬编码**：颜色、文字、枚举值提取为常量或 Token，不内联在 JSX/模板
- **状态全覆盖**：loading / error / empty / disabled 状态均有 UI，不遗漏
- **无副作用泄漏**：useEffect 有清理函数；Vue 在 onUnmounted 移除监听
- **可访问性（a11y）**：ARIA 标签、键盘导航、焦点管理符合 WCAG 2.1 AA 基线（落实 Step 2.2 审查结论）
- **无直接 DOM 操作**：用框架 ref / $el，不用 `document.querySelector`
- **CSS 不污染全局**：CSS Modules / scoped / styled-components，类名有命名空间
- **错误边界**：关键数据加载失败有 fallback UI，不白屏
- **魔法值在数据层统一转换**：组件层只处理业务语义

#### 5.3 枚举值与魔法值处理规范（来自真实案例）

```javascript
// constants/enums.js — 统一维护，不在组件中硬编码
const COOLING_MODE_LABELS = {
  'EnergySaving':'节能','LowNoise':'低噪','HighPerformance':'高性能',
  'Custom':'自定义','LiquidCooling':'液冷'
};
const PID_MODE_LABELS = {
  1:'慢升快降（省电优先）',2:'快升慢降（响应优先）',
  3:'慢升慢降（稳定优先）',4:'快升快降（激进模式）'
};
// utils/formatters.js — 魔法值集中处理
function formatTemperature(val){ return val >= 32768 ? '—' : val + ' ℃'; }
```

#### 5.4 API 集成层 → `src/services/[feature]Api.ts`

把 Demo 的 Mock 替换为真实 API 调用骨架，**保留 Mock 作为开发降级**：

> 仅当功能有 HTTP 后端时才建本层。**纯本地功能**（离线计算/编解码）无需 API 层，把「结果输出」做成对宿主的事件/IPC（如 `dispatchEvent('feature-apply', {detail})` → Webview `postMessage`），并在 INTEGRATION.md 写清这个边界即可。

```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export async function fetchFeatureData(params: QueryParams): Promise<FeatureData[]> {
  if (USE_MOCK) return mockFeatureData
  const res = await http.get('/api/feature', { params })
  return res.data
}
```

字段命名严格对齐阶段一 `data-structure.md` / `interface-contract.md` 的定义——这是「Mock 即契约」的落地。

**业务逻辑隔离原则：**
- 复杂业务规则（状态机、权限计算、条件映射）提取为纯函数放 `src/utils/[feature]Logic.ts`，与 UI 解耦
- API 层只做数据请求 + 字段映射，不含 UI 判断逻辑
- 在 INTEGRATION.md 列出「Demo 里写死、接入真接口后需替换成动态计算」的 Mock 常量

```typescript
// src/utils/[feature]Logic.ts — 业务规则独立于组件
export function resolveActionState(status: ItemStatus, role: UserRole): ActionConfig {
  if (role !== 'admin' && status === 'locked') return { disabled:true, reason:'无操作权限' }
  return { disabled:false }
}
```

#### 5.5 单元测试桩（视项目而定）

```typescript
describe('[ComponentName]', () => {
  it('renders loading state', () => { /* TODO: implement */ })
  it('renders error state', () => { /* TODO: implement */ })
  it('renders empty state', () => { /* TODO: implement */ })
  it('renders data correctly', () => { /* TODO: implement */ })
  it('handles user interaction: [主要交互]', () => { /* TODO: implement */ })
})
```

测试桩标 `// TODO: implement` 而非空 it 块，让开发者知道要补什么。

> **⚠️ 完成 Step 5 工程代码后，立即进入 Step 6，不要询问用户是否继续。**

---

### Step 6 — 接入说明 → `INTEGRATION.md`

接入说明必须覆盖四块：**接口定义 · 业务逻辑 · 前后端边界 · 联调待确认**。

```markdown
# [功能名称] · 工程接入指南

## 前置条件
[Node 版本、框架版本、其他依赖（带版本号或 CDN 链接）]

## 安装依赖 / 文件放置
[npm install …；每个文件放到工程的哪个目录]

## 配置
[路由注册 / 全局组件注册 / 状态初始化]

## 接口定义对接
[把后端数据传入组件的方式 + 示例；字段命名与 data-structure.md / interface-contract.md 一致]
[替换 Mock：VITE_USE_MOCK=true → false，配置 VITE_API_BASE_URL]

## 业务逻辑说明
[关键业务规则放在 utils/[feature]Logic.ts；哪些 Demo 写死的 Mock 常量接入后需替换成动态计算]

## 前后端边界
| 功能 | 前端负责 | 后端负责 | 联调验证点 |
|------|---------|---------|----------|

## 枚举值 / 魔法值说明
[指向 constants/enums.js 与 utils/formatters.js；如何扩展新枚举]

## 与后端联调待确认项
1. [ ] 接口字段命名与组件是否一致
2. [ ] 业务规则由后端 flag 控制 vs 前端本地计算的边界
3. [ ] 错误码 → 前端错误提示映射
4. [ ] 分页策略（cursor / offset）
[重点：魔法值字段、动态语法字段（如 CSR `<=/...`）的处理]

## 已知限制
[从 design-review.md / accessibility-audit.md 摘取的待处理项；待后端配合项]
```

---

### Step 7 — README + 新增/修改日志（CHANGELOG）

**README.md** — 项目总览，覆盖两阶段：背景、产物清单、目录结构、如何打开 Demo、如何接入工程、文档索引（指向 design-structure / INTEGRATION / 审查报告 / 阶段一可视化报告）。

> 「如何打开」要区分两类产物：**单文件 Demo** 可 `file://` 双击；**用 ES Modules 的工程版**不能双击（浏览器对 `file://` 的模块 CORS 限制），必须经 HTTP 打开，README 要给出 `python3 -m http.server` 之类的命令，别让接收方对着空白页排查。

**CHANGELOG.md** — 新增/修改日志，区分 Demo 版与工程版：

```markdown
## [v1.0.0-engineering] - [日期]
### 新增
- 工程级组件拆分（阶段二）
- TypeScript 类型定义 / API 集成层（含 Mock 降级）/ 单元测试桩
- 可访问性修复（落实 accessibility-audit.md 的前端可独立项）
### 修改
- [列出 Demo → 工程过程中的设计调整]
### 来自审查的变更
- [设计审查 / 可访问性审查中已修复的问题，逐条对应]
### 待后续
- [需后端配合 / 需产品决策的遗留项]
```

> 若多轮迭代，每轮都追加 CHANGELOG 条目，注明本轮新增/修改/修复，让协作方一眼看到差异。

> **⚠️ 完成 Step 7（README + CHANGELOG）后，整体执行结束。输出所有产物清单，逐条列出文件名与保存路径。**

---

## 来自 openUBMC Studio 的实践笔记

**Demo 是便宜的实验，工程代码是昂贵的承诺。** 别在方向未确认时写工程代码——Demo 阶段暴露的问题修起来是分钟级，工程代码里是小时级。

**Hex 优于颜色名。** 始终从 Demo 提取精确 hex 值。`#141420` 无歧义；「深海军蓝」则不然。

**视觉规格精确，数据与布局不写死。** 颜色 hex、尺寸 px、内部层级越精确越好；节点 x/y 坐标、hardcode 数组、具体实例属于运行时数据，不进设计文档。写死实例会导致无法接入真实数据源、拖拽等交互失效。

**图布局必须用布局引擎。** 永远不要硬编码图节点 x/y。用 ELK / dagre / ReactFlow 自动布局；用户拖拽后的位置持久化回数据源，而不是刷新又回到算法位置。

**Mock 数据 = API 契约。** Demo 的 Mock 字段形状应与真实后端一致，`lastLoginAt`（而非 `last_login`）的对齐从阶段一就开始，本阶段 API 层是替换而非重写。

**魔法值是 UI 层的责任。** `32768` 表示「无效温度」是后端内部约定，UI 绝不能直接展示。转换集中在 `formatters` 统一处理，不散落各组件。

**Canvas 组件必须有表格替代方案。** 曲线编辑器用 Canvas 直观，但对辅助技术完全不透明。提供完全等价的表格视图作为备选，而非表格只读展示。

**工程工具的「信息密度」标准与消费者应用不同。** 专业用户能处理更高密度信息，但这不意味着可以用 `font-size: 11px` 或 `max-height: 160px` 的输出区。长时间使用的工具对可读性要求更高，不是更低。

**可访问性问题根源在后端时要写清楚。** `pid_control_mode: 1/2/3/4` 这类整数枚举，若后端不提供 label 映射 API，前端就得硬编码中文标签，导致国际化困难、标签与后端不同步。在 accessibility-audit.md 明确标注，推动后端改进。

**组件拆分在写代码前确认。** 组件树比代码实现更容易改。把结构对齐后再动手，比写完再重构省力得多。

**接入指南是工程交付的最后一公里。** 写不清楚开发会在环境配置和依赖版本卡很久。具体写：包名 + 版本、目录位置、环境变量名称、字段映射。假设读者是刚加入团队、不知道 `32768` 是什么、不知道 `monitoring_status` 是 CSR 同步语法的人。

---

## Artifact 模板

### design-structure.md（完整模板）

```markdown
# [产品名称] · 设计结构文档
> 生成时间：[日期] | Demo 版本：[版本号 / 链接]

## 一、页面整体布局
### 1.1 分区结构（ASCII 树）
​```
页面（全屏 / 1440px min-width，背景 #XXXXXX）
├── [区域名]   固定高 XXpx，背景 #XXXXXX，底部边框 1px solid #XXXXXX
│   ├── 左侧：[内容，从左到右]
│   └── 右侧：[内容，从左到右]
├── [区域名]   flex:1，背景 #XXXXXX
│   ├── 侧边栏  宽 XXXpx，背景 #XXXXXX，右边框 1px solid #XXXXXX
│   └── 主内容区 flex:1，padding XXpx
└── [区域名]   固定高 XXpx / 悬浮定位
​```
### 1.2 间距系统
| 用途 | 值 |
|------|----|
| 组件间主间距 | Xpx |
| 卡片内边距 | Xpx Xpx |
| 列表行高 | Xpx |
| 图标与文字间距 | Xpx |

## 二、组件清单
> 每个组件：精确尺寸 + 精确颜色(hex) + 内部层叠结构 + 变体 + 状态

### [组件名]（[类型：TopBar / Card / Button / Input / List / Modal / ...]）
​```
尺寸：宽 Xpx / 100%，高 Xpx / auto
背景：#XXXXXX
边框：Xpx solid #XXXXXX，圆角 Xpx
阴影：无 / box-shadow: 0 Xpx Xpx Xpx rgba(X,X,X,X)
​```
**内部结构（从上到下）：**
1. **[层级名]**（高 Xpx，背景 #XXXXXX，圆角 top Xpx）
   - 文字：Xpx，weight XXX，颜色 #XXXXXX，letter-spacing Xpx
   - 图标：Xpx × Xpx，颜色 #XXXXXX
2. **[层级名]**（高 Xpx，padding X Xpx）
   - [内容]：颜色 #XXXXXX，尺寸 Xpx
**变体：**
| 变体 | 背景 | 文字色 | 边框 | 其他 |
|------|------|--------|------|------|
| 默认 | #XXXXXX | #XXXXXX | 1px solid #XXXXXX | — |
| 激活 | #XXXXXX | #XXXXXX | 1px solid #XXXXXX | — |
| 禁用 | #XXXXXX | #XXXXXX | — | opacity 0.4 |
**交互热点：**
- [位置]：hover → [变化，如 border-color #XXXXXX，brightness 1.3]
- [位置]：active → [变化]
- [位置]：focus → [outline 2px solid #XXXXXX]
**空状态：** [描述/无]  **加载状态：** [骨架屏 / spinner #XXXXXX / 无]

（按上述格式为每个组件逐一填写）

## 三、色彩 Token
| Token 名 | hex 值 | 用途 |
|---------|--------|------|
| bg-page | #XXXXXX | 页面背景 |
| bg-card | #XXXXXX | 卡片背景 |
| bg-hover | #XXXXXX | hover 态背景 |
| border-default | #XXXXXX | 默认边框 |
| border-active | #XXXXXX | 选中/激活边框 |
| text-primary | #XXXXXX | 主文字 |
| text-secondary | #XXXXXX | 次级文字 |
| text-disabled | #XXXXXX | 禁用文字 |
| accent-[color] | #XXXXXX | [用途] |

## 四、字体规格
| 用途 | 字号 | 字重 | 颜色 | 行高 |
|------|------|------|------|------|
| 页面标题 | Xpx | XXX | #XXXXXX | X |
| 卡片标题 | Xpx | XXX | #XXXXXX | X |
| 正文 | Xpx | XXX | #XXXXXX | X |
| 标签 / Badge | Xpx | XXX | #XXXXXX | — |
| 辅助说明 | Xpx | XXX | #XXXXXX | X |

## 五、非静态区域
| 区域 | 组件 | 类型 | 空状态处理 |
|------|------|------|----------|
| [区域名] | [组件名] | 动态列表 | 空状态插图 + 提示 |
| [区域名] | [组件名] | 条件渲染 | 权限不足时隐藏 |
| [区域名] | [组件名] | 动画 | 进入动画 Xms ease-out |

## 六、数据 Schema
> ⚠️ 只写字段结构，不写具体节点实例。数据来自数据源，由代码动态渲染。
​```typescript
// [实体名] — 来源：[API 路径 / config 文件 / 待确认]
interface [Entity] {
  id: string
  type: '[类型A]' | '[类型B]'  // 决定渲染哪种组件变体
  label: string
  parentId?: string            // 层级关系
}
​```
数据来源：[API GET /xxx / YAML config / JSON 文件] | 加载时机：[挂载 / 路由进入 / 用户触发] | 更新策略：[WebSocket / 轮询 Xs / 保存时]

## 七、布局策略
（仅在有拓扑图/流程图/树形结构时填写）
| 项目 | 规格 |
|------|------|
| 布局算法 | dagre / ELK.js / d3-force / 无（手动） |
| 方向 | LR / TB / BT / RL |
| 节点间距 | Xpx |
| 层级间距 | Xpx |
| 初始位置来源 | 从数据源读取 / 算法计算后用户拖拽持久化 |
| 布局触发时机 | 数据加载完成后 / 节点增删后重算 |

## 八、交互操作规格 + 状态枚举

### 8.1 画布级 / 容器级交互（如适用）
| 操作 | 是否支持 | 约束 |
|------|---------|------|
| 拖拽平移 | ✅ | 无边界 / 限制在 [X,Y] |
| 滚轮缩放 | ✅ | 范围 [10%,200%]，默认 100% |
| 框选多节点 | ✅ | Shift 追加 |
| 右键菜单 | ✅ | 见下 |

### 8.2 节点 / 行级交互（如适用）
| 操作 | 适用类型 | 约束 |
|------|---------|------|
| 拖拽移动 | [全部/指定] | 网格吸附 Xpx / 无 |
| 缩放 resize | [容器节点] | 最小 Xpx×Xpx |
| 连线 | [可连接类型] | 源端/目标端位置 |
| 双击编辑 | [可编辑类型] | 行内 / 弹出 Panel |
| hover 高亮 | [全部] | border-color #XXXXXX |
| 选中态 | [全部] | outline 2px solid #XXXXXX |

### 8.3 右键菜单 / 撤销重做（如适用）
| 菜单项 | 作用 | 适用节点 |
|--------|------|---------|
| 编辑属性 / 删除 / 复制 | … | … |
- 撤销重做：✅/❌；覆盖操作：移动/删除/新增/连线/属性；快捷键 Ctrl+Z / Ctrl+Y

### 8.4 逐组件状态枚举表（每个可交互组件单独一张表，不可合并）

> **必须覆盖的状态**：default / hover / focus / active / disabled / error / empty / loading  
> 不存在的状态写「不适用」，不可省略该行。

#### [组件名，如：主操作按钮]
| 状态 | 触发条件 | 视觉变化（精确 hex/px） | 行为约束 |
|------|---------|----------------------|---------|
| default | 页面加载 | 背景 #XXXXXX，文字 #XXXXXX，边框 none | — |
| hover | 鼠标移入 | 背景 #XXXXXX | 非持久态 |
| focus | Tab / 点击 | outline 2px solid #XXXXXX，offset 2px | 键盘导航可见 |
| active | 鼠标按下 | 背景 #XXXXXX，scale(0.98) | 松开恢复 hover |
| disabled | 前置条件未满足 | opacity 0.4，cursor not-allowed | 不响应交互 |
| error | 不适用 | — | — |
| empty | 不适用 | — | — |
| loading | 请求发出后 | [spinner] 替换文字，disabled | 禁止重复触发 |

（为每个可交互组件逐一填写：输入框、下拉选择器、开关/复选框、单选组、表格行、可点击卡片/列表项等）

## 九、关键交互序列 + 数据流

### [交互名称，如：提交表单 / 切换模式 / 删除节点]

1. **触发**：用户 [动作，如点击「生成」按钮]（条件：[前置状态，如表单无错误]）
2. **即时反馈**：[组件] 进入 loading 态，[按钮] disabled；出现 [进度条/spinner]
3. **后端/计算处理**：[接口调用 / 本地计算] → 预计耗时 [范围]
4. **成功响应**：[组件] 展示 [结果]；状态从 loading → [新状态]；[Toast/Banner] 显示「[成功文案]」
5. **失败响应**：[错误类型] → [错误展示位置] 显示「[错误文案]」；[组件] 回到 error 态；[提供修复入口]
6. **逆操作路径**：[可撤销 → Ctrl+Z 恢复 / 不可撤销 → 操作前需二次确认弹窗]

```
[数据源（API / config）] → 解析为 [数据结构] → [布局算法（如有）]
→ 渲染 → 用户交互 → 状态更新（本地 store）→ [可选] 持久化回写 / 导出
```

（为每条关键流程单独列出：提交表单、切换视图/模式、加载数据、错误恢复等）

## ⚠️ 待设计师确认
1. [ ] 动画时长与缓动曲线（具体组件：[列出]）
2. [ ] 错误提示文案与出现时机（具体场景：[列出]）
3. [ ] 边缘状态视觉处理：空数据 / 超长文本 / 权限不足
4. [ ] 多步骤流程的回退规则
5. [ ] [从 Step 2 审查未决项中补充]
```

### tech-selection.md

```markdown
# [产品名称] · 技术选型
## Demo 选型（单文件 / 零安装 / CDN）
[框架 + 关键库 + 理由]
## 工程选型（对齐目标栈）
[框架 + UI 库 + 状态管理 + CSS 方案 + 数据请求 + 理由]
## Demo → 工程迁移路径
[逐项：Demo 怎么做 → 工程怎么做]
## 被排除的方案
| 方案 | 排除原因 |
```

### accessibility-audit.md / design-review.md
> 见 Step 2 的输出格式。
```
