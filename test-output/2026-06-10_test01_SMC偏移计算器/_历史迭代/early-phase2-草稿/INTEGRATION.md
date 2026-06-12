# SMC 偏移量计算器 · 工程接入指南

## 前置条件
- 运行环境：现代浏览器 / VS Code Webview（支持 ES Modules + Custom Elements + Shadow DOM，无 polyfill 需求）。
- 无 npm 运行时依赖。仅开发期测试用 Node ≥ 18（`node:test`）。

## 安装依赖 / 文件放置
无需 `npm install`。把 `src/` 整体拷入工程：
```
src/constants/enums.js
src/utils/smcCodec.js
src/utils/formatters.js
src/components/SmcCalculator/smc-calculator.js
```
宿主页 `import './src/components/SmcCalculator/smc-calculator.js'` 后即可使用 `<smc-calculator>`。

## 配置
- 无路由/全局状态。组件自注册（`customElements.define('smc-calculator', …)`）。
- 主题：组件用 `--vscode-*` 风格 hex；在 VS Code Webview 中可由宿主主题变量覆盖 `:host` 上的 CSS 变量实现明暗适配。

## 接口定义对接
本功能**无 HTTP 后端**，唯一对外接口是「应用」事件：
```js
const calc = document.querySelector('smc-calculator');
calc.addEventListener('smc-apply', (e) => {
  // e.detail = { offsetHex: '0x30460000', offsetDec: 809893888, fields: {...} }
  // VS Code Webview 宿主侧：
  // acquireVsCodeApi().postMessage({ type: 'applyOffset', ...e.detail });
});
```
反向（宿主带初值打开）可扩展一个 `setOffset(dec)` 公开方法 → 内部 `decodeOffset` 回填（当前未实现，见待确认）。

## 业务逻辑说明
- 编解码/校验纯函数集中在 `utils/smcCodec.js`，与 UI 解耦，可单测。
- 语义映射集中在 `constants/enums.js` + `utils/formatters.js`，组件不硬编码标签。
- **Demo 写死、接入后需替换为动态的项**：`FUNCTION_LABELS`（功能码语义）当前前端硬编码。若宿主/后端能下发枚举字典（含 i18n），应改为运行时注入，避免与协议表脱节。

## 前后端边界
| 功能 | 前端负责 | 宿主/后端负责 | 联调验证点 |
|------|---------|--------------|----------|
| 位字段编解码/校验 | 全部（本地纯函数） | 无 | — |
| 功能码语义标签 | 兜底硬编码 | 理想下发枚举字典 | 标签来源、i18n、与协议表一致性 |
| 应用结果回写 | 抛 `smc-apply` 事件 | 接收并写目标（寄存器/单元格） | 写回目标、失败反馈 |
| 功能码合法性（保留/OEM/空洞） | 前端给区段提示 | 规格定义拦截策略 | 是否拦截 0x0A–0x1F 等空洞 |

## 枚举值 / 魔法值说明
- 枚举与字段定义见 `constants/enums.js`（`FIELD_DEFS` / `FUNCTION_LABELS` / `BIT_LABELS`）。
- 魔法值 `0xFFFFFFFF`：偏移量输入溢出时取低 32 位并警告，逻辑在 `smcCodec.parseOffsetInput`。
- 扩展新功能码：在 `FUNCTION_LABELS` 加一行即可；OEM(0x37–0x3F) 由 `formatters.describeFunction` 自动归类。

## 与后端/宿主联调待确认项
1. [ ] 部署形态：VS Code Webview 嵌入 还是 独立工具页？决定是否需要 `postMessage` 桥与 `setOffset` 入口。
2. [ ] 「应用」真实写回目标与失败反馈文案。
3. [ ] 功能码空洞（0x0A–0x1F、0x21–0x36）：仅警告 vs 拦截？（来自 design-review D6）
4. [ ] 功能码语义是否由宿主下发（替换前端硬编码）。
5. [ ] 错误码 → 提示映射（若未来加入下发校验）。

## 已知限制
- 功能码语义为前端兜底硬编码（待宿主下发）。
- 无历史记录/批量解码（后续迭代）。
- `setOffset(dec)` 宿主入口尚未实现（待确认部署形态后补）。
- 窄面板(<360px)下 2 列网格未做单列降级（design-structure 待确认项 5）。
