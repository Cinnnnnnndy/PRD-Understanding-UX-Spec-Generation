// SMC 命令字枚举与字段定义 —— 统一维护，组件中不得硬编码
// 来源：preview-smc-calculator.html 的 fieldConfig + 功能码 tooltip 语义
// 字段命名与阶段一 data-structure.md / interface-contract.md 严格一致

/** 5 个位字段的位宽、位偏移、最大值、输入长度 */
export const FIELD_DEFS = Object.freeze({
  function:  { bits: 6,  shift: 26, maxValue: 0x3f,   maxLen: 2, label: '功能码', en: 'Function' },
  command:   { bits: 16, shift: 10, maxValue: 0xffff, maxLen: 4, label: '命令码', en: 'Command' },
  ms:        { bits: 1,  shift: 9,  maxValue: 0x1,    maxLen: 1, label: '读取方式', en: 'MS' },
  rw:        { bits: 1,  shift: 8,  maxValue: 0x1,    maxLen: 1, label: '读写方向', en: 'RW' },
  parameter: { bits: 8,  shift: 0,  maxValue: 0xff,   maxLen: 2, label: '参数', en: 'Parameter' },
});

/** 字段顺序（MSB → LSB），用于位布局可视化与遍历 */
export const FIELD_ORDER = ['function', 'command', 'ms', 'rw', 'parameter'];

/** 32 位上限；超过按取低 32 位处理 */
export const MAX_U32 = 0xffffffff;

/**
 * 功能码语义表。区分四类区段：
 * defined（已定义部件域）/ reserved（保留）/ oem（厂商扩展）/ undefined（空洞，合法范围内但语义未分配）
 * 理想由宿主下发；此处作为前端兜底字典。
 */
export const FUNCTION_LABELS = Object.freeze({
  0x00: '公共功能',
  0x01: '扩展组件管理功能',
  0x02: '机箱部件管理功能',
  0x03: '计算部件管理功能',
  0x04: '内存部件管理功能',
  0x05: '存储部件管理功能',
  0x06: '散热部件管理功能',
  0x07: 'IO 扩展部件管理功能',
  0x08: '加速扩展部件管理功能',
  0x09: '供电部件管理功能',
  0x20: 'Reserved（保留）',
});

/** MS / RW 1-bit 位的语义标签 */
export const BIT_LABELS = Object.freeze({
  ms: { 0: '多读', 1: '单读' },
  rw: { 0: '写操作', 1: '读操作' },
});

/** 位字段可视化配色（与阶段一报告 concept slide 一致） */
export const FIELD_COLORS = Object.freeze({
  function: '#0071e3', command: '#5e5ce6', ms: '#1a7f42', rw: '#b06000', parameter: '#86868b',
});
