# 设计系统（可插拔单元）

> **设计系统在本流水线里是一个「可替换单元」。** 每个项目的视觉标准不同——同一份功能规格，插上不同的设计系统就渲染成不同的视觉。流水线只负责「功能完成度」，视觉决策**全部委托**给当前插入的设计系统。

## 核心原则

```
功能完成度规格（可移植，design-system 无关）
        ×
设计系统（可插拔：PTO / Studio shell / 某项目自有 …）
        =
每次都对齐目标视觉的 Demo
```

- 阶段一产出的 `demo-prompt.md` 里，**能力规格（§B/§C：位图、历史、多格式导出、双向同步…）描述「做什么」，与视觉无关**。
- **§A「设计系统」是一个槽位**：插入哪个设计系统，就把所有视觉决策（颜色/字体/间距/圆角/组件/pattern）委托给它——读它的规则、用它的 token/class/pattern、不自创视觉。
- 换项目只换槽位里的设计系统，能力规格不动 → 每次生成的 Demo 都自动对齐该项目视觉。

## 当前激活：`pto-design-system`

本目录 `pto-design-system/` 是从 <https://github.com/yinyucheng0601/pto-design-system> vendored 的设计系统包，作为本轮及后续实验的激活设计系统。

它**本身是一个 skill**（`pto-design-system/SKILL.md`），有 Workflow A（新页面）/ B（改造现有 demo）/ C（pattern-first）。本流水线生成 Demo 时**委托给它**：

> 生成/改造 Demo 时，先读 `design-systems/pto-design-system/SKILL.md`，按其 Workflow B（把功能规格当作待改造 demo）执行：把每个元素映射到 PTO 的 token/class/pattern，产出迁移对照表，删除旧容器装饰，不自创视觉。

### 已 vendored（足够做样式委托）
- `SKILL.md` · `README.md` · `design-system-preview.html`
- `tokens/`（foundation / semantic / components．css —— 真实 CSS 变量）
- `css/style.css`（class 实现）
- `references/`（DESIGN.md / quick-reference / pto-design-system-map / retrofit-container-audit / preview-gate）
- `swimlane/` · `assets/`
- `patterns/patterns.json` + 各 `patterns/<id>/pattern.json`（pattern 契约）

### 未 vendored（需要时从 GitHub 取）
- 各 pattern 的 `pattern.js` / `pattern.css` 运行时（IDE frame、workbench-shell、graphviz、memory-architecture 等）
- `graphviz/` 大体积模型数据与 demo（5.9M）
- 用到某 pattern 的**运行时**时，`git clone https://github.com/yinyucheng0601/pto-design-system` 取完整包。
- SMC 计算器这类表单/数据工具：tokens + css 已足够，无需 pattern 运行时。

## 换一个设计系统怎么做
1. 把新设计系统包放到 `design-systems/<name>/`。
2. 在阶段一生成 Demo 前的「设计系统确认门」选它。
3. `demo-prompt.md` §A 槽位指向 `<name>`，能力规格（§B/§C）原样不动。
