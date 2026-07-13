/**
 * SMC 编解码 + 格式化纯函数单元测试
 * 运行：node --test src/test/smcCodec.test.js
 *
 * 注意：文件使用相对路径导入，须从项目根目录运行，
 *   或：cd iter-3-phase2 && node --test src/test/smcCodec.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { composeWord, decomposeWord, parseLoose, anyFieldSet, fieldOfBit } from '../utils/smcCodec.js';
import { fmtHex, fmtFieldHex, formatOutput, describeFuncCode, fmtHistoryTime, pad } from '../utils/formatters.js';

// ─── composeWord ──────────────────────────────────────────────────────────────

test('composeWord: 全字段往返（0x18040600）', () => {
  const fields = decomposeWord(0x18040600);
  assert.strictEqual(composeWord(fields), 0x18040600);
});

test('composeWord: null 字段贡献 0', () => {
  const fields = { func: 0x06, cmd: null, ms: null, rw: null, param: null };
  // func=0x06 at [31:26] → 0x06 << 26 = 0x18000000
  assert.strictEqual(composeWord(fields), 0x18000000);
});

test('composeWord: 全 null → 0', () => {
  assert.strictEqual(composeWord({ func: null, cmd: null, ms: null, rw: null, param: null }), 0);
});

test('composeWord: 最大值', () => {
  const fields = { func: 0x3F, cmd: 0xFFFF, ms: 1, rw: 1, param: 0xFF };
  assert.strictEqual(composeWord(fields) >>> 0, 0xFFFFFFFF);
});

// ─── decomposeWord ────────────────────────────────────────────────────────────

test('decomposeWord: 0x30440100 字段分解', () => {
  // 0x30440100 = 0011 0000 0100 0100 0000 0001 0000 0000
  // func[31:26] = 001100 = 0x0C = 12
  // cmd [25:10] = 00 0001 0001 0000 0000 00 → bits25-10 = 0001 0001 0000 0000 = 0x1100 = 4352
  // ms  [9]     = 0
  // rw  [8]     = 1
  // param[7:0]  = 0x00
  const fields = decomposeWord(0x30440100);
  assert.strictEqual(fields.func,  0x0C);
  assert.strictEqual(fields.cmd,   0x1100);
  assert.strictEqual(fields.ms,    0);
  assert.strictEqual(fields.rw,    1);
  assert.strictEqual(fields.param, 0x00);
  // 再验证往返
  assert.strictEqual(composeWord(fields), 0x30440100);
});

test('decomposeWord: composeWord 往返一致性', () => {
  const words = [0x00000000, 0xFFFFFFFF, 0x18040600, 0x80000000, 0x000003FF];
  for (const w of words) {
    assert.strictEqual(composeWord(decomposeWord(w)), w >>> 0, `往返失败: ${fmtHex(w)}`);
  }
});

// ─── parseLoose ───────────────────────────────────────────────────────────────

test('parseLoose: 0x 前缀 hex', () => {
  const r = parseLoose('0x18040600', 32);
  assert.ok(r.ok);
  assert.strictEqual(r.value, 0x18040600);
});

test('parseLoose: 裸 hex（含 a-f）', () => {
  const r = parseLoose('1a2b3c', 32);
  assert.ok(r.ok);
  assert.strictEqual(r.value, 0x1a2b3c);
});

test('parseLoose: 十进制', () => {
  const r = parseLoose('255', 8);
  assert.ok(r.ok);
  assert.strictEqual(r.value, 255);
});

test('parseLoose: 空字符串 → null', () => {
  const r = parseLoose('', 32);
  assert.ok(r.ok);
  assert.strictEqual(r.value, null);
});

test('parseLoose: 超出范围报错', () => {
  const r = parseLoose('256', 8);
  assert.ok(!r.ok);
  assert.match(r.err, /超出 8-bit/);
});

test('parseLoose: 非法 hex 字符串报错', () => {
  const r = parseLoose('0xGG', 32);
  assert.ok(!r.ok);
});

// ─── anyFieldSet ─────────────────────────────────────────────────────────────

test('anyFieldSet: 全 null → false', () => {
  assert.strictEqual(anyFieldSet({ func: null, cmd: null, ms: null, rw: null, param: null }), false);
});

test('anyFieldSet: 有一个非 null → true', () => {
  assert.strictEqual(anyFieldSet({ func: 0, cmd: null, ms: null, rw: null, param: null }), true);
});

// ─── fieldOfBit ──────────────────────────────────────────────────────────────

test('fieldOfBit: 边界位归属正确', () => {
  assert.strictEqual(fieldOfBit(31), 'func');
  assert.strictEqual(fieldOfBit(26), 'func');
  assert.strictEqual(fieldOfBit(25), 'cmd');
  assert.strictEqual(fieldOfBit(10), 'cmd');
  assert.strictEqual(fieldOfBit(9),  'ms');
  assert.strictEqual(fieldOfBit(8),  'rw');
  assert.strictEqual(fieldOfBit(7),  'param');
  assert.strictEqual(fieldOfBit(0),  'param');
});

// ─── formatOutput ────────────────────────────────────────────────────────────

test('formatOutput: hex 格式', () => {
  assert.strictEqual(formatOutput(0x18040600, 'hex'), '0x18040600');
});

test('formatOutput: dec 格式', () => {
  assert.strictEqual(formatOutput(0x18040600, 'dec'), String(0x18040600));
});

test('formatOutput: c 字面量', () => {
  assert.strictEqual(formatOutput(0x18040600, 'c'), '0x18040600u');
});

test('formatOutput: json 包含全部字段', () => {
  const j = JSON.parse(formatOutput(0x18040600, 'json'));
  assert.ok('offset' in j && 'func' in j && 'cmd' in j && 'ms' in j && 'rw' in j && 'param' in j);
});

// ─── describeFuncCode ────────────────────────────────────────────────────────

test('describeFuncCode: 已知功能码返回正确描述', () => {
  const d = describeFuncCode(0x06);
  assert.strictEqual(d.kind, '');
  assert.match(d.label, /散热/);
});

test('describeFuncCode: 0x20 = Reserved → warn', () => {
  const d = describeFuncCode(0x20);
  assert.strictEqual(d.kind, 'warn');
  assert.match(d.label, /Reserved/);
});

test('describeFuncCode: OEM 范围 → warn + OEM 标签', () => {
  const d = describeFuncCode(0x38);
  assert.strictEqual(d.kind, 'warn');
  assert.match(d.label, /OEM/);
});

test('describeFuncCode: 未定义功能码 → warn', () => {
  const d = describeFuncCode(0x10);
  assert.strictEqual(d.kind, 'warn');
  assert.match(d.label, /未定义/);
});
