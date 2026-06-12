/**
 * SMC 32-bit 命令字编解码
 * 纯函数，与 UI 完全解耦，可独立用 node:test 测试
 *
 * 位布局：
 *   [31:26] func  (6-bit，功能码)
 *   [25:10] cmd   (16-bit，命令码)
 *   [9]     ms    (1-bit，0=多读/1=单读)
 *   [8]     rw    (1-bit，0=写入/1=读取)
 *   [7:0]   param (8-bit，参数)
 */

import { FIELDS, ORDER } from '../constants/enums.js';

/**
 * 将字段对象合成 32-bit 无符号整数
 * null 字段贡献 0（等同于该字段为 0）
 *
 * @param {Record<string, number|null>} fields
 * @returns {number} 32-bit unsigned integer
 */
export function composeWord(fields) {
  let w = 0;
  for (const k of ORDER) {
    const v = fields[k];
    if (v != null) {
      w = (w | ((v << FIELDS[k].lo) >>> 0)) >>> 0;
    }
  }
  return w >>> 0;
}

/**
 * 将 32-bit 无符号整数分解为各字段值
 *
 * @param {number} word 32-bit unsigned integer
 * @returns {Record<string, number>} 各字段值（均为非负整数）
 */
export function decomposeWord(word) {
  const w = word >>> 0;
  const fields = {};
  for (const k of ORDER) {
    const { lo, w: width } = FIELDS[k];
    const mask = (1 << width) - 1;
    fields[k] = (w >>> lo) & mask;
  }
  return fields;
}

/**
 * 宽松解析输入字符串为整数
 * 支持：`0x` 前缀 hex / 含 a-f 裸 hex / 纯十进制
 *
 * @param {string|undefined|null} raw   原始输入
 * @param {number}                bits  字段位宽（1–32），用于范围检查
 * @returns {{ ok: true, value: number|null } | { ok: false, err: string }}
 *   value=null 表示空输入（合法，不触发更新）
 */
export function parseLoose(raw, bits) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: null };

  let n;
  if (/^0x/i.test(s)) {
    if (!/^0x[0-9a-f]+$/i.test(s)) return { ok: false, err: '不合法的十六进制' };
    n = parseInt(s.slice(2), 16);
  } else if (/^[0-9a-f]+$/i.test(s) && /[a-f]/i.test(s)) {
    n = parseInt(s, 16);
  } else if (/^[0-9]+$/.test(s)) {
    n = parseInt(s, 10);
  } else {
    return { ok: false, err: '只接受 dec 或 0x hex' };
  }

  if (!Number.isFinite(n) || n < 0) return { ok: false, err: '非法数字' };

  const max = bits === 32 ? 0xFFFFFFFF : ((1 << bits) - 1);
  if (n > max) return { ok: false, err: `超出 ${bits}-bit 范围` };

  return { ok: true, value: n >>> 0 };
}

/**
 * 判断字段集合是否有任意字段已设置（非 null）
 *
 * @param {Record<string, number|null>} fields
 * @returns {boolean}
 */
export function anyFieldSet(fields) {
  return ORDER.some(k => fields[k] != null);
}

/**
 * 根据位序号判断所属字段
 * bit 31 对应 func 最高位，bit 0 对应 param 最低位
 *
 * @param {number} bit 位序号 0–31
 * @returns {string} 字段 key
 */
export function fieldOfBit(bit) {
  if (bit >= 26) return 'func';
  if (bit >= 10) return 'cmd';
  if (bit === 9)  return 'ms';
  if (bit === 8)  return 'rw';
  return 'param';
}
