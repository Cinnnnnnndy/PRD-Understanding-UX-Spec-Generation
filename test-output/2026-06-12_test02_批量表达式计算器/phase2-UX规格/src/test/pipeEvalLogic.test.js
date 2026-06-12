/**
 * 管道表达式批量评估器 · 核心逻辑单元测试
 * 运行：node --test src/test/pipeEvalLogic.test.js
 * 或：  node --experimental-vm-modules src/test/pipeEvalLogic.test.js
 *
 * 使用 node:test 零依赖测试框架（Node.js 18+）
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  parsePipeExpr,
  splitArgs,
  parseTestCaseText,
  parseTestCaseLine,
  PipeEvaluator,
  fmtVal,
  inferType,
  executeBatch,
} from '../utils/pipeEvalLogic.js'

// ─────────────────────────────────────────────────────────────────────────────
// parsePipeExpr
// ─────────────────────────────────────────────────────────────────────────────

describe('parsePipeExpr', () => {
  it('单参数无管道阶段', () => {
    const r = parsePipeExpr('$1')
    assert.equal(r.ok, true)
    assert.equal(r.inputs.length, 1)
    assert.equal(r.stages.length, 0)
  })

  it('双参数 + 两阶段', () => {
    const r = parsePipeExpr('$1;$2 |> expr($1+$2) |> string.format("%.2f",$1)')
    assert.equal(r.ok, true)
    assert.equal(r.inputs.length, 2)
    assert.equal(r.stages.length, 2)
    assert.equal(r.stages[0].fn, 'expr')
    assert.equal(r.stages[1].fn, 'string.format')
  })

  it('管道连接符两侧必须有空格 — 无空格不拆分为管道', () => {
    const r = parsePipeExpr('$1|>expr($1+1)')
    assert.equal(r.ok, true)
    assert.equal(r.stages.length, 0) // 无合法管道，整体作为 input
  })

  it('无管道的裸表达式', () => {
    const r = parsePipeExpr('$1;$2')
    assert.equal(r.ok, true)
    assert.equal(r.inputs.length, 2)
    assert.equal(r.stages.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// splitArgs
// ─────────────────────────────────────────────────────────────────────────────

describe('splitArgs', () => {
  it('简单两参数', () => {
    const r = splitArgs('"%.2f", $1')
    assert.deepEqual(r, ['"%.2f"', '$1'])
  })

  it('嵌套括号不拆分', () => {
    const r = splitArgs('expr($1+$2), "ok"')
    assert.deepEqual(r, ['expr($1+$2)', '"ok"'])
  })

  it('引号内逗号不拆分', () => {
    const r = splitArgs('"a,b", $1')
    assert.deepEqual(r, ['"a,b"', '$1'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PipeEvaluator — 三张示例卡片（GATE: PASS）
// ─────────────────────────────────────────────────────────────────────────────

describe('PipeEvaluator — BUILTIN_EXAMPLES gate', () => {
  const ev = new PipeEvaluator()

  it('示例1：两数求和并格式化', () => {
    const p = parsePipeExpr('$1;$2 |> expr($1+$2) |> string.format("%.2f",$1)')
    assert.equal(p.ok, true)
    const r = ev.evaluate(p, ['3', '4'])
    assert.equal(r.success, true)
    assert.equal(fmtVal(r.result), '"7.00"')
  })

  it('示例2：去空格并转大写（注意 gsub 量词缺陷，空格替换结果正确）', () => {
    const p = parsePipeExpr('$1 |> string.gsub($1," ","") |> string.upper($1)')
    assert.equal(p.ok, true)
    const r = ev.evaluate(p, ['bmc studio'])
    assert.equal(r.success, true)
    assert.equal(fmtVal(r.result), '"BMCSTUDIO"')
  })

  it('示例3：条件判断正数', () => {
    const p = parsePipeExpr('$1 |> expr($1>0 ? "正数" : "非正数")')
    assert.equal(p.ok, true)
    const r = ev.evaluate(p, ['5'])
    assert.equal(r.success, true)
    assert.equal(fmtVal(r.result), '"正数"')
  })

  it('示例3：条件判断非正数', () => {
    const p = parsePipeExpr('$1 |> expr($1>0 ? "正数" : "非正数")')
    const r = ev.evaluate(p, ['-3'])
    assert.equal(r.success, true)
    assert.equal(fmtVal(r.result), '"非正数"')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PipeEvaluator — 各内置函数
// ─────────────────────────────────────────────────────────────────────────────

describe('PipeEvaluator — 内置函数', () => {
  const ev = new PipeEvaluator()

  it('string.upper', () => {
    const p = parsePipeExpr('$1 |> string.upper($1)')
    const r = ev.evaluate(p, ['hello'])
    assert.equal(r.success, true)
    assert.equal(r.result, 'HELLO')
  })

  it('string.lower', () => {
    const p = parsePipeExpr('$1 |> string.lower($1)')
    const r = ev.evaluate(p, ['WORLD'])
    assert.equal(r.success, true)
    assert.equal(r.result, 'world')
  })

  it('string.sub 正索引', () => {
    const p = parsePipeExpr('$1 |> string.sub($1, 1, 3)')
    const r = ev.evaluate(p, ['abcdef'])
    assert.equal(r.success, true)
    assert.equal(r.result, 'abc')
  })

  it('string.cmp 相等', () => {
    const p = parsePipeExpr('$1 |> string.cmp($1, "hello")')
    const r = ev.evaluate(p, ['hello'])
    assert.equal(r.success, true)
    assert.equal(r.result, true)
  })

  it('string.cmp 不等', () => {
    const p = parsePipeExpr('$1 |> string.cmp($1, "hello")')
    const r = ev.evaluate(p, ['world'])
    assert.equal(r.success, true)
    assert.equal(r.result, false)
  })

  it('expr 算术', () => {
    const p = parsePipeExpr('$1;$2 |> expr($1 * $2 + 1)')
    const r = ev.evaluate(p, ['3', '4'])
    assert.equal(r.success, true)
    assert.equal(r.result, 13)
  })

  it('expr 位运算', () => {
    const p = parsePipeExpr('$1 |> expr($1 & 0xFF)')
    const r = ev.evaluate(p, ['256'])
    assert.equal(r.success, true)
    assert.equal(r.result, 0)
  })

  it('参数为空 → 失败', () => {
    const p = parsePipeExpr('$1 |> expr($1 + 1)')
    const r = ev.evaluate(p, [''])
    assert.equal(r.success, false)
    assert.match(r.error, /参数 \$1 未提供/)
  })

  it('未知函数 → 失败', () => {
    const p = parsePipeExpr('$1 |> unknown.fn($1)')
    // parsePipeExpr parses ok, but evaluate will fail
    const r = ev.evaluate(p, ['5'])
    assert.equal(r.success, false)
    assert.match(r.error, /未知函数/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseTestCaseText
// ─────────────────────────────────────────────────────────────────────────────

describe('parseTestCaseText', () => {
  it('空格分隔单输入', () => {
    const { cases, errors } = parseTestCaseText('5 10\n10 20')
    assert.equal(errors.length, 0)
    assert.equal(cases.length, 2)
    assert.deepEqual(cases[0].inputs, [5])
    assert.equal(cases[0].expectedOutput, '10')
  })

  it('逗号分隔多输入', () => {
    const { cases, errors } = parseTestCaseText('3,4,14')
    assert.equal(errors.length, 0)
    assert.equal(cases[0].inputs.length, 2)
    assert.equal(cases[0].expectedOutput, '14')
  })

  it('注释行跳过', () => {
    const { cases } = parseTestCaseText('# 这是注释\n5 10')
    assert.equal(cases.length, 1)
  })

  it('空行跳过', () => {
    const { cases } = parseTestCaseText('\n\n5 10\n\n')
    assert.equal(cases.length, 1)
  })

  it('单列报错', () => {
    const { errors } = parseTestCaseText('onlyone')
    assert.equal(errors.length, 1)
    assert.match(errors[0].message, /至少需要 2 列/)
  })

  it('引号未闭合报错', () => {
    const { errors } = parseTestCaseText('"unclosed 5')
    assert.equal(errors.length, 1)
    assert.match(errors[0].message, /引号未闭合/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// executeBatch
// ─────────────────────────────────────────────────────────────────────────────

describe('executeBatch', () => {
  // 注：test case 格式中引号包裹的列会被 tokenizeLine 去掉外层引号；
  // 数值结果 fmtVal 不加引号，因此数值类型用例比对不受此影响。
  it('全部匹配时 matched === total（数值结果）', () => {
    const { cases } = parseTestCaseText('3 4 7\n10 5 15')
    const parsed = parsePipeExpr('$1;$2 |> expr($1+$2)')
    const { stats } = executeBatch(cases, parsed, new Map())
    assert.equal(stats.matched, stats.total)
    assert.equal(stats.mismatched, 0)
    assert.equal(stats.errored, 0)
  })

  it('有不匹配时 mismatched > 0', () => {
    const { cases } = parseTestCaseText('3 4 99')
    const parsed = parsePipeExpr('$1;$2 |> expr($1+$2)')
    const { stats } = executeBatch(cases, parsed, new Map())
    assert.equal(stats.mismatched, 1)
    assert.equal(stats.matched, 0)
  })

  it('布尔结果比对', () => {
    const { cases } = parseTestCaseText('5 true')
    const parsed = parsePipeExpr('$1 |> expr($1>0)')
    const { stats } = executeBatch(cases, parsed, new Map())
    assert.equal(stats.matched, 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// fmtVal
// ─────────────────────────────────────────────────────────────────────────────

describe('fmtVal', () => {
  it('数字不加引号', () => assert.equal(fmtVal(42), '42'))
  it('字符串加双引号', () => assert.equal(fmtVal('hello'), '"hello"'))
  it('null → null', () => assert.equal(fmtVal(null), 'null'))
  it('undefined → undefined', () => assert.equal(fmtVal(undefined), 'undefined'))
  it('true → true', () => assert.equal(fmtVal(true), 'true'))
})
