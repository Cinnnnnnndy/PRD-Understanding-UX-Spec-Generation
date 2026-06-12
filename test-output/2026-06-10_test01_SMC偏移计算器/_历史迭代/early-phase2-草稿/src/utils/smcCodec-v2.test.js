import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeOffset, decodeOffset, isValidField, isValidFields,
  parseHex, toHex, parseOffsetInput,
} from '../src/utils/smcCodec.js';
import { describeFunction, describeBit, formatOffsetHex } from '../src/utils/formatters.js';

const Z = { function: 0, command: 0, ms: 0, rw: 0, parameter: 0 };

test('encode: 全零命令字 = 0x00000000（合法零值）', () => {
  assert.equal(encodeOffset(Z), 0);
});

test('encode/decode 往返：0x30440100（skill 示例）', () => {
  const fields = decodeOffset(0x30440100);
  assert.deepEqual(fields, { function: 0x0c, command: 0x1100, ms: 0, rw: 1, parameter: 0 });
  assert.equal(encodeOffset(fields) >>> 0, 0x30440100);
});

test('decode：日志占位示例 809893888', () => {
  const f = decodeOffset(809893888);
  assert.equal(f.function, 0x0c);
  assert.equal(f.command, 0x1180);
  assert.equal(encodeOffset(f), 809893888);
});

test('encode：各字段落在正确位区间', () => {
  assert.equal(encodeOffset({ ...Z, function: 0x3f }) >>> 0, 0xfc000000);
  assert.equal(encodeOffset({ ...Z, command: 0xffff }) >>> 0, 0x03fffc00);
  assert.equal(encodeOffset({ ...Z, ms: 1 }), 0x200);
  assert.equal(encodeOffset({ ...Z, rw: 1 }), 0x100);
  assert.equal(encodeOffset({ ...Z, parameter: 0xff }), 0xff);
});

test('isValidField：边界与越界', () => {
  assert.ok(isValidField('function', 0x3f));
  assert.ok(!isValidField('function', 0x40));
  assert.ok(!isValidField('ms', 2));
  assert.ok(!isValidField('command', -1));
  assert.ok(!isValidField('parameter', 1.5));
  assert.ok(isValidFields(Z));
});

test('parseHex：空串/非法 → NaN', () => {
  assert.ok(Number.isNaN(parseHex('')));
  assert.ok(Number.isNaN(parseHex('GZ')));
  assert.equal(parseHex('3F'), 0x3f);
  assert.equal(toHex(0x0c, 2), '0C');
});

test('parseOffsetInput：十进制 / 0x / 溢出 / 非法', () => {
  assert.deepEqual(parseOffsetInput('809893888'), { ok: true, value: 809893888, truncated: 809893888, overflow: false });
  assert.equal(parseOffsetInput('0x30460000').value, 0x30460000);
  assert.equal(parseOffsetInput('  ').ok, false);
  assert.equal(parseOffsetInput('-5').ok, false);
  const big = parseOffsetInput('4294967296'); // 0x100000000
  assert.equal(big.overflow, true);
  assert.equal(big.truncated, 0);
});

test('describeFunction：四类区段', () => {
  assert.equal(describeFunction(0x06).kind, 'defined');
  assert.equal(describeFunction(0x20).kind, 'reserved');
  assert.equal(describeFunction(0x3a).kind, 'oem');
  assert.equal(describeFunction(0x1f).kind, 'undefined');
  assert.equal(describeFunction(0x40).kind, 'invalid');
});

test('describeBit / formatOffsetHex', () => {
  assert.equal(describeBit('ms', 1), '单读');
  assert.equal(describeBit('rw', 0), '写操作');
  assert.equal(formatOffsetHex(0x30460000), '0x30460000');
  assert.equal(formatOffsetHex(0), '0x00000000');
});
