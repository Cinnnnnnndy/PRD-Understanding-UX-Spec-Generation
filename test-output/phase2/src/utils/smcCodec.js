// SMC 命令字编解码 —— 纯函数，与 UI 解耦，可被组件 / 测试 / 宿主复用
import { FIELD_DEFS, FIELD_ORDER, MAX_U32 } from '../constants/enums.js';

/**
 * @typedef {Object} SmcFields
 * @property {number} function  0x00–0x3F
 * @property {number} command   0x0000–0xFFFF
 * @property {number} ms        0|1
 * @property {number} rw        0|1
 * @property {number} parameter 0x00–0xFF
 */

/** 解析一段十六进制文本为整数；空串或非法返回 NaN */
export function parseHex(value) {
  const t = String(value ?? '').trim();
  if (!t) return NaN;
  return /^[0-9a-fA-F]+$/.test(t) ? parseInt(t, 16) : NaN;
}

/** 整数转固定宽度大写十六进制（不带 0x） */
export function toHex(value, digits) {
  return ((value >>> 0).toString(16).toUpperCase()).padStart(digits, '0');
}

/** 单字段是否合法（整数、≥0、≤maxValue） */
export function isValidField(field, value) {
  const def = FIELD_DEFS[field];
  if (!def || !Number.isInteger(value)) return false;
  return value >= 0 && value <= def.maxValue;
}

/** 整组字段是否都合法 */
export function isValidFields(fields) {
  return FIELD_ORDER.every((f) => isValidField(f, fields[f]));
}

/**
 * 编码：字段 → 32 位命令字
 * @param {SmcFields} fields
 * @returns {number} uint32
 */
export function encodeOffset(fields) {
  let acc = 0;
  for (const f of FIELD_ORDER) acc |= (fields[f] << FIELD_DEFS[f].shift);
  return acc >>> 0;
}

/**
 * 解码：32 位命令字 → 字段
 * @param {number} offset32
 * @returns {SmcFields}
 */
export function decodeOffset(offset32) {
  const v = offset32 >>> 0;
  /** @type {any} */
  const out = {};
  for (const f of FIELD_ORDER) {
    const { shift, bits } = FIELD_DEFS[f];
    out[f] = (v >>> shift) & ((1 << bits) - 1) >>> 0;
  }
  return out;
}

/**
 * 解析用户输入的偏移量文本（十进制，或 0x 前缀十六进制）。
 * @returns {{ ok: boolean, value?: number, truncated?: number, overflow?: boolean, error?: string }}
 */
export function parseOffsetInput(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return { ok: false, error: '请输入偏移量' };
  const value = /^0x/i.test(t) ? parseInt(t, 16) : parseInt(t, 10);
  if (Number.isNaN(value) || value < 0) return { ok: false, error: '无效的偏移量' };
  if (value > MAX_U32) {
    return { ok: true, value, truncated: value >>> 0, overflow: true };
  }
  return { ok: true, value, truncated: value >>> 0, overflow: false };
}
