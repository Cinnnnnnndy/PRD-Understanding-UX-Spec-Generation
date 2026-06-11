# SMC 偏移量计算器 · 工程产物总览

BMC 固件 32-bit 命令字 ↔ 5 字段（功能码/命令码/MS/RW/参数）双向编解码工具。  
目标用户：BMC/固件工程师；使用场景：写/审一批配置时连用，要求快、准、可带走。

---

## 两阶段产物汇总

### 阶段一（需求分析 + 优化 Demo）

| 产物 | 路径 |
|------|------|
| 优化后 Demo（PTO 设计系统版，单文件可双击） | `test-output/skill-validation/iter-3/optimized-demo.html` |
| Demo 渲染验证截图 | `test-output/skill-validation/iter-3/render-proof.png` |
| 优化提示词 | `test-output/skill-validation/iter-3/demo-prompt.md` |
| 需求分析三件套 | `test-output/phase1/` |

### 阶段二（本目录：设计审查 + UX 规格 + 工程代码）

| 产物 | 文件 | 说明 |
|------|------|------|
| 设计审查报告 | `design-review.md` | 7 条问题 + 7 条设计亮点 |
| 可访问性审查报告 | `accessibility-audit.md` | WCAG 2.1 AA，6 条问题，12 条已符合项 |
| UX 规格文档（精确源） | `design-structure.md` | 8 节完整规格（精确 hex/px，状态枚举，交互序列） |
| UX 规格可视化报告 | `uxspec-report.html` | 16:9 幻灯片，8 张 slide |
| 技术选型 | `tech-selection.md` | Demo（无框架）+ 工程（Web Component）迁移路径 |
| Web Component 组件 | `src/components/SmcCalculator/index.js` | `<smc-calculator>` 自定义元素 |
| 编解码纯函数 | `src/utils/smcCodec.js` | compose / decompose / parseLoose |
| 格式化工具 | `src/utils/formatters.js` | 输出格式化、功能码语义、时间戳 |
| 校验工具 | `src/utils/validators.js` | 字段范围校验 |
| 常量与枚举 | `src/constants/enums.js` | 字段定义、功能码表、格式枚举 |
| 单元测试 | `src/test/smcCodec.test.js` | 23 个用例，`node --test` 全通过 |
| 接入说明 | `INTEGRATION.md` | 前端独立 + VS Code Webview postMessage 桥 |
| 修改日志 | `CHANGELOG.md` | Demo 版 → 工程版变更记录 |

---

## 快速开始

### 打开优化后 Demo（单文件，file:// 可直接双击）
```
test-output/skill-validation/iter-3/optimized-demo.html
```
PTO CSS 已内联，双击即完整显示，无需服务。

### 运行工程版 Web Component（需 HTTP 服务）
```bash
cd test-output/skill-validation/iter-3-phase2
python3 -m http.server 8080
# 访问 http://localhost:8080
# 在 HTML 中 <script type="module" src="src/components/SmcCalculator/index.js"></script>
# 使用 <smc-calculator></smc-calculator>
```
> ⚠️ 工程版使用 ES Modules，**不能 `file://` 直接打开**（浏览器 CORS 限制）。

### 运行单元测试
```bash
cd test-output/skill-validation/iter-3-phase2
node --test src/test/smcCodec.test.js
# 预期输出：pass 23 / fail 0
```

---

## 目录结构

```
iter-3-phase2/
├── design-review.md          设计审查
├── accessibility-audit.md    可访问性审查
├── design-structure.md       UX 规格（精确源）
├── uxspec-report.html        UX 规格可视化报告
├── tech-selection.md         技术选型
├── INTEGRATION.md            接入指南
├── README.md                 本文件
├── CHANGELOG.md              修改日志
└── src/
    ├── components/
    │   └── SmcCalculator/
    │       └── index.js      <smc-calculator> Web Component
    ├── constants/
    │   └── enums.js          字段定义、枚举、常量
    ├── utils/
    │   ├── smcCodec.js       编解码纯函数
    │   ├── formatters.js     格式化工具
    │   └── validators.js     校验工具
    └── test/
        └── smcCodec.test.js  单元测试（23 用例）
```

---

## 核心编码规则

**32-bit 命令字位布局：**
```
位  31 30 29 28 27 26 | 25 ... 10 | 9  | 8  | 7 ... 0
字段  ←── func(6b) ──→ ←─cmd(16b)─→ ms   rw  ←param(8b)→
```

**合成公式：** `word = (func<<26) | (cmd<<10) | (ms<<9) | (rw<<8) | param`

**字段颜色（PTO 设计系统）：**
- func → `--warning` #FFAA3B（橙色）
- cmd  → `--primary` #4369EF（蓝色）
- ms   → `--accent`  #7c8db8（灰蓝）
- rw   → `--success` #04D793（绿色）
- param → `--danger` #FF4B7B（粉红）

---

## 文档索引

- 设计意图与功能规格 → `test-output/skill-validation/iter-3/demo-prompt.md`
- 设计审查问题清单 → `design-review.md`
- 可访问性修复清单 → `accessibility-audit.md`
- 精确视觉规格 → `design-structure.md`（hex + px，状态枚举，交互序列）
- 接入宿主 + Webview 桥 → `INTEGRATION.md`
