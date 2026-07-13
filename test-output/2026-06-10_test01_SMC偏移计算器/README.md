# test01 · SMC 偏移计算器 · 2026-06-10

**需求输入**：`preview-smc-calculator.html`（单页 HTML 原型，BMC Studio VS Code 插件工具）
**验证内容**：两阶段 Skill 全流程——Phase1 需求分析 + Phase2 UX 规格输出

---

## 关键交付物

| 文件 | 说明 | 打开方式 |
|------|------|---------|
| `phase1-需求分析/REPORT-分析报告.html` | **可视化分析报告** · 9 幕 16:9 幻灯片（BUTP 四维 + A–H 八节 + 设计机会点） | 浏览器直接打开 |
| `phase1-需求分析/PROMPT-Demo优化提示词.md` | **Demo 优化提示词** · §A VS Code token 基线 + §B 量化问题 + §C 目标状态 + §F 状态覆盖 | 文本查看 |
| `phase1-需求分析/DEMO-优化版/index.html` | **优化版 Demo** · PTO Design System，完整响应真实需求 | 浏览器直接打开 |
| `phase2-UX规格/REPORT-UX规格报告.html` | **UX 规格报告** · 1210 行完整版，含状态矩阵 + 交互流程 + 工程桥接 | 浏览器直接打开 |

---

## 迭代过程

本次测试历经 3 轮迭代（详见 `_历史迭代/`），最终产物来自：
- Phase1 → `skill-validation/iter-3`（PTO 设计系统，渲染验证通过）
- Phase2 → `skill-validation/iter-3-phase2`（升级到 1210 行完整版）

早期草稿归档在 `_历史迭代/`，仅供回溯对比，不作为正式产物。

---

## 重要发现（测试结论）

- BUTP 四维分析能准确覆盖 B（商业价值）/ U（固件工程师痛点）/ T（VS Code 生态趋势）/ P（操作流断点）
- Phase2 第 9 节「机会点→uxspec 落地对照」有效闭合了设计↔产品对齐环
- SMC 特定业务逻辑（SMC codec 字段计算）已从 Skill 中抽离为案例示例，不影响其他需求复用
