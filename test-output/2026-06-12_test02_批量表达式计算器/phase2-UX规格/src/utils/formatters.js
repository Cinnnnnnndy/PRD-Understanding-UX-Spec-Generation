/**
 * 管道表达式批量评估器 · 格式化工具
 * 所有魔法值与展示转换集中于此，不散落各组件
 */

import { PARAM_BADGE_TYPES, EXEC_STATUS } from '../constants/enums.js'

/**
 * 将求值结果格式化为带引号的显示字符串
 * @param {unknown} v
 * @returns {string}
 */
export function fmtVal(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return '"' + v + '"'
  return String(v)
}

/**
 * 格式化历史记录时间戳
 * - 24 小时内：HH:MM
 * - 超过 24 小时：M/D HH:MM
 * @param {number} ts  Date.now() 时间戳
 * @returns {string}
 */
export function fmtHistoryTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (diffMs < 24 * 60 * 60 * 1000) return `${hh}:${mm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

/**
 * 将执行状态枚举映射为中文标签
 * @param {string} status
 * @returns {string}
 */
export function fmtExecStatus(status) {
  const map = {
    [EXEC_STATUS.PENDING]:   '待执行',
    [EXEC_STATUS.MATCH]:     '✓ 匹配',
    [EXEC_STATUS.MISMATCH]:  '✗ 不匹配',
    [EXEC_STATUS.ERROR]:     '⚠ 错误',
  }
  return map[status] ?? status
}

/**
 * 将参数类型枚举映射为 aria-label 说明
 * 用于可访问性（badge-select aria-label）
 * @param {string} type
 * @returns {string}
 */
export function fmtBadgeTypeDesc(type) {
  const map = {
    [PARAM_BADGE_TYPES.SYNC]:     'SYNC：由宿主实时同步的动态参数',
    [PARAM_BADGE_TYPES.REF]:      'REF：引用其他字段的值',
    [PARAM_BADGE_TYPES.CONST]:    'CONST：固定常量，不随运行时变化',
    [PARAM_BADGE_TYPES.LITERAL]:  'LITERAL：字面量，用户直接输入',
    [PARAM_BADGE_TYPES.TEMPLATE]: 'TEMPLATE：包含 ${VarName} 模板变量',
  }
  return map[type] ?? type
}

/**
 * 格式化通过率摘要文案
 * @param {{ matched: number, total: number }} stats
 * @returns {{ text: string, isOk: boolean }}
 */
export function fmtPassRate(stats) {
  const isOk = stats.matched === stats.total
  const icon = isOk ? '✓' : '✗'
  return { text: `${icon} 通过 ${stats.matched}/${stats.total}`, isOk }
}

/**
 * 格式化批量执行进度提示（大量用例时显示进度）
 * @param {number} done
 * @param {number} total
 * @returns {string}
 */
export function fmtProgress(done, total) {
  return `已处理 ${done}/${total}`
}

/**
 * 推断值的类型（用于 type-chip class 选择）
 * @param {unknown} v
 * @returns {'number' | 'string' | 'boolean' | 'null' | 'other'}
 */
export function inferValueType(v) {
  if (v === null || v === undefined) return 'null'
  const t = typeof v
  if (t === 'number') return 'number'
  if (t === 'string') return 'string'
  if (t === 'boolean') return 'boolean'
  return 'other'
}

/**
 * 将 type 映射为 type-chip 的 CSS class
 * @param {ReturnType<typeof inferValueType>} type
 * @returns {string}
 */
export function typeChipClass(type) {
  const map = {
    number:  'type-num',
    string:  'type-str',
    boolean: 'type-bool',
    null:    '',
    other:   '',
  }
  return map[type] ?? ''
}
