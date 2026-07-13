/**
 * 管道表达式批量评估器 · 校验工具
 * 纯函数，返回 { ok, msg } 结构，不依赖 DOM
 */

import { parsePipeExpr } from './pipeEvalLogic.js';
import { KNOWN_FUNCTIONS } from '../constants/enums.js';

/**
 * 验证管道表达式原始文本
 * @param {string} raw
 * @returns {{ ok: true, msg: string, parsed: import('./pipeEvalLogic').ParsedExpr }
 *          | { ok: false, msg: string }}
 */
export function validateExpr(raw) {
  if (!raw.trim()) return { ok: false, msg: '表达式不能为空' };

  const parsed = parsePipeExpr(raw);
  if (!parsed.ok) return { ok: false, msg: '解析失败：' + parsed.error };
  if (!parsed.inputs.length) return { ok: false, msg: '至少需要声明一个输入参数（如 $1）' };

  for (const st of parsed.stages) {
    if (!KNOWN_FUNCTIONS.includes(st.fn)) {
      return { ok: false, msg: `未知函数: ${st.fn}` };
    }
  }

  return {
    ok:     true,
    msg:    `✓ 解析成功 · ${parsed.inputs.length} 个输入 · ${parsed.stages.length} 个阶段`,
    parsed,
  };
}
