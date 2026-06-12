/**
 * PipeBatchEvaluator — 管道表达式批量评估器
 * 工程级 Web Component（Custom Element + Shadow DOM）
 *
 * 用法：
 *   <pipe-batch-evaluator></pipe-batch-evaluator>
 *
 * 对外事件（CustomEvent）：
 *   pipe-result-ready  { detail: { expr, result, inputs } }  — 单次调试求值完成
 *   pipe-batch-done    { detail: { stats, results } }        — 批量执行完成
 *
 * 接受 postMessage（宿主 ↔ 工具通信）：
 *   { type: 'TEMPLATE_VARS_UPDATE', vars: Record<string, string> }
 *
 * 可访问性修复（对照 accessibility-audit.md）：
 *   A2: inline-msg 加 aria-live / role="alert"
 *   A3: op-head 改为 <button aria-expanded aria-controls>
 *   A4: tpl-head 改为 <button aria-expanded aria-controls>
 *   A5: badge-select 加 aria-label
 *   A6: input-field 加 aria-label + aria-describedby
 *   A7: tc-load-err 加 role="alert"
 *   A8: pass-badge 加 aria-label
 *   A9: theme-seg 按钮加 aria-pressed
 *   A10: 虚拟表格加 ARIA 表格语义
 *   A11: op-chip hint 提升颜色对比度
 */

import {
  parsePipeExpr,
  parseTestCaseText,
  PipeEvaluator,
  fmtVal,
  inferType,
  executeBatch,
} from '../../utils/pipeEvalLogic.js'
import { validateExpr, validateAllInputs } from '../../utils/validators.js'
import { fmtVal as fmtValF, fmtHistoryTime, fmtPassRate, inferValueType, typeChipClass } from '../../utils/formatters.js'
import {
  PARAM_BADGE_TYPES, BADGE_LABELS, EXEC_STATUS, RESULT_FILTER,
  FILTER_LABELS, APP_MODE, STORAGE_KEYS, HISTORY_MAX,
  VIRTUAL_SCROLL, DEFAULT_EXPR, BUILTIN_EXAMPLES, MSG_TYPES,
} from '../../constants/enums.js'

const { ROW_HEIGHT, BUFFER } = VIRTUAL_SCROLL

const TEMPLATE = /* html */`
<link rel="stylesheet" href="../../design-system/pipe-evaluator.css">
<div class="app-shell">

  <div class="topbar" role="banner">
    <span class="tb-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" width="18" height="18">
        <path d="M2 4h12M2 8h8M2 12h5"/><circle cx="13" cy="11" r="2"/>
      </svg>
    </span>
    <span class="tb-title">管道表达式批量评估器</span>
    <span class="tb-beta" aria-label="Beta 版本">Beta</span>
    <span class="tb-spacer"></span>
    <div class="theme-seg" role="group" aria-label="主题切换">
      <button data-theme-val="dark"  aria-pressed="true"  onclick="this.getRootNode().host._setTheme('dark')">暗色</button>
      <button data-theme-val="light" aria-pressed="false" onclick="this.getRootNode().host._setTheme('light')">亮色</button>
      <button data-theme-val="glass" aria-pressed="false" onclick="this.getRootNode().host._setTheme('glass')">玻璃</button>
    </div>
  </div>

  <div class="main-grid">
    <div class="main-col" id="col-left">

      <!-- ① 表达式 -->
      <div class="panel" role="region" aria-label="表达式编辑">
        <div class="panel-title">
          <span class="num-chip" aria-hidden="true">1</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 2v12M12 2v12M2 5h2M2 11h2M12 5h2M12 11h2"/></svg>
          管道表达式
        </div>
        <textarea id="expr-input" class="expr-textarea" spellcheck="false"
          aria-label="管道表达式输入" aria-describedby="expr-msg"
          aria-multiline="true"></textarea>
        <div id="expr-msg" class="inline-msg" role="status" aria-live="polite" aria-atomic="true"></div>

        <!-- 操作符 Chip 面板 -->
        <div class="op-panel" id="op-panel">
          <button class="op-head" id="op-toggle"
            aria-expanded="true" aria-controls="op-body"
            onclick="this.getRootNode().host._toggleOpPanel()">
            <span class="caret" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="12" height="12"><path d="M6 4l4 4-4 4"/></svg>
            </span>
            操作符面板 · 悬停看签名说明 · 点击插入到光标处
          </button>
          <div class="op-body" id="op-body" role="group" aria-label="操作符列表">
            <div class="op-group">
              <span class="op-dot" style="background:var(--primary);" aria-hidden="true"></span>
              <span class="op-gname">输入</span>
              <div class="op-chips">
                <button class="op-chip" title="$N · 引用第 N 个输入参数；首段用 ; 分隔多个输入"
                  onclick="this.getRootNode().host._insertOp('$1')">$1 <span class="hint">· 引用第 1 个参数</span></button>
                <button class="op-chip" title="; · 追加声明一个输入参数"
                  onclick="this.getRootNode().host._insertOp(';$2')">;$2</button>
                <button class="op-chip" title="|> · 管道连接符，两侧必须有空格"
                  onclick="this.getRootNode().host._insertOp(' |> ')">|&gt;</button>
              </div>
            </div>
            <div class="op-group">
              <span class="op-dot" style="background:var(--success);" aria-hidden="true"></span>
              <span class="op-gname">字符串</span>
              <div class="op-chips">
                <button class="op-chip" title="string.format(fmt, …) · Lua 风格格式化 %d %f %s %x"
                  onclick="this.getRootNode().host._insertOp('string.format(&quot;%.2f&quot;, $1)')">string.format</button>
                <button class="op-chip" title="string.upper(s) · 转大写"
                  onclick="this.getRootNode().host._insertOp('string.upper($1)')">string.upper</button>
                <button class="op-chip" title="string.lower(s) · 转小写"
                  onclick="this.getRootNode().host._insertOp('string.lower($1)')">string.lower</button>
                <button class="op-chip" title="string.sub(s, start, end) · 1 基截取，支持负索引"
                  onclick="this.getRootNode().host._insertOp('string.sub($1, 1, 3)')">string.sub</button>
                <button class="op-chip" title="string.gsub(s, pat, repl) · Lua pattern 全局替换"
                  onclick="this.getRootNode().host._insertOp('string.gsub($1, &quot;a&quot;, &quot;b&quot;)')">string.gsub</button>
                <button class="op-chip" title="string.cmp(a, b) · 字符串相等比较，返回 true/false"
                  onclick="this.getRootNode().host._insertOp('string.cmp($1, &quot;expected&quot;)')">string.cmp</button>
              </div>
            </div>
            <div class="op-group">
              <span class="op-dot" style="background:var(--warning);" aria-hidden="true"></span>
              <span class="op-gname">自定义</span>
              <div class="op-chips">
                <button class="op-chip" title="expr(<JS表达式>) · 算术/逻辑/位运算；? : 为条件"
                  onclick="this.getRootNode().host._insertOp('expr($1 + $2)')">expr( … )</button>
              </div>
            </div>
          </div>
        </div>

        <div class="expr-actions">
          <span class="kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 应用</span>
          <button class="btn btn-secondary" onclick="this.getRootNode().host._resetExpr()" aria-label="重置为默认表达式">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3"/></svg>
            重置
          </button>
          <button class="btn btn-primary" id="apply-btn" onclick="this.getRootNode().host._applyExpr()" aria-label="应用表达式">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8.5l3 3 7-7"/></svg>
            应用表达式
          </button>
        </div>
      </div>

      <!-- 模式切换 -->
      <div class="mode-toggle" role="tablist" aria-label="工作模式">
        <button class="mode-btn active" id="btn-debug" role="tab" aria-selected="true"
          onclick="this.getRootNode().host._switchMode('debug')">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="9" r="4"/><path d="M8 5V2M5 3l1.5 2M11 3L9.5 5M2 9h2M12 9h2M4 13l1.5-1.5M12 13l-1.5-1.5"/></svg>
          调试模式
        </button>
        <button class="mode-btn" id="btn-testcase" role="tab" aria-selected="false"
          onclick="this.getRootNode().host._switchMode('testcase')">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 9h6M5 12h3"/></svg>
          用例模式
        </button>
      </div>

      <!-- 调试：输入参数 -->
      <div id="dbg-inputs" class="panel" role="region" aria-label="输入参数">
        <div class="panel-title">
          <span class="num-chip" aria-hidden="true">2</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2v8M5 7l3 3 3-3M3 13h10"/></svg>
          输入参数
        </div>
        <div id="inputs-container"></div>
      </div>

      <!-- 调试：模板变量 -->
      <div id="dbg-tpl" class="panel tpl-panel">
        <button class="tpl-head" id="tpl-toggle"
          aria-expanded="false" aria-controls="tpl-body"
          onclick="this.getRootNode().host._toggleTplPanel()">
          <span class="caret" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="13" height="13"><path d="M6 4l4 4-4 4"/></svg></span>
          <span class="panel-title" style="margin:0;">模板变量</span>
          <span class="pt-hint" style="margin-left:auto;">${VarName} 注入</span>
        </button>
        <div class="tpl-body" id="tpl-body" hidden>
          <div class="muted-note">为表达式中的 <code>${VarName}</code> 占位符提供值；亦可由宿主通过 postMessage 注入。</div>
          <div id="tpl-rows" role="list"></div>
          <div>
            <button class="btn btn-secondary" onclick="this.getRootNode().host._addTplRow()">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 3v10M3 8h10"/></svg>
              添加变量
            </button>
          </div>
        </div>
      </div>

      <!-- 调试：历史表达式 -->
      <div id="dbg-history" class="panel" role="region" aria-label="历史表达式">
        <div class="panel-title">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>
          历史表达式
          <span class="pt-hint">本地保存，点击恢复</span>
        </div>
        <div id="history-list" class="history-list" role="list" aria-label="历史记录列表"></div>
      </div>

      <!-- 用例：加载 -->
      <div id="tc-left" class="hidden">
        <div class="panel">
          <div class="panel-title">
            <span class="num-chip" aria-hidden="true">2</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2v8M5 7l3 3 3-3M3 13h10"/></svg>
            加载测试用例
          </div>
          <textarea class="load-textarea" id="tc-input" spellcheck="false"
            aria-label="测试用例文本，空格或逗号分隔，最后一列为预期输出"
            placeholder="粘贴测试用例（空格/逗号/Tab 分隔，最后一列为预期输出）&#10;&#10;示例：&#10;3 4 14&#10;10 5 30&#10;&#10;# 井号开头为注释行"></textarea>
          <div class="action-bar" style="margin-top:var(--space-3);">
            <button class="btn btn-primary" onclick="this.getRootNode().host._loadTestCases()">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2v8M5 7l3 3 3-3M3 13h10"/></svg>
              加载用例
            </button>
            <button class="btn btn-ghost" onclick="this.getRootNode().host._clearTestCases()">清空</button>
          </div>
          <div id="tc-load-err" class="errbox" role="alert" aria-live="assertive"></div>
        </div>
      </div>

    </div><!-- /col-left -->
    <div class="main-col" id="col-right">

      <!-- 空态示例卡片 -->
      <div id="dbg-empty" class="panel" role="region" aria-label="快速示例">
        <div class="panel-title">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 1.5l2 4 4.5.5-3.3 3.1.9 4.4L8 11.3l-4.1 2.2.9-4.4L1.5 6l4.5-.5z"/></svg>
          还没有数据？点一张示例立即看运行轨迹
        </div>
        <div class="ex-cards" id="ex-cards" role="list"></div>
      </div>

      <!-- 管道处理 -->
      <div id="dbg-pipeline" class="panel" role="region" aria-label="管道处理轨迹">
        <div class="panel-title">
          <span class="num-chip" aria-hidden="true">3</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 5h5l2 6h5M2 11h3"/><circle cx="14" cy="5" r="1.5"/></svg>
          管道处理
          <span class="pt-hint">每阶段：入 → 操作 → 出</span>
        </div>
        <div id="pipeline-container"></div>
      </div>

      <!-- 最终结果 -->
      <div id="dbg-result" class="panel" role="region" aria-label="最终结果">
        <div class="panel-title">
          <span class="num-chip" aria-hidden="true">4</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2l1.8 3.8L14 6.4l-3 2.9.7 4.2L8 11.5 4.3 13.5 5 9.3 2 6.4l4.2-.6z"/></svg>
          最终结果
        </div>
        <div class="final-result waiting" id="final-result" aria-live="polite" aria-atomic="true">等待输入…</div>
        <div class="result-actions">
          <button class="btn btn-secondary hidden" id="copy-btn"
            onclick="this.getRootNode().host._copyResult()" aria-label="复制结果到剪贴板">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h7"/></svg>
            复制结果
          </button>
        </div>
      </div>

      <!-- 用例：执行 + 结果 -->
      <div id="tc-right" class="hidden">
        <div class="panel hidden" id="tc-exec-section" style="margin-bottom:var(--space-4);">
          <div class="panel-title">
            <span class="num-chip" aria-hidden="true">3</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M9 2L3 9h4l-1 5 6-7H8z"/></svg>
            批量执行
            <span class="pt-hint"><kbd>F5</kbd> 执行</span>
          </div>
          <div class="action-bar">
            <button class="btn btn-primary" id="tc-exec-btn"
              onclick="this.getRootNode().host._executeBatch()" aria-label="执行全部测试用例">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5z"/></svg>
              执行全部
            </button>
            <button class="btn btn-secondary hidden" id="tc-export-btn"
              onclick="this.getRootNode().host._exportResults()" aria-label="导出执行结果为 CSV">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 10V2M5 5l3-3 3 3M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg>
              导出结果
            </button>
            <span id="tc-exec-info" class="muted-note" aria-live="polite"></span>
          </div>
        </div>

        <div class="panel hidden" id="tc-results-section">
          <div class="panel-title">
            <span class="num-chip" aria-hidden="true">4</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 14V9M6 14V4M10 14V7M14 14V2"/></svg>
            执行结果
            <button class="pass-badge hidden" id="pass-badge"
              onclick="this.getRootNode().host._setFilter('mismatch')"></button>
          </div>
          <div class="stats" id="tc-stats" role="group" aria-label="执行统计"></div>
          <div class="filter-bar" id="tc-filter" role="group" aria-label="结果筛选"></div>
          <div role="table" aria-label="批量执行结果">
            <div class="vtable-header" role="rowgroup">
              <div class="vcell ci" role="columnheader">#</div>
              <div class="vcell inp" role="columnheader">输入</div>
              <div class="vcell exp" role="columnheader">期望输出</div>
              <div class="vcell act" role="columnheader">实际输出</div>
              <div class="vcell st" role="columnheader">状态</div>
            </div>
          </div>
          <div class="virtual-container" id="vc" role="rowgroup">
            <div class="virtual-spacer" id="vs">
              <div class="virtual-content" id="vcon"></div>
            </div>
          </div>
          <div class="scroll-foot">
            <span id="vrange" aria-live="polite">–</span>
            <span id="vhint" aria-live="polite"></span>
          </div>
        </div>
      </div>

    </div><!-- /col-right -->
  </div><!-- /main-grid -->
</div><!-- /app-shell -->

<div id="toast" role="status" aria-live="polite"></div>
`

export class PipeBatchEvaluator extends HTMLElement {
  constructor() {
    super()
    this._shadow = this.attachShadow({ mode: 'open' })
    this._shadow.innerHTML = TEMPLATE

    // State
    this._evaluator = new PipeEvaluator()
    this._parsedExpr = parsePipeExpr(DEFAULT_EXPR)
    this._inputValues = []
    this._badgeTypes = []
    this._templateVars = []
    this._testCases = []
    this._execResults = null
    this._currentMode = APP_MODE.DEBUG
    this._resultFilter = RESULT_FILTER.ALL
    this._vsReady = false
    this._debounceTimer = null

    this._bindEvents()
    this._init()
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  connectedCallback() {
    window.addEventListener('message', this._onMessage.bind(this))
    window.addEventListener('keydown', this._onKeydown.bind(this))
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage.bind(this))
    window.removeEventListener('keydown', this._onKeydown.bind(this))
  }

  // ── Init ───────────────────────────────────────────────────────────────

  _init() {
    const ta = this._shadow.getElementById('expr-input')
    ta.value = DEFAULT_EXPR
    this._applyExpr(true)
    this._renderExamples()
    this._renderHistory()
    const opOpen = localStorage.getItem(STORAGE_KEYS.OP_OPEN) !== 'false'
    if (!opOpen) this._shadow.getElementById('op-panel').classList.remove('open')
    this._shadow.getElementById('op-toggle').setAttribute('aria-expanded', opOpen ? 'true' : 'false')
  }

  _bindEvents() {
    const ta = this._shadow.getElementById('expr-input')
    ta.addEventListener('input', () => {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = setTimeout(() => this._validateExprDebounced(), 300)
    })
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this._applyExpr() }
    })
    const vc = this._shadow.getElementById('vc')
    if (vc) vc.addEventListener('scroll', () => this._onVirtualScroll())
  }

  // ── Theme ──────────────────────────────────────────────────────────────

  _setTheme(val) {
    document.documentElement.setAttribute('data-theme', val)
    this._shadow.querySelectorAll('.theme-seg button').forEach(btn => {
      const isActive = btn.dataset.themeVal === val
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    })
  }

  // ── Expression ────────────────────────────────────────────────────────

  _validateExprDebounced() {
    const raw = this._shadow.getElementById('expr-input').value
    const { ok, message } = validateExpr(raw)
    this._showInlineMsg(ok ? null : message, ok ? null : 'err')
    const ta = this._shadow.getElementById('expr-input')
    ta.classList.toggle('invalid', !ok)
  }

  _applyExpr(silent = false) {
    const raw = this._shadow.getElementById('expr-input').value
    const vr = validateExpr(raw)
    if (!vr.ok) {
      this._showInlineMsg(vr.message, 'err')
      this._shadow.getElementById('expr-input').classList.add('invalid')
      return
    }
    this._parsedExpr = parsePipeExpr(raw)
    this._shadow.getElementById('expr-input').classList.remove('invalid')
    if (!silent) {
      this._showInlineMsg('✓ 表达式有效，已应用', 'ok')
      this._saveHistory(raw)
    }
    this._renderInputFields()
    this._renderPipelineSlots()
    this._updateDebugResults()
  }

  _resetExpr() {
    this._shadow.getElementById('expr-input').value = DEFAULT_EXPR
    this._applyExpr()
  }

  // ── Input Fields ──────────────────────────────────────────────────────

  _renderInputFields() {
    const c = this._shadow.getElementById('inputs-container')
    if (!this._parsedExpr.ok || !this._parsedExpr.inputs.length) {
      c.innerHTML = '<p class="muted-note">此表达式无需输入参数</p>'
      this._inputValues = []
      return
    }
    this._inputValues = new Array(this._parsedExpr.inputs.length).fill('')
    if (this._badgeTypes.length !== this._parsedExpr.inputs.length) {
      this._badgeTypes = new Array(this._parsedExpr.inputs.length).fill(PARAM_BADGE_TYPES.LITERAL)
    }
    c.innerHTML = this._parsedExpr.inputs.map((inp, i) => {
      const btype = this._badgeTypes[i] || PARAM_BADGE_TYPES.LITERAL
      const opts = Object.values(PARAM_BADGE_TYPES).map(t =>
        `<option value="${t}" ${t === btype ? 'selected' : ''}>${BADGE_LABELS[t]}</option>`
      ).join('')
      const msgId = `param-msg-${i}`
      return `
        <div class="input-row" data-idx="${i}" id="irow-${i}">
          <label class="input-label" for="ifield-${i}">
            <span class="pname">${inp.placeholder}</span>
            <span class="phint">${inp.desc}</span>
            <select class="badge-select badge badge-${btype}"
              aria-label="参数 ${inp.placeholder} 类型"
              onchange="this.getRootNode().host._onBadgeChange(${i}, this.value)">${opts}</select>
          </label>
          <input type="text" class="input-field" id="ifield-${i}"
            aria-label="参数 ${inp.placeholder} 的值"
            aria-describedby="${msgId}"
            oninput="this.getRootNode().host._onInputChange(${i}, this.value)">
          <div class="param-msg" id="${msgId}" aria-live="polite" role="status"></div>
        </div>`
    }).join('')
  }

  _onInputChange(idx, value) {
    this._inputValues[idx] = value
    const row = this._shadow.getElementById(`irow-${idx}`)
    const msg = this._shadow.getElementById(`param-msg-${idx}`)
    if (!value.trim()) {
      row?.classList.add('warn')
      if (msg) { msg.textContent = `${this._parsedExpr.inputs[idx].placeholder} 未填写`; msg.classList.add('show') }
    } else {
      row?.classList.remove('warn')
      if (msg) { msg.textContent = ''; msg.classList.remove('show') }
    }
    clearTimeout(this._inputDebounce)
    this._inputDebounce = setTimeout(() => this._updateDebugResults(), 300)
  }

  _onBadgeChange(idx, value) {
    this._badgeTypes[idx] = value
    const sel = this._shadow.querySelector(`#irow-${idx} .badge-select`)
    if (sel) {
      sel.className = `badge-select badge badge-${value}`
    }
  }

  // ── Pipeline Slots ────────────────────────────────────────────────────

  _renderPipelineSlots() {
    const c = this._shadow.getElementById('pipeline-container')
    if (!this._parsedExpr.ok) { c.innerHTML = ''; return }
    const stages = this._parsedExpr.stages
    const arrow = `<div class="flow-arrow" aria-hidden="true"><div class="bar"></div><div class="tip">▼</div></div>`
    c.innerHTML = `<div class="flow-input" id="flow-input">输入：等待参数…</div>` +
      stages.map((s, i) => `${arrow}
        <div class="stage" id="stage-${i}" role="listitem">
          <div class="stage-head">
            <span class="stage-idx" aria-hidden="true">阶段 ${i + 1}</span>
            <span class="stage-expr">${this._esc(s.raw)}</span>
          </div>
          <div class="stage-io" id="sio-${i}">
            <span class="io-out waiting">等待输入…</span>
          </div>
        </div>`
      ).join('')
  }

  _updateDebugResults() {
    if (!this._parsedExpr.ok) return
    const hasValues = this._inputValues.some(v => v !== '' && v !== undefined)
    const emptyPanel = this._shadow.getElementById('dbg-empty')
    const pipeline = this._shadow.getElementById('dbg-pipeline')
    const result = this._shadow.getElementById('dbg-result')

    if (!hasValues) {
      if (emptyPanel) emptyPanel.classList.remove('hidden')
      if (pipeline) pipeline.classList.add('hidden')
      if (result) result.classList.add('hidden')
      return
    }

    if (emptyPanel) emptyPanel.classList.add('hidden')
    if (pipeline) pipeline.classList.remove('hidden')
    if (result) result.classList.remove('hidden')

    const tplMap = new Map(this._templateVars.map(t => [t.key, t.val]))
    const evalResult = this._evaluator.evaluate(this._parsedExpr, this._inputValues, tplMap)

    // Update flow-input
    const fi = this._shadow.getElementById('flow-input')
    if (fi) fi.textContent = `输入：${this._inputValues.map((v, i) => `$${i+1}=${v}`).join(', ')}`

    // Update each stage
    if (evalResult.success) {
      let prevParams = this._inputValues
      this._parsedExpr.stages.forEach((stage, i) => {
        const stageEl = this._shadow.getElementById(`stage-${i}`)
        const sioEl = this._shadow.getElementById(`sio-${i}`)
        const outVal = evalResult.intermediates[i]
        const type = inferValueType(outVal)
        const tClass = typeChipClass(type)
        stageEl?.classList.remove('errored', 'skipped')
        if (sioEl) {
          sioEl.innerHTML = `
            <span class="io-in">${this._esc(fmtVal(Array.isArray(prevParams) ? prevParams[0] : prevParams))}</span>
            <span class="io-arr">→</span>
            <span class="io-out">${this._esc(fmtVal(outVal))}</span>
            <span class="type-chip ${tClass}" aria-label="类型：${type}">${type}</span>`
        }
        prevParams = outVal
      })
      this._updateFinalResult(true, fmtVal(evalResult.result))
      this.dispatchEvent(new CustomEvent('pipe-result-ready', {
        bubbles: true,
        detail: { expr: this._shadow.getElementById('expr-input').value, result: evalResult.result, inputs: this._inputValues },
      }))
    } else {
      // Find failure point by re-running per stage
      let prevParams = this._inputValues.map(v => v)
      let failed = false
      this._parsedExpr.stages.forEach((stage, i) => {
        const stageEl = this._shadow.getElementById(`stage-${i}`)
        const sioEl = this._shadow.getElementById(`sio-${i}`)
        if (failed) {
          stageEl?.classList.add('skipped')
          stageEl?.classList.remove('errored')
          if (sioEl) sioEl.innerHTML = '<span class="io-out waiting">未执行</span>'
          return
        }
        try {
          const tplMap = new Map(this._templateVars.map(t => [t.key, t.val]))
          this._evaluator.templateVars = tplMap
          const out = this._evaluator._evalStage(stage, prevParams)
          const type = inferValueType(out)
          stageEl?.classList.remove('errored', 'skipped')
          if (sioEl) {
            sioEl.innerHTML = `
              <span class="io-in">${this._esc(fmtVal(Array.isArray(prevParams) ? prevParams[0] : prevParams))}</span>
              <span class="io-arr">→</span>
              <span class="io-out">${this._esc(fmtVal(out))}</span>
              <span class="type-chip ${typeChipClass(type)}">${type}</span>`
          }
          prevParams = out
        } catch (e) {
          failed = true
          stageEl?.classList.add('errored')
          stageEl?.classList.remove('skipped')
          if (sioEl) sioEl.innerHTML = `<span class="io-out" style="color:var(--danger)">错误: ${this._esc(e.message)}</span>`
        }
      })
      this._updateFinalResult(false, evalResult.error)
    }
  }

  _updateFinalResult(success, text) {
    const el = this._shadow.getElementById('final-result')
    const copyBtn = this._shadow.getElementById('copy-btn')
    if (!el) return
    el.className = `final-result${success ? '' : ' error'}`
    el.textContent = success ? text : `错误: ${text}`
    if (copyBtn) copyBtn.classList.toggle('hidden', !success)
    this._lastResult = success ? text : null
  }

  // ── Examples ──────────────────────────────────────────────────────────

  _renderExamples() {
    const c = this._shadow.getElementById('ex-cards')
    if (!c) return
    c.innerHTML = BUILTIN_EXAMPLES.map((ex, i) => `
      <button class="ex-card" role="listitem"
        onclick="this.getRootNode().host._useExample(${i})"
        aria-label="示例：${ex.title}，点击填入">
        <div class="ex-title">${this._esc(ex.title)}</div>
        <div class="ex-expr">${this._esc(ex.expr)}</div>
        <div class="ex-io">输入：${ex.vals.join(', ')} → 期望：<b>${this._esc(ex.out)}</b></div>
      </button>`
    ).join('')
  }

  _useExample(i) {
    const ex = BUILTIN_EXAMPLES[i]
    if (!ex) return
    const ta = this._shadow.getElementById('expr-input')
    ta.value = ex.expr
    this._applyExpr(true)
    ex.vals.forEach((v, idx) => {
      this._inputValues[idx] = v
      const field = this._shadow.getElementById(`ifield-${idx}`)
      if (field) field.value = v
    })
    this._updateDebugResults()
  }

  // ── Operator Panel ─────────────────────────────────────────────────────

  _toggleOpPanel() {
    const panel = this._shadow.getElementById('op-panel')
    const toggle = this._shadow.getElementById('op-toggle')
    const body = this._shadow.getElementById('op-body')
    const isOpen = panel.classList.toggle('open')
    toggle.setAttribute('aria-expanded', String(isOpen))
    localStorage.setItem(STORAGE_KEYS.OP_OPEN, String(isOpen))
  }

  _insertOp(text) {
    const ta = this._shadow.getElementById('expr-input')
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    ta.value = val.slice(0, start) + text + val.slice(end)
    ta.selectionStart = ta.selectionEnd = start + text.length
    ta.focus()
    this._validateExprDebounced()
  }

  // ── Template Variables ─────────────────────────────────────────────────

  _toggleTplPanel() {
    const toggle = this._shadow.getElementById('tpl-toggle')
    const body = this._shadow.getElementById('tpl-body')
    const panel = this._shadow.getElementById('dbg-tpl')
    const isOpen = panel.classList.toggle('open')
    toggle.setAttribute('aria-expanded', String(isOpen))
    body.hidden = !isOpen
    localStorage.setItem(STORAGE_KEYS.TPL_OPEN, String(isOpen))
  }

  _addTplRow() {
    this._templateVars.push({ key: '', val: '' })
    this._renderTplRows()
  }

  _renderTplRows() {
    const c = this._shadow.getElementById('tpl-rows')
    if (!c) return
    c.innerHTML = this._templateVars.map((t, i) => `
      <div class="tpl-row" role="listitem">
        <input class="tpl-key" value="${this._esc(t.key)}"
          aria-label="模板变量名 ${i + 1}"
          placeholder="VarName"
          onchange="this.getRootNode().host._updateTplKey(${i}, this.value)">
        <input class="tpl-val" value="${this._esc(t.val)}"
          aria-label="模板变量值 ${i + 1}"
          placeholder="值"
          onchange="this.getRootNode().host._updateTplVal(${i}, this.value)">
        <button class="icon-btn" aria-label="删除变量 ${i + 1}"
          onclick="this.getRootNode().host._removeTplRow(${i})">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M5 4l.5 9M10.5 4l-.5 9"/></svg>
        </button>
      </div>`
    ).join('')
  }

  _updateTplKey(i, v) { this._templateVars[i].key = v }
  _updateTplVal(i, v) { this._templateVars[i].val = v; this._updateDebugResults() }
  _removeTplRow(i) { this._templateVars.splice(i, 1); this._renderTplRows() }

  // ── History ────────────────────────────────────────────────────────────

  _saveHistory(expr) {
    const hist = this._loadHistoryData()
    if (hist[0]?.expr === expr) return
    hist.unshift({ expr, time: Date.now() })
    if (hist.length > HISTORY_MAX) hist.splice(HISTORY_MAX)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(hist))
    this._renderHistory()
  }

  _loadHistoryData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]') }
    catch { return [] }
  }

  _renderHistory() {
    const c = this._shadow.getElementById('history-list')
    if (!c) return
    const hist = this._loadHistoryData()
    if (!hist.length) {
      c.innerHTML = '<div class="history-empty" role="listitem">暂无历史记录</div>'
      return
    }
    c.innerHTML = hist.map((h, i) => `
      <button class="history-item" role="listitem"
        aria-label="历史表达式：${this._esc(h.expr)}，时间 ${fmtHistoryTime(h.time)}，点击恢复"
        onclick="this.getRootNode().host._restoreHistory(${i})">
        <span class="hi-expr">${this._esc(h.expr)}</span>
        <span class="hi-time">${fmtHistoryTime(h.time)}</span>
      </button>`
    ).join('')
  }

  _restoreHistory(i) {
    const hist = this._loadHistoryData()
    if (!hist[i]) return
    this._shadow.getElementById('expr-input').value = hist[i].expr
    this._applyExpr()
  }

  // ── Mode ───────────────────────────────────────────────────────────────

  _switchMode(mode) {
    this._currentMode = mode
    const isDebug = mode === APP_MODE.DEBUG
    const ids = {
      debug: ['dbg-inputs', 'dbg-tpl', 'dbg-history', 'dbg-empty', 'dbg-pipeline', 'dbg-result'],
      testcase: ['tc-left', 'tc-right'],
    }
    ids.debug.forEach(id => {
      const el = this._shadow.getElementById(id)
      el?.classList.toggle('hidden', !isDebug)
    })
    ids.testcase.forEach(id => {
      const el = this._shadow.getElementById(id)
      el?.classList.toggle('hidden', isDebug)
    })
    const dbgBtn = this._shadow.getElementById('btn-debug')
    const tcBtn = this._shadow.getElementById('btn-testcase')
    dbgBtn?.classList.toggle('active', isDebug)
    dbgBtn?.setAttribute('aria-selected', String(isDebug))
    tcBtn?.classList.toggle('active', !isDebug)
    tcBtn?.setAttribute('aria-selected', String(!isDebug))
  }

  // ── Test Cases ─────────────────────────────────────────────────────────

  _loadTestCases() {
    const text = this._shadow.getElementById('tc-input')?.value || ''
    const errEl = this._shadow.getElementById('tc-load-err')
    const { cases, errors } = parseTestCaseText(text)
    if (errors.length) {
      if (errEl) {
        errEl.classList.add('show')
        errEl.innerHTML = `<strong>解析错误（${errors.length} 处）：</strong>` +
          errors.map(e => `<div class="err-detail">第 ${e.line} 行：${this._esc(e.message)}</div>`).join('')
      }
      if (!cases.length) return
    } else {
      if (errEl) { errEl.classList.remove('show'); errEl.innerHTML = '' }
    }
    this._testCases = cases
    const execSection = this._shadow.getElementById('tc-exec-section')
    execSection?.classList.remove('hidden')
    const info = this._shadow.getElementById('tc-exec-info')
    if (info) info.textContent = `已加载 ${cases.length} 条用例`
  }

  _clearTestCases() {
    this._testCases = []
    this._execResults = null
    const ta = this._shadow.getElementById('tc-input')
    if (ta) ta.value = ''
    const errEl = this._shadow.getElementById('tc-load-err')
    if (errEl) { errEl.classList.remove('show'); errEl.innerHTML = '' }
    this._shadow.getElementById('tc-exec-section')?.classList.add('hidden')
    this._shadow.getElementById('tc-results-section')?.classList.add('hidden')
  }

  _executeBatch() {
    if (!this._testCases.length) return
    const { results, stats } = executeBatch(this._testCases, this._parsedExpr,
      new Map(this._templateVars.map(t => [t.key, t.val])))
    this._execResults = results
    this._renderBatchStats(stats)
    this._renderFilterBar(stats)
    this._renderBatchResults()

    this._shadow.getElementById('tc-results-section')?.classList.remove('hidden')
    this._shadow.getElementById('tc-export-btn')?.classList.remove('hidden')

    this.dispatchEvent(new CustomEvent('pipe-batch-done', {
      bubbles: true,
      detail: { stats, results },
    }))
  }

  _renderBatchStats(stats) {
    const c = this._shadow.getElementById('tc-stats')
    if (!c) return
    const items = [
      { v: stats.total, l: '总计', cls: '' },
      { v: stats.matched, l: '通过', cls: 's-ok' },
      { v: stats.mismatched, l: '不匹配', cls: 's-fail' },
      { v: stats.errored, l: '错误', cls: 's-warn' },
    ]
    c.innerHTML = items.map(it => `
      <div class="stat" role="group" aria-label="${it.l} ${it.v}">
        <div class="stat-v ${it.cls}">${it.v}</div>
        <div class="stat-l">${it.l}</div>
      </div>`
    ).join('')

    const pb = this._shadow.getElementById('pass-badge')
    if (pb) {
      const { text, isOk } = fmtPassRate(stats)
      pb.className = `pass-badge ${isOk ? 'ok' : 'bad'}`
      pb.textContent = text
      pb.setAttribute('aria-label', `通过率 ${stats.matched}/${stats.total}，点击筛选不匹配项`)
      pb.classList.remove('hidden')
    }
  }

  _renderFilterBar(stats) {
    const c = this._shadow.getElementById('tc-filter')
    if (!c) return
    const counts = {
      [RESULT_FILTER.ALL]: stats.total,
      [RESULT_FILTER.MATCH]: stats.matched,
      [RESULT_FILTER.MISMATCH]: stats.mismatched,
      [RESULT_FILTER.ERROR]: stats.errored,
    }
    c.innerHTML = Object.values(RESULT_FILTER).map(f => `
      <button class="filter-chip ${f === this._resultFilter ? 'active' : ''}"
        aria-pressed="${f === this._resultFilter}"
        onclick="this.getRootNode().host._setFilter('${f}')">
        ${FILTER_LABELS[f]}
        <span class="fc-count" aria-hidden="true">${counts[f]}</span>
      </button>`
    ).join('')
  }

  _setFilter(f) {
    this._resultFilter = f
    if (this._execResults) {
      const stats = {
        total: this._execResults.length,
        matched: this._execResults.filter(r => r.executionStatus === EXEC_STATUS.MATCH).length,
        mismatched: this._execResults.filter(r => r.executionStatus === EXEC_STATUS.MISMATCH).length,
        errored: this._execResults.filter(r => r.executionStatus === EXEC_STATUS.ERROR).length,
      }
      this._renderFilterBar(stats)
      this._renderBatchResults()
    }
  }

  _getFilteredResults() {
    if (!this._execResults) return []
    if (this._resultFilter === RESULT_FILTER.ALL) return this._execResults
    return this._execResults.filter(r => r.executionStatus === this._resultFilter)
  }

  _renderBatchResults() {
    const filtered = this._getFilteredResults()
    const vs = this._shadow.getElementById('vs')
    if (vs) vs.style.height = (filtered.length * ROW_HEIGHT) + 'px'
    this._vsReady = true
    this._renderVirtualRows(filtered)
  }

  _onVirtualScroll() {
    if (!this._vsReady) return
    this._renderVirtualRows(this._getFilteredResults())
  }

  _renderVirtualRows(filtered) {
    const vc = this._shadow.getElementById('vc')
    const vcon = this._shadow.getElementById('vcon')
    const vrange = this._shadow.getElementById('vrange')
    const vhint = this._shadow.getElementById('vhint')
    if (!vc || !vcon) return

    const scrollTop = vc.scrollTop
    const viewH = vc.clientHeight
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER)
    const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + viewH) / ROW_HEIGHT) + BUFFER)

    vcon.style.top = (startIdx * ROW_HEIGHT) + 'px'
    vcon.innerHTML = filtered.slice(startIdx, endIdx).map((r, relI) => {
      const absI = startIdx + relI
      const st = r.executionStatus
      const rowCls = st === EXEC_STATUS.MISMATCH ? 'mismatch' : st === EXEC_STATUS.ERROR ? 'errored' : ''
      const micCls = st === EXEC_STATUS.MATCH ? 'mic-ok' : st === EXEC_STATUS.ERROR ? 'mic-err' : 'mic-fail'
      const micLabel = st === EXEC_STATUS.MATCH ? '✓' : st === EXEC_STATUS.ERROR ? '⚠' : '✗'
      return `<div class="vrow ${rowCls}" role="row"
        aria-label="第 ${r.lineNumber} 行 输入:${this._esc(r.inputs.join(','))} 期望:${this._esc(r.expectedOutput)} 实际:${this._esc(r.actualOutput ?? '')} 状态:${st}">
        <div class="vcell ci" role="cell">${absI + 1}</div>
        <div class="vcell inp" role="cell">${this._esc(r.inputs.join(', '))}</div>
        <div class="vcell exp" role="cell">${this._esc(r.expectedOutput)}</div>
        <div class="vcell act" role="cell">${this._esc(r.actualOutput ?? '')}</div>
        <div class="vcell st" role="cell"><div class="mic ${micCls}" aria-label="状态：${st}">${micLabel}</div></div>
      </div>`
    }).join('')

    if (vrange) vrange.textContent = filtered.length ? `显示 ${startIdx + 1}–${Math.min(endIdx, filtered.length)} / ${filtered.length}` : '无结果'
    if (vhint) vhint.textContent = filtered.length > 200 ? '虚拟滚动已启用' : ''
  }

  // ── Export ─────────────────────────────────────────────────────────────

  _exportResults() {
    const filtered = this._getFilteredResults()
    const header = '序号,输入,期望输出,实际输出,状态\n'
    const rows = filtered.map((r, i) => [
      i + 1,
      `"${r.inputs.join(',')}"`,
      `"${r.expectedOutput}"`,
      `"${r.actualOutput ?? ''}"`,
      r.executionStatus,
    ].join(',')).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pipe-eval-results.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Copy ───────────────────────────────────────────────────────────────

  _copyResult() {
    if (!this._lastResult) return
    navigator.clipboard.writeText(this._lastResult).then(() => this._showToast('已复制到剪贴板'))
  }

  // ── postMessage ────────────────────────────────────────────────────────

  _onMessage(evt) {
    if (evt.data?.type === MSG_TYPES.TEMPLATE_VARS_UPDATE) {
      const vars = evt.data.vars || {}
      this._templateVars = Object.entries(vars).map(([key, val]) => ({ key, val: String(val) }))
      this._renderTplRows()
      this._updateDebugResults()
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────

  _onKeydown(e) {
    if (e.key === 'F5' && this._currentMode === APP_MODE.TESTCASE) {
      e.preventDefault()
      this._executeBatch()
    }
    if (e.key === 'Escape') {
      // Close any open dropdowns or panels if needed
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────

  _showToast(msg) {
    const t = this._shadow.getElementById('toast')
    if (!t) return
    t.textContent = msg
    t.classList.add('show')
    setTimeout(() => t.classList.remove('show'), 2000)
  }

  // ── Inline Message ─────────────────────────────────────────────────────

  _showInlineMsg(text, type) {
    const el = this._shadow.getElementById('expr-msg')
    if (!el) return
    if (!text) { el.className = 'inline-msg'; el.innerHTML = ''; el.removeAttribute('role'); return }
    el.className = `inline-msg show ${type}`
    el.setAttribute('role', type === 'err' ? 'alert' : 'status')
    const icon = type === 'err'
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v4M8 11v.5"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>'
    el.innerHTML = icon + this._esc(text)
    if (type === 'ok') setTimeout(() => { if (el.classList.contains('ok')) { el.className = 'inline-msg'; el.innerHTML = '' } }, 3000)
  }

  // ── Util ───────────────────────────────────────────────────────────────

  _esc(s) {
    const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML
  }
}

customElements.define('pipe-batch-evaluator', PipeBatchEvaluator)
