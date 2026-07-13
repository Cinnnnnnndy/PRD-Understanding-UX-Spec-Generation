// 语义格式化 —— 把工程值翻译成用户可读标签，集中处理，组件不散落映射
import { FUNCTION_LABELS, BIT_LABELS } from '../constants/enums.js';

/** 功能码 → 语义分类 + 标签 */
export function describeFunction(code) {
  if (code in FUNCTION_LABELS) {
    const kind = code === 0x20 ? 'reserved' : 'defined';
    return { kind, label: FUNCTION_LABELS[code] };
  }
  if (code >= 0x37 && code <= 0x3f) return { kind: 'oem', label: `OEM 功能 (0x${code.toString(16).toUpperCase()})` };
  if (code >= 0 && code <= 0x3f) return { kind: 'undefined', label: '未定义功能码' };
  return { kind: 'invalid', label: '超出范围' };
}

/** MS / RW 位 → 语义标签 */
export function describeBit(field, value) {
  return BIT_LABELS[field]?.[value] ?? '—';
}

/** 命令字十六进制展示：0xXXXXXXXX */
export function formatOffsetHex(offset32) {
  return '0x' + (offset32 >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
