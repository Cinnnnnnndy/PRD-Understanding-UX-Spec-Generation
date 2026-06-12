# 管道表达式批量评估器 · 数据结构文档
> 来源：`86234586-previewbatchevaluator.html` JS 层静态分析

---

## 核心类型

```typescript
/** 解析后的管道表达式（parsePipeExpr 返回值） */
type ParsedExpr =
  | { ok: true;  inputs: InputDef[]; stages: Stage[] }
  | { ok: false; error: string }

interface InputDef {
  idx:         number;   // 0-based
  placeholder: string;   // 原始 token，如 "$1"
  desc:        string;   // 展示标签，如 "参数 $1"
}

interface Stage {
  fn:   string;    // 函数名，如 "expr" / "string.format" / "string.sub" …
  args: string[];  // 字符串参数列表（未替换 $1 占位符）
  raw:  string;    // 原始片段，如 "expr($1 + $2)"
}

/** 单条测试用例（parseTestCaseLine 返回值） */
interface TestCase {
  id:              string;              // Math.random().toString(36).slice(2)
  inputs:          (number | string)[]; // 最后一列前的所有列（自动数字化）
  expectedOutput:  string;             // 最后一列（始终字符串）
  actualOutput:    string | null;      // 执行后填入
  executionStatus: 'pending' | 'success' | 'error';
  matchStatus:     'match' | 'mismatch' | null;  // null = 尚未执行或执行出错
  lineNumber:      number;
  createdAt:       number;             // Date.now()
  executedAt?:     number;
  errorMessage?:   string;
}

/** evaluator.evaluate() 返回值 */
type EvalResult =
  | { success: true;  result: unknown; intermediates: unknown[] }
  | { success: false; error: string;  intermediates: [] }

/** 批量执行结果（execResults 全局变量） */
interface ExecResults {
  testCases: TestCase[];
  summary: {
    total:      number;
    success:    number;
    failed:     number;
    matched:    number;
    mismatched: number;
  };
}

/** 应用状态（模块级变量） */
interface AppState {
  originalExprText: string;        // 上次成功应用的表达式原文
  parsedExpr:       ParsedExpr;    // 解析结果
  inputValues:      string[];      // 与 parsedExpr.inputs 同长
  testCases:        TestCase[];
  execResults:      ExecResults | null;
  currentMode:      'debug' | 'testcase';
}
```

---

## 魔法值与特殊 Token

| 值 | 含义 | 出现位置 |
|----|------|---------|
| `'__EMPTY_STRING__'` | 参数值为空字符串时的内部替换 | `_replParams()` ↔ `_parsePrimary()` |
| `'__NULL__'` | 参数值为 `null` 时的内部替换 | 同上 |
| `'__UNDEFINED__'` | 参数值为 `undefined` 时的内部替换 | 同上 |

> 这三个魔法 token 是跨 `_replParams` / `SafeExpressionParser` 边界传递特殊 JS 值的内部协议，**不是用户可见的语法**。若用户输入恰好是这三个字符串，会被误识别为特殊值——这是一个已知边界问题。

---

## 枚举映射（UI 层转换规则）

### executionStatus
| 值 | 含义 | UI 指示图标 |
|----|------|------------|
| `'pending'` | 尚未执行 | `…`（灰色） |
| `'success'` | 执行成功（matchStatus 另判） | 由 matchStatus 决定 |
| `'error'` | 执行时抛出异常 | `⚠`（橙色，mic-err） |

### matchStatus
| 值 | 含义 | UI 指示图标 |
|----|------|------------|
| `'match'` | actualOutput 归一化 = expectedOutput 归一化 | `✓`（绿色，mic-ok） |
| `'mismatch'` | 不等 | `✗`（红色，mic-fail） |
| `null` | 未执行或执行出错 | 同 error（mic-err） |

### 参数徽章（已定义但未完全使用）
| CSS 类 | 颜色 | 语义（推测） |
|--------|------|------------|
| `.badge-sync` | 蓝 #007acc | 与外部数据源同步型参数 |
| `.badge-ref` | 紫 #68217a | 引用其他变量 |
| `.badge-const` | 绿 #388a34 | 常量型参数 |
| `.badge-literal` | 灰 #616161 | 字面量型参数 |
| `.badge-template` | 红 #d73a49 | 模板变量型参数 |

> 当前代码中所有参数一律渲染为 `.badge-sync`（硬编码），其余徽章类型**已定义但从未使用**——这意味着参数类型区分的 UI 框架已预留，但宿主参数类型信息尚未接入。

---

## 输出归一化规则（matchStatus 判断依据）

```javascript
function normOut(s) {
  return String(s).trim()              // 去首尾空白
    .replace(/^["']|["']$/g, '')       // 去首尾引号
    .replace(/\s+/g, ' ');             // 合并内部空白
}
```

比较：`normOut(actualOutput) === normOut(expectedOutput)`

---

## 关系图

```
AppState
├── parsedExpr: ParsedExpr
│   ├── inputs: InputDef[]    ← 决定 inputValues 的长度和标签
│   └── stages: Stage[]       ← 决定 pipeline-container 渲染行数
├── inputValues: string[]     ← 用户填入，驱动 updateDebugResults()
├── testCases: TestCase[]     ← loadTestCases() 解析填入，executeBatch() 更新
└── execResults: ExecResults  ← executeBatch() 填入，renderBatchResults() 消费
```
