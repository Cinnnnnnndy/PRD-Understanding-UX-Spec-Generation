# PRD Understanding · UX Spec Generation

一套面向 Claude Code 的**两阶段 Skill 流水线**，把「任意形态的需求」系统地推进到「可接入工程的代码与交付文档」。提炼并重构自 openUBMC Studio 的设计协作实践。

```
需求输入 ──[阶段一]──▶ 分析报告 + 可视化报告 + Demo 提示词
                              │
                              ▼  用提示词生成 / 精调 Demo
                              │
精调后的 Demo ──[阶段二]──▶ 设计审查 + 设计规格 + 工程代码 + 接入交付文档
```

---

## 仓库结构

```
.
├── phase1-requirement-analysis/   # 阶段一 Skill
│   └── SKILL.md
└── phase2-demo-to-data/           # 阶段二 Skill
    └── SKILL.md
```

每个文件夹即一个 Claude Code Skill，文件名必须为 `SKILL.md`，文件夹名即 Skill 标识。

---

## 阶段一 · 需求 → 分析报告 · 可视化报告 · Demo 提示词

**输入**：后端代码 / 一段文字 / 一张草图 / 一句话 / 一份简易文档——任意形态的需求。

**产出**：
1. **可视化报告**——16:9 幻灯片 HTML，单文件（CSS/JS 内联），宽度自适应且比例不变
2. **Demo 提示词文档**——用于生成或精调 Demo 的高质量提示词
3. **优化后 Demo**——用提示词产出的单文件可双击 Demo，是阶段二的输入
4. **代码梳理三件套**（当输入为代码时）——数据结构、接口契约、业务逻辑

**核心动作**：功能定义 · 场景分析 · 用户画像 · 核心流程 · 设计机会点 · 对标竞品 · 注意事项洞察，并跑第一轮设计审查（方法内置，工具无关；环境有 `/design-critique` 可叠加），结论并入可视化报告。

**触发词**：`帮我分析这个需求` / `把这段代码/文字/草图变成分析报告` / `生成demo提示词` / `第一阶段分析` …

---

## 阶段二 · Demo 精调产物 → 设计审查 · 工程代码 · 接入交付

**输入**：阶段一产出的**优化后 Demo**（或基于 Demo 提示词再迭代的版本）。本阶段所有审查与 uxspec 都以这个优化后 Demo 为对象。

**产出（七步，全部强制顺序执行，不中途停顿；审查方法内置、工具无关）**：
1. `design-review.md`——设计审查（内置四维度方法；环境有 `/design-critique` 可叠加）
2. `accessibility-audit.md`——可访问性审查（内置 WCAG 2.1 AA 清单；环境有 `/accessibility-review` 可叠加）
3. `design-structure.md`（uxspec 精确源）+ 可选 `uxspec-report.html`（uxspec 可视化报告形态）——精确视觉规格 · 布局算法 · 交互规格 · 逐组件状态枚举 · 交互序列 · 待确认清单
4. `tech-selection.md`（可选）——技术选型，Demo 与工程各一套
5. 工程级前端代码——符合后端数据结构，可直接接入
6. `INTEGRATION.md`——接口定义 · 业务逻辑 · 前后端边界 · 联调待确认
7. `README.md` + `CHANGELOG.md`——项目总览与新增/修改日志

**触发词**：`工程化这个demo` / `把demo转成工程代码` / `生成可接入的组件` / `对demo做可访问性审查` / `第二阶段` …

---

## 安装

把两个 Skill 文件夹软链或复制到 Claude Code 的 skills 目录：

```bash
ln -s "$(pwd)/phase1-requirement-analysis" ~/.claude/skills/phase1-requirement-analysis
ln -s "$(pwd)/phase2-demo-to-data"         ~/.claude/skills/phase2-demo-to-data
```

或直接复制：

```bash
cp -r phase1-requirement-analysis phase2-demo-to-data ~/.claude/skills/
```

安装后在 Claude Code 中通过上述触发词或显式 `/` 调用即可。

---

## 设计理念

> **任何需求形态都先被翻译成结构化分析，再渲染成两类产物——给人看的可视化报告、给 AI 看的 Demo 提示词。**

> **Demo 是验证工具，不是最终交付物。** 设计意图通过 Demo 对齐之后，工程代码才是真正能进仓库的资产。Demo 是便宜的实验，工程代码是昂贵的承诺——审查、反推规格、对齐方向都要在写工程代码之前完成。
