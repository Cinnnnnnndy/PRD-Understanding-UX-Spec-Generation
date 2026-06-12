# 管道表达式批量评估器 · 业务逻辑文档

---

## 一、管道表达式语法规则

### 1.1 格式
```
<输入声明> [ |> <阶段> [ |> <阶段> ... ] ]

输入声明 = $1 [; $2 [; $3 ...]]
阶段     = fnName(arg1, arg2, ...) | 裸表达式字符串
```

### 1.2 输入替换
- `$N`（N 从 1 起）在阶段 args 中会被替换为对应的输入值。
- 管道中前一阶段的**输出**会成为下一阶段的第一个（或唯一）参数（由具体函数决定）。

### 1.3 管道阶段函数清单

| 函数 | 签名 | 说明 |
|------|------|------|
| `expr(expression)` | → any | 求值一个算术/逻辑表达式（见 1.4） |
| `string.format(fmt, ...)` | → string | C-style printf 格式化 |
| `string.cmp(a, b)` | → boolean | 字符串相等比较（去引号后） |
| `string.sub(s, start, end)` | → string | Lua 风格子串（1-based，负数从末尾计） |
| `string.gsub(s, pattern, replacement)` | → string | Lua 模式替换（映射为 JS RegExp）|
| `string.upper(s)` | → string | 转大写 |
| `string.lower(s)` | → string | 转小写 |

### 1.4 `expr()` 支持的运算符（SafeExpressionParser 实现）

| 类别 | 运算符 |
|------|--------|
| 算术 | `+` `-` `*` `/` `//`（整除） `%` |
| 位运算 | `&` `\|` `^` `~`（按位非） `<<` `>>` `>>>` |
| 比较 | `==` `!=` `~=` `<` `>` `<=` `>=` |
| 逻辑 | `&&`/`and`、`\|\|`/`or`、`!`（逻辑非） |
| 分组 | `(` `)` |
| 字面量 | 整数/浮点、`true`/`false`、`null`/`undefined`、`NaN`、`Infinity`、字符串（单/双引号）|

**Lua 风格真值判断**：只有 `null`、`undefined`、`false` 为假；其余全为真（包括 `0` 和空字符串）。

**`?` / `:` 映射**：`?` 被重映射为 `and`，`:` 被重映射为 `or`（当 `:` 不紧跟字母时）——实现了类三目运算符效果。

---

## 二、输入值类型强制转换

`PipeEvaluator._parseVal(v: string)` 在评估前对字符串输入做自动转换：

| 输入字符串 | 转换后类型 |
|----------|----------|
| 纯整数/浮点（如 `"42"`, `"-3.14"`） | number |
| `"true"` / `"false"`（大小写不敏感） | boolean |
| `"null"` | null |
| 其他 | 保持 string |

---

## 三、模板变量替换（`${VarName}`）

- 替换时机：在 `_replParams()` 内，先替换 `$N` 位置参数，再替换 `${VarName}` 模板变量。
- 来源：`evaluator.templateVars: Map<string, unknown>`，当前 Demo 始终空。
- 未定义变量：保持原文 `${VarName}` 不替换（不报错）。

---

## 四、测试用例行解析规则

### 4.1 列分隔符
空格、`,`（逗号）、`\t`（Tab）均为分隔符；分隔符连续出现时合并（即不产生空列）。

### 4.2 字符串引号处理
- 单/双引号括起的值：引号内的分隔符不分割（保留原始字符串，去掉引号）。
- 转义序列（引号内）：`\n` `\t` `\r` `\\` `\"` `\'` `\0` → 对应字符；其他 `\X` → `X`。

### 4.3 列角色
- 第 1 列 ~ 第 (N-1) 列：输入（`inputs`）
- 最后 1 列：期望输出（`expectedOutput`，始终以字符串保留）
- 最少需要 2 列，否则抛 `至少需要 2 列`

### 4.4 注释与空行
- 以 `#` 开头的行 → 忽略
- 空行（或纯空白行）→ 忽略
- 解析失败的行 → 加入 `errors[]` 数组，**不中断**整体解析

---

## 五、输出比较与归一化

```
match = normOut(actualOutput) === normOut(expectedOutput)

normOut(s) = s.trim()
              .replace(/^["']|["']$/g, '')   // 去首尾一对引号
              .replace(/\s+/g, ' ')           // 合并内部连续空白
```

**注意**：比较基于字符串，数字 `10` 与字符串 `"10"` 在此归一化后相等（因为 actualOutput 在 executeBatch 中已 `String(res.result)` 转换）。

---

## 六、批量执行控制流

```
executeBatch()
  │
  ├── btn.disabled = true, btn.textContent = '⏳ 执行中...'
  ├── await new Promise(setTimeout 0)    ← 让 UI 刷新
  │
  ├── 对每条 testCase：
  │   ├── evaluator.evaluate(parsedExpr, tc.inputs.map(String))
  │   ├── success=true  → actualOutput = String(result)
  │   │                   matchStatus  = normOut 比较
  │   └── success=false → executionStatus='error', errorMessage=error
  │
  ├── 汇总 summary (total/success/failed/matched/mismatched)
  ├── execResults = { testCases, summary }
  └── renderBatchResults()
```

---

## 七、虚拟滚动算法

```
ROW_H = 32px    // 每行高度（固定）
BUF   = 10      // 上下缓冲行数

onScroll:
  start = max(0, floor(scrollTop / ROW_H) - BUF)
  end   = min(total, ceil((scrollTop + clientHeight) / ROW_H) + BUF)

renderRows(start, end):
  spacer.height = total * ROW_H           // 保持滚动条比例
  content.top   = start * ROW_H           // 绝对定位偏移
  渲染 [start, end) 范围内的行
```

---

## 八、校验规则汇总（前端独立实现）

| 场景 | 规则 | 错误提示 |
|------|------|---------|
| 表达式为空 | 点击「应用」时检查 | `表达式不能为空`（alert） |
| 参数未填 | 评估时检查 inputValues[i] === '' | `参数 $N 未提供` |
| 未知函数 | 评估阶段 switch/default | `未知函数: X` |
| 测试用例列不足 | 解析时每行检查 | `至少需要 2 列，得到 N 列` |
| 用例引号未闭合 | tokenizeLine 结束检查 | `第 N 行引号未闭合` |
| 无有效用例 | loadTestCases 检查 | `未能解析到有效的测试用例` |

---

## 九、验证阶段发现的缺陷（待修复）

> 以下为优化版 Demo 构建时通过运行验证门（node 复算 10 组用例）发现的真实问题。

### 9.1 🔴 `string.gsub` Lua 量词失效（功能性 Bug）
`_luaPatToRegex` 的 `magic = '^$()%.[]*+-?'` 把 Lua 量词 `+ * - ?` 也纳入了转义集合，导致：

```
string.gsub("a1b22", "%d+", "N")
  → _luaPatToRegex("%d+") 生成 /[0-9]\+/g   ← '+' 被转义为字面量
  → 实际匹配「数字后跟一个加号」，而非「一个或多个数字」
  → 返回 "a1b22"（未替换），而非预期的 "aNbN"
```

**影响**：所有依赖 Lua 量词（`+`/`*`/`-`）的 gsub 模式全部失效，只有定长模式（如 `%d`、`[abc]`）能正常工作。
**根因**：量词字符不应放进 magic 转义集；Lua 的 `magic` 字符集本应是 `^$()%.[]*+-?` 中**仅作为字面量需转义**的部分，但实现把它们一律 `\` 转义，反而破坏了量词语义。
**建议**：将 `+ * - ?` 从 magic 集移出，改为映射到 JS 正则的同名量词（`-` 需特殊处理为非贪婪 `*?`）。
**优先级**：P1（属功能正确性，非视觉问题）；本次优化 Demo **保持逐字移植以维持行为一致**，缺陷修复另立工单。

### 9.2 校验门覆盖结论
| 用例类别 | 结果 |
|---------|------|
| 算术 / 位运算 / 移位 | ✅ 通过 |
| string.format 格式化 | ✅ 通过 |
| string.sub / upper / lower | ✅ 通过 |
| Lua 真值 `?:` 三目 | ✅ 通过 |
| Lua 真值 `0 or X`（0 为真） | ✅ 通过 |
| **string.gsub 量词** | ❌ 见 9.1（原 Demo 同样缺陷，移植行为一致）|
| validateExpr 空/未知函数/合法 | ✅ 通过 |
