/**
 * 管道表达式批量评估器 · 枚举常量
 * 所有参数类型、状态值、本地存储 key、UI 配置统一维护于此
 */

// ── 参数徽章类型 ──────────────────────────────────────────────────────────────
/** @type {Record<string, string>} 徽章 value → 显示标签 */
export const BADGE_LABEL = {
  sync:     'SYNC',
  ref:      'REF',
  const:    'CONST',
  literal:  'LITERAL',
  template: 'TEMPLATE',
};

// ── 已知函数白名单（用于 validateExpr）───────────────────────────────────────
export const KNOWN_FUNCTIONS = [
  'expr',
  'string.format',
  'string.cmp',
  'string.sub',
  'string.gsub',
  'string.upper',
  'string.lower',
];

// ── 操作符面板分组 ─────────────────────────────────────────────────────────────
/**
 * @typedef {{ dot: string, name: string, chips: Array<{text: string, sig: string}> }} OpGroup
 * @type {OpGroup[]}
 */
export const OP_GROUPS = [
  {
    dot: '--primary',
    name: '输入',
    chips: [
      { text: '$1',   sig: '$N · 引用第 N 个输入参数；首段用 ; 分隔多个输入' },
      { text: ';$2',  sig: '; · 在首段追加声明一个输入参数' },
      { text: ' |> ', sig: '|> · 管道连接符，左侧输出作为右侧 $1（两侧必须有空格）' },
    ],
  },
  {
    dot: '--success',
    name: '字符串',
    chips: [
      { text: 'string.format("%.2f", $1)', sig: 'string.format(fmt, …) · Lua 风格格式化：%d %f %s %x 等' },
      { text: 'string.upper($1)',           sig: 'string.upper(s) · 转大写' },
      { text: 'string.lower($1)',           sig: 'string.lower(s) · 转小写' },
      { text: 'string.sub($1, 1, 3)',       sig: 'string.sub(s, start, end) · 1 基截取，支持负索引' },
      { text: 'string.gsub($1, "a", "b")', sig: 'string.gsub(s, pat, repl) · Lua pattern 全局替换（%d %a %s 等字符类）' },
      { text: 'string.cmp($1, "expected")',sig: 'string.cmp(a, b) · 字符串相等比较，返回 true/false' },
    ],
  },
  {
    dot: '--warning',
    name: '自定义',
    chips: [
      { text: 'expr($1 + $2)', sig: 'expr(<表达式>) · 算术/逻辑/位运算；? : 为 Lua 风格条件（0 和 "" 为真值）' },
    ],
  },
];

// ── 空态示例 ──────────────────────────────────────────────────────────────────
/**
 * @typedef {{ title: string, expr: string, vals: string[], out: string }} Example
 * @type {Example[]}
 */
export const EXAMPLES = [
  {
    title: '两数求和并格式化',
    expr:  '$1;$2 |> expr($1 + $2) |> string.format("%.2f", $1)',
    vals:  ['3', '4'],
    out:   '"7.00"',
  },
  {
    title: '去空格并转大写',
    expr:  '$1 |> string.gsub($1, " ", "") |> string.upper($1)',
    vals:  ['bmc studio'],
    out:   '"BMCSTUDIO"',
  },
  {
    title: '条件判断（Lua 风格 ?:）',
    expr:  '$1 |> expr($1 > 0 ? "正数" : "非正数")',
    vals:  ['5'],
    out:   '"正数"',
  },
];

// ── localStorage Keys ─────────────────────────────────────────────────────────
export const LS_KEYS = {
  HISTORY:   'pipe-eval-history',
  TPL_OPEN:  'pipe-eval-tpl-open',
  OP_OPEN:   'pipe-eval-op-open',
  THEME:     'pipe-eval-theme',
};

// ── 历史记录最大保存条数（Prompt 规格：20 条，原 Demo 误写为 8）──────────────
export const HISTORY_MAX = 20;

// ── 虚拟滚动参数 ──────────────────────────────────────────────────────────────
export const VSCROLL = {
  ROW_H: 36,  // px，与 CSS --table-row-height 一致
  BUF:   10,  // 可视区外预渲染缓冲行数
};

// ── 结果筛选类型 ──────────────────────────────────────────────────────────────
/** @typedef {'all' | 'match' | 'mismatch' | 'error'} ResultFilter */
export const FILTER_LABELS = {
  all:      '全部',
  match:    '匹配',
  mismatch: '不匹配',
  error:    '错误',
};
