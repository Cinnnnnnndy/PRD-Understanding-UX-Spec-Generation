/**
 * SMC 偏移量计算器 · 格式化工具
 * 所有魔法值转换、输出格式化集中在此，不散落组件
 */

import { FIELDS, ORDER, FUNC_TABLE, FUNC_OEM_MIN, FUNC_OEM_MAX } from '../constants/enums.js';
import { decomposeWord } from './smcCodec.js';

/**
 * 左补零至指定宽度
 * @param {string} s
 * @param {number} n
 * @returns {string}
 */
export function pad(s, n) {
  return s.length >= n ? s : '0'.repeat(n - s.length) + s;
}

/**
 * 整数 → `0x` 前缀 8位大写 HEX
 * @param {number} w 32-bit unsigned int
 * @returns {string} e.g. "0x18040600"
 */
export function fmtHex(w) {
  return '0x' + pad((w >>> 0).toString(16).toUpperCase(), 8);
}

/**
 * 将字段值格式化为 HEX 字符串（含 0x 前缀，补零到字段宽度）
 * @param {string} key   字段 key
 * @param {number} value 字段值
 * @returns {string}
 */
export function fmtFieldHex(key, value) {
  return '0x' + pad(value.toString(16).toUpperCase(), FIELDS[key].hex);
}

/**
 * 生成指定格式的复制文本
 * @param {number} word   32-bit unsigned integer
 * @param {'hex'|'dec'|'both'|'c'|'json'} fmt
 * @returns {string}
 */
export function formatOutput(word, fmt) {
  const w = word >>> 0;
  const hex = fmtHex(w);
  const dec = String(w);

  switch (fmt) {
    case 'dec':  return dec;
    case 'both': return `${hex} (${dec})`;
    case 'c':    return `${hex}u`;
    case 'json': {
      const p = decomposeWord(w);
      return JSON.stringify({
        offset: hex,
        func:   fmtFieldHex('func',  p.func),
        cmd:    fmtFieldHex('cmd',   p.cmd),
        ms:     p.ms,
        rw:     p.rw,
        param:  fmtFieldHex('param', p.param),
      });
    }
    default:     return hex; // 'hex'
  }
}

/**
 * 解析功能码的语义描述
 * @param {number} v 功能码值 0–63
 * @returns {{ kind: ''|'warn'|'err', label: string }}
 */
export function describeFuncCode(v) {
  if (v in FUNC_TABLE) {
    return {
      kind:  v === 0x20 ? 'warn' : '',
      label: FUNC_TABLE[v],
    };
  }
  if (v >= FUNC_OEM_MIN && v <= FUNC_OEM_MAX) {
    return { kind: 'warn', label: 'OEM 0x' + v.toString(16).toUpperCase() };
  }
  if (v >= 0 && v <= 0x3F) {
    return { kind: 'warn', label: '未定义功能码' };
  }
  return { kind: 'err', label: '超范围' };
}

/**
 * 格式化历史记录的时间戳
 * 24 小时内：HH:MM；超过 24 小时：M/D HH:MM
 * @param {number} ts Date.now() 毫秒时间戳
 * @returns {string}
 */
export function fmtHistoryTime(ts) {
  const now = Date.now();
  const d = new Date(ts);
  const hhmm = `${pad(String(d.getHours()), 2)}:${pad(String(d.getMinutes()), 2)}`;
  if (now - ts < 24 * 60 * 60 * 1000) return hhmm;
  return `${d.getMonth() + 1}/${d.getDate()} ${hhmm}`;
}
