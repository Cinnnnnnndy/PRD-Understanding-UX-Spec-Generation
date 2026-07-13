/**
 * 管道表达式批量评估器 · 格式化工具
 * 所有值展示转换集中于此，不散落各组件
 */

/**
 * 对任意运行时值生成可读字符串（含类型标注）
 * @param {*} v
 * @returns {string}
 */
export function fmtVal(v) {
  if (v === null)      return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return '"' + v + '"';
  return String(v);
}

/**
 * 批量结果比较标准化：去首尾引号、合并空白
 * 设计取舍：`"7.00"` 与 `7.00` 视为匹配（normOut 语义）
 * @param {*} s
 * @returns {string}
 */
export function normOut(s) {
  return String(s).trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * 相对时间格式化
 * @param {number} ts  Unix ms 时间戳
 * @returns {string}
 */
export function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)    return '刚刚';
  if (d < 3600)  return Math.floor(d / 60) + ' 分钟前';
  if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
  return Math.floor(d / 86400) + ' 天前';
}

/**
 * HTML 转义（防 XSS；用于 innerHTML 拼接场景）
 * @param {*} s
 * @returns {string}
 */
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

/**
 * 类型 chip CSS class
 * @param {*} v
 * @returns {string}
 */
export function typeChipClass(v) {
  const t = v === null ? 'null' : typeof v;
  if (t === 'number')  return 'type-num';
  if (t === 'string')  return 'type-str';
  if (t === 'boolean') return 'type-bool';
  return '';
}
