# SMC 偏移量计算器

BMC 固件 **32 位 SMC 命令字 ↔ 5 语义字段** 的双向编解码工具。功能码(6) | 命令码(16) | 读取方式(1) | 读写方向(1) | 参数(8)。

本仓库覆盖「需求 → 工程」两阶段流水线的产物。

## 产物清单

### 阶段一 · 需求分析（`../phase1/`）
- `product-doc.md` — 完整产品文档（功能/场景/用户/痛点/机会点/竞品/概念）
- `data-structure.md` · `interface-contract.md` · `business-logic.md` — 代码梳理三件套
- `demo-prompt.md` — Demo 优化提示词（优化模式）
- `smc-calculator-report.html` — 16:9 幻灯片可视化报告（含第一轮设计审查）
- `preview/index.html` — 审查对象（原始 Demo）

### 阶段间过渡 · 优化后 Demo（`../optimized-demo/`）
- `index.html` — 由阶段一 demo-prompt.md 产出的优化后 Demo（单文件可双击）；**阶段二的输入对象**。

### 阶段二 · 工程化（本目录）
- `design-review.md` · `accessibility-audit.md` — 针对**优化后 Demo** 的第二轮设计 / 可访问性审查（WCAG 2.1 AA）
- `design-structure.md` — uxspec 精确源（视觉/布局/逐组件状态枚举/交互序列）
- `uxspec-report.html` — **uxspec 可视化报告**（16:9 幻灯片，评审沟通用）
- `tech-selection.md` — 技术选型（原生 Web Component，无框架）
- `src/` — 工程级前端代码
- `test/` — 单元测试（9 用例，`node --test` 通过）
- `INTEGRATION.md` — 接入说明
- `CHANGELOG.md` — 变更日志

## 目录结构
```
phase2/
├── index.html                          # 宿主演示页
├── package.json                        # type:module, npm test
├── src/
│   ├── constants/enums.js              # 字段定义 + 枚举 + 配色
│   ├── utils/smcCodec.js               # 编解码/校验纯函数
│   ├── utils/formatters.js             # 语义格式化
│   └── components/SmcCalculator/
│       └── smc-calculator.js           # <smc-calculator> Web Component
├── test/smcCodec.test.js
├── design-review.md · accessibility-audit.md · design-structure.md · tech-selection.md
└── INTEGRATION.md · README.md · CHANGELOG.md
```

## 如何打开 Demo / 工程版
- 原始 Demo：双击 `../phase1/preview/index.html`。
- **优化后 Demo：双击 `../optimized-demo/index.html`**（单文件，可直接 file:// 打开）。
- uxspec 可视化报告：双击 `uxspec-report.html`。
- 工程版：因用 ES Modules，需经 HTTP 打开（不能 file://）：
  ```bash
  cd phase2 && python3 -m http.server 8765   # 浏览器访问 http://localhost:8765
  ```

## 如何接入工程
见 `INTEGRATION.md`。核心：拷 `src/`，宿主页 `import` 组件，监听 `smc-apply` 事件拿结果。

## 如何跑测试
```bash
cd phase2 && npm test     # 等价 node --test
```

## 文档索引
设计规格 → `design-structure.md`｜接入 → `INTEGRATION.md`｜审查 → `design-review.md` / `accessibility-audit.md`｜可视化报告 → `../phase1/smc-calculator-report.html`
