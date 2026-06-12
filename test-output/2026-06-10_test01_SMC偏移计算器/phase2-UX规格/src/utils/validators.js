/**
 * SMC 偏移量计算器 · 校验工具
 * 字段范围校验，与编解码解耦
 */

import { FIELDS } from '../constants/enums.js';

/**
 * 校验字段值是否在合法范围内
 * @param {string} key   字段 key
 * @param {number} value 待校验值
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
export function validateField(key, value) {
  const field = FIELDS[key];
  if (!field) return { valid: false, reason: `未知字段: ${key}` };

  const max = (1 << field.w) - 1;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    return { valid: false, reason: `超出 ${field.w}-bit 范围（0–${max}）` };
  }
  return { valid: true };
}

/**
 * 校验 32-bit word 是否合法
 * @param {number} word
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
export function validateWord(word) {
  if (!Number.isInteger(word) || word < 0 || word > 0xFFFFFFFF) {
    return { valid: false, reason: '超出 32-bit 范围（0–0xFFFFFFFF）' };
  }
  return { valid: true };
}
