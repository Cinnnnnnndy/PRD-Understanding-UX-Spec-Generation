/**
 * 管道表达式批量评估器 · 核心业务逻辑（纯函数）
 *
 * 所有函数无副作用，不依赖 DOM / localStorage / fetch，可独立单元测试。
 * SafeExpressionParser / PipeEvaluator / parsePipeExpr / parseTestCaseText
 * 逐字移植自 DEMO-优化版/index.html，求值逻辑零改动。
 *
 * ⚠️ 已知缺陷（刻意保持与 Demo 一致）：
 *   _luaPatToRegex 将 `%d+` 解析为 `/[0-9]\+/g`（`+` 被当作普通字符而非 Lua 量词），
 *   因 magic 集合 '^$()%.[]*+-?' 中 `+` 会被 `\\` 转义。缺陷修复另立工单。
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1.  SafeExpressionParser  — 安全表达式解析器（无 eval）
// ═══════════════════════════════════════════════════════════════════════════

class SafeExpressionParser {
  /** @param {string} input */
  constructor(input) {
    this.input = input
    this.tokens = []
    this.pos = 0
    this._tokenize()
  }

  _tokenize() {
    const patterns = [
      { re: /\s+/, skip: true },
      { re: /\/\/[ \t]*(?=[0-9(a-zA-Z_$+\-*&|^~!<>?:%])/ },
      { re: /\/\/.*$/, skip: true },
      { re: /\d+(\.\d+)?/ },
      { re: /"[^"]*"|'[^']*'/ },
      { re: /true|false/ },
      { re: /null|undefined/ },
      { re: /\?/, sub: 'and' },
      { re: /:(?![a-zA-Z_$])/, sub: 'or' },
      { re: /\band\b/ }, { re: /\bor\b/ },
      { re: /&&/ }, { re: /\|\|/ },
      { re: />>>|<<|>>/ },
      { re: /~=|==|!=|<=|>=/ },
      { re: /[+\-*/%&|^~!<>]/ },
      { re: /[\(\)\[\]\{\}]/ },
      { re: /[^"'\s+\-*/%&|^~!<>?:\[\]\(\)\{\}=,]+/ },
    ]
    let rem = this.input
    while (rem.length > 0) {
      let matched = false
      for (const p of patterns) {
        const m = rem.match(p.re)
        if (m && m.index === 0) {
          if (!p.skip) {
            let tok = p.sub || m[0]
            if (tok.startsWith('//')) tok = tok.replace(/[ \t]+$/, '')
            this.tokens.push(tok)
          }
          rem = rem.slice(m[0].length)
          matched = true
          break
        }
      }
      if (!matched) rem = rem.slice(1)
    }
  }

  parse() { return this._parseLogicalOr() }
  _peek(off = 0) { return this.tokens[this.pos + off] ?? null }
  _consume() { return this.tokens[this.pos++] ?? '' }
  _match(t) { if (this._peek() === t) { this._consume(); return true } return false }
  _expect(t) { if (this._peek() !== t) throw new Error(`期望 '${t}'，但得到 '${this._peek()}'`); this._consume() }
  _truthy(v) { return v !== null && v !== undefined && v !== false }
  _luaAnd(l, r) { return this._truthy(l) ? r : l }
  _luaOr(l, r) { return this._truthy(l) ? l : r }

  _parseLogicalOr() {
    let l = this._parseLogicalAnd()
    while (true) {
      const op = this._peek()
      if (op === '||' || op === 'or') { this._consume(); l = this._luaOr(l, this._parseLogicalAnd()) }
      else break
    }
    return l
  }
  _parseLogicalAnd() {
    let l = this._parseRelational()
    while (true) {
      const op = this._peek()
      if (op === '&&' || op === 'and') { this._consume(); l = this._luaAnd(l, this._parseRelational()) }
      else break
    }
    return l
  }
  _parseRelational() {
    let l = this._parseBitwiseOr()
    while (true) {
      if (this._match('==')) l = l === this._parseBitwiseOr()
      else if (this._match('!=')) l = l !== this._parseBitwiseOr()
      else if (this._match('~=')) l = l !== this._parseBitwiseOr()
      else if (this._match('<=')) l = l <= this._parseBitwiseOr()
      else if (this._match('>=')) l = l >= this._parseBitwiseOr()
      else if (this._peek() === '<' && this._peek(1) !== '<') { this._consume(); l = l < this._parseBitwiseOr() }
      else if (this._peek() === '>' && this._peek(1) !== '>') { this._consume(); l = l > this._parseBitwiseOr() }
      else break
    }
    return l
  }
  _parseBitwiseOr() {
    let l = this._parseBitwiseXor()
    while (this._peek() === '|' && this._peek(1) !== '|') { this._consume(); l = l | this._parseBitwiseXor() }
    return l
  }
  _parseBitwiseXor() {
    let l = this._parseBitwiseAnd()
    while (this._peek() === '^') { this._consume(); l = l ^ this._parseBitwiseAnd() }
    return l
  }
  _parseBitwiseAnd() {
    let l = this._parseShift()
    while (this._peek() === '&' && this._peek(1) !== '&') { this._consume(); l = l & this._parseShift() }
    return l
  }
  _parseShift() {
    let l = this._parseAdditive()
    while (true) {
      if (this._match('<<<')) l = l << this._parseAdditive()
      else if (this._match('>>>')) l = (l >>> 0) >>> this._parseAdditive()
      else if (this._match('<<')) l = l << this._parseAdditive()
      else if (this._match('>>')) l = l >> this._parseAdditive()
      else break
    }
    return l
  }
  _parseAdditive() {
    let l = this._parseMultiplicative()
    while (true) {
      if (this._peek() === '+' && this.pos > 0) { this._consume(); l = l + this._parseMultiplicative() }
      else if (this._peek() === '-' && this.pos > 0) { this._consume(); l = l - this._parseMultiplicative() }
      else break
    }
    return l
  }
  _parseMultiplicative() {
    let l = this._parseUnary()
    while (true) {
      if (this._peek() === '*' && this._peek(1) !== '*') { this._consume(); l = l * this._parseUnary() }
      else if (this._match('//')) l = Math.trunc(l / this._parseUnary())
      else if (this._peek() === '/') { this._consume(); l = l / this._parseUnary() }
      else if (this._peek() === '%') { this._consume(); l = l % this._parseUnary() }
      else break
    }
    return l
  }
  _parseUnary() {
    if (this._match('!')) return !this._parseUnary()
    if (this._match('~')) return ~this._parseUnary()
    if (this._match('-')) return -this._parseUnary()
    if (this._match('+')) return +this._parseUnary()
    return this._parsePrimary()
  }
  _parsePrimary() {
    if (this._match('(')) { const v = this._parseLogicalOr(); this._expect(')'); return v }
    const t = this._peek()
    if (t === null) throw new Error('意外的表达式结束')
    if (t === '__EMPTY_STRING__') { this._consume(); return '' }
    if (t === '__NULL__') { this._consume(); return null }
    if (t === '__UNDEFINED__') { this._consume(); return undefined }
    if (t.startsWith('"') || t.startsWith("'")) { this._consume(); return t.slice(1, -1) }
    if (/^-?\d+(\.\d+)?$/.test(t)) { this._consume(); return parseFloat(t) }
    if (t === 'true') { this._consume(); return true }
    if (t === 'false') { this._consume(); return false }
    if (t === 'null') { this._consume(); return null }
    if (t === 'undefined') { this._consume(); return undefined }
    this._consume()
    if (t === 'NaN') return NaN
    if (t === 'Infinity') return Infinity
    const n = parseFloat(t)
    return isNaN(n) ? t : n
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2.  PipeEvaluator  — 管道表达式求值器
// ═══════════════════════════════════════════════════════════════════════════

export class PipeEvaluator {
  constructor() {
    /** @type {Map<string, string>} */
    this.templateVars = new Map()
  }

  /** @param {unknown} v */
  _parseVal(v) {
    if (typeof v !== 'string') return v
    if (/^-?\d+(\.\d+)?$/.test(v)) { const n = parseFloat(v); if (!isNaN(n)) return n }
    if (v.toLowerCase() === 'true') return true
    if (v.toLowerCase() === 'false') return false
    if (v.toLowerCase() === 'null') return null
    return v
  }

  /** @param {string} s */
  _rmQuotes(s) {
    s = String(s)
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
    return s
  }

  /** @param {string} s */
  _replTplVars(s) {
    return s.replace(/\$\{([^}]+)\}/g, (m, name) => {
      const v = this.templateVars.get(name)
      return v !== undefined ? String(v) : m
    })
  }

  /**
   * @param {string} arg
   * @param {unknown[]} params
   */
  _replParams(arg, params) {
    let r = arg
    for (let i = 0; i < params.length; i++) {
      let pv = params[i]
      if (typeof pv === 'string' && ((pv.startsWith('"') && pv.endsWith('"')) || (pv.startsWith("'") && pv.endsWith("'")))) {
        pv = pv.slice(1, -1)
      }
      const sub = pv === '' ? '__EMPTY_STRING__' : pv === null ? '__NULL__' : pv === undefined ? '__UNDEFINED__' : String(pv)
      r = r.replace(new RegExp('\\$' + (i + 1), 'g'), sub)
    }
    return this._replTplVars(r)
  }

  /**
   * @param {string} fmt
   * @param {unknown[]} params
   */
  _strFormat(fmt, params) {
    let pi = 0
    return fmt.replace(/%(-)?(\+)?( )?(0)?(\d+)?(?:\.(\d+))?([sdfoxXeEubBgGi])/g, (_, la, ps, sp, zp, wS, prS, type) => {
      if (pi >= params.length) return _
      const raw = params[pi++]
      const width = wS ? parseInt(wS) : 0
      const prec = prS !== undefined ? parseInt(prS) : (['f','e','E','g','G'].includes(type) ? 6 : 0)
      const num = Number(raw)
      let fmt2 = ''
      switch (type) {
        case 's': fmt2 = String(raw ?? ''); if (prec > 0) fmt2 = fmt2.slice(0, prec); break
        case 'd': case 'i': fmt2 = Math.trunc(num).toString(); break
        case 'f': fmt2 = num.toFixed(prec); break
        case 'e': fmt2 = num.toExponential(prec); break
        case 'E': fmt2 = num.toExponential(prec).replace('e','E'); break
        case 'g': case 'G':
          fmt2 = (Math.abs(num) >= 1e-4 && Math.abs(num) < 1e4) ? num.toFixed(prec) : num.toExponential(prec)
          if (type === 'G') fmt2 = fmt2.replace('e','E')
          break
        case 'x': fmt2 = Math.round(num).toString(16); break
        case 'X': fmt2 = Math.round(num).toString(16).toUpperCase(); break
        case 'o': fmt2 = Math.round(num).toString(8); break
        case 'b': case 'B': fmt2 = Math.round(num).toString(2); break
        case 'u': fmt2 = Math.abs(Math.trunc(num)).toString(); break
        default: fmt2 = String(raw ?? '')
      }
      if (ps && !isNaN(num) && type !== 's') { if (num > 0) fmt2 = '+' + fmt2 }
      else if (sp && !isNaN(num) && !ps && type !== 's') { if (num >= 0) fmt2 = ' ' + fmt2 }
      if (fmt2.length < width) {
        const pad = width - fmt2.length
        if (zp && !la && type !== 's') {
          if (/^[+\- ]/.test(fmt2)) fmt2 = fmt2[0] + '0'.repeat(pad) + fmt2.slice(1)
          else fmt2 = '0'.repeat(pad) + fmt2
        } else if (la) fmt2 = fmt2 + ' '.repeat(pad)
        else fmt2 = ' '.repeat(pad) + fmt2
      }
      return fmt2
    })
  }

  /**
   * @param {string} s
   * @param {number} start
   * @param {number} end
   */
  _strSub(s, start, end) {
    const len = s.length
    const a = start < 0 ? len + start + 1 : start
    const b = end < 0 ? len + end + 1 : end
    const js = Math.max(0, a - 1)
    const je = Math.min(len, b)
    return js >= len || js > je ? '' : s.substring(js, je)
  }

  /** @param {string} pat */
  _luaPatToRegex(pat) {
    const magic = '^$()%.[]*+-?'
    const cls = { a:'[A-Za-z]', d:'[0-9]', s:'\\s', l:'[a-z]', u:'[A-Z]', w:'[A-Za-z0-9_]', x:'[0-9A-Fa-f]', c:'[\\x00-\\x1F]', z:'\\x00' }
    let r = ''; let i = 0
    while (i < pat.length) {
      const c = pat[i]
      if (c === '%' && i + 1 < pat.length) { const nx = pat[++i]; r += cls[nx] || nx; i++ }
      else if (c === '[') { const cb = pat.indexOf(']', i); if (cb === -1) { r += '\\['; i++ } else { r += '[' + pat.slice(i+1, cb) + ']'; i = cb + 1 } }
      else if (magic.includes(c)) { r += '\\' + c; i++ }
      else { r += c; i++ }
    }
    return new RegExp(r, 'g')
  }

  /**
   * 单阶段求值（可单独调用，供 UI 逐阶段追踪）
   * @param {{ fn: string, args: string[], raw: string }} stage
   * @param {unknown | unknown[]} params
   */
  _evalStage(stage, params) {
    const pArr = Array.isArray(params) ? params : [params]
    const args = stage.args.map(a => this._replParams(a, pArr))
    switch (stage.fn) {
      case 'expr':
        return new SafeExpressionParser(args[0]).parse()
      case 'string.format': {
        let fmt = args[0]
        if ((fmt.startsWith('"') && fmt.endsWith('"')) || (fmt.startsWith("'") && fmt.endsWith("'"))) fmt = fmt.slice(1, -1)
        return this._strFormat(fmt, args.slice(1))
      }
      case 'string.cmp':
        return this._rmQuotes(args[0]) === this._rmQuotes(args[1])
      case 'string.sub': {
        const s = this._rmQuotes(args[0])
        return this._strSub(s, parseInt(args[1], 10), parseInt(args[2], 10))
      }
      case 'string.gsub': {
        const s = this._rmQuotes(args[0])
        const rgx = this._luaPatToRegex(this._rmQuotes(args[1]))
        const rep = this._rmQuotes(args[2]).replace(/%(\d)/g, '$$$1')
        return s.replace(rgx, rep)
      }
      case 'string.upper':
        return this._rmQuotes(args[0]).toUpperCase()
      case 'string.lower':
        return this._rmQuotes(args[0]).toLowerCase()
      default:
        throw new Error(`未知函数: ${stage.fn}`)
    }
  }

  /**
   * 完整管道求值
   * @param {{ ok: boolean, inputs: unknown[], stages: Array<{fn:string,args:string[],raw:string}> }} parsed
   * @param {string[]} inputVals
   * @param {Map<string,string>} [tplVars]
   * @returns {{ success: true, result: unknown, intermediates: unknown[] } | { success: false, error: string, intermediates: [] }}
   */
  evaluate(parsed, inputVals, tplVars) {
    this.templateVars = tplVars || new Map()
    try {
      const inputs = inputVals.map((v, i) => {
        if (v === '' || v === undefined) throw new Error(`参数 $${i+1} 未提供`)
        return this._parseVal(v)
      })
      const intermediates = []
      let cur = inputs
      for (const stage of parsed.stages) {
        cur = this._evalStage(stage, cur)
        intermediates.push(cur)
      }
      return { success: true, result: cur, intermediates }
    } catch (e) {
      return { success: false, error: e.message, intermediates: [] }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3.  表达式解析器
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 解析管道表达式字符串
 * 语法：`$1;$2 |> fn($1) |> fn($1,$2)`
 * 要求：管道连接符两侧必须有空格（` |> `）
 *
 * @param {string} raw
 * @returns {{ ok: true, inputs: Array<{idx:number,placeholder:string,desc:string}>, stages: Array<{fn:string,args:string[],raw:string}> } | { ok: false, error: string }}
 */
export function parsePipeExpr(raw) {
  try {
    const firstPipe = raw.indexOf(' |> ')
    let inputPart, pipeStr
    if (firstPipe === -1) { inputPart = raw.trim(); pipeStr = '' }
    else { inputPart = raw.slice(0, firstPipe).trim(); pipeStr = raw.slice(firstPipe + 4).trim() }
    const inputTokens = inputPart.split(';').map(t => t.trim()).filter(Boolean)
    const inputs = inputTokens.map((t, i) => ({ idx: i, placeholder: t, desc: `参数 ${t}` }))
    const stageStrs = pipeStr ? pipeStr.split(' |> ').filter(Boolean) : []
    const stages = stageStrs.map(s => {
      s = s.trim()
      const m = s.match(/^([A-Za-z_][A-Za-z0-9_.]*)\((.*)\)$/s)
      if (!m) return { fn: 'expr', args: [s], raw: s }
      return { fn: m[1], args: splitArgs(m[2]), raw: s }
    })
    return { ok: true, inputs, stages }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * 按逗号分割函数参数（处理嵌套括号和引号）
 * @param {string} s
 * @returns {string[]}
 */
export function splitArgs(s) {
  const args = []; let cur = ''; let depth = 0; let inQ = false; let qc = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (!inQ && (c === '"' || c === "'")) { inQ = true; qc = c; cur += c; continue }
    if (inQ && c === qc && s[i-1] !== '\\') { inQ = false; qc = ''; cur += c; continue }
    if (inQ) { cur += c; continue }
    if (c === '(') { depth++; cur += c; continue }
    if (c === ')') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) args.push(cur.trim())
  return args
}

// ═══════════════════════════════════════════════════════════════════════════
// 4.  测试用例文本解析器
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 解析单行测试用例
 * 格式：`col1 col2 … expected`（空格/逗号/Tab 分隔，最后一列为预期输出）
 *
 * @param {string} line
 * @param {number} lineNum
 * @returns {{ id:string, inputs:(number|string)[], expectedOutput:string, actualOutput:null, executionStatus:'pending', lineNumber:number, createdAt:number }}
 */
export function parseTestCaseLine(line, lineNum) {
  const tokens = tokenizeLine(line, lineNum)
  if (tokens.length < 2) throw new Error(`至少需要 2 列（输入 + 预期输出），得到 ${tokens.length} 列`)
  const inputs = tokens.slice(0, -1).map(t => { const n = Number(t); return (isNaN(n) || t === '') ? t : n })
  return {
    id: Math.random().toString(36).slice(2),
    inputs,
    expectedOutput: tokens[tokens.length - 1],
    actualOutput: null,
    executionStatus: 'pending',
    lineNumber: lineNum,
    createdAt: Date.now(),
  }
}

/**
 * 按分隔符分词（支持引号包裹、转义字符）
 * @param {string} line
 * @param {number} lineNum
 * @returns {string[]}
 */
export function tokenizeLine(line, lineNum) {
  const tokens = []; let cur = ''; let inQ = false; let qc = ''; let i = 0
  while (i < line.length) {
    const c = line[i]
    if (!inQ && (c === '"' || c === "'")) { inQ = true; qc = c; i++; continue }
    if (inQ && c === qc) {
      if (i + 1 < line.length && line[i+1] === qc) { cur += qc; i += 2; continue }
      inQ = false; qc = ''; i++; continue
    }
    if (inQ && c === '\\' && i + 1 < line.length) {
      const nx = line[i+1]
      const esc = { n:'\n', t:'\t', r:'\r', '\\':'\\', '"':'"', "'":"'", '0':'\0' }
      cur += esc[nx] ?? nx; i += 2; continue
    }
    if (!inQ && (c === ' ' || c === ',' || c === '\t')) {
      if (cur.trim()) tokens.push(cur.trim())
      cur = ''; i++; continue
    }
    cur += c; i++
  }
  if (cur.trim()) tokens.push(cur.trim())
  if (inQ) throw new Error(`第 ${lineNum} 行引号未闭合`)
  return tokens
}

/**
 * 解析整段测试用例文本
 * 跳过空行和 `#` 开头的注释行
 *
 * @param {string} text
 * @returns {{ cases: ReturnType<typeof parseTestCaseLine>[], errors: Array<{line:number,message:string,context:string}> }}
 */
export function parseTestCaseText(text) {
  const lines = text.split('\n')
  const cases = []
  const errors = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) continue
    try { cases.push(parseTestCaseLine(line, i + 1)) }
    catch (e) { errors.push({ line: i + 1, message: e.message, context: line }) }
  }
  return { cases, errors }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5.  辅助纯函数
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 格式化求值结果为显示字符串
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
 * 判断求值结果类型（用于 type-chip 渲染）
 * @param {unknown} v
 * @returns {'number' | 'string' | 'boolean' | 'null' | 'other'}
 */
export function inferType(v) {
  if (v === null) return 'null'
  const t = typeof v
  if (t === 'number') return 'number'
  if (t === 'string') return 'string'
  if (t === 'boolean') return 'boolean'
  return 'other'
}

/**
 * 批量执行用例，返回带 actualOutput 和 executionStatus 的结果数组 + 摘要统计
 * @param {ReturnType<typeof parseTestCaseText>['cases']} cases
 * @param {ReturnType<typeof parsePipeExpr>} parsedExpr
 * @param {Map<string,string>} templateVars
 * @returns {{ results: typeof cases, stats: { total:number, matched:number, mismatched:number, errored:number } }}
 */
export function executeBatch(cases, parsedExpr, templateVars) {
  const ev = new PipeEvaluator()
  const results = cases.map(tc => {
    const r = ev.evaluate(parsedExpr, tc.inputs.map(String), templateVars)
    const actual = r.success ? fmtVal(r.result) : `错误: ${r.error}`
    const status = !r.success ? 'error' : actual === tc.expectedOutput ? 'match' : 'mismatch'
    return { ...tc, actualOutput: actual, executionStatus: status }
  })
  const total = results.length
  const matched = results.filter(r => r.executionStatus === 'match').length
  const errored = results.filter(r => r.executionStatus === 'error').length
  return { results, stats: { total, matched, mismatched: total - matched - errored, errored } }
}
