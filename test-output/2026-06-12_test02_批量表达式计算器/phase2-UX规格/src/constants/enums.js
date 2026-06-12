/**
 * 管道表达式批量评估器 · 枚举常量
 * 所有参数类型、状态值、本地存储 key 统一维护于此
 */

/** 参数徽章类型（badge-select 可选值） */
export const PARAM_BADGE_TYPES = /** @type {const} */ ({
  SYNC:     'sync',
  REF:      'ref',
  CONST:    'const',
  LITERAL:  'literal',
  TEMPLATE: 'template',
})

/** 参数徽章类型的显示标签 */
export const BADGE_LABELS = {
  [PARAM_BADGE_TYPES.SYNC]:     'SYNC',
  [PARAM_BADGE_TYPES.REF]:      'REF',
  [PARAM_BADGE_TYPES.CONST]:    'CONST',
  [PARAM_BADGE_TYPES.LITERAL]:  'LITERAL',
  [PARAM_BADGE_TYPES.TEMPLATE]: 'TEMPLATE',
}

/** 单条测试用例的执行状态 */
export const EXEC_STATUS = /** @type {const} */ ({
  PENDING:   'pending',
  MATCH:     'match',
  MISMATCH:  'mismatch',
  ERROR:     'error',
})

/** 批量结果筛选项 */
export const RESULT_FILTER = /** @type {const} */ ({
  ALL:      'all',
  MATCH:    'match',
  MISMATCH: 'mismatch',
  ERROR:    'error',
})

/** 筛选项的显示标签 */
export const FILTER_LABELS = {
  [RESULT_FILTER.ALL]:      '全部',
  [RESULT_FILTER.MATCH]:    '匹配',
  [RESULT_FILTER.MISMATCH]: '不匹配',
  [RESULT_FILTER.ERROR]:    '错误',
}

/** 应用模式（调试 / 用例） */
export const APP_MODE = /** @type {const} */ ({
  DEBUG:    'debug',
  TESTCASE: 'testcase',
})

/** 本地存储 key */
export const STORAGE_KEYS = {
  HISTORY:   'pipe-eval-history',
  TPL_OPEN:  'pipe-eval-tpl-open',
  OP_OPEN:   'pipe-eval-op-open',
}

/** 历史记录最大条数 */
export const HISTORY_MAX = 20

/** 虚拟滚动相关常量 */
export const VIRTUAL_SCROLL = {
  ROW_HEIGHT: 36,
  BUFFER:     10,
}

/** 默认表达式（初始/重置用） */
export const DEFAULT_EXPR = '$1;$2 |> expr($1 + $2) |> expr($1 * 2)'

/** postMessage 事件类型（宿主 ↔ 工具通信协议） */
export const MSG_TYPES = {
  TEMPLATE_VARS_UPDATE: 'TEMPLATE_VARS_UPDATE',
  RESULT_READY:         'RESULT_READY',
}

/** 三张内置示例卡片（经 node 验证，GATE: PASS） */
export const BUILTIN_EXAMPLES = [
  {
    title: '两数求和并格式化',
    expr:  '$1;$2 |> expr($1+$2) |> string.format("%.2f",$1)',
    vals:  ['3', '4'],
    out:   '"7.00"',
  },
  {
    title: '去空格并转大写',
    expr:  '$1 |> string.gsub($1," ","") |> string.upper($1)',
    vals:  ['bmc studio'],
    out:   '"BMCSTUDIO"',
  },
  {
    title: '条件判断（Lua ?: 风格）',
    expr:  '$1 |> expr($1>0 ? "正数" : "非正数")',
    vals:  ['5'],
    out:   '"正数"',
  },
]
