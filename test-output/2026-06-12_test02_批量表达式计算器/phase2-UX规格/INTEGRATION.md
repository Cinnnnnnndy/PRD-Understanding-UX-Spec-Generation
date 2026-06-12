# 管道表达式批量评估器 · 工程接入指南

## 前置条件

- **浏览器**：Chrome 80+ / Firefox 75+ / Safari 14+（Custom Elements + Shadow DOM + ES Modules）
- **Node.js**：18+（如需运行单元测试 `node:test`）
- **PTO Design System**：CSS 变量通过 `data-theme` 属性控制主题（dark / light / glass）；工程中只需在 `<html>` 或宿主容器上挂载 PTO foundation.css + semantic.css，组件 Shadow DOM 内的 CSS 变量会自动继承

> ⚠️ **打开方式说明**：工程版使用 ES Modules（`import`），不支持 `file://` 协议双击打开（浏览器跨域限制）。请通过 HTTP 服务器提供：`python3 -m http.server 8080`，然后访问 `http://localhost:8080`。

---

## 文件放置

```
your-project/
├── src/
│   ├── components/
│   │   └── PipeBatchEvaluator/
│   │       └── index.js          ← 自定义元素主文件
│   ├── utils/
│   │   ├── pipeEvalLogic.js      ← 求值核心（可独立复用）
│   │   ├── formatters.js
│   │   └── validators.js
│   └── constants/
│       └── enums.js
└── design-system/                ← PTO Design System CSS 快照（或从 CDN 引入）
    ├── foundation.css
    ├── semantic.css
    └── components.css
```

---

## 注册组件

```html
<!-- 在 HTML 中引入 PTO 设计系统 -->
<link rel="stylesheet" href="/design-system/foundation.css">
<link rel="stylesheet" href="/design-system/semantic.css">
<link rel="stylesheet" href="/design-system/components.css">

<!-- 注册自定义元素 -->
<script type="module" src="/src/components/PipeBatchEvaluator/index.js"></script>

<!-- 使用 -->
<html data-theme="dark">
<body>
  <pipe-batch-evaluator></pipe-batch-evaluator>
</body>
</html>
```

---

## 嵌入 BMC Studio Webview（postMessage 通道）

### 宿主向工具注入模板变量

```javascript
// 宿主（BMC Studio Webview 宿主端）
const iframe = document.querySelector('iframe') // 或 webview
iframe.contentWindow.postMessage({
  type: 'TEMPLATE_VARS_UPDATE',
  vars: {
    DeviceName: 'bmc-01',
    SlotId: '2',
    FirmwareVer: '3.1.4',
  }
}, '*')
```

### 工具向宿主上报求值结果

工具在每次单次调试求值完成时派发 `pipe-result-ready` 事件：

```javascript
// 宿主监听
document.querySelector('pipe-batch-evaluator').addEventListener('pipe-result-ready', evt => {
  const { expr, result, inputs } = evt.detail
  console.log('求值完成', result)
})

// 批量执行完成时派发 pipe-batch-done
document.querySelector('pipe-batch-evaluator').addEventListener('pipe-batch-done', evt => {
  const { stats, results } = evt.detail
  // stats: { total, matched, mismatched, errored }
  // results: TestCase[]（含 actualOutput, executionStatus）
})
```

### 与 BMC Studio 已有桥接方式对比

| 通信方向 | 机制 | 字段 |
|---------|------|------|
| 宿主 → 工具（注入变量） | `postMessage` | `{ type: 'TEMPLATE_VARS_UPDATE', vars: Record<string,string> }` |
| 工具 → 宿主（通知结果） | `CustomEvent`（bubbles） | `pipe-result-ready` / `pipe-batch-done` |

> 无 HTTP 接口，本工具为**纯本地计算**，所有求值在客户端 JS 完成。

---

## 业务逻辑说明

| 关键逻辑 | 所在文件 | 说明 |
|---------|---------|------|
| 管道表达式解析 | `utils/pipeEvalLogic.js` → `parsePipeExpr()` | 纯函数，语法校验 + 阶段切分 |
| 单阶段求值 | `PipeEvaluator._evalStage()` | 支持 `expr`, `string.*` 函数；`_luaPatToRegex` 有量词缺陷（已知，刻意保留） |
| 完整管道求值 | `PipeEvaluator.evaluate()` | 返回 `{ success, result, intermediates }` |
| 测试用例解析 | `parseTestCaseText()` | 跳过空行和 `#` 注释；支持空格/逗号/Tab 分隔；引号包裹的值会去掉外层引号 |
| 批量执行 + 比对 | `executeBatch()` | 将 `fmtVal(result)` 与 `expectedOutput` 比对 |
| 历史记录 | `localStorage`（key: `pipe-eval-history`） | 最多 20 条，FIFO 淘汰 |

**Demo 写死需接入后替换的部分：**

| Mock 常量 | 位置 | 接入后替换为 |
|-----------|------|------------|
| `BUILTIN_EXAMPLES`（3 张示例卡片） | `enums.js` | 可从配置文件读取，或由宿主 `postMessage` 下发 |
| `DEFAULT_EXPR`（默认表达式） | `enums.js` | 可从 URL query / 宿主注入 |
| `BADGE_LABELS`（参数类型标签） | `enums.js` | 若宿主有动态类型定义，可由宿主下发 |

---

## 前后端边界

| 功能 | 前端负责 | 后端/宿主负责 | 联调验证点 |
|------|---------|-------------|----------|
| 表达式解析与求值 | ✅ 全部本地计算 | — | — |
| 模板变量注入 | 接收 + 渲染 | 宿主通过 postMessage 下发 | `type: TEMPLATE_VARS_UPDATE` 字段命名 |
| 测试用例加载 | 用户粘贴文本解析 | — | — |
| 批量执行 | ✅ 全部本地计算 | — | — |
| 结果导出（CSV） | ✅ 前端生成 Blob | — | — |
| 历史记录持久化 | localStorage | — | — |
| 主题切换 | CSS data-theme 属性 | 宿主可设定初始主题 | `<html data-theme="dark">` |

---

## 枚举值 / 魔法值说明

所有枚举常量集中在 `src/constants/enums.js`：

- `PARAM_BADGE_TYPES`：参数类型（SYNC / REF / CONST / LITERAL / TEMPLATE）
- `EXEC_STATUS`：执行状态（pending / match / mismatch / error）
- `RESULT_FILTER`：筛选选项（all / match / mismatch / error）
- `STORAGE_KEYS`：localStorage key 名
- `HISTORY_MAX`（= 20）：历史记录上限
- `VIRTUAL_SCROLL.ROW_HEIGHT`（= 36）：虚拟滚动行高

扩展新参数类型：在 `PARAM_BADGE_TYPES` 和 `BADGE_LABELS` 同步增加，无需修改组件逻辑。

---

## 与后端联调待确认项

1. [ ] **模板变量注入协议**：`TEMPLATE_VARS_UPDATE` 消息的 origin 限制（生产环境不能用 `*`）；商定具体 origin 白名单
2. [ ] **示例卡片数据来源**：是否需要从宿主动态下发（`postMessage`），还是保持前端内置 3 张固定示例
3. [ ] **历史记录跨设备同步**：当前仅 localStorage 本地存储；若需云端同步，后端需提供 POST/GET 接口
4. [ ] **参数类型（SYNC/REF）的实际联动行为**：SYNC 参数是否需要宿主实时推送值；当前 UI 仅展示类型标注，无真实联动逻辑
5. [ ] **`string.gsub` Lua 量词缺陷修复时机**：`%d+` 无法匹配连续数字是已知缺陷，修复会改变求值行为，需协调现有用例的预期输出更新

---

## 已知限制

来自 `design-review.md` / `accessibility-audit.md`：

| 限制 | 来源 | 修复优先级 |
|------|------|----------|
| 可访问性：虚拟表格缺 ARIA 表格语义（role="row/cell"）| A10 | 工程版已修复（见组件代码） |
| 可访问性：折叠面板非 `<button>` 元素（A3/A4） | A3/A4 | 工程版已修复 |
| 可访问性：参数输入框无 `<label>`（A5/A6） | A5/A6 | 工程版已修复 |
| 可访问性：inline-msg 无 aria-live（A2） | A2 | 工程版已修复 |
| 设计：用例数 > 200 时无进度提示（D6） | D6 | 下一迭代 |
| 设计：历史记录无日期（D7） | D7 | 下一迭代（已修复在 formatters.js） |
| `string.gsub` Lua 量词缺陷 | 业务逻辑 | 另立工单，修复需更新所有含 `%d+` 的测试用例预期输出 |
