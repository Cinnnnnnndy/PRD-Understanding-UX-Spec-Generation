/**
 * 管道表达式批量评估器 · 核心业务逻辑（纯函数）
 *
 * 所有函数无副作用，不依赖 DOM / localStorage / fetch，可独立单元测试。
 * 包含：SafeExpressionParser · PipeEvaluator · parsePipeExpr · splitArgs
 *        parseTestCaseText · tokenizeLine
 *
 * 修复记录（相对原始 Demo）：
 *   [R3/E5] _luaPatToRegex：magic 集移除 `+` `*`，使 Lua 量词 `%d+` 正常工作
 */

// ── SafeExpressionParser ──────────────────────────────────────────────────────

export class SafeExpressionParser {
  /** @param {string} input */
  constructor(input) {
    this.input  = input;
    this.tokens = [];
    this.pos    = 0;
    this._tokenize();
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
    ];
    let rem = this.input;
    while (rem.length > 0) {
      let matched = false;
      for (const p of patterns) {
        const m = rem.match(p.re);
        if (m && m.index === 0) {
          if (!p.skip) {
            let tok = p.sub || m[0];
            if (tok.startsWith('//')) tok = tok.replace(/[ \t]+$/, '');
            this.tokens.push(tok);
          }
          rem = rem.slice(m[0].length);
          matched = true;
          break;
        }
      }
      if (!matched) rem = rem.slice(1);
    }
  }

  parse()         { return this._parseLogicalOr(); }
  _peek(off = 0)  { return this.tokens[this.pos + off] ?? null; }
  _consume()      { return this.tokens[this.pos++] ?? ''; }
  _match(t)       { if (this._peek() === t) { this._consume(); return true; } return false; }
  _expect(t)      { if (this._peek() !== t) throw new Error(`期望 '${t}'，但得到 '${this._peek()}'`); this._consume(); }
  _truthy(v)      { return v !== null && v !== undefined && v !== false; }
  _luaAnd(l, r)   { return this._truthy(l) ? r : l; }
  _luaOr(l, r)    { return this._truthy(l) ? l : r; }

  _parseLogicalOr() {
    let l = this._parseLogicalAnd();
    while (true) {
      const op = this._peek();
      if (op === '||' || op === 'or') { this._consume(); l = this._luaOr(l, this._parseLogicalAnd()); }
      else break;
    }
    return l;
  }

  _parseLogicalAnd() {
    let l = this._parseRelational();
    while (true) {
      const op = this._peek();
      if (op === '&&' || op === 'and') { this._consume(); l = this._luaAnd(l, this._parseRelational()); }
      else break;
    }
    return l;
  }

  _parseRelational() {
    let l = this._parseBitwiseOr();
    while (true) {
      if (this._match('=='))  l = l === this._parseBitwiseOr();
      else if (this._match('!='))  l = l !== this._parseBitwiseOr();
      else if (this._match('~='))  l = l !== this._parseBitwiseOr();
      else if (this._match('<='))  l = l <= this._parseBitwiseOr();
      else if (this._match('>='))  l = l >= this._parseBitwiseOr();
      else if (this._peek() === '<' && this._peek(1) !== '<') { this._consume(); l = l < this._parseBitwiseOr(); }
      else if (this._peek() === '>' && this._peek(1) !== '>') { this._consume(); l = l > this._parseBitwiseOr(); }
      else break;
    }
    return l;
  }

  _parseBitwiseOr()  { let l = this._parseBitwiseXor(); while (this._peek() === '|' && this._peek(1) !== '|') { this._consume(); l = l | this._parseBitwiseXor(); } return l; }
  _parseBitwiseXor() { let l = this._parseBitwiseAnd(); while (this._peek() === '^') { this._consume(); l = l ^ this._parseBitwiseAnd(); } return l; }
  _parseBitwiseAnd() { let l = this._parseShift(); while (this._peek() === '&' && this._peek(1) !== '&') { this._consume(); l = l & this._parseShift(); } return l; }

  _parseShift() {
    let l = this._parseAdditive();
    while (true) {
      if (this._match('<<<'))      l = l << this._parseAdditive();
      else if (this._match('>>>')) l = (l >>> 0) >>> this._parseAdditive();
      else if (this._match('<<'))  l = l << this._parseAdditive();
      else if (this._match('>>'))  l = l >> this._parseAdditive();
      else break;
    }
    return l;
  }

  _parseAdditive() {
    let l = this._parseMultiplicative();
    while (true) {
      if (this._peek() === '+' && this.pos > 0) { this._consume(); l = l + this._parseMultiplicative(); }
      else if (this._peek() === '-' && this.pos > 0) { this._consume(); l = l - this._parseMultiplicative(); }
      else break;
    }
    return l;
  }

  _parseMultiplicative() {
    let l = this._parseUnary();
    while (true) {
      if (this._peek() === '*' && this._peek(1) !== '*') { this._consume(); l = l * this._parseUnary(); }
      else if (this._match('//')) l = Math.trunc(l / this._parseUnary());
      else if (this._peek() === '/') { this._consume(); l = l / this._parseUnary(); }
      else if (this._peek() === '%') { this._consume(); l = l % this._parseUnary(); }
      else break;
    }
    return l;
  }

  _parseUnary() {
    if (this._match('!')) return !this._parseUnary();
    if (this._match('~')) return ~this._parseUnary();
    if (this._match('-')) return -this._parseUnary();
    if (this._match('+')) return +this._parseUnary();
    return this._parsePrimary();
  }

  _parsePrimary() {
    if (this._match('(')) { const v = this._parseLogicalOr(); this._expect(')'); return v; }
    const t = this._peek();
    if (t === null) throw new Error('意外的表达式结束');
    if (t === '__EMPTY_STRING__') { this._consume(); return ''; }
    if (t === '__NULL__')         { this._consume(); return null; }
    if (t === '__UNDEFINED__')    { this._consume(); return undefined; }
    if (t.startsWith('"') || t.startsWith("'")) { this._consume(); return t.slice(1, -1); }
    if (/^-?\d+(\.\d+)?$/.test(t)) { this._consume(); return parseFloat(t); }
    if (t === 'true')      { this._consume(); return true; }
    if (t === 'false')     { this._consume(); return false; }
    if (t === 'null')      { this._consume(); return null; }
    if (t === 'undefined') { this._consume(); return undefined; }
    this._consume();
    if (t === 'NaN')      return NaN;
    if (t === 'Infinity') return Infinity;
    const n = parseFloat(t);
    return isNaN(n) ? t : n;
  }
}

// ── PipeEvaluator ─────────────────────────────────────────────────────────────

export class PipeEvaluator {
  constructor() {
    /** @type {Map<string,string>} */
    this.templateVars = new Map();
  }

  /** @param {*} v @returns {*} */
  _parseVal(v) {
    if (typeof v !== 'string') return v;
    if (/^-?\d+(\.\d+)?$/.test(v)) { const n = parseFloat(v); if (!isNaN(n)) return n; }
    if (v.toLowerCase() === 'true')  return true;
    if (v.toLowerCase() === 'false') return false;
    if (v.toLowerCase() === 'null')  return null;
    return v;
  }

  _rmQuotes(s) {
    s = String(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    return s;
  }

  _replTplVars(s) {
    return s.replace(/\$\{([^}]+)\}/g, (m, name) => {
      const v = this.templateVars.get(name);
      return v !== undefined ? String(v) : m;
    });
  }

  _replParams(arg, params) {
    let r = arg;
    // 按长度降序替换，避免 $1 先于 $10 替换导致的歧义（G3 修复）
    const indices = Array.from({ length: params.length }, (_, i) => i)
      .sort((a, b) => b - a);
    for (const i of indices) {
      let pv = params[i];
      if (typeof pv === 'string' && ((pv.startsWith('"') && pv.endsWith('"')) || (pv.startsWith("'") && pv.endsWith("'")))) pv = pv.slice(1, -1);
      const sub = pv === '' ? '__EMPTY_STRING__'
                : pv === null ? '__NULL__'
                : pv === undefined ? '__UNDEFINED__'
                : String(pv);
      r = r.replace(new RegExp('\\$' + (i + 1), 'g'), sub);
    }
    return this._replTplVars(r);
  }

  _strFormat(fmt, params) {
    let pi = 0;
    return fmt.replace(/%(-)?(\+)?( )?(0)?(\d+)?(?:\.(\d+))?([sdfoxXeEubBgGi])/g, (_, la, ps, sp, zp, wS, prS, type) => {
      if (pi >= params.length) return _;
      const raw   = params[pi++];
      const width = wS  ? parseInt(wS)  : 0;
      const prec  = prS !== undefined ? parseInt(prS) : (['f','e','E','g','G'].includes(type) ? 6 : 0);
      const num   = Number(raw);
      let out = '';
      switch (type) {
        case 's': out = String(raw ?? ''); if (prec > 0) out = out.slice(0, prec); break;
        case 'd': case 'i': out = Math.trunc(num).toString(); break;
        case 'f': out = num.toFixed(prec); break;
        case 'e': out = num.toExponential(prec); break;
        case 'E': out = num.toExponential(prec).replace('e', 'E'); break;
        case 'g': case 'G':
          out = (Math.abs(num) >= 1e-4 && Math.abs(num) < 1e4) ? num.toFixed(prec) : num.toExponential(prec);
          if (type === 'G') out = out.replace('e', 'E');
          break;
        case 'x': out = Math.round(num).toString(16); break;
        case 'X': out = Math.round(num).toString(16).toUpperCase(); break;
        case 'o': out = Math.round(num).toString(8); break;
        case 'b': case 'B': out = Math.round(num).toString(2); break;
        case 'u': out = Math.abs(Math.trunc(num)).toString(); break;
        default:  out = String(raw ?? '');
      }
      if (ps && !isNaN(num) && type !== 's') { if (num > 0) out = '+' + out; }
      else if (sp && !isNaN(num) && !ps && type !== 's') { if (num >= 0) out = ' ' + out; }
      if (out.length < width) {
        const pad = width - out.length;
        if (zp && !la && type !== 's') {
          if (/^[+\- ]/.test(out)) out = out[0] + '0'.repeat(pad) + out.slice(1);
          else out = '0'.repeat(pad) + out;
        } else if (la) out = out + ' '.repeat(pad);
        else out = ' '.repeat(pad) + out;
      }
      return out;
    });
  }

  _strSub(s, start, end) {
    const len = s.length;
    const a   = start < 0 ? len + start + 1 : start;
    const b   = end   < 0 ? len + end   + 1 : end;
    const js  = Math.max(0, a - 1);
    const je  = Math.min(len, b);
    return (js >= len || js > je) ? '' : s.substring(js, je);
  }

  /**
   * Lua pattern → JS RegExp
   *
   * [R3/E5 Bug 修复] 原始 Demo 的 magic 集包含 `+`，使 `%d+` 中的 `+` 被转义为 `\+`，
   * 量词失效。修复：magic 集只保留 Lua 规定的魔法字符，`+`/`*`/`?` 不在其中，
   * 保持 regex 量词语义。
   *
   * Lua magic chars: ^ $ ( ) % . [ ] * + - ?
   * 其中 + * ? 是量词，直接放入 regex 输出；- 在 [] 内是范围，在外不是 magic。
   * 为安全起见，此处仅转义明确的结构字符 ^ $ ( ) % . [ ]
   */
  _luaPatToRegex(pat) {
    const structMagic = '^$()%.[]';  // 仅转义结构字符；+*?- 保持量词语义
    const cls = {
      a: '[A-Za-z]',   d: '[0-9]',     s: '\\s',       l: '[a-z]',
      u: '[A-Z]',      w: '[A-Za-z0-9_]', x: '[0-9A-Fa-f]',
      c: '[\\x00-\\x1F]', z: '\\x00',
    };
    let r = '';
    let i = 0;
    while (i < pat.length) {
      const c = pat[i];
      if (c === '%' && i + 1 < pat.length) {
        const nx = pat[++i];
        r += cls[nx] || nx;
        i++;
      } else if (c === '[') {
        const cb = pat.indexOf(']', i);
        if (cb === -1) { r += '\\['; i++; }
        else { r += '[' + pat.slice(i + 1, cb) + ']'; i = cb + 1; }
      } else if (structMagic.includes(c)) {
        r += '\\' + c;
        i++;
      } else {
        r += c;
        i++;
      }
    }
    return new RegExp(r, 'g');
  }

  _evalStage(stage, params) {
    const pArr = Array.isArray(params) ? params : [params];
    const args = stage.args.map(a => this._replParams(a, pArr));
    switch (stage.fn) {
      case 'expr':
        return new SafeExpressionParser(args[0]).parse();
      case 'string.format': {
        let fmt = args[0];
        if ((fmt.startsWith('"') && fmt.endsWith('"')) || (fmt.startsWith("'") && fmt.endsWith("'"))) fmt = fmt.slice(1, -1);
        return this._strFormat(fmt, args.slice(1));
      }
      case 'string.cmp':
        return this._rmQuotes(args[0]) === this._rmQuotes(args[1]);
      case 'string.sub':
        return this._strSub(this._rmQuotes(args[0]), parseInt(args[1], 10), parseInt(args[2], 10));
      case 'string.gsub': {
        const s   = this._rmQuotes(args[0]);
        const rgx = this._luaPatToRegex(this._rmQuotes(args[1]));
        const rep = this._rmQuotes(args[2]).replace(/%(\d)/g, '$$$1');
        return s.replace(rgx, rep);
      }
      case 'string.upper':
        return this._rmQuotes(args[0]).toUpperCase();
      case 'string.lower':
        return this._rmQuotes(args[0]).toLowerCase();
      default:
        throw new Error(`未知函数: ${stage.fn}`);
    }
  }

  /**
   * @param {import('./pipeEvalLogic').ParsedExpr} parsed
   * @param {string[]} inputVals
   * @param {Map<string,string>} [tplVars]
   * @returns {{ success: true, result: *, intermediates: *[] }
   *          | { success: false, error: string, intermediates: [] }}
   */
  evaluate(parsed, inputVals, tplVars) {
    this.templateVars = tplVars || new Map();
    try {
      const inputs = inputVals.map((v, i) => {
        if (v === '' || v === undefined) throw new Error(`参数 $${i + 1} 未提供`);
        return this._parseVal(v);
      });
      const intermediates = [];
      let cur = inputs;
      for (const stage of parsed.stages) {
        cur = this._evalStage(stage, cur);
        intermediates.push(cur);
      }
      return { success: true, result: cur, intermediates };
    } catch (e) {
      return { success: false, error: e.message, intermediates: [] };
    }
  }
}

// ── parsePipeExpr ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ idx: number, placeholder: string, desc: string }} InputDef
 * @typedef {{ fn: string, args: string[], raw: string }} StageDef
 * @typedef {{ ok: true, inputs: InputDef[], stages: StageDef[] }
 *          | { ok: false, error: string }} ParsedExpr
 */

/**
 * 解析管道表达式原始文本为结构化表示
 * @param {string} raw
 * @returns {ParsedExpr}
 */
export function parsePipeExpr(raw) {
  try {
    const firstPipe   = raw.indexOf(' |> ');
    let inputPart, pipeStr;
    if (firstPipe === -1) {
      inputPart = raw.trim();
      pipeStr   = '';
    } else {
      inputPart = raw.slice(0, firstPipe).trim();
      pipeStr   = raw.slice(firstPipe + 4).trim();
    }
    const inputTokens = inputPart.split(';').map(t => t.trim()).filter(Boolean);
    const inputs      = inputTokens.map((t, i) => ({ idx: i, placeholder: t, desc: `参数 ${t}` }));
    const stageStrs   = pipeStr ? pipeStr.split(' |> ').filter(Boolean) : [];
    const stages      = stageStrs.map(s => {
      s = s.trim();
      const m = s.match(/^([A-Za-z_][A-Za-z0-9_.]*)\((.*)\)$/s);
      if (!m) return { fn: 'expr', args: [s], raw: s };
      return { fn: m[1], args: splitArgs(m[2]), raw: s };
    });
    return { ok: true, inputs, stages };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * @param {string} s
 * @returns {string[]}
 */
export function splitArgs(s) {
  const args = []; let cur = ''; let depth = 0; let inQ = false; let qc = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inQ && (c === '"' || c === "'")) { inQ = true; qc = c; cur += c; continue; }
    if (inQ && c === qc && s[i - 1] !== '\\') { inQ = false; qc = ''; cur += c; continue; }
    if (inQ) { cur += c; continue; }
    if (c === '(') { depth++; cur += c; continue; }
    if (c === ')') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

// ── parseTestCaseText / tokenizeLine ─────────────────────────────────────────

/**
 * @typedef {{ id: string, inputs: (string|number)[], expectedOutput: string,
 *             actualOutput: string|null, executionStatus: 'pending'|'success'|'error',
 *             matchStatus: 'match'|'mismatch'|null, lineNumber: number }} TestCase
 * @typedef {{ line: number, message: string, context: string }} ParseError
 */

/**
 * @param {string} text
 * @returns {{ cases: TestCase[], errors: ParseError[] }}
 */
export function parseTestCaseText(text) {
  const lines = text.split('\n');
  const cases = [], errors = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    try {
      cases.push(_parseTestCaseLine(line, i + 1));
    } catch (e) {
      errors.push({ line: i + 1, message: e.message, context: line });
    }
  }
  return { cases, errors };
}

/** @param {string} line @param {number} lineNum @returns {TestCase} */
function _parseTestCaseLine(line, lineNum) {
  const tokens = tokenizeLine(line, lineNum);
  if (tokens.length < 2) throw new Error(`至少需要 2 列（输入 + 预期输出），得到 ${tokens.length} 列`);
  const inputs = tokens.slice(0, -1).map(t => {
    const n = Number(t);
    return (isNaN(n) || t === '') ? t : n;
  });
  return {
    id:              Math.random().toString(36).slice(2),
    inputs,
    expectedOutput:  tokens[tokens.length - 1],
    actualOutput:    null,
    executionStatus: 'pending',
    matchStatus:     null,
    lineNumber:      lineNum,
  };
}

/**
 * 单行 CSV 分词（支持引号包裹、转义序列）
 * @param {string} line
 * @param {number} lineNum
 * @returns {string[]}
 */
export function tokenizeLine(line, lineNum) {
  const tokens = []; let cur = ''; let inQ = false; let qc = ''; let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (!inQ && (c === '"' || c === "'")) { inQ = true; qc = c; i++; continue; }
    if (inQ && c === qc) {
      if (i + 1 < line.length && line[i + 1] === qc) { cur += qc; i += 2; continue; }
      inQ = false; qc = ''; i++; continue;
    }
    if (inQ && c === '\\' && i + 1 < line.length) {
      const nx  = line[i + 1];
      const esc = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", '0': '\0' };
      cur += esc[nx] ?? nx;
      i += 2;
      continue;
    }
    if (!inQ && (c === ' ' || c === ',' || c === '\t')) {
      if (cur.trim()) tokens.push(cur.trim());
      cur = ''; i++; continue;
    }
    cur += c; i++;
  }
  if (cur.trim()) tokens.push(cur.trim());
  if (inQ) throw new Error(`第 ${lineNum} 行引号未闭合`);
  return tokens;
}
