# test-output · 测试产物总索引

每次用真实需求输入对两阶段 Skill（phase1 需求分析 + phase2 UX 规格）做端到端验证，产物按测试编号 + 日期 + 需求名称分类。

---

## 测试记录

| # | 日期 | 需求 | 输入形态 | 产物目录 |
|---|------|------|---------|---------|
| 01 | 2026-06-10 | SMC 偏移计算器 | 单页 HTML 原型 | `2026-06-10_test01_SMC偏移计算器/` |
| 02 | 2026-06-12 | 管道表达式批量评估器 | 单页 HTML 原型 | `2026-06-12_test02_批量表达式计算器/` |

---

## 关键产物说明

每个测试目录内三类关键交付物用**前缀**标识，一眼可辨：

| 前缀 | 说明 |
|------|------|
| `REPORT-` | 可视化分析报告（HTML 幻灯片，直接浏览器打开） |
| `PROMPT-` | Demo 优化提示词（给 LLM 生成优化版 Demo 用的 Markdown） |
| `DEMO-优化版/` | 优化后的 Demo 文件夹（`index.html` 即主文件） |

---

## test01 — SMC 偏移计算器

```
2026-06-10_test01_SMC偏移计算器/
├── phase1-需求分析/
│   ├── REPORT-分析报告.html          ← 可视化分析报告（9幕 16:9）
│   ├── PROMPT-Demo优化提示词.md      ← Demo 生成提示词
│   ├── DEMO-优化版/
│   │   ├── index.html                ← 优化版 Demo（PTO Design System）
│   │   └── render-proof.png          渲染验证截图
│   ├── product-doc.md                BUTP + A–H 需求分析
│   ├── business-logic.md
│   ├── data-structure.md
│   └── interface-contract.md
├── phase2-UX规格/
│   ├── REPORT-UX规格报告.html        ← UX 规格报告（1210 行完整版）
│   ├── design-structure.md           九节设计结构文档（含第9节机会点落地对照）
│   ├── design-review.md
│   ├── accessibility-audit.md
│   ├── tech-selection.md
│   └── src/                          工程化参考代码（Web Component）
└── _历史迭代/                        早期草稿，仅供参考
    ├── iter-1/                       第一轮验证草稿
    ├── iter-2/                       PTO 迁移对照表
    ├── early-demo/                   studio-shell 风格早期 Demo
    ├── early-phase1-草稿/            最初分析文档
    └── early-phase2-草稿/            最初 UX 规格草稿（354 行旧版）
```

---

## test02 — 管道表达式批量评估器

```
2026-06-12_test02_批量表达式计算器/
├── phase1-需求分析/
│   ├── REPORT-分析报告.html          ← 可视化分析报告（9幕 16:9）
│   ├── PROMPT-Demo优化提示词.md      ← Demo 生成提示词（§A–§F 完整结构）
│   ├── product-doc.md                BUTP + A–H 需求分析（含 H 商业价值优先级表）
│   ├── business-logic.md             管道语法 + 函数清单 + 验证发现的缺陷（§9）
│   ├── data-structure.md
│   └── interface-contract.md
└── DEMO-优化版/
    ├── index.html                    ← 优化版 Demo（PTO Design System，P0+P1+P2）
    ├── design-system/                PTO 三层 token CSS（dark/light/glass 三主题）
    └── README.md                     改动说明 + 验证门结果
```

---

## Skill 文件位置

两阶段 Skill 源文件在 `phase1-requirement-analysis/SKILL.md` 和 `phase2-demo-to-data/SKILL.md`。
