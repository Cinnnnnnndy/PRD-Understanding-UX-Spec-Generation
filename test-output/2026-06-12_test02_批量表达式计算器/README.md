# test02 · 管道表达式批量评估器 · 2026-06-12

**需求输入**：`86234586-previewbatchevaluator.html`（单页 HTML 原型，BMC Studio VS Code 插件工具）
**验证内容**：Phase1 需求分析全流程（BUTP + A–H + 优化 Demo）

---

## 关键交付物

| 文件 | 说明 | 打开方式 |
|------|------|---------|
| `phase1-需求分析/REPORT-分析报告.html` | **可视化分析报告** · 9 幕 16:9 幻灯片（BUTP/概念/场景/用户流/设计基线/四维审查/机会点/综合结论） | 浏览器直接打开 |
| `phase1-需求分析/PROMPT-Demo优化提示词.md` | **Demo 优化提示词** · PTO token 基线 + §B 量化 11 处问题 + §C 目标状态 + §F 14 项状态覆盖 | 文本查看 |
| `DEMO-优化版/index.html` | **优化版 Demo** · PTO Design System（P0+P1+P2 全量），求值核心逐字移植 | 浏览器直接打开 |

---

## 设计系统

**PTO Design System** · `github.com/yinyucheng0601/pto-design-system`
- Dark / Light / Glass 三主题（右上角切换）
- `DEMO-优化版/design-system/` 内含三层 token CSS 离线快照

---

## Phase1 优化实现范围

| 优先级 | 改动 |
|--------|------|
| **P0** | inline 实时语法校验（替换 alert）· Ctrl+Enter/F5 快捷键 · 模板变量面板（打开 `${VarName}` 通道） |
| **P1** | 11 处英文→中文化 · 参数徽章动态类型 · 历史表达式持久化 · 结果筛选 Chips · 顶栏重构 · 零硬编码颜色 |
| **P2** | Emoji→SVG 图标 · 间距统一 `--space-1..6` · 三主题切换 |

---

## 验证发现

- **string.gsub Lua 量词缺陷**：原 Demo 的 `_luaPatToRegex` 把 `+*-?` 纳入转义集，导致 `%d+` 等量词失效（返回未替换结果）。优化 Demo 保持逐字移植行为一致，缺陷详见 `phase1-需求分析/business-logic.md` 第九节。
- 运行验证门：node 复算 10 组用例 **GATE PASS**（零硬编码颜色、零英文残留）
