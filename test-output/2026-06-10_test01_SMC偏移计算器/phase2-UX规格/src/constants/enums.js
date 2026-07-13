/**
 * SMC 偏移量计算器 · 常量与枚举
 * 字段位区间、功能码表、格式枚举——统一维护，不在组件中硬编码
 */

/**
 * @typedef {'func'|'cmd'|'ms'|'rw'|'param'} FieldKey
 */

/**
 * 字段定义表
 * lo: 字段 LSB 在 32-bit word 中的位偏移
 * w:  字段位宽
 * hex: HEX 显示时的最小字符宽度（补零用）
 * hue: 对应 PTO 语义 token 名（颜色系统）
 * label: 显示名称
 * meta: 位区间描述
 * @type {Record<FieldKey, {lo:number, w:number, hex:number, hue:string, label:string, meta:string}>}
 */
export const FIELDS = {
  func:  { lo: 26, w: 6,  hex: 2, hue: '--warning', label: 'Function · 功能码', meta: '[31:26] · 6b · 0–0x3F' },
  cmd:   { lo: 10, w: 16, hex: 4, hue: '--primary',  label: 'Command · 命令码',  meta: '[25:10] · 16b · 0–0xFFFF' },
  ms:    { lo: 9,  w: 1,  hex: 1, hue: '--accent',   label: 'MS · 读取方式',    meta: '[9] · 1b' },
  rw:    { lo: 8,  w: 1,  hex: 1, hue: '--success',  label: 'RW · 读写方向',   meta: '[8] · 1b' },
  param: { lo: 0,  w: 8,  hex: 2, hue: '--danger',   label: 'Param · 参数',    meta: '[7:0] · 8b · 0–0xFF' },
};

/** 字段渲染顺序 */
export const ORDER = /** @type {FieldKey[]} */ (['func', 'cmd', 'ms', 'rw', 'param']);

/**
 * 位图字段带定义（字段名、起始列、结束列、显示名、位区间标注）
 * grid-column 以 CSS 1-indexed 为准，end 为 exclusive
 */
export const BAND = [
  ['func',  1,  7,  'Function', '[31:26]'],
  ['cmd',   7,  23, 'Command',  '[25:10]'],
  ['ms',    23, 24, 'MS',       ''],
  ['rw',    24, 25, 'RW',       ''],
  ['param', 25, 33, 'Param',    '[7:0]'],
];

/**
 * 1-bit 字段的分段控件选项 [值, 标签]
 * @type {Record<'ms'|'rw', [string, string][]>}
 */
export const SEGMENTED = {
  ms: [['0', '多读'], ['1', '单读']],
  rw: [['0', '写入'], ['1', '读取']],
};

/**
 * 功能码权威映射表（BMC SMC 规范）
 * 0x00–0x09 已定义；0x20 = Reserved；0x37–0x3F = OEM 范围；其余未定义
 * @type {Record<number, string>}
 */
export const FUNC_TABLE = {
  0x00: '公共功能',
  0x01: '扩展组件管理',
  0x02: '机箱部件管理',
  0x03: '计算部件管理',
  0x04: '内存部件管理',
  0x05: '存储部件管理',
  0x06: '散热部件管理',
  0x07: 'IO 扩展部件管理',
  0x08: '加速扩展部件管理',
  0x09: '供电部件管理',
  0x20: 'Reserved（保留）',
};

/** OEM 功能码范围 */
export const FUNC_OEM_MIN = 0x37;
export const FUNC_OEM_MAX = 0x3F;

/**
 * 复制格式枚举
 * @typedef {'hex'|'dec'|'both'|'c'|'json'} CopyFmt
 */
export const COPY_FMT = /** @type {CopyFmt[]} */ (['hex', 'dec', 'both', 'c', 'json']);

/** 复制格式显示名 */
export const COPY_FMT_LABEL = {
  hex:  '仅 HEX',
  dec:  '仅 DEC',
  both: 'HEX + DEC',
  c:    'C 字面量',
  json: 'JSON 字段',
};

/** localStorage 持久化键 */
export const HISTORY_STORAGE_KEY = 'pto.smc.history.v1';

/** 最大历史记录数 */
export const HISTORY_MAX = 10;
