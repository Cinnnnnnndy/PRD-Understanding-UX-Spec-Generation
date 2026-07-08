# 数据结构分析 · 管道表达式批量评估器

> 输入来源：`previewbatchevaluator.html`（原始 VS Code Webview Demo）  
> 分析日期：2026-07-08

---

## 实体清单

### ParsedExpr · 解析后的管道表达式

| 字段 | 类型 | 说明 |
|------|------|------|
| `ok` | `boolean` | 解析是否成功 |
| `inputs` | `InputDef[]` | 输入参数声明列表 |
| `stages` | `StageDef[]` | 管道阶段列表 |
| `error?` | `string` | 解析失败时的错误消息 |

**InputDef（输入参数定义）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `idx` | `number` | 参数索引（0 基） |
| `placeholder` | `string` | 原始占位符文本（如 `$1`） |
| `desc` | `string` | 参数描述（如 `参数 $1`） |

**StageDef（管道阶段定义）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `fn` | `string` | 函数名（如 `expr`、`string.format`） |
| `args` | `string[]` | 参数列表（含 `$N` 占位符，未展开） |
| `raw` | `string` | 原始阶段文本（用于展示） |

---

### TestCase · 单条测试用例

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 随机 ID（`Math.random().toString(36).slice(2)`） |
| `inputs` | `(number\|string)[]` | 输入值列表（末列期望值不含） |
| `expectedOutput` | `string` | 期望输出（CSV 最后一列，保持字符串形式） |
| `actualOutput` | `string\|null` | 实际输出（执行后填入；`null` = 未执行） |
| `executionStatus` | `'pending'\|'success'\|'error'` | 执行状态 |
| `matchStatus` | `'match'\|'mismatch'\|null` | 与期望的比较结果（`error` 时为 `null`） |
| `lineNumber` | `number` | 原始文本行号（用于错误定位） |
| `createdAt` | `number` | 创建时间戳（`Date.now()`） |
| `executedAt?` | `number` | 执行时间戳 |
| `errorMessage?` | `string` | 执行出错时的错误消息 |

---

### ExecResults · 批量执行结果

| 字段 | 类型 | 说明 |
|------|------|------|
| `testCases` | `TestCase[]` | 含执行结果的用例列表 |
| `summary` | `Summary` | 汇总统计 |

**Summary（统计摘要）：**

| 字段 | 含义 |
|------|------|
| `total` | 总用例数 |
| `success` | 执行成功数（不代表结果匹配） |
| `failed` | 执行出错数（表达式运行时抛错） |
| `matched` | 实际输出与期望一致数 |
| `mismatched` | 实际输出与期望不一致数 |

---

## 支持的管道函数（枚举映射）

| 函数名 | 签名 | 说明 |
|--------|------|------|
| `expr` | `expr(<表达式>)` | 算术/逻辑/位运算；Lua 风格三元 `?:` |
| `string.format` | `string.format(fmt, args...)` | C 风格格式化：`%d %f %s %x %b` 等 |
| `string.upper` | `string.upper(s)` | 全部转大写 |
| `string.lower` | `string.lower(s)` | 全部转小写 |
| `string.sub` | `string.sub(s, start, end)` | Lua 1 基截取，支持负索引 |
| `string.gsub` | `string.gsub(s, pattern, replacement)` | Lua 字符类模式全局替换 |
| `string.cmp` | `string.cmp(a, b)` | 字符串相等比较，返回 `true/false` |

---

## 魔法值标注

### 参数替换哨兵值

`_replParams` 在替换 `$N` 时，空/null/undefined 值被编码为哨兵字符串传给解析器：

| 哨兵值 | 含义 | UI 层影响 |
|--------|------|----------|
| `__EMPTY_STRING__` | 参数值为 `''` | Parser 还原为空字符串 |
| `__NULL__` | 参数值为 `null` | Parser 返回 `null` |
| `__UNDEFINED__` | 参数值为 `undefined` | Parser 返回 `undefined` |

> ⚠️ 这三个字符串是内部实现细节，**禁止出现在用户输入中**，否则被错误解析为特殊类型。

### 参数类型 badge（原始 Demo 硬编码问题）

原始 Demo 所有参数均硬编码为 `SYNC` badge，实际语义枚举如下：

| 值 | UI 标签 | 业务语义 |
|----|---------|---------|
| `sync` | SYNC | 实时同步自外部数据源 |
| `ref` | REF | 引用另一字段/计算结果 |
| `const` | CONST | 常量，不应被用户手动修改 |
| `literal` | LITERAL | 字面量，用户直接填写 |
| `template` | TEMPLATE | 来自模板变量 `${VarName}` 注入 |

---

## 实体关系图

```
原始表达式文本（用户输入）
  └── parsePipeExpr() → ParsedExpr
        ├── inputs: InputDef[]     ← $1, $2 ... 参数声明
        └── stages: StageDef[]    ← 各管道阶段，args 含 $N 占位符

CSV 测试数据（粘贴文本）
  └── parseTestCaseText()
        └── TestCase[]
              ├── inputs[]         ← 末列前的所有列
              └── expectedOutput   ← 最后一列

PipeEvaluator.evaluate(ParsedExpr, inputVals[])
  └── EvalResult
        ├── result: any            ← 最终输出
        └── intermediates: any[]   ← 每阶段中间输出（长度 = stages.length）

ExecResults（批量模式）
  ├── testCases: TestCase[]       ← 含 actualOutput + matchStatus
  └── summary: Summary
```

---

## 动态字段说明

### $N 参数引用的作用域规则

```
$1;$2 |> expr($1 + $2) |> string.format("%.2f", $1)
```

- 首段 `$1;$2` 声明两个输入参数
- `expr($1 + $2)` 中，`$1=原始输入1`，`$2=原始输入2`
- `string.format("%.2f", $1)` 中，`$1=上一阶段输出`（不再是原始输入）
- `;` 分隔符仅在表达式**首段**有效

> ⚠️ 已知边界：当参数数量 ≥ 10 时，`$10` 会被 `$1` 的正则先匹配导致替换歧义。实际参数数量通常 ≤ 5，暂无触发风险，但工程上应修复。

### normOut 输出标准化规则

比较期望值与实际值时，`normOut()` 会：
1. 去前后空白
2. 去除首尾单/双引号
3. 合并连续空白为单个空格

**结果**：字符串 `"7.00"` 和数字 `7.00` 被视为**匹配**——大多数场景合理，严格类型验证场景下是 bug。
