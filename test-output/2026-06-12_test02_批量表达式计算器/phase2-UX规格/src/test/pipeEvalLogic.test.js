/**
 * 管道表达式批量评估器 · 核心逻辑单元测试
 * 运行：node --test src/test/pipeEvalLogic.test.js
 *
 * 依赖：node:test（Node.js 18+ 内置，无额外依赖）
 * 注意：由于使用 ES Modules，需要 Node.js 18+ 或用 --experimental-vm-modules
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SafeExpressionParser,
  PipeEvaluator,
  parsePipeExpr,
  splitArgs,
  parseTestCaseText,
  tokenizeLine,
} from '../utils/pipeEvalLogic.js';

const ev = new PipeEvaluator();

// ── SafeExpressionParser ──────────────────────────────────────────────────────
describe('SafeExpressionParser', () => {
  it('基础算术', () => {
    assert.equal(new SafeExpressionParser('1 + 2').parse(), 3);
    assert.equal(new SafeExpressionParser('10 - 4').parse(), 6);
    assert.equal(new SafeExpressionParser('3 * 4').parse(), 12);
    assert.equal(new SafeExpressionParser('7 / 2').parse(), 3.5);
  });

  it('整除 //', () => {
    assert.equal(new SafeExpressionParser('7 // 2').parse(), 3);
    assert.equal(new SafeExpressionParser('-7 // 2').parse(), -3);
  });

  it('Lua 风格三元 ?:', () => {
    assert.equal(new SafeExpressionParser('1 > 0 ? "正" : "负"').parse(), '正');
    assert.equal(new SafeExpressionParser('0 > 0 ? "正" : "负"').parse(), '负');
    // Lua 真值：0 和 "" 为真（与 JS 不同）
    assert.equal(new SafeExpressionParser('0 ? "yes" : "no"').parse(), 'yes');
    assert.equal(new SafeExpressionParser('"" ? "yes" : "no"').parse(), 'yes');
    assert.equal(new SafeExpressionParser('false ? "yes" : "no"').parse(), 'no');
  });

  it('位运算', () => {
    assert.equal(new SafeExpressionParser('5 & 3').parse(), 1);
    assert.equal(new SafeExpressionParser('5 | 3').parse(), 7);
    assert.equal(new SafeExpressionParser('5 ^ 3').parse(), 6);
    assert.equal(new SafeExpressionParser('1 << 4').parse(), 16);
  });
});

// ── PipeEvaluator._luaPatToRegex（R3/E5 Bug 修复验证）────────────────────────
describe('PipeEvaluator._luaPatToRegex（量词 bug 修复）', () => {
  it('%d+ 量词应匹配一个或多个数字', () => {
    const rgx = ev._luaPatToRegex('%d+');
    assert.equal('123abc'.replace(rgx, 'X'), 'Xabc');   // 整组数字被替换
    assert.equal('a12b3c'.replace(rgx, 'N'), 'aNbNc');
  });

  it('%d* 量词应匹配零个或多个数字', () => {
    const rgx = ev._luaPatToRegex('%d*');
    assert.equal(''.replace(rgx, 'X'), 'X');            // 零匹配
  });

  it('%a+ 量词应匹配一个或多个字母', () => {
    const rgx = ev._luaPatToRegex('%a+');
    assert.equal('abc123'.replace(rgx, 'W'), 'W123');
  });

  it('^ 仍为元字符（结构字符应转义）', () => {
    // ^ 在 _luaPatToRegex 中被转义为 \^，即字面 ^
    const rgx = ev._luaPatToRegex('^');
    assert.equal('^hello'.replace(rgx, ''), 'hello');
  });
});

// ── PipeEvaluator.evaluate ────────────────────────────────────────────────────
describe('PipeEvaluator.evaluate', () => {
  it('两数求和', () => {
    const parsed = parsePipeExpr('$1;$2 |> expr($1 + $2)');
    assert.equal(parsed.ok, true);
    const res = ev.evaluate(parsed, ['3', '4']);
    assert.equal(res.success, true);
    assert.equal(res.result, 7);
  });

  it('格式化输出', () => {
    const parsed = parsePipeExpr('$1;$2 |> expr($1 + $2) |> string.format("%.2f", $1)');
    const res = ev.evaluate(parsed, ['3', '4']);
    assert.equal(res.success, true);
    assert.equal(res.result, '7.00');
  });

  it('去空格并转大写', () => {
    const parsed = parsePipeExpr('$1 |> string.gsub($1, " ", "") |> string.upper($1)');
    const res = ev.evaluate(parsed, ['bmc studio']);
    assert.equal(res.success, true);
    assert.equal(res.result, 'BMCSTUDIO');
  });

  it('条件判断', () => {
    const parsed = parsePipeExpr('$1 |> expr($1 > 0 ? "正数" : "非正数")');
    assert.equal(ev.evaluate(parsed, ['5']).result,  '正数');
    assert.equal(ev.evaluate(parsed, ['-1']).result, '非正数');
  });

  it('模板变量替换', () => {
    const parsed = parsePipeExpr('$1 |> expr($1 + ${threshold})');
    const tpl = new Map([['threshold', '10']]);
    const res = ev.evaluate(parsed, ['5'], tpl);
    assert.equal(res.success, true);
    assert.equal(res.result, 15);
  });

  it('参数未提供时返回 failure', () => {
    const parsed = parsePipeExpr('$1;$2 |> expr($1 + $2)');
    const res = ev.evaluate(parsed, ['3', '']);
    assert.equal(res.success, false);
    assert.match(res.error, /参数 \$2 未提供/);
  });

  it('未知函数时返回 failure', () => {
    // 直接调用 _evalStage 测试
    const stage = { fn: 'unknown.func', args: ['$1'], raw: 'unknown.func($1)' };
    assert.throws(() => ev._evalStage(stage, [1]), /未知函数/);
  });

  it('string.sub 1 基截取', () => {
    const parsed = parsePipeExpr('$1 |> string.sub($1, 2, 4)');
    const res = ev.evaluate(parsed, ['hello']);
    assert.equal(res.result, 'ell');
  });

  it('string.cmp 字符串比较', () => {
    const parsed = parsePipeExpr('$1 |> string.cmp($1, "hello")');
    assert.equal(ev.evaluate(parsed, ['hello']).result, true);
    assert.equal(ev.evaluate(parsed, ['world']).result, false);
  });
});

// ── parsePipeExpr ─────────────────────────────────────────────────────────────
describe('parsePipeExpr', () => {
  it('单输入单阶段', () => {
    const p = parsePipeExpr('$1 |> expr($1 * 2)');
    assert.equal(p.ok, true);
    assert.equal(p.inputs.length, 1);
    assert.equal(p.stages.length, 1);
    assert.equal(p.stages[0].fn, 'expr');
  });

  it('多输入', () => {
    const p = parsePipeExpr('$1;$2;$3 |> expr($1 + $2 + $3)');
    assert.equal(p.inputs.length, 3);
  });

  it('无管道段视为纯输入声明', () => {
    const p = parsePipeExpr('$1');
    assert.equal(p.ok, true);
    assert.equal(p.stages.length, 0);
  });

  it('裸表达式自动包装为 expr', () => {
    const p = parsePipeExpr('$1 |> $1 + 1');
    assert.equal(p.stages[0].fn, 'expr');
  });
});

// ── parseTestCaseText ─────────────────────────────────────────────────────────
describe('parseTestCaseText', () => {
  it('正常解析空格分隔', () => {
    const { cases, errors } = parseTestCaseText('3 4 7\n10 5 50');
    assert.equal(cases.length, 2);
    assert.equal(errors.length, 0);
    assert.deepEqual(cases[0].inputs, [3, 4]);
    assert.equal(cases[0].expectedOutput, '7');
  });

  it('注释行跳过', () => {
    const { cases } = parseTestCaseText('# 注释\n3 4 7');
    assert.equal(cases.length, 1);
  });

  it('引号包裹含空格的值', () => {
    const { cases } = parseTestCaseText('"bmc studio" BMCSTUDIO');
    assert.equal(cases[0].inputs[0], 'bmc studio');
    assert.equal(cases[0].expectedOutput, 'BMCSTUDIO');
  });

  it('列数不足时记录错误', () => {
    const { cases, errors } = parseTestCaseText('onlyone');
    assert.equal(cases.length, 0);
    assert.equal(errors.length, 1);
  });
});

// ── splitArgs ─────────────────────────────────────────────────────────────────
describe('splitArgs', () => {
  it('基础逗号分隔', () => {
    assert.deepEqual(splitArgs('a, b, c'), ['a', 'b', 'c']);
  });

  it('嵌套括号不分割', () => {
    assert.deepEqual(splitArgs('f(a, b), c'), ['f(a, b)', 'c']);
  });

  it('引号内逗号不分割', () => {
    assert.deepEqual(splitArgs('"a, b", c'), ['"a, b"', 'c']);
  });
});
