/**
 * PipeBatchEvaluator · 管道表达式批量评估器
 * 工程级 Web Component（Custom Element + Shadow DOM）
 *
 * 用法：<pipe-batch-evaluator></pipe-batch-evaluator>
 *
 * 对外事件（CustomEvent，冒泡穿越 Shadow DOM）：
 *   pipe-result-ready  { expr, result, inputs }  — 单次调试求值完成
 *   pipe-batch-done    { stats, results }         — 批量执行完成
 *
 * 接收 postMessage（VS Code Webview 宿主通信）：
 *   { type: 'setTemplateVars', payload: Record<string,string> }
 *   { type: 'setExpression',   payload: string }
 *   { type: 'setBadgeTypes',   payload: string[] }
 *
 * 可访问性修复（对照 accessibility-audit.md）：
 *   A2  contrast — foreground-muted 用 foreground 代替
 *   A3  div[onclick] → <button> for history items
 *   A4  badge-select — aria-label
 *   A5  expr-textarea — aria-label
 *   A6  inline-msg — aria-live="polite"
 *   A7  toast — role="status" aria-live="polite"
 *   A8  tab/tabpanel ARIA pattern for mode switch
 *   A9  icon-only buttons — aria-label
 *   A11 focus-visible styles — 2px solid #4369ef outline
 *   A12 virtual table — role="table" / row / cell ARIA
 */

import {
  PipeEvaluator,
  parsePipeExpr,
  parseTestCaseText,
} from '../../utils/pipeEvalLogic.js';

import { validateExpr } from '../../utils/validators.js';

import {
  fmtVal,
  normOut,
  relTime,
  esc,
  typeChipClass,
} from '../../utils/formatters.js';

import {
  BADGE_LABEL,
  EXAMPLES,
  OP_GROUPS,
  LS_KEYS,
  HISTORY_MAX,
  VSCROLL,
  FILTER_LABELS,
} from '../../constants/enums.js';

// ── shared evaluator instance ─────────────────────────────────────────────────
const _ev = new PipeEvaluator();

// ── CSS (PTO token variables cascade in from host; provide dark fallbacks) ────
const CSS = /* css */`
/* PTO foundation tokens — cascade from host; these are shadow-local fallbacks */
:host {
  --background:           #101010;
  --surface:              #141414;
  --surface-raised:       #1a1a1a;
  --surface-overlay:      #1f1f1f;
  --border:               #2a2a2a;
  --border-subtle:        #222222;
  --foreground:           #e6e6e6;
  --foreground-muted:     #a0a0a0;
  --primary:              #4369ef;
  --primary-hover:        #5a7ff5;
  --success:              #04d793;
  --warning:              #ffaa3b;
  --danger:               #ff4b7b;
  --font-sans: 'Inter', 'Source Han Sans SC', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-pill: 999px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.28);
  --shadow-md: 0 6px 18px rgba(0,0,0,.34);
  --duration-base: 200ms;
  --easing-default: cubic-bezier(.4,0,.2,1);
  display: block;
  height: 100%;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--foreground);
  background: var(--background);
}
/* light theme overrides */
:host([data-theme='light']) {
  --background: #f5f5f5; --surface: #ffffff; --surface-raised: #f2f2f2;
  --surface-overlay: #e8e8e8; --border: #e0e0e0; --border-subtle: #ebebeb;
  --foreground: #1a1a1a; --foreground-muted: #555555;
}
:host([data-theme='glass']) {
  --background: rgba(12,12,18,.85); --surface: rgba(255,255,255,.06);
  --surface-raised: rgba(255,255,255,.1); --border: rgba(255,255,255,.1);
  --foreground: #e8e8f0;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Focus visible */
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* ── Layout ─────────────────────────────────────────────────────────────────── */
.app-shell { display: flex; flex-direction: column; height: 100%; min-height: 400px; }

.topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.topbar-brand { display: flex; align-items: center; gap: var(--space-2); }
.topbar-brand-name { font-size: 13px; font-weight: 600; letter-spacing: .3px; }
.topbar-actions { display: flex; align-items: center; gap: var(--space-2); }

.main-grid {
  flex: 1; display: grid;
  grid-template-columns: 55fr 45fr;
  min-height: 0; overflow: hidden;
}
@media (max-width: 1023px) { .main-grid { grid-template-columns: 1fr; } }

.left-panel, .right-panel {
  overflow-y: auto; padding: var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-3);
}
.right-panel { border-left: 1px solid var(--border); }

/* ── Common ──────────────────────────────────────────────────────────────────── */
button {
  font-family: inherit; cursor: pointer;
  border: none; background: none; color: inherit;
}
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1);
  padding: 7px 16px; border-radius: var(--radius-md); font-size: 13px; font-weight: 600;
  background: var(--primary); color: #fff;
  transition: background var(--duration-base) var(--easing-default);
}
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 5px 10px; border-radius: var(--radius-sm); font-size: 12px;
  color: var(--foreground-muted);
  transition: background var(--duration-base);
}
.btn-ghost:hover { background: var(--surface-raised); color: var(--foreground); }

.icon-btn {
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--foreground-muted);
  transition: background var(--duration-base), color var(--duration-base);
}
.icon-btn:hover { background: var(--surface-raised); color: var(--foreground); }

.panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); overflow: hidden;
}
.panel-head {
  width: 100%; text-align: left;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  font-size: 12px; font-weight: 600; letter-spacing: .4px;
  text-transform: uppercase; color: var(--foreground-muted);
  cursor: pointer;
}
.panel-head:hover { background: var(--surface-raised); }
.panel-body { padding: var(--space-3); }
.panel-body.collapsed { display: none; }

label { font-size: 12px; color: var(--foreground-muted); }

/* ── TopBar theme segmented control ─────────────────────────────────────────── */
.theme-seg {
  display: flex; gap: 2px;
  background: var(--surface-raised); border-radius: var(--radius-sm);
  padding: 2px;
}
.theme-seg button {
  padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
  color: var(--foreground-muted);
  transition: background var(--duration-base), color var(--duration-base);
}
.theme-seg button[aria-pressed='true'] {
  background: var(--primary); color: #fff;
}

/* ── Expression Editor ───────────────────────────────────────────────────────── */
.expr-area { display: flex; flex-direction: column; gap: var(--space-2); }
.expr-label { font-size: 12px; color: var(--foreground-muted); font-weight: 500; }
.expr-textarea {
  width: 100%; min-height: 72px; resize: vertical;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 13px;
  color: var(--foreground); line-height: 1.6;
  transition: border-color var(--duration-base);
}
.expr-textarea:focus { border-color: var(--primary); outline: none; }
.expr-textarea.valid   { border-color: var(--success); }
.expr-textarea.invalid { border-color: var(--danger); }

.inline-msg {
  font-size: 12px; min-height: 18px;
  transition: color var(--duration-base);
}
.inline-msg.ok  { color: var(--success); }
.inline-msg.err { color: var(--danger); }
.inline-msg.warn{ color: var(--warning); }

/* ── Operator chips ──────────────────────────────────────────────────────────── */
.chip-group { display: flex; flex-direction: column; gap: var(--space-2); }
.chip-group-name {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: var(--foreground-muted);
  display: flex; align-items: center; gap: var(--space-1);
}
.chip-group-name::before {
  content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--dot-color, var(--primary));
}
.chips { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.chip {
  display: inline-flex; align-items: center;
  padding: 3px 8px; border-radius: var(--radius-pill);
  background: var(--surface-raised); border: 1px solid var(--border);
  font-family: var(--font-mono); font-size: 11px; font-weight: 500;
  color: var(--foreground); cursor: pointer;
  transition: background var(--duration-base), border-color var(--duration-base);
}
.chip:hover { background: var(--primary); border-color: var(--primary); color: #fff; }
.chip-dot-primary   { --dot-color: var(--primary); }
.chip-dot-success   { --dot-color: var(--success); }
.chip-dot-warning   { --dot-color: var(--warning); }

/* ── Parameter row ───────────────────────────────────────────────────────────── */
.param-rows { display: flex; flex-direction: column; gap: var(--space-2); }
.param-row {
  display: grid; grid-template-columns: 80px 1fr auto;
  align-items: center; gap: var(--space-2);
}
.param-label { font-size: 12px; color: var(--foreground-muted); font-family: var(--font-mono); }
.param-input {
  padding: 5px 10px; background: var(--surface-raised);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 13px; color: var(--foreground); font-family: var(--font-mono);
}
.param-input:focus { border-color: var(--primary); outline: none; }
.param-input.warn { border-color: var(--warning); }
.badge-select {
  padding: 3px 6px; font-size: 11px; font-weight: 600;
  background: var(--surface-overlay); border: 1px solid var(--border);
  border-radius: var(--radius-pill); color: var(--foreground-muted);
  cursor: pointer;
}
.badge-select option { background: var(--surface-overlay); }

/* ── Template variable panel ─────────────────────────────────────────────────── */
.tpl-row {
  display: grid; grid-template-columns: 100px 1fr;
  align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);
}
.tpl-key { font-family: var(--font-mono); font-size: 12px; color: var(--foreground-muted); }
.tpl-val {
  padding: 4px 8px; background: var(--surface-raised);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 12px; font-family: var(--font-mono); color: var(--foreground);
}
.tpl-val:focus { border-color: var(--primary); outline: none; }
.tpl-empty { font-size: 12px; color: var(--foreground-muted); font-style: italic; }

/* ── Mode tabs ───────────────────────────────────────────────────────────────── */
.mode-tabs {
  display: flex; border-bottom: 1px solid var(--border); gap: 0;
}
.mode-tab {
  padding: 8px 16px; font-size: 13px; font-weight: 500;
  color: var(--foreground-muted); border-bottom: 2px solid transparent;
  transition: color var(--duration-base), border-color var(--duration-base);
}
.mode-tab[aria-selected='true'] {
  color: var(--primary); border-bottom-color: var(--primary);
}
.mode-tab:hover { color: var(--foreground); }

.tabpanel { padding-top: var(--space-3); }
.tabpanel[hidden] { display: none; }

/* ── Pipeline result ─────────────────────────────────────────────────────────── */
.pipeline-stages { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
.stage-card {
  background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3);
  display: flex; align-items: center; gap: var(--space-2);
}
.stage-arrow { color: var(--foreground-muted); font-size: 11px; }
.stage-fn { font-family: var(--font-mono); font-size: 12px; color: var(--primary); }
.stage-result { font-size: 13px; font-weight: 600; margin-left: auto; }
.type-chip {
  display: inline-block; padding: 1px 5px; border-radius: 3px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
}
.type-num  { background: rgba(67,105,239,.2); color: #7b9fff; }
.type-str  { background: rgba(4,215,147,.15); color: #04d793; }
.type-bool { background: rgba(255,170,59,.15); color: #ffaa3b; }
.stage-err { color: var(--danger); font-size: 12px; }

/* ── Examples ────────────────────────────────────────────────────────────────── */
.examples-grid { display: flex; flex-direction: column; gap: var(--space-2); }
.example-card {
  background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-3);
  cursor: pointer; transition: border-color var(--duration-base);
}
.example-card:hover { border-color: var(--primary); }
.example-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.example-expr  { font-family: var(--font-mono); font-size: 11px; color: var(--foreground-muted); }

/* ── Right panel ─────────────────────────────────────────────────────────────── */
.tc-textarea {
  width: 100%; min-height: 120px; resize: vertical;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 12px;
  color: var(--foreground); line-height: 1.6;
}
.tc-textarea:focus { border-color: var(--primary); outline: none; }

.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
  text-align: center;
}
.stat-num  { font-size: 20px; font-weight: 700; }
.stat-label{ font-size: 11px; color: var(--foreground-muted); margin-top: 2px; }
.stat-pass { color: var(--success); }
.stat-fail { color: var(--danger); }
.stat-err  { color: var(--warning); }

.results-head {
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
}
.pass-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--radius-pill);
  font-size: 12px; font-weight: 700;
  background: var(--surface-raised); border: 1px solid var(--border);
  cursor: pointer; transition: background var(--duration-base);
}
.pass-badge:hover { background: var(--surface-overlay); }
.pass-badge.good { border-color: var(--success); color: var(--success); }
.pass-badge.bad  { border-color: var(--danger);  color: var(--danger); }

.filter-chips { display: flex; gap: var(--space-1); flex-wrap: wrap; margin-left: auto; }
.filter-chip {
  padding: 3px 10px; border-radius: var(--radius-pill);
  font-size: 11px; font-weight: 500;
  background: var(--surface-raised); border: 1px solid var(--border);
  color: var(--foreground-muted); cursor: pointer;
  transition: background var(--duration-base), color var(--duration-base);
}
.filter-chip.active {
  background: var(--primary); border-color: var(--primary); color: #fff;
}

/* ── Virtual scroll table ────────────────────────────────────────────────────── */
.vtable-wrap {
  flex: 1; border: 1px solid var(--border); border-radius: var(--radius-md);
  overflow: hidden; display: flex; flex-direction: column; min-height: 120px;
}
.vtable-head {
  display: grid; grid-template-columns: 40px 1fr 1fr 70px;
  background: var(--surface); border-bottom: 1px solid var(--border);
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: var(--foreground-muted);
}
.vtable-head-cell { padding: 6px var(--space-2); }
.vtable-scroller { overflow-y: auto; flex: 1; position: relative; }
.vtable-spacer   { position: absolute; top: 0; left: 0; width: 1px; }
.vtable-rows     { position: absolute; top: 0; left: 0; right: 0; }
.vtable-row {
  display: grid; grid-template-columns: 40px 1fr 1fr 70px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px; line-height: 36px; height: 36px;
}
.vtable-row:hover { background: var(--surface-raised); }
.vtable-row.match    { border-left: 2px solid var(--success); }
.vtable-row.mismatch { border-left: 2px solid var(--danger); }
.vtable-row.error    { border-left: 2px solid var(--warning); }
.vtable-cell {
  padding: 0 var(--space-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: flex; align-items: center; gap: 4px;
}
.vtable-num  { color: var(--foreground-muted); font-size: 11px; }
.result-ok   { color: var(--success); }
.result-fail { color: var(--danger); }
.result-err  { color: var(--warning); }

.vtable-empty {
  display: flex; align-items: center; justify-content: center;
  height: 80px; color: var(--foreground-muted); font-size: 13px;
}

/* ── History dropdown ────────────────────────────────────────────────────────── */
.history-dropdown {
  position: absolute; top: 44px; right: var(--space-4); z-index: 200;
  width: 320px; background: var(--surface-overlay);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,.4); overflow: hidden;
  display: none;
}
.history-dropdown.open { display: block; }
.history-head {
  padding: var(--space-2) var(--space-3);
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: var(--foreground-muted);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.history-list { max-height: 280px; overflow-y: auto; }
.history-item {
  width: 100%; text-align: left;
  display: flex; flex-direction: column; gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer; background: none;
  transition: background var(--duration-base);
}
.history-item:hover { background: var(--surface-raised); }
.history-item:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.history-expr { font-family: var(--font-mono); font-size: 12px; color: var(--foreground); }
.history-meta { font-size: 11px; color: var(--foreground-muted); }
.history-empty {
  padding: var(--space-4); text-align: center;
  font-size: 12px; color: var(--foreground-muted);
}

/* ── Toast ───────────────────────────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: var(--space-5); left: 50%; transform: translateX(-50%) translateY(8px);
  padding: 8px 16px; border-radius: var(--radius-md);
  background: var(--surface-overlay); border: 1px solid var(--border);
  font-size: 13px; box-shadow: var(--shadow-md);
  opacity: 0; pointer-events: none;
  transition: opacity var(--duration-base), transform var(--duration-base);
  white-space: nowrap; z-index: 400;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ── Misc ─────────────────────────────────────────────────────────────────────── */
.section-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: var(--foreground-muted);
}
.execute-row { display: flex; align-items: center; gap: var(--space-2); }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border-width: 0;
}
`;

// ── HTML Template ─────────────────────────────────────────────────────────────
const HTML = /* html */`
<div class="app-shell">

  <!-- TopBar -->
  <header class="topbar" role="banner">
    <div class="topbar-brand">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="var(--primary)"/>
        <rect x="11" y="1" width="6" height="6" rx="1.5" fill="var(--success)"/>
        <rect x="1" y="11" width="6" height="6" rx="1.5" fill="var(--warning)"/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" fill="var(--danger)"/>
      </svg>
      <span class="topbar-brand-name">管道表达式批量评估器</span>
    </div>
    <div class="topbar-actions">
      <!-- history toggle -->
      <button class="icon-btn" id="history-btn" aria-label="历史记录" aria-expanded="false" aria-haspopup="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>
      <!-- theme segmented control -->
      <div class="theme-seg" role="group" aria-label="主题">
        <button data-theme="dark"  aria-pressed="true">Dark</button>
        <button data-theme="light" aria-pressed="false">Light</button>
        <button data-theme="glass" aria-pressed="false">Glass</button>
      </div>
    </div>
  </header>

  <!-- History dropdown -->
  <div class="history-dropdown" id="history-dropdown" role="dialog" aria-label="历史记录" aria-modal="false">
    <div class="history-head">
      <span>历史记录</span>
      <button class="icon-btn" id="history-clear" aria-label="清空历史">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
    <div class="history-list" id="history-list" role="list"></div>
  </div>

  <!-- Main grid -->
  <div class="main-grid">

    <!-- ── Left Panel ─────────────────────────────────────────────── -->
    <section class="left-panel" aria-label="表达式配置">

      <!-- Expression editor -->
      <div class="expr-area">
        <label for="expr-ta" class="expr-label">管道表达式</label>
        <textarea
          id="expr-ta" class="expr-textarea"
          rows="3" spellcheck="false"
          aria-label="管道表达式输入"
          aria-describedby="expr-msg"
          placeholder="$1;$2 |> expr($1 + $2) |> string.format(&quot;%.2f&quot;, $1)"
        ></textarea>
        <!-- A6: aria-live so screen readers announce validation changes -->
        <div id="expr-msg" class="inline-msg" role="status" aria-live="polite"></div>
      </div>

      <!-- Operator chip panel (collapsible) -->
      <div class="panel">
        <button class="panel-head" id="op-head" aria-expanded="true" aria-controls="op-body">
          <span>操作符面板</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" class="chevron">
            <path d="M2 4l4 4 4-4"/>
          </svg>
        </button>
        <div class="panel-body" id="op-body">
          <div id="op-chips"></div>
        </div>
      </div>

      <!-- Parameter rows -->
      <div id="param-section" style="display:none;">
        <div class="section-label" style="margin-bottom:var(--space-2)">输入参数</div>
        <div class="param-rows" id="param-rows"></div>
      </div>

      <!-- Template variable panel (collapsible) -->
      <div class="panel" id="tpl-panel" style="display:none;">
        <button class="panel-head" id="tpl-head" aria-expanded="false" aria-controls="tpl-body">
          <span>模板变量</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" class="chevron">
            <path d="M2 4l4 4 4-4"/>
          </svg>
        </button>
        <div class="panel-body collapsed" id="tpl-body">
          <div id="tpl-rows"></div>
        </div>
      </div>

      <!-- Examples (collapsible) -->
      <div class="panel">
        <button class="panel-head" id="ex-head" aria-expanded="false" aria-controls="ex-body">
          <span>内置示例</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" class="chevron">
            <path d="M2 4l4 4 4-4"/>
          </svg>
        </button>
        <div class="panel-body collapsed" id="ex-body">
          <div class="examples-grid" id="examples"></div>
        </div>
      </div>

      <!-- Mode tabs + execute -->
      <div>
        <div class="mode-tabs" role="tablist" aria-label="运行模式">
          <button class="mode-tab" role="tab" id="tab-debug" aria-selected="true" aria-controls="panel-debug">调试</button>
          <button class="mode-tab" role="tab" id="tab-batch" aria-selected="false" aria-controls="panel-batch">批量</button>
        </div>

        <!-- Debug tabpanel -->
        <div class="tabpanel" id="panel-debug" role="tabpanel" aria-labelledby="tab-debug">
          <div class="execute-row" style="margin-bottom:var(--space-2)">
            <button class="btn-primary" id="run-debug-btn" style="flex:1">
              执行（Ctrl+Enter）
            </button>
          </div>
          <div id="debug-output"></div>
        </div>

        <!-- Batch tabpanel -->
        <div class="tabpanel" id="panel-batch" role="tabpanel" aria-labelledby="tab-batch" hidden>
          <div class="execute-row">
            <button class="btn-primary" id="run-batch-btn" style="flex:1">
              批量执行（F5）
            </button>
          </div>
        </div>
      </div>

    </section>

    <!-- ── Right Panel ────────────────────────────────────────────── -->
    <section class="right-panel" aria-label="执行结果">

      <!-- Test case input -->
      <div>
        <label for="tc-ta" class="section-label" style="display:block;margin-bottom:var(--space-2)">
          批量测试用例
        </label>
        <textarea
          id="tc-ta" class="tc-textarea"
          rows="6" spellcheck="false"
          aria-label="批量测试用例，每行一组，空格分隔，最后一列为期望输出"
          placeholder="# 每行：输入1 输入2 … 期望输出&#10;3 4 7&#10;10 5 50"
        ></textarea>
        <!-- A6: tc parse errors -->
        <div id="tc-msg" class="inline-msg" role="status" aria-live="polite" style="margin-top:4px"></div>
      </div>

      <!-- Stats cards -->
      <div class="stat-cards" id="stat-cards" aria-label="统计信息">
        <div class="stat-card"><div class="stat-num" id="st-total">—</div><div class="stat-label">总数</div></div>
        <div class="stat-card"><div class="stat-num stat-pass" id="st-pass">—</div><div class="stat-label">匹配</div></div>
        <div class="stat-card"><div class="stat-num stat-fail" id="st-fail">—</div><div class="stat-label">不匹配</div></div>
        <div class="stat-card"><div class="stat-num stat-err"  id="st-err">—</div><div class="stat-label">错误</div></div>
      </div>

      <!-- Pass rate + filter chips -->
      <div class="results-head">
        <button class="pass-badge" id="pass-badge" aria-label="通过率">—</button>
        <div class="filter-chips" role="group" aria-label="结果筛选">
          <button class="filter-chip active" data-filter="all">全部</button>
          <button class="filter-chip" data-filter="match">匹配</button>
          <button class="filter-chip" data-filter="mismatch">不匹配</button>
          <button class="filter-chip" data-filter="error">错误</button>
        </div>
      </div>

      <!-- Virtual scroll table -->
      <div class="vtable-wrap" aria-label="批量结果表格">
        <div class="vtable-head" role="row" aria-hidden="true">
          <div class="vtable-head-cell">#</div>
          <div class="vtable-head-cell">输入</div>
          <div class="vtable-head-cell">输出 / 期望</div>
          <div class="vtable-head-cell">状态</div>
        </div>
        <div class="vtable-scroller" id="vtable-scroller"
             role="table" aria-label="批量执行结果"
             aria-rowcount="0" tabindex="0">
          <div class="vtable-spacer" id="vtable-spacer" aria-hidden="true"></div>
          <div class="vtable-rows" id="vtable-rows" role="rowgroup"></div>
        </div>
      </div>

    </section>
  </div>

  <!-- Toast — A7: role="status" aria-live="polite" -->
  <div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>
</div>
`;

// ── Web Component ─────────────────────────────────────────────────────────────
class PipeBatchEvaluator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // State
    this._expr        = '';
    this._parsed      = null;
    this._inputValues = [];
    this._badgeTypes  = [];
    this._tplVars     = new Map();
    this._testCases   = [];
    this._results     = [];
    this._filter      = 'all';
    this._mode        = 'debug';
    this._historyOpen = false;
    this._history     = [];
    this._touched     = new Set();
    this._debounceTimer = null;
    this._toastTimer    = null;

    this._onMessage  = this._handleMessage.bind(this);
    this._onKeyDown  = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${HTML}`;
    this._bindEls();
    this._renderOpChips();
    this._renderExamples();
    this._restoreState();
    this._setupListeners();
    window.addEventListener('message', this._onMessage);
    document.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage);
    document.removeEventListener('keydown', this._onKeyDown);
    clearTimeout(this._debounceTimer);
    clearTimeout(this._toastTimer);
  }

  // ── Element references ────────────────────────────────────────────────────
  _$ = (id) => this.shadowRoot.getElementById(id);

  _bindEls() {
    this._exprTa    = this._$('expr-ta');
    this._exprMsg   = this._$('expr-msg');
    this._paramRows = this._$('param-rows');
    this._paramSec  = this._$('param-section');
    this._tplPanel  = this._$('tpl-panel');
    this._tplRows   = this._$('tpl-rows');
    this._tcTa      = this._$('tc-ta');
    this._tcMsg     = this._$('tc-msg');
    this._debugOut  = this._$('debug-output');
    this._passBadge = this._$('pass-badge');
    this._scroller  = this._$('vtable-scroller');
    this._spacer    = this._$('vtable-spacer');
    this._rowsEl    = this._$('vtable-rows');
    this._histDropdown = this._$('history-dropdown');
    this._histList  = this._$('history-list');
    this._histBtn   = this._$('history-btn');
    this._toast     = this._$('toast');
    this._shell     = this.shadowRoot.querySelector('.app-shell');
  }

  // ── Event setup ───────────────────────────────────────────────────────────
  _setupListeners() {
    const sr = this.shadowRoot;

    // Expression textarea — debounced validation
    this._exprTa.addEventListener('input', () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._validateExpr(), 300);
    });

    // Collapsible panels
    sr.getElementById('op-head').addEventListener('click', () => this._togglePanel('op-head', 'op-body'));
    sr.getElementById('tpl-head').addEventListener('click', () => this._togglePanel('tpl-head', 'tpl-body'));
    sr.getElementById('ex-head').addEventListener('click', () => this._togglePanel('ex-head', 'ex-body'));

    // Mode tabs
    sr.getElementById('tab-debug').addEventListener('click', () => this._switchMode('debug'));
    sr.getElementById('tab-batch').addEventListener('click', () => this._switchMode('batch'));

    // Execute buttons
    sr.getElementById('run-debug-btn').addEventListener('click', () => this._runDebug());
    sr.getElementById('run-batch-btn').addEventListener('click', () => this._runBatch());

    // Test case textarea
    this._tcTa.addEventListener('input', () => this._parseTc());

    // History
    this._histBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleHistory();
    });
    sr.getElementById('history-clear').addEventListener('click', () => {
      this._history = [];
      this._saveHistory();
      this._renderHistory();
      this._showToast('历史已清空');
    });

    // Filter chips
    sr.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filter = btn.dataset.filter;
        sr.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.filter === this._filter));
        this._renderVtable();
      });
    });

    // Pass badge: toggle detail / summary
    this._passBadge.addEventListener('click', () => {
      const f = this._filter === 'mismatch' ? 'all' : 'mismatch';
      this._filter = f;
      sr.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
      this._renderVtable();
    });

    // Theme
    sr.querySelectorAll('.theme-seg button').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.theme;
        this._shell.setAttribute('data-theme', t);
        sr.querySelectorAll('.theme-seg button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        try { localStorage.setItem(LS_KEYS.THEME, t); } catch {}
      });
    });

    // Virtual scroll
    this._scroller.addEventListener('scroll', () => this._renderVtableRows());

    // Close history when clicking outside
    document.addEventListener('click', () => {
      if (this._historyOpen) this._closeHistory();
    });
    this._histDropdown.addEventListener('click', e => e.stopPropagation());
  }

  // ── Collapsible panels ────────────────────────────────────────────────────
  _togglePanel(headId, bodyId) {
    const head = this._$(headId);
    const body = this._$(bodyId);
    const open = head.getAttribute('aria-expanded') === 'true';
    head.setAttribute('aria-expanded', String(!open));
    body.classList.toggle('collapsed', open);
    try { localStorage.setItem(`${headId}-open`, String(!open)); } catch {}
  }

  // ── Expression validation ─────────────────────────────────────────────────
  _validateExpr() {
    const raw = this._exprTa.value.trim();
    if (!raw) {
      this._parsed = null;
      this._exprMsg.textContent = '';
      this._exprMsg.className = 'inline-msg';
      this._exprTa.className = 'expr-textarea';
      this._paramSec.style.display = 'none';
      this._tplPanel.style.display = 'none';
      return;
    }

    const v = validateExpr(raw);
    if (v.ok) {
      this._parsed = v.parsed;
      this._expr   = raw;
      this._exprMsg.textContent = v.msg;
      this._exprMsg.className = 'inline-msg ok';
      this._exprTa.className  = 'expr-textarea valid';
      this._syncParams();
      this._syncTplPanel();
    } else {
      this._parsed = null;
      this._exprMsg.textContent = v.msg;
      this._exprMsg.className = 'inline-msg err';
      this._exprTa.className  = 'expr-textarea invalid';
      this._paramSec.style.display = 'none';
    }
  }

  // ── Parameter rows ────────────────────────────────────────────────────────
  _syncParams() {
    if (!this._parsed) { this._paramSec.style.display = 'none'; return; }
    const n = this._parsed.inputs.length;
    // preserve existing values
    while (this._inputValues.length < n) this._inputValues.push('');
    while (this._badgeTypes.length  < n) this._badgeTypes.push('sync');

    this._paramSec.style.display = '';
    this._paramRows.innerHTML = '';

    this._parsed.inputs.forEach((_, i) => {
      const row = document.createElement('div');
      row.className = 'param-row';

      // A4: badge-select aria-label
      const badgeOpts = Object.entries(BADGE_LABEL).map(([v, l]) =>
        `<option value="${v}"${this._badgeTypes[i] === v ? ' selected' : ''}>${l}</option>`
      ).join('');

      row.innerHTML = `
        <label for="p${i}" class="param-label">$${i + 1}</label>
        <input id="p${i}" class="param-input"
               type="text" value="${esc(this._inputValues[i] ?? '')}"
               aria-label="参数 $${i + 1} 的值"
               placeholder="输入值…">
        <select class="badge-select" data-idx="${i}"
                aria-label="参数 $${i + 1} 的类型标记">
          ${badgeOpts}
        </select>
      `;
      this._paramRows.appendChild(row);

      row.querySelector('input').addEventListener('input', (e) => {
        this._inputValues[i] = e.target.value;
        this._touched.add(i);
        this._checkParamWarnings();
      });
      row.querySelector('select').addEventListener('change', (e) => {
        this._badgeTypes[i] = e.target.value;
      });
    });

    this._checkParamWarnings();
  }

  _checkParamWarnings() {
    if (!this._parsed) return;
    this._paramRows.querySelectorAll('.param-input').forEach((inp, i) => {
      const empty = inp.value.trim() === '';
      const warn  = empty && this._touched.has(i);
      inp.classList.toggle('warn', warn);
      inp.setAttribute('aria-invalid', String(warn));
    });
  }

  // ── Template variable panel ───────────────────────────────────────────────
  _syncTplPanel() {
    // find ${key} placeholders in expression
    const raw = this._exprTa.value;
    const keys = [...raw.matchAll(/\$\{([^}]+)\}/g)].map(m => m[1]);
    if (!keys.length) { this._tplPanel.style.display = 'none'; return; }

    this._tplPanel.style.display = '';
    this._tplRows.innerHTML = '';

    keys.forEach(k => {
      if (!this._tplVars.has(k)) this._tplVars.set(k, '');
      const row = document.createElement('div');
      row.className = 'tpl-row';
      row.innerHTML = `
        <label for="tpl-${k}" class="tpl-key">\${${k}}</label>
        <input id="tpl-${k}" class="tpl-val" type="text"
               value="${esc(this._tplVars.get(k))}"
               aria-label="模板变量 ${k} 的值">
      `;
      this._tplRows.appendChild(row);
      row.querySelector('input').addEventListener('input', (e) => {
        this._tplVars.set(k, e.target.value);
      });
    });
  }

  // ── Operator chips ────────────────────────────────────────────────────────
  _renderOpChips() {
    const container = this._$('op-chips');
    container.innerHTML = '';
    const dotMap = { '--primary': 'chip-dot-primary', '--success': 'chip-dot-success', '--warning': 'chip-dot-warning' };

    OP_GROUPS.forEach(group => {
      const div = document.createElement('div');
      div.className = `chip-group ${dotMap[group.dot] ?? ''}`;
      div.innerHTML = `<div class="chip-group-name">${group.name}</div>`;
      const chips = document.createElement('div');
      chips.className = 'chips';
      group.chips.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = c.text;
        btn.title = c.sig;
        btn.setAttribute('aria-label', `插入 ${c.text}: ${c.sig}`);
        btn.addEventListener('click', () => this._insertChip(c.text));
        chips.appendChild(btn);
      });
      div.appendChild(chips);
      container.appendChild(div);
    });
  }

  _insertChip(text) {
    const ta = this._exprTa;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const cur   = ta.value;
    ta.value = cur.slice(0, start) + text + cur.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
    clearTimeout(this._debounceTimer);
    this._validateExpr();
  }

  // ── Examples ──────────────────────────────────────────────────────────────
  _renderExamples() {
    const container = this._$('examples');
    EXAMPLES.forEach(ex => {
      const card = document.createElement('button');
      card.className = 'example-card';
      card.setAttribute('aria-label', `加载示例：${ex.title}`);
      card.innerHTML = `
        <div class="example-title">${esc(ex.title)}</div>
        <div class="example-expr">${esc(ex.expr)}</div>
      `;
      card.addEventListener('click', () => {
        this._exprTa.value = ex.expr;
        this._inputValues  = [...ex.vals];
        this._validateExpr();
        // collapse examples panel
        this._$(  'ex-head').setAttribute('aria-expanded', 'false');
        this._$('ex-body').classList.add('collapsed');
        this._showToast(`已加载：${ex.title}`);
      });
      container.appendChild(card);
    });
  }

  // ── Mode switch ───────────────────────────────────────────────────────────
  _switchMode(mode) {
    this._mode = mode;
    const isDebug = mode === 'debug';
    const tabD = this._$('tab-debug');
    const tabB = this._$('tab-batch');
    const panD = this._$('panel-debug');
    const panB = this._$('panel-batch');

    tabD.setAttribute('aria-selected', String(isDebug));
    tabB.setAttribute('aria-selected', String(!isDebug));
    panD.hidden = !isDebug;
    panB.hidden = isDebug;
  }

  // ── Debug run ─────────────────────────────────────────────────────────────
  _runDebug() {
    if (!this._parsed) {
      this._showToast('请先输入有效的管道表达式');
      return;
    }
    const inputs = this._inputValues.map(v => String(v ?? ''));
    const res = _ev.evaluate(this._parsed, inputs, this._tplVars);

    const out = this._debugOut;
    if (!res.success) {
      out.innerHTML = `<div class="stage-err" role="alert">错误：${esc(res.error)}</div>`;
      return;
    }

    // pipeline stages
    const stagesHtml = (res.stageResults ?? []).map((s, i) => {
      const cls = typeChipClass(s.value);
      const chip = cls ? `<span class="type-chip ${cls}">${typeof s.value}</span>` : '';
      return `
        <div class="stage-card" role="row">
          <span class="stage-arrow" aria-hidden="true">${i === 0 ? '▶' : '↓'}</span>
          <span class="stage-fn">${esc(s.fn)}</span>
          ${chip}
          <span class="stage-result">${esc(fmtVal(s.value))}</span>
        </div>`;
    }).join('');

    const valCls = typeChipClass(res.result);
    out.innerHTML = `
      <div class="pipeline-stages" role="table" aria-label="管道执行步骤">
        ${stagesHtml}
        <div class="stage-card" role="row" style="border-color:var(--primary)">
          <span class="stage-arrow" aria-hidden="true">✓</span>
          <span style="font-weight:600">最终结果</span>
          ${valCls ? `<span class="type-chip ${valCls}">${typeof res.result}</span>` : ''}
          <span class="stage-result" style="color:var(--success)">${esc(fmtVal(res.result))}</span>
        </div>
      </div>`;

    // push to history
    this._pushHistory({ expr: this._exprTa.value, result: fmtVal(res.result), ts: Date.now() });

    this.dispatchEvent(new CustomEvent('pipe-result-ready', {
      bubbles: true, composed: true,
      detail: { expr: this._expr, result: res.result, inputs },
    }));
  }

  // ── Batch run ─────────────────────────────────────────────────────────────
  _parseTc() {
    const { cases, errors } = parseTestCaseText(this._tcTa.value);
    this._testCases = cases;
    if (errors.length) {
      this._tcMsg.textContent = `⚠ ${errors.length} 行格式错误`;
      this._tcMsg.className = 'inline-msg warn';
    } else if (cases.length) {
      this._tcMsg.textContent = `✓ ${cases.length} 条用例`;
      this._tcMsg.className = 'inline-msg ok';
    } else {
      this._tcMsg.textContent = '';
      this._tcMsg.className = 'inline-msg';
    }
  }

  _runBatch() {
    if (!this._parsed) { this._showToast('请先输入有效的管道表达式'); return; }
    if (!this._testCases.length) { this._showToast('请输入批量测试用例'); return; }

    this._results = this._testCases.map(tc => {
      const inputs = tc.inputs.map(String);
      const res = _ev.evaluate(this._parsed, inputs, this._tplVars);
      if (!res.success) return { ...tc, status: 'error', actual: res.error };
      const actual   = res.result;
      const match    = normOut(actual) === normOut(tc.expectedOutput);
      return { ...tc, status: match ? 'match' : 'mismatch', actual };
    });

    this._updateStats();
    this._renderVtable();

    const pass = this._results.filter(r => r.status === 'match').length;
    const total = this._results.length;
    this._pushHistory({ expr: this._exprTa.value, result: `${pass}/${total}`, ts: Date.now() });

    this.dispatchEvent(new CustomEvent('pipe-batch-done', {
      bubbles: true, composed: true,
      detail: { stats: { total, pass, fail: total - pass }, results: this._results },
    }));
  }

  // ── Stats update ──────────────────────────────────────────────────────────
  _updateStats() {
    const rs = this._results;
    const pass = rs.filter(r => r.status === 'match').length;
    const fail = rs.filter(r => r.status === 'mismatch').length;
    const err  = rs.filter(r => r.status === 'error').length;
    const total = rs.length;

    this._$('st-total').textContent = total || '—';
    this._$('st-pass').textContent  = pass  || '—';
    this._$('st-fail').textContent  = fail  || '—';
    this._$('st-err').textContent   = err   || '—';

    const pct = total ? Math.round(pass / total * 100) : null;
    const badge = this._passBadge;
    if (pct === null) {
      badge.textContent = '—';
      badge.className = 'pass-badge';
      badge.setAttribute('aria-label', '通过率：暂无数据');
    } else {
      badge.textContent = `${pct}% 通过`;
      badge.className = `pass-badge ${pct >= 100 ? 'good' : 'bad'}`;
      badge.setAttribute('aria-label', `通过率 ${pct}%，点击筛选不匹配项`);
    }
  }

  // ── Virtual scroll ────────────────────────────────────────────────────────
  _getFiltered() {
    if (this._filter === 'all') return this._results;
    return this._results.filter(r => r.status === this._filter);
  }

  _renderVtable() {
    const rows = this._getFiltered();
    const { ROW_H, BUF } = VSCROLL;
    const totalH = rows.length * ROW_H;
    this._spacer.style.height = totalH + 'px';
    this._scroller.setAttribute('aria-rowcount', String(rows.length));
    if (!rows.length) {
      this._rowsEl.innerHTML = `<div class="vtable-empty">无结果</div>`;
    } else {
      this._renderVtableRows();
    }
  }

  _renderVtableRows() {
    const rows    = this._getFiltered();
    const { ROW_H, BUF } = VSCROLL;
    const scrollTop = this._scroller.scrollTop;
    const clientH   = this._scroller.clientHeight;
    const startIdx  = Math.max(0, Math.floor(scrollTop / ROW_H) - BUF);
    const endIdx    = Math.min(rows.length, Math.ceil((scrollTop + clientH) / ROW_H) + BUF);

    let html = '';
    for (let i = startIdx; i < endIdx; i++) {
      const r = rows[i];
      const statusIcon = r.status === 'match' ? '✓' : r.status === 'error' ? '⚠' : '✗';
      const statusCls  = r.status === 'match' ? 'result-ok' : r.status === 'error' ? 'result-err' : 'result-fail';
      const inputStr   = r.inputs.map(fmtVal).join(', ');
      const actualStr  = r.status === 'error' ? r.actual : fmtVal(r.actual);
      const expStr     = r.expectedOutput;

      html += `
        <div class="vtable-row ${r.status}" style="top:${i * ROW_H}px;position:absolute;left:0;right:0"
             role="row" aria-rowindex="${i + 1}">
          <div class="vtable-cell vtable-num" role="cell">${i + 1}</div>
          <div class="vtable-cell" role="cell" title="${esc(inputStr)}">${esc(inputStr)}</div>
          <div class="vtable-cell" role="cell" title="${esc(actualStr)} / ${esc(expStr)}">
            <span class="${statusCls}">${esc(actualStr)}</span>
            ${r.status !== 'match' ? `<span style="color:var(--foreground-muted)"> / ${esc(expStr)}</span>` : ''}
          </div>
          <div class="vtable-cell ${statusCls}" role="cell" aria-label="${r.status}">
            ${statusIcon}
          </div>
        </div>`;
    }
    this._rowsEl.innerHTML = html;
    this._rowsEl.style.position = 'relative';
    this._rowsEl.style.height   = rows.length * ROW_H + 'px';
  }

  // ── History ───────────────────────────────────────────────────────────────
  _pushHistory(entry) {
    this._history = [entry, ...this._history.filter(h => h.expr !== entry.expr)].slice(0, HISTORY_MAX);
    this._saveHistory();
    this._renderHistory();
  }

  _saveHistory() {
    try { localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(this._history)); } catch {}
  }

  _renderHistory() {
    const list = this._histList;
    if (!this._history.length) {
      list.innerHTML = `<div class="history-empty">暂无历史记录</div>`;
      return;
    }
    list.innerHTML = '';
    this._history.forEach((h, i) => {
      // A3: <button> instead of div[onclick] — no string interpolation, use data-index
      const btn = document.createElement('button');
      btn.className = 'history-item';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `恢复表达式：${h.expr}`);
      btn.dataset.index = String(i);
      btn.innerHTML = `
        <span class="history-expr">${esc(h.expr)}</span>
        <span class="history-meta">${esc(h.result)} · ${relTime(h.ts)}</span>
      `;
      btn.addEventListener('click', () => {
        this._exprTa.value = h.expr;
        this._validateExpr();
        this._closeHistory();
        this._showToast('已恢复表达式');
      });
      list.appendChild(btn);
    });
  }

  _toggleHistory() {
    this._historyOpen ? this._closeHistory() : this._openHistory();
  }

  _openHistory() {
    this._historyOpen = true;
    this._histDropdown.classList.add('open');
    this._histBtn.setAttribute('aria-expanded', 'true');
    this._renderHistory();
  }

  _closeHistory() {
    this._historyOpen = false;
    this._histDropdown.classList.remove('open');
    this._histBtn.setAttribute('aria-expanded', 'false');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  _showToast(msg, dur = 2200) {
    clearTimeout(this._toastTimer);
    this._toast.textContent = msg;
    this._toast.classList.add('show');
    this._toastTimer = setTimeout(() => this._toast.classList.remove('show'), dur);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  _handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this._runDebug(); }
    if (e.key === 'F5') { e.preventDefault(); this._runBatch(); }
    if (e.key === 'Escape' && this._historyOpen) this._closeHistory();
  }

  // ── postMessage (VS Code Webview) ─────────────────────────────────────────
  _handleMessage(e) {
    const { type, payload } = e.data ?? {};
    if (type === 'setTemplateVars' && payload && typeof payload === 'object') {
      this._tplVars = new Map(Object.entries(payload));
      this._syncTplPanel();
    } else if (type === 'setExpression' && typeof payload === 'string') {
      this._exprTa.value = payload;
      this._validateExpr();
    } else if (type === 'setBadgeTypes' && Array.isArray(payload)) {
      this._badgeTypes = payload;
      this._syncParams();
    }
  }

  // ── State persistence ─────────────────────────────────────────────────────
  _restoreState() {
    try {
      const h = localStorage.getItem(LS_KEYS.HISTORY);
      if (h) this._history = JSON.parse(h);
    } catch {}

    try {
      const t = localStorage.getItem(LS_KEYS.THEME);
      if (t) {
        this._shell.setAttribute('data-theme', t);
        this.shadowRoot.querySelectorAll('.theme-seg button').forEach(b => {
          b.setAttribute('aria-pressed', String(b.dataset.theme === t));
        });
      }
    } catch {}

    // restore panel open states
    [['op-head', 'op-body'], ['tpl-head', 'tpl-body'], ['ex-head', 'ex-body']].forEach(([hId, bId]) => {
      try {
        const open = localStorage.getItem(`${hId}-open`);
        if (open === 'true') {
          this._$(hId).setAttribute('aria-expanded', 'true');
          this._$(bId).classList.remove('collapsed');
        } else if (open === 'false') {
          this._$(hId).setAttribute('aria-expanded', 'false');
          this._$(bId).classList.add('collapsed');
        }
      } catch {}
    });
  }
}

customElements.define('pipe-batch-evaluator', PipeBatchEvaluator);

export { PipeBatchEvaluator };
