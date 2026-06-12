# 管道表达式批量评估器 · 接口契约文档
> 本工具无 HTTP 后端，为**纯前端本地计算 + 宿主消息桥**模式。

---

## 接口形态判断

| 形态 | 是否适用 | 说明 |
|------|---------|------|
| HTTP / REST | ❌ | 无网络请求 |
| 纯函数计算契约 | ✅ | 核心逻辑完全前端实现 |
| 宿主桥（postMessage / IPC） | ⚠️ 部分 | 模板变量注入通道**已预留但未在此 Demo 中实现** |

---

## 纯函数计算契约

### `parsePipeExpr(raw: string): ParsedExpr`
```typescript
// 输入
raw: string   // 如 "$1;$2 |> expr($1 + $2) |> expr($1 * 2)"

// 输出（成功）
{ ok: true, inputs: InputDef[], stages: Stage[] }

// 输出（失败）
{ ok: false, error: string }
```
> **格式约束**：输入段用 `;` 分隔；管道阶段用 ` |> ` 分隔（两侧空格必须）；阶段格式 `fnName(arg1, arg2, ...)`，省略括号时等同于 `expr(stage_string)`。

### `evaluator.evaluate(parsed, inputVals, tplVars?): EvalResult`
```typescript
// 输入
parsed:    ParsedExpr           // parsePipeExpr 的成功结果
inputVals: string[]             // 与 parsed.inputs 等长，顺序对应
tplVars?:  Map<string, unknown> // 模板变量 ${VarName}，可为空

// 输出（成功）
{ success: true, result: unknown, intermediates: unknown[] }
// intermediates[i] = 第 i 个 stage 的输出

// 输出（失败）
{ success: false, error: string, intermediates: [] }
```
> **校验规则**：任一 `inputVal` 为空字符串 → 抛 `参数 $N 未提供`；未知函数名 → 抛 `未知函数: X`。

### `parseTestCaseText(text: string): { cases: TestCase[], errors: ParseError[] }`
```typescript
// 输入：多行文本，每行格式为「空格/逗号/Tab 分隔列，最后列为期望值」
// # 开头 = 注释行，空行忽略

// 输出
{
  cases: TestCase[],              // 成功解析的用例
  errors: { line, message, context }[]  // 解析失败行（不中断，继续解析其余行）
}
```
> **最小列数**：每行至少 2 列（1 输入 + 1 期望），否则报 `至少需要 2 列`。

---

## 宿主桥（VS Code Webview postMessage）

### 现状（此 Demo 未实现）
`evaluator.templateVars` 始终为 `new Map()`（空），模板变量 `${VarName}` 在当前 Demo 中无法注入值，相关替换逻辑存在但不生效。

### 建议接入方案（草案，待宿主确认）

**宿主 → WebView（注入模板变量）**：
```javascript
// 扩展侧（extension.ts）
panel.webview.postMessage({
  type: 'setTemplateVars',
  payload: { varName1: value1, varName2: value2 }
});
```
```javascript
// WebView 侧（此文件需补充）
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'setTemplateVars') {
    Object.entries(msg.payload).forEach(([k, v]) => {
      evaluator.templateVars.set(k, v);
    });
    updateDebugResults();  // 重新计算
  }
  // 可扩展: 'setExpression' → 注入并应用表达式
});
```

**宿主 → WebView（注入并应用表达式）**：
```javascript
// 扩展侧
panel.webview.postMessage({ type: 'setExpression', payload: '$1 |> expr($1 * 100)' });

// WebView 侧（需补充）
if (msg.type === 'setExpression') {
  document.getElementById('expr-input').value = msg.payload;
  applyExpr();
}
```

---

## 前后端责任划分

| 功能 | 前端负责 | 外部依赖 | 联调状态 |
|------|---------|---------|---------|
| 表达式解析与求值 | ✅ 完全独立 | 无 | 已实现 |
| 调试模式实时计算 | ✅ 完全独立 | 无 | 已实现 |
| 测试用例解析 | ✅ 完全独立 | 无 | 已实现 |
| 批量执行与统计 | ✅ 完全独立 | 无 | 已实现 |
| 虚拟滚动渲染 | ✅ 完全独立 | 无 | 已实现 |
| 结果导出 | `navigator.clipboard.writeText()` | 浏览器安全上下文 | 已实现（WebView 内通常可用） |
| 模板变量注入 | 接收 postMessage | VS Code extension API | ⚠️ 已预留，**待宿主实现** |
| 表达式外部注入 | 接收 postMessage | VS Code extension API | ⚠️ 未实现，**待宿主实现** |

---

## 待联调确认项

1. [ ] 模板变量由宿主在何时注入？（组件加载时/每次计算前/用户触发时）
2. [ ] 宿主是否需要监听表达式执行结果？（如需要，需增加 WebView → 宿主的 postMessage 消息类型）
3. [ ] `navigator.clipboard` 在目标 Electron/Chromium 版本是否有权限限制？若有，需用 `vscode.postMessage` 桥接剪贴板写入。
4. [ ] 参数徽章类型（SYNC/REF/CONST/LITERAL/TEMPLATE）由谁确定？若宿主知道参数的绑定类型，需通过 postMessage 随参数定义一起传入。
