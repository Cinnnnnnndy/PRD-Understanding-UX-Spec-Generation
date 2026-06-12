/**
 * 管道表达式批量评估器 · 校验工具
 * 纯函数，返回 { ok, message } 结构，不依赖 DOM
 */

import { parsePipeExpr } from './pipeEvalLogic.js'

/**
 * 校验管道表达式语法
 * @param {string} raw
 * @returns {{ ok: boolean, message: string }}
 */
export function validateExpr(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, message: '表达式不能为空' }

  // 检查管道连接符格式（两侧必须有空格）
  if (/\|>/.test(trimmed) && !/\s\|>\s/.test(trimmed)) {
    return { ok: false, message: '管道连接符 |> 两侧必须有空格，如：$1 |> expr($1+1)' }
  }

  const parsed = parsePipeExpr(trimmed)
  if (!parsed.ok) return { ok: false, message: parsed.error ?? '表达式解析失败' }
  if (parsed.inputs.length === 0 && parsed.stages.length === 0) {
    return { ok: false, message: '表达式无有效内容' }
  }
  return { ok: true, message: '表达式有效' }
}

/**
 * 校验单个输入参数值
 * @param {string} value
 * @param {string} placeholder  参数占位符，如 "$1"
 * @returns {{ ok: boolean, message: string }}
 */
export function validateInputValue(value, placeholder) {
  if (value === '' || value === undefined || value === null) {
    return { ok: false, message: `${placeholder} 未填写` }
  }
  return { ok: true, message: '' }
}

/**
 * 校验所有输入参数是否齐全
 * @param {string[]} values
 * @param {Array<{ placeholder: string }>} inputDefs
 * @returns {{ ok: boolean, emptyIndexes: number[], messages: string[] }}
 */
export function validateAllInputs(values, inputDefs) {
  const emptyIndexes = []
  const messages = []
  inputDefs.forEach((def, i) => {
    const r = validateInputValue(values[i], def.placeholder)
    if (!r.ok) { emptyIndexes.push(i); messages.push(r.message) }
  })
  return { ok: emptyIndexes.length === 0, emptyIndexes, messages }
}

/**
 * 校验测试用例文本是否非空
 * @param {string} text
 * @returns {{ ok: boolean, message: string }}
 */
export function validateTestCaseText(text) {
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
  if (lines.length === 0) return { ok: false, message: '请输入至少一条测试用例' }
  return { ok: true, message: `共 ${lines.length} 行（不含空行和注释）` }
}

/**
 * 校验模板变量名格式（合法标识符）
 * @param {string} key
 * @returns {{ ok: boolean, message: string }}
 */
export function validateTemplateVarKey(key) {
  if (!key.trim()) return { ok: false, message: '变量名不能为空' }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key.trim())) {
    return { ok: false, message: '变量名只能包含字母、数字和下划线，且不能以数字开头' }
  }
  return { ok: true, message: '' }
}
