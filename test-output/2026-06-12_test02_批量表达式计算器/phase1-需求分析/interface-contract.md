# 接口契约 · 管道表达式批量评估器

> 本工具为**纯前端本地计算 + Webview 消息桥**模式，无 HTTP 后端。  
> 接口形态：纯函数计算契约 + postMessage 宿主通信协议

---

## 纯函数计算契约

### `parsePipeExpr(raw: string): ParseResult`

**功能**：解析管道表达式原始文本为结构化表示

**输入**：
```
raw: string
示例: "$1;$2 |> expr($1 + $2) |> string.format(\"%.2f\", $1)"
```

**输出**：
```typescript
// 成功
{ ok: true, inputs: InputDef[], stages: StageDef[] }

// 失败
{ ok: false, error: string }
```

**边界行为**：
- 无 ` |> ` → `stages = []`，视为纯输入声明
- 无 `;` → 视为单输入，`inputs = [{idx:0, placeholder:'$1', desc:'参数 $1'}]`
- 裸表达式（不带函数括号）→ 自动包装为 `{ fn: 'expr', args: [s], raw: s }`

---

### `PipeEvaluator.evaluate(parsed, inputVals, tplVars?): EvalResult`

**功能**：按解析结构执行管道求值

**输入**：
```typescript
parsed:    ParsedExpr              // parsePipeExpr 的成功输出
inputVals: string[]                // 与 inputs 等长，每项对应 $N 的值
tplVars?:  Map<string, string>     // ${VarName} → 值（可选）
```

**输出**：
```typescript
// 成功
{ success: true, result: any, intermediates: any[] }
// intermediates[i] = 第 i 阶段的输出值

// 失败
{ success: false, error: string, intermediates: [] }
```

**副作用**：设置实例变量 `this.templateVars`  
**边界**：任意 `inputVals[i] === ''` → 抛 `参数 $i+1 未提供`

---

### `parseTestCaseText(text: string): {cases, errors}`

**功能**：从多行 CSV 文本解析测试用例

**输入格式**：
```
# 注释行（跳过）
<输入1> [<输入2> ...] <期望输出>   ← 空格/Tab/逗号分隔，最后列为期望
"带空格的值", 42, expected          ← 引号包裹含分隔符的值
```

**输出**：
```typescript
{
  cases:  TestCase[],        // 解析成功的用例
  errors: ParseError[]       // { line: number, message: string, context: string }
}
```

**边界**：每行至少 2 列（≥1 输入 + 1 期望），否则报错跳过

---

### `tokenizeLine(line: string, lineNum: number): string[]`

**功能**：单行 CSV 分词

引号语义：
- 双/单引号包裹含分隔符的值
- 连续两个相同引号 → 转义（`""` → `"`）
- 支持 `\n \t \r \\ \" \' \0` C 风格转义

---

## postMessage 宿主通信协议

> 原始 Demo **未实现** postMessage 接收（优化版 Demo 已补充）。  
> 以下为草案，待宿主（VS Code 扩展）正式确认。

### 宿主 → 工具（inbound）

| 消息 `type` | `payload` 类型 | 触发行为 |
|------------|--------------|---------|
| `setTemplateVars` | `Record<string, string>` | 注入模板变量，`${VarName}` 自动替换 |
| `setExpression` | `string` | 设置表达式文本并自动 apply |
| `setBadgeTypes` | `string[]` | 设置各参数的 badge 类型 |

**消息结构示例**：
```javascript
webviewPanel.webview.postMessage({
  type: 'setTemplateVars',
  payload: { threshold: '75', unit: 'celsius' }
});
```

### 工具 → 宿主（outbound，待实现）

| 事件 | payload | 触发时机 |
|------|---------|---------|
| `pipe-result-ready` | `{result, intermediates}` | 调试模式求值完成 |
| `pipe-batch-done` | `{summary, cases}` | 批量执行完成 |

---

## 前后端责任划分

| 功能 | 工具内部 | VS Code 宿主 | 联调验证点 |
|------|---------|------------|-----------|
| 表达式解析和求值 | ✅ 完全 | — | 所有函数边界值和错误消息 |
| 模板变量提供 | ✅ UI 手动填写 | ⬜ postMessage 注入 | 两路注入后是否正确合并 |
| 参数类型语义 | ⬜ Badge 仅展示 | ⬜ 提供 badge 类型信息 | CONST 类型是否限制用户修改 |
| 持久化 | ✅ localStorage | — | 多 VS Code 窗口时 localStorage 隔离问题 |
| 结果导出 | ✅ Clipboard API | — | 宿主是否有特殊剪贴板限制 |

---

## 待联调确认事项

- [ ] postMessage `type` 键名最终版本（宿主侧是否已用 `TEMPLATE_VARS_UPDATE`？需统一）
- [ ] `setBadgeTypes` 的值域：CONST 类型参数是否在 UI 层禁止用户编辑？
- [ ] 宿主是否需要监听 `pipe-result-ready` 事件？在什么场景下消费？
- [ ] VS Code Webview 是否需要 `acquireVsCodeApi()` 用于回传消息？（当前未调用）
- [ ] localStorage 多窗口隔离：不同 VS Code 实例是否会共享同一 origin 的存储？
