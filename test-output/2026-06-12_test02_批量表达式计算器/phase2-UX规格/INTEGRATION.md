# 管道表达式批量评估器 · 工程接入指南

## 前置条件

- **浏览器**：Chrome 80+ / Firefox 75+ / Safari 14+（Custom Elements + Shadow DOM + ES Modules）
- **Node.js**：18+（仅运行单元测试时需要）
- **宿主环境**：VS Code Webview（主要场景）或任何支持 ES Modules 的 HTTP 服务器

无需构建工具，无需 npm 安装。

---

## 文件放置

将 `phase2-UX规格/src/` 目录整体复制到目标项目：

```
your-project/
├── webview/                         ← VS Code Webview 根目录（或等价的 HTTP 根）
│   ├── index.html                   ← 宿主页面（你需要自己创建）
│   └── src/
│       ├── components/
│       │   └── PipeBatchEvaluator/
│       │       └── index.js         ← Web Component 入口
│       ├── utils/
│       │   ├── pipeEvalLogic.js     ← 管道解析 + 求值核心
│       │   ├── formatters.js        ← 值展示工具
│       │   └── validators.js        ← 表达式校验
│       ├── constants/
│       │   └── enums.js             ← 枚举常量（KNOWN_FUNCTIONS / HISTORY_MAX / …）
│       └── test/
│           └── pipeEvalLogic.test.js
```

> **ES Modules 限制**：工程版使用 `import/export`，浏览器对 `file://` 协议施加跨域限制，必须通过 HTTP 服务器打开，不能双击 HTML 文件。
>
> 本地开发：`python3 -m http.server 8080`，然后访问 `http://localhost:8080/webview/index.html`

---

## 宿主页面接入

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <!-- PTO Design System CSS（可选；组件有内置 fallback token） -->
  <!-- <link rel="stylesheet" href="design-system/foundation.css"> -->
  <!-- <link rel="stylesheet" href="design-system/semantic.css">   -->
</head>
<body style="margin:0;height:100vh">

  <!-- 注册并使用 Web Component -->
  <pipe-batch-evaluator></pipe-batch-evaluator>

  <script type="module">
    import '../../src/components/PipeBatchEvaluator/index.js';
  </script>
</body>
</html>
```

---

## 接口定义对接

### 对外 CustomEvent（组件 → 宿主）

| 事件名 | `detail` 结构 | 触发时机 |
|--------|--------------|---------|
| `pipe-result-ready` | `{ expr: string, result: any, inputs: string[] }` | 单次调试求值完成 |
| `pipe-batch-done`   | `{ stats: {total,pass,fail}, results: ExecResult[] }` | 批量执行完成 |

```javascript
document.querySelector('pipe-batch-evaluator')
  .addEventListener('pipe-result-ready', e => {
    const { expr, result, inputs } = e.detail;
    console.log('单次结果:', result);
  });
```

### 接收 postMessage（宿主 → 组件，VS Code Webview 场景）

| `type` 字段 | `payload` 类型 | 作用 |
|-------------|---------------|------|
| `setTemplateVars` | `Record<string, string>` | 从宿主注入模板变量（如 `{ threshold: "10" }`） |
| `setExpression`   | `string` | 宿主预填管道表达式 |
| `setBadgeTypes`   | `string[]` | 设置各参数的徽章类型（`'sync' \| 'ref' \| 'const' \| 'literal' \| 'template'`） |

```javascript
// VS Code 扩展侧发送消息
webviewPanel.webview.postMessage({
  type: 'setTemplateVars',
  payload: { threshold: '10', maxRetry: '3' }
});
```

---

## 业务逻辑说明

### 核心模块职责

| 模块 | 路径 | 职责 |
|------|------|------|
| `PipeEvaluator` | `utils/pipeEvalLogic.js` | 管道求值引擎；`evaluate(parsed, inputs, tplVars)` |
| `SafeExpressionParser` | `utils/pipeEvalLogic.js` | 安全算术/逻辑/位运算解析，含 Lua 风格 `?:` |
| `parsePipeExpr` | `utils/pipeEvalLogic.js` | 管道表达式语法解析 → `ParsedExpr` |
| `parseTestCaseText` | `utils/pipeEvalLogic.js` | 批量用例文本解析 |
| `validateExpr` | `utils/validators.js` | 表达式校验 + 白名单函数检查 |
| `normOut` | `utils/formatters.js` | 结果比较标准化（去引号、合并空白） |

### 关键已知限制与已修复 Bug

| # | 问题 | Demo 状态 | 工程状态 |
|---|------|-----------|---------|
| R1 | 历史记录最多 8 条 | `h.slice(0,8)` | `HISTORY_MAX = 20` ✅ 已修复 |
| R3 | `_luaPatToRegex` 把 `+` 当转义字符，`%d+` 不工作 | `magic='…+-?'` | `structMagic='^$()%.[]'` ✅ 已修复 |
| R8 | `renderHistory` onClick 字符串拼接 XSS | `onclick="restore('${...}')"` | `<button data-index>` + 事件代理 ✅ 已修复 |
| G3 | `$N` (N≥10) 替换歧义（`$10` 匹配 `$1` 再跟 `0`） | 未处理 | 索引倒序排列 ✅ 已修复 |

### Mock → 真实数据替换

当前工程代码使用前端本地计算（不依赖后端接口）。若将来需要从后端获取模板变量或历史记录：

- `_handleMessage` 中的 `setTemplateVars` 处理方式保持不变
- 后端持久化历史时替换 `localStorage.getItem/setItem(LS_KEYS.HISTORY, …)` 为 API 调用
- `KNOWN_FUNCTIONS` 白名单在 `constants/enums.js` 中维护；若后端新增函数，前端同步更新此列表

---

## 前后端边界

| 功能 | 前端负责 | 宿主/后端负责 |
|------|---------|-------------|
| 管道表达式解析与求值 | 完整本地实现 | 无 |
| 批量测试用例比对 | 完整本地实现 | 无 |
| 模板变量值来源 | 渲染 + 持久化 | 通过 `setTemplateVars` postMessage 注入 |
| 历史记录持久化 | localStorage（本地） | 可选：后端 API 替换 |
| 主题偏好 | localStorage 保存/恢复 | 无 |
| 结果输出通知 | `pipe-result-ready` / `pipe-batch-done` CustomEvent | 宿主监听 CustomEvent 消费 |

---

## 枚举值 / 常量说明

所有枚举和魔法值集中于 `src/constants/enums.js`：

| 常量 | 用途 |
|------|------|
| `KNOWN_FUNCTIONS` | 允许在表达式中使用的函数白名单 |
| `BADGE_LABEL` | 参数类型徽章（`sync/ref/const/literal/template`）→ 显示标签 |
| `LS_KEYS` | localStorage key 命名空间（防冲突） |
| `HISTORY_MAX` | 历史记录最大条数（当前 `20`） |
| `VSCROLL` | 虚拟滚动参数（`ROW_H: 36, BUF: 10`）— 与 CSS `--table-row-height` 保持一致 |
| `FILTER_LABELS` | 结果筛选器标签文案 |
| `EXAMPLES` | 内置示例（3 条） |
| `OP_GROUPS` | 操作符面板分组数据 |

扩展新函数：在 `KNOWN_FUNCTIONS` 追加函数名，并在 `pipeEvalLogic.js` 的 `_evalStage` 中添加对应 `case`。

---

## 运行单元测试

```bash
node --test src/test/pipeEvalLogic.test.js
```

测试覆盖：`SafeExpressionParser`（算术/整除/Lua三元/位运算）、`_luaPatToRegex`（R3 bug 修复验证）、`PipeEvaluator.evaluate`（8 个用例）、`parsePipeExpr`、`parseTestCaseText`、`splitArgs`。

---

## 联调待确认项

1. [ ] VS Code Webview 的 `acquireVsCodeApi` 是否由宿主注入；若是，`postMessage` 收发方向需调整
2. [ ] `pipe-result-ready` 中的 `result` 是否需要序列化（JSON.stringify）再传递给 Python 扩展
3. [ ] 历史记录是否需要后端持久化（当前为 localStorage，Webview 重启后保留）
4. [ ] 新增函数（如 `string.len`、`math.abs`）的扩展流程是否需要后端 flag 控制白名单

---

## 已知限制（来自审查报告）

| 来源 | 问题 | 状态 |
|------|------|------|
| `design-review.md` R6 | 通过率徽章点击仅切换筛选视图，未实现「总览/详情」切换 | 工程版已实现点击→筛选不匹配 |
| `design-review.md` R7 | 历史恢复未同步还原参数值（仅还原表达式） | 待后续迭代 |
| `accessibility-audit.md` A2 | `foreground-muted` (#666) 对比度约 2.9:1 | 工程版已改用 `foreground` 或更高对比色 |
| `accessibility-audit.md` A13 | Canvas 替代方案（如阶段输出的 ASCII 示意图）未实现 | 工程版使用 pipeline-stages div 替代 |
