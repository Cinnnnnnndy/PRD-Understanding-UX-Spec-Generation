/**
 * <smc-calculator> · SMC 偏移量计算器 Web Component
 *
 * 使用方式（宿主页需提供 PTO 设计系统 CSS 或通过 CSS 自定义属性注入 token）：
 *   <script type="module" src="src/components/SmcCalculator/index.js"></script>
 *   <smc-calculator></smc-calculator>
 *
 * 事件输出（向外广播结果）：
 *   'smc-apply'  →  event.detail = { word: number, fields: Record<FieldKey, number> }
 *   'smc-copy'   →  event.detail = { text: string, fmt: CopyFmt }
 *
 * 属性：
 *   sample-word  设置示例值（默认 0x18040600）
 */

import {
  FIELDS, ORDER, BAND, SEGMENTED, FUNC_TABLE,
  FUNC_OEM_MIN, FUNC_OEM_MAX, COPY_FMT_LABEL,
  HISTORY_STORAGE_KEY, HISTORY_MAX,
} from '../../constants/enums.js';
import { composeWord, decomposeWord, parseLoose, anyFieldSet, fieldOfBit } from '../../utils/smcCodec.js';
import { pad, fmtHex, fmtFieldHex, formatOutput, describeFuncCode, fmtHistoryTime } from '../../utils/formatters.js';

const SAMPLE_WORD_DEFAULT = 0x18040600;

class SmcCalculator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** @type {Record<string, number|null>} */
    this._fields = { func: null, cmd: null, ms: null, rw: null, param: null };

    /** @type {Array<{word:number, parts:object, ts:number}>} */
    this._history = [];

    /** @type {string} */
    this._fmt = 'hex';

    /** @type {number|null} */
    this._toastTimer = null;
  }

  connectedCallback() {
    this._render();
    this._loadHistory();
    this._refresh();
  }

  // ─── 渲染 ────────────────────────────────────────────────────────────────────

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      ${this._template()}
    `;
    this._bindEvents();
    this._buildGrid();
    this._buildFields();
  }

  _styles() {
    return `
      :host {
        display: block;
        font-family: var(--font-sans, 'Inter', sans-serif);
        font-size: var(--font-size-body-md, 14px);
        color: var(--foreground, rgba(255,255,255,0.90));
        background: var(--background, #101010);
      }
      /* module-local 布局（视觉值全部来自 PTO token） */
      .smc-wrap { max-width: 980px; margin: 0 auto; padding: var(--space-4, 16px); display: flex; flex-direction: column; gap: var(--space-4, 16px); }
      .smc-head-sub { font-size: var(--font-size-body-sm, 12px); color: var(--foreground-secondary, rgba(255,255,255,0.60)); }

      /* 顶部输入区 */
      .smc-offset-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: var(--space-3, 12px); align-items: stretch; }
      @media (max-width: 760px) { .smc-offset-row { grid-template-columns: 1fr; } }
      .smc-owrap { background: var(--input-bg, var(--surface-1, #161616)); border: 1px solid var(--input-border, rgba(255,255,255,0.10)); border-radius: var(--input-radius, var(--radius-md, 8px)); padding: var(--space-2, 8px) var(--space-3, 12px); display: flex; flex-direction: column; gap: var(--space-1, 4px); }
      .smc-owrap:focus-within { border-color: var(--primary, #4369EF); box-shadow: 0 0 0 3px var(--focus-ring, rgba(67,105,239,0.42)); }
      .smc-owrap.invalid { border-color: var(--danger, #FF4B7B); box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger, #FF4B7B) 14%, transparent); }
      .smc-otag { display: flex; justify-content: space-between; font-size: 11px; letter-spacing: 0.5px; color: var(--foreground-muted, rgba(255,255,255,0.40)); font-family: var(--font-mono, monospace); text-transform: uppercase; }
      .smc-osync { color: var(--foreground-muted, rgba(255,255,255,0.40)); }
      .smc-owrap.synced .smc-osync { color: var(--primary, #4369EF); }
      .smc-owrap input { background: transparent; border: 0; color: var(--foreground, rgba(255,255,255,0.90)); font-family: var(--font-mono, monospace); font-size: 19px; font-weight: 600; outline: none; width: 100%; }
      .smc-owrap input::placeholder { color: var(--foreground-disabled, rgba(255,255,255,0.25)); }
      .smc-split { position: relative; display: flex; align-items: stretch; }
      .smc-fmt { padding: 0 var(--space-2, 8px); border-left: 1px solid var(--border-default, rgba(255,255,255,0.10)); border-radius: 0 var(--radius-md, 8px) var(--radius-md, 8px) 0; }
      .smc-oerr { min-height: 16px; font-size: var(--font-size-body-sm, 12px); color: var(--danger, #FF4B7B); font-family: var(--font-mono, monospace); margin-top: var(--space-2, 8px); }

      /* 位图 */
      .smc-bitwrap { overflow-x: auto; padding: var(--space-4, 16px); }
      .smc-grid { display: grid; grid-template-columns: repeat(32, minmax(18px, 1fr)); min-width: 660px; }
      .smc-band { padding: var(--space-1, 4px) 0; text-align: center; font-size: 11px; font-weight: 700; color: #fff; border-radius: 6px 6px 0 0; margin-right: 2px; white-space: nowrap; overflow: hidden; }
      .smc-band:last-of-type { margin-right: 0; }
      .smc-band .si { font-family: var(--font-mono, monospace); opacity: 0.75; margin-left: var(--space-1, 4px); }
      .smc-cell { height: 28px; border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); border-right: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono, monospace); font-size: 12px; font-weight: 600; color: var(--foreground-muted, rgba(255,255,255,0.40)); transition: background 0.15s, color 0.15s; }
      .smc-cell.bound { border-right: 1px solid var(--border-strong, rgba(255,255,255,0.16)); }
      .smc-cell:last-child { border-right: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); }
      .smc-cell.on { color: var(--foreground, rgba(255,255,255,0.90)); background: color-mix(in srgb, var(--cell-hue) 22%, transparent); border-color: color-mix(in srgb, var(--cell-hue) 50%, transparent); }
      .smc-pos { text-align: center; font-family: var(--font-mono, monospace); font-size: 11px; color: var(--foreground-muted, rgba(255,255,255,0.40)); padding-top: var(--space-1, 4px); }
      .smc-pos.bound { color: var(--foreground, rgba(255,255,255,0.90)); font-weight: 700; }
      .smc-legend { display: flex; flex-wrap: wrap; gap: var(--space-3, 12px); margin-top: var(--space-3, 12px); font-size: 11px; color: var(--foreground-secondary, rgba(255,255,255,0.60)); font-family: var(--font-mono, monospace); }
      .smc-legend span { display: inline-flex; align-items: center; gap: var(--space-1, 4px); }
      .smc-sw { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

      /* 字段卡 */
      .smc-frow { display: grid; gap: var(--space-3, 12px); }
      .smc-frow + .smc-frow { margin-top: var(--space-3, 12px); }
      .smc-frow.r1 { grid-template-columns: 6fr 16fr; }
      .smc-frow.r2 { grid-template-columns: 1fr 1fr 2fr; }
      @media (max-width: 760px) { .smc-frow.r1, .smc-frow.r2 { grid-template-columns: 1fr; } }
      .smc-fc { background: var(--surface-2, #1c1c1c); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); border-radius: var(--radius-lg, 12px); padding: var(--space-3, 12px); }
      .smc-fc:focus-within { background: var(--surface-3, #262626); }
      .smc-fhead { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2, 8px); margin-bottom: var(--space-2, 8px); }
      .smc-flabel { font-size: 14px; font-weight: 600; color: var(--foreground, rgba(255,255,255,0.90)); display: inline-flex; align-items: center; gap: var(--space-1, 4px); }
      .smc-fmeta { font-size: 11px; color: var(--foreground-muted, rgba(255,255,255,0.40)); font-family: var(--font-mono, monospace); white-space: nowrap; }
      .smc-fin-wrap { display: flex; gap: var(--space-1, 4px); }
      .smc-fin { flex: 1; min-width: 0; background: var(--input-bg, var(--surface-1, #161616)); border: 1px solid var(--input-border, rgba(255,255,255,0.10)); border-radius: var(--input-radius, var(--radius-md, 8px)); color: var(--foreground, rgba(255,255,255,0.90)); font-family: var(--font-mono, monospace); font-size: 14px; font-weight: 600; padding: var(--space-2, 8px) var(--space-3, 12px); outline: none; }
      .smc-fin:focus { border-color: var(--primary, #4369EF); box-shadow: 0 0 0 3px var(--focus-ring, rgba(67,105,239,0.42)); }
      .smc-fin.invalid { border-color: var(--danger, #FF4B7B); box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger, #FF4B7B) 14%, transparent); }
      .smc-fin::placeholder { color: var(--foreground-disabled, rgba(255,255,255,0.25)); }
      .smc-ffoot { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2, 8px); margin-top: var(--space-2, 8px); min-height: 22px; }
      .smc-pair { display: inline-flex; gap: var(--space-2, 8px); }
      .smc-sem { font-size: 14px; color: var(--foreground-muted, rgba(255,255,255,0.40)); font-style: italic; }
      .smc-sem.warn { color: var(--warning, #FFAA3B); font-style: normal; }
      .smc-sem.err  { color: var(--danger,  #FF4B7B); font-style: normal; }

      /* hint 浮层 */
      .smc-hint { position: relative; cursor: help; border-bottom: 1px dotted var(--foreground-muted, rgba(255,255,255,0.40)); }
      .smc-hint:hover .smc-pop,
      .smc-hint:focus-within .smc-pop { opacity: 1; transform: none; pointer-events: auto; }
      .smc-pop { position: absolute; top: calc(100% + var(--space-2, 8px)); left: 0; background: var(--background-elevated, #141414); border: 1px solid var(--border-default, rgba(255,255,255,0.10)); border-radius: var(--radius-md, 8px); padding: var(--space-3, 12px); min-width: 260px; z-index: 12; box-shadow: var(--shadow-lg, 0 12px 30px rgba(0,0,0,0.42)); opacity: 0; transform: translateY(-4px); pointer-events: none; transition: opacity 0.15s, transform 0.15s; font-weight: 500; }
      .smc-pop .ph { font-size: 11px; color: var(--foreground-muted, rgba(255,255,255,0.40)); font-family: var(--font-mono, monospace); margin-bottom: var(--space-2, 8px); display: block; }
      .smc-pop ul { list-style: none; margin: 0; padding: 0; font-family: var(--font-mono, monospace); line-height: 1.7; color: var(--foreground, rgba(255,255,255,0.90)); }
      .smc-pop li .k { color: var(--warning, #FFAA3B); display: inline-block; min-width: 48px; }
      .smc-pop li .d { color: var(--foreground-secondary, rgba(255,255,255,0.60)); margin-left: var(--space-1, 4px); }

      /* segmented-control（最小实现，不依赖宿主 PTO class） */
      .seg-ctrl { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); background: rgba(255,255,255,0.04); }
      .seg-btn { min-width: 60px; height: 28px; padding: 0 var(--space-3, 12px); border: 0; border-radius: 6px; background: transparent; color: var(--foreground-secondary, rgba(255,255,255,0.60)); font-size: 13px; font-family: var(--font-sans, sans-serif); cursor: pointer; transition: background 0.1s, color 0.1s; }
      .seg-btn:hover:not(.is-selected) { background: rgba(255,255,255,0.06); }
      .seg-btn.is-selected { background: rgba(255,255,255,0.90); color: var(--background, #101010); font-weight: 600; }
      .seg-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring, rgba(67,105,239,0.42)); }

      /* stat-chip */
      .stat-chip { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px; background: var(--surface-3, #262626); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); font-family: var(--font-mono, monospace); font-size: 12px; color: var(--foreground, rgba(255,255,255,0.90)); }

      /* 复制按钮组 */
      .smc-split-btn { display: flex; align-items: stretch; }
      .btn-copy-main { flex: 1; height: 40px; padding: 0 var(--space-4, 16px); background: rgba(255,255,255,0.90); color: var(--background, #101010); border: 0; border-radius: var(--radius-md, 8px) 0 0 var(--radius-md, 8px); font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.1s, transform 0.1s; white-space: nowrap; }
      .btn-copy-main:hover:not(:disabled) { background: rgba(255,255,255,0.88); transform: translateY(-1px); }
      .btn-copy-main:active { transform: translateY(0); }
      .btn-copy-main:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .btn-copy-fmt { width: 36px; height: 40px; background: rgba(255,255,255,0.90); color: var(--background, #101010); border: 0; border-left: 1px solid rgba(0,0,0,0.15); border-radius: 0 var(--radius-md, 8px) var(--radius-md, 8px) 0; font-size: 12px; cursor: pointer; }
      .btn-copy-fmt:disabled { opacity: 0.4; cursor: not-allowed; }
      .btn-copy-fmt:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring, rgba(67,105,239,0.42)); }

      /* 格式下拉 */
      .fmt-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 220px; background: var(--background-elevated, #141414); border: 1px solid var(--border-default, rgba(255,255,255,0.10)); border-radius: var(--radius-md, 8px); box-shadow: var(--shadow-lg, 0 12px 30px rgba(0,0,0,0.42)); overflow: hidden; display: none; z-index: 100; }
      .fmt-menu.open { display: block; }
      .fmt-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; background: transparent; border: 0; color: var(--foreground, rgba(255,255,255,0.90)); font-size: 13px; font-family: var(--font-sans, sans-serif); text-align: left; cursor: pointer; }
      .fmt-item:hover { background: rgba(255,255,255,0.06); }
      .fmt-item[role="menuitem"]:focus-visible { outline: none; background: rgba(255,255,255,0.08); }
      .fmt-preview { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--foreground-muted, rgba(255,255,255,0.40)); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* 字段卡 copy btn */
      .btn-field-copy { width: 32px; height: 32px; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm, 6px); color: var(--foreground-secondary, rgba(255,255,255,0.60)); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: color 0.15s, border-color 0.15s; flex-shrink: 0; }
      .btn-field-copy:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: var(--foreground, rgba(255,255,255,0.90)); }
      .btn-field-copy:disabled { opacity: 0.3; cursor: not-allowed; }
      .btn-field-copy.copied { color: var(--success, #04D793); border-color: var(--success, #04D793); }

      /* 历史 */
      .smc-hlist { list-style: none; margin: 0; padding: var(--space-4, 16px); display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); }
      .smc-hempty { font-size: 12px; color: var(--foreground-muted, rgba(255,255,255,0.40)); padding: var(--space-3, 12px) 0; }
      .recent-chip { display: inline-flex; align-items: center; gap: var(--space-2, 8px); padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 999px; font-family: var(--font-mono, monospace); font-size: 12px; color: var(--foreground-secondary, rgba(255,255,255,0.60)); cursor: pointer; transition: background 0.1s, border-color 0.1s; white-space: nowrap; }
      .recent-chip:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); color: var(--foreground, rgba(255,255,255,0.90)); }
      .recent-chip:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring, rgba(67,105,239,0.42)); }
      .smc-hts { color: rgba(255,255,255,0.40); margin-left: var(--space-1, 4px); }

      /* panel-shell (minimal if not inherited from host) */
      .panel { background: var(--background-elevated, #141414); border: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); border-radius: 14px; overflow: hidden; }
      .panel-hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06)); }
      .panel-title { font-size: 14px; font-weight: 600; color: var(--foreground, rgba(255,255,255,0.90)); }
      .panel-body { padding: var(--space-4, 16px); }
      .panel-quiet { background: transparent; border-color: var(--border-subtle, rgba(255,255,255,0.06)); }
      .panel-quiet .panel-hd { border-bottom-color: transparent; }

      /* toast */
      .smc-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(10px); background: var(--background-elevated, #141414); border: 1px solid var(--border-default, rgba(255,255,255,0.10)); border-radius: var(--radius-lg, 12px); padding: var(--space-2, 8px) var(--space-4, 16px); font-family: var(--font-mono, monospace); font-size: 13px; color: var(--foreground, rgba(255,255,255,0.90)); box-shadow: var(--shadow-lg, 0 12px 30px rgba(0,0,0,0.42)); opacity: 0; pointer-events: none; transition: opacity 0.18s, transform 0.18s; z-index: 50; white-space: nowrap; }
      .smc-toast.show { opacity: 1; transform: translateX(-50%); }

      /* util */
      .btn-ghost-sm { background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm, 6px); color: var(--foreground-secondary, rgba(255,255,255,0.60)); font-size: 12px; padding: 3px 8px; cursor: pointer; font-family: inherit; }
      .btn-ghost-sm:hover { background: rgba(255,255,255,0.06); color: var(--foreground, rgba(255,255,255,0.90)); }
      .page-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: var(--space-2, 8px) 0 var(--space-4, 16px); }
      .page-title { font-size: 15px; font-weight: 600; color: var(--foreground, rgba(255,255,255,0.90)); display: inline-flex; align-items: center; gap: 8px; }
      .page-title-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary, #4369EF); display: inline-block; }
      .hd-actions { display: flex; align-items: center; gap: 8px; }
    `;
  }

  _template() {
    return `
      <div class="smc-wrap">

        <!-- 页头 -->
        <div class="page-header">
          <span class="page-title">
            <span class="page-title-dot"></span>
            SMC 偏移量计算器
          </span>
          <span class="smc-head-sub">32-bit 命令字 ↔ 功能码·命令码·MS·RW·参数 双向同步</span>
          <div class="hd-actions">
            <button class="btn-ghost-sm" id="reset" type="button">重置</button>
            <button class="btn-ghost-sm" id="sample" type="button">载入示例</button>
          </div>
        </div>

        <!-- 偏移量面板 -->
        <div class="panel">
          <div class="panel-hd">
            <span class="panel-title">偏移量 · 32-bit</span>
            <span class="smc-head-sub">输入 dec 或 0x hex，两边与字段即时联动</span>
          </div>
          <div class="panel-body">
            <div class="smc-offset-row">
              <div class="smc-owrap" id="hexw">
                <span class="smc-otag"><span>HEX · 0x…</span><span class="smc-osync">●</span></span>
                <input id="hex" placeholder="0x00000000" autocomplete="off" spellcheck="false" aria-label="十六进制偏移量"/>
              </div>
              <div class="smc-owrap" id="decw">
                <span class="smc-otag"><span>DEC · 0–4294967295</span><span class="smc-osync">●</span></span>
                <input id="dec" placeholder="0" autocomplete="off" spellcheck="false" inputmode="numeric" aria-label="十进制偏移量"/>
              </div>
              <div class="smc-split">
                <div class="smc-split-btn">
                  <button class="btn-copy-main" id="copyAll" type="button" disabled aria-label="复制偏移量">复制偏移量</button>
                  <button class="btn-copy-fmt smc-fmt" id="fmBtn" type="button" disabled aria-label="选择复制格式" aria-haspopup="menu" aria-expanded="false">▾</button>
                </div>
                <div class="fmt-menu" id="menu" role="menu" aria-label="复制格式选择">
                  ${Object.entries(COPY_FMT_LABEL).map(([f, label]) => `
                    <button class="fmt-item" role="menuitem" data-f="${f}" type="button">
                      ${label}
                      <span class="fmt-preview" id="pv-${f}">…</span>
                    </button>`).join('')}
                </div>
              </div>
            </div>
            <div class="smc-oerr" id="oerr" role="status" aria-live="polite"></div>
          </div>
        </div>

        <!-- 32-bit 位图 -->
        <div class="panel">
          <div class="panel-hd">
            <span class="panel-title">32-bit 位图</span>
            <span class="smc-head-sub">MSB → LSB · 每格 1 bit · 颜色对应字段</span>
          </div>
          <div class="panel-body smc-bitwrap">
            <div class="smc-grid" id="grid" aria-hidden="true"></div>
            <div class="smc-legend" id="legend"></div>
          </div>
        </div>

        <!-- 字段拆解 -->
        <div class="panel">
          <div class="panel-hd">
            <span class="panel-title">字段拆解 · 双向编辑</span>
            <span class="smc-head-sub">0x 开头按十六进制，否则十进制</span>
          </div>
          <div class="panel-body">
            <div class="smc-frow r1" id="rowA"></div>
            <div class="smc-frow r2" id="rowB"></div>
          </div>
        </div>

        <!-- 历史 -->
        <div class="panel panel-quiet">
          <div class="panel-hd">
            <span class="panel-title">最近 ${HISTORY_MAX} 次计算</span>
            <span style="display:inline-flex;gap:8px;align-items:center">
              <span class="smc-head-sub">Ctrl+S 收藏 · 点击回填</span>
              <button class="btn-ghost-sm" id="clearH" type="button">清空</button>
            </span>
          </div>
          <ul class="smc-hlist" id="hlist" aria-label="最近 ${HISTORY_MAX} 次计算历史">
            <li class="smc-hempty">尚无历史记录 · 复制即自动收藏</li>
          </ul>
        </div>

      </div>
      <div class="smc-toast" id="toast" role="status" aria-live="polite"></div>
    `;
  }

  // ─── 位图 ───────────────────────────────────────────────────────────────────

  _buildGrid() {
    const sr = this.shadowRoot;
    const h = [];

    for (const [k, a, b, name, si] of BAND) {
      h.push(`<div class="smc-band" style="grid-column:${a}/${b};background:var(${FIELDS[k].hue})">${name}${si ? `<span class="si">${si}</span>` : ''}</div>`);
    }

    for (let c = 0; c < 32; c++) {
      const b = 31 - c;
      const bound = [5, 21, 22, 23].includes(c) ? ' bound' : '';
      h.push(`<div class="smc-cell${bound}" data-bit="${b}" style="--cell-hue:var(${FIELDS[fieldOfBit(b)].hue})">0</div>`);
    }

    for (let c = 0; c < 32; c++) {
      const b = 31 - c;
      const bound = [31, 26, 25, 10, 9, 8, 7, 0].includes(b) ? ' bound' : '';
      h.push(`<div class="smc-pos${bound}">${b}</div>`);
    }

    sr.getElementById('grid').innerHTML = h.join('');

    sr.getElementById('legend').innerHTML = ORDER.map(k =>
      `<span><span class="smc-sw" style="background:var(${FIELDS[k].hue})"></span>${FIELDS[k].label.split(' ·')[0]} · ${FIELDS[k].meta.split(' · ').slice(0, 2).join(' · ')}</span>`
    ).join('');
  }

  _paintGrid() {
    const sr = this.shadowRoot;
    const w = composeWord(this._fields);
    const set = anyFieldSet(this._fields);
    sr.querySelectorAll('#grid .smc-cell').forEach(c => {
      const b = +c.dataset.bit;
      const on = set && ((w >>> b) & 1) === 1;
      c.textContent = set ? (on ? '1' : '0') : '0';
      c.classList.toggle('on', on);
    });
  }

  // ─── 字段卡 ─────────────────────────────────────────────────────────────────

  _fieldCardHTML(k) {
    const f = FIELDS[k];

    // 功能码浮层包含完整 FUNC_TABLE（修复 D1）
    const hints = k === 'func' ? {
      h: '功能码速查 · 6-bit',
      items: [
        ...Object.entries(FUNC_TABLE).map(([code, desc]) => [
          '0x' + pad(Number(code).toString(16).toUpperCase(), 2), desc
        ]),
        [`0x${FUNC_OEM_MIN.toString(16).toUpperCase()}–0x${FUNC_OEM_MAX.toString(16).toUpperCase()}`, 'OEM 保留范围'],
      ],
    } : null;

    const labelEl = hints
      ? `<span class="smc-hint" tabindex="0" role="button" aria-describedby="hint-${k}">${f.label}
           <span class="smc-pop" id="hint-${k}" role="tooltip">
             <span class="ph">${hints.h}</span>
             <ul>${hints.items.map(([a, b]) => `<li><span class="k">${a}</span><span class="d">${b}</span></li>`).join('')}</ul>
           </span>
         </span>`
      : f.label;

    const inputEl = SEGMENTED[k]
      ? `<div class="seg-ctrl" role="group" aria-label="${f.label}" data-seg="${k}">
           ${SEGMENTED[k].map(([v, t], i) =>
             `<button class="seg-btn${i === 0 ? ' is-selected' : ''}" type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`
           ).join('')}
         </div>`
      : `<div class="smc-fin-wrap">
           <input class="smc-fin" data-in="${k}" placeholder="0x.. / dec" autocomplete="off" spellcheck="false" aria-label="${f.label}"/>
           <button class="btn-field-copy" data-copy="${k}" title="复制此字段（${f.label}）" type="button" disabled aria-label="复制 ${f.label}">⧉</button>
         </div>`;

    return `<div class="smc-fc" data-field="${k}">
      <div class="smc-fhead">
        <span class="smc-flabel">
          <span class="smc-sw" style="background:var(${f.hue})"></span>${labelEl}
        </span>
        <span class="smc-fmeta">${f.meta}</span>
      </div>
      ${inputEl}
      <div class="smc-ffoot">
        <span class="smc-pair" data-pair="${k}"></span>
        <span class="smc-sem" data-sem="${k}"></span>
      </div>
    </div>`;
  }

  _buildFields() {
    const sr = this.shadowRoot;
    sr.getElementById('rowA').innerHTML = this._fieldCardHTML('func') + this._fieldCardHTML('cmd');
    sr.getElementById('rowB').innerHTML = this._fieldCardHTML('ms') + this._fieldCardHTML('rw') + this._fieldCardHTML('param');

    // 数字字段：输入联动
    for (const k of ['func', 'cmd', 'param']) {
      const inp = sr.querySelector(`[data-in="${k}"]`);
      inp.addEventListener('input', () => {
        const r = parseLoose(inp.value, FIELDS[k].w);
        const sem = sr.querySelector(`[data-sem="${k}"]`);
        if (!r.ok) {
          inp.classList.add('invalid');
          sem.textContent = '⚠ ' + r.err;
          sem.className = 'smc-sem err';
          return;
        }
        inp.classList.remove('invalid');
        this._fields[k] = r.value;
        this._refresh('field:' + k);
      });
      inp.addEventListener('blur', () => {
        const v = this._fields[k];
        if (v != null) inp.value = fmtFieldHex(k, v);
      });
    }

    // 1-bit 字段：分段控件
    for (const k of ['ms', 'rw']) {
      sr.querySelector(`[data-seg="${k}"]`).addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        this._fields[k] = +b.dataset.v;
        sr.querySelectorAll(`[data-seg="${k}"] button`).forEach(x => {
          x.classList.toggle('is-selected', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
        this._refresh();
      });
    }

    // 字段复制（修复 A5：触发 toast）
    sr.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.copy;
        const v = this._fields[k];
        if (v == null) return;
        const t = fmtFieldHex(k, v);
        navigator.clipboard?.writeText(t);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 800);
        this._toast('已复制 ' + t); // 修复 A5
      });
    });
  }

  // ─── 渲染更新 ────────────────────────────────────────────────────────────────

  _renderFeet() {
    const sr = this.shadowRoot;
    ORDER.forEach(k => {
      const v = this._fields[k];
      const pair = sr.querySelector(`[data-pair="${k}"]`);
      const sem  = sr.querySelector(`[data-sem="${k}"]`);

      if (v == null) {
        pair.innerHTML = `<span class="stat-chip">DEC —</span>${FIELDS[k].w > 1 ? '<span class="stat-chip">HEX —</span>' : ''}`;
        if (!sem.classList.contains('err')) { sem.textContent = ''; sem.className = 'smc-sem'; }
      } else {
        pair.innerHTML = `<span class="stat-chip">DEC ${v}</span>${FIELDS[k].w > 1 ? `<span class="stat-chip">HEX ${fmtFieldHex(k, v)}</span>` : ''}`;
        if (k === 'func') {
          const d = describeFuncCode(v);
          sem.textContent = '· ' + d.label;
          sem.className = 'smc-sem ' + (d.kind || '');
        } else {
          sem.textContent = ''; sem.className = 'smc-sem';
        }
      }

      const cp = sr.querySelector(`[data-copy="${k}"]`);
      if (cp) cp.disabled = v == null;
    });
  }

  _renderInputs(skip) {
    const sr = this.shadowRoot;
    for (const k of ['func', 'cmd', 'param']) {
      if (skip === 'field:' + k) continue;
      const inp = sr.querySelector(`[data-in="${k}"]`);
      const v = this._fields[k];
      inp.value = v == null ? '' : fmtFieldHex(k, v);
      inp.classList.remove('invalid');
    }
    for (const k of ['ms', 'rw']) {
      const v = this._fields[k] ?? 0;
      sr.querySelectorAll(`[data-seg="${k}"] button`).forEach(b => {
        const on = +b.dataset.v === v && this._fields[k] != null
          || this._fields[k] == null && b.dataset.v === '0';
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  }

  _renderTop(src) {
    const sr = this.shadowRoot;
    const w = composeWord(this._fields);
    const set = anyFieldSet(this._fields);
    if (src !== 'hex') sr.getElementById('hex').value = set ? fmtHex(w) : '';
    if (src !== 'dec') sr.getElementById('dec').value = set ? String(w) : '';
    sr.getElementById('hexw').classList.toggle('synced', set);
    sr.getElementById('decw').classList.toggle('synced', set);
    sr.getElementById('hexw').classList.remove('invalid');
    sr.getElementById('decw').classList.remove('invalid');
  }

  _renderPreviews() {
    const sr = this.shadowRoot;
    const w = composeWord(this._fields);
    Object.keys(COPY_FMT_LABEL).forEach(f => {
      const el = sr.getElementById('pv-' + f);
      if (!el) return;
      const t = formatOutput(w, f);
      el.textContent = t.length > 24 ? t.slice(0, 22) + '…' : t;
    });
    const s = anyFieldSet(this._fields);
    sr.getElementById('copyAll').disabled = !s;
    sr.getElementById('fmBtn').disabled = !s;
  }

  _refresh(src) {
    this._renderInputs(src);
    this._renderFeet();
    this._renderTop(src);
    this._paintGrid();
    this._renderPreviews();
  }

  // ─── 事件绑定 ────────────────────────────────────────────────────────────────

  _bindEvents() {
    const sr = this.shadowRoot;

    // 顶部双输入
    const onTop = src => {
      const raw = src === 'hex' ? sr.getElementById('hex').value : sr.getElementById('dec').value;
      sr.getElementById('oerr').textContent = '';
      sr.getElementById('hexw').classList.remove('invalid');
      sr.getElementById('decw').classList.remove('invalid');
      if (raw.trim() === '') {
        ORDER.forEach(k => this._fields[k] = null);
        this._refresh(src);
        return;
      }
      const r = parseLoose(raw, 32);
      if (!r.ok) {
        sr.getElementById(src === 'hex' ? 'hexw' : 'decw').classList.add('invalid');
        sr.getElementById('oerr').textContent = '⚠ ' + r.err;
        return;
      }
      const p = decomposeWord(r.value);
      ORDER.forEach(k => this._fields[k] = p[k]);
      this._refresh(src);
    };

    sr.getElementById('hex').addEventListener('input', () => onTop('hex'));
    sr.getElementById('dec').addEventListener('input', () => onTop('dec'));

    // 复制
    sr.getElementById('copyAll').addEventListener('click', () => {
      if (!anyFieldSet(this._fields)) return;
      const t = formatOutput(composeWord(this._fields), this._fmt);
      navigator.clipboard?.writeText(t);
      this._toast('已复制 ' + (t.length > 36 ? t.slice(0, 34) + '…' : t));
      this._saveHistory();
      this.dispatchEvent(new CustomEvent('smc-copy', {
        bubbles: true,
        composed: true,
        detail: { text: t, fmt: this._fmt },
      }));
    });

    // 格式选择菜单（修复 A1/A2）
    const menu = sr.getElementById('menu');
    const fmBtn = sr.getElementById('fmBtn');
    fmBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      fmBtn.setAttribute('aria-expanded', String(open));
      if (open) {
        const firstItem = menu.querySelector('[role="menuitem"]');
        firstItem?.focus();
      }
    });

    // 菜单键盘导航（修复 A2）
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('[role="menuitem"]')];
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        menu.classList.remove('open');
        fmBtn.setAttribute('aria-expanded', 'false');
        fmBtn.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      }
    });

    sr.addEventListener('click', e => {
      if (!e.target.closest('.smc-split')) {
        menu.classList.remove('open');
        fmBtn.setAttribute('aria-expanded', 'false');
      }
    });

    sr.querySelectorAll('.fmt-item').forEach(el => {
      el.addEventListener('click', () => {
        this._fmt = el.dataset.f;
        menu.classList.remove('open');
        fmBtn.setAttribute('aria-expanded', 'false');
        sr.getElementById('copyAll').click();
      });
    });

    // 示例 / 重置
    sr.getElementById('reset').addEventListener('click', () => {
      ORDER.forEach(k => this._fields[k] = null);
      sr.getElementById('oerr').textContent = '';
      this._refresh();
    });
    sr.getElementById('sample').addEventListener('click', () => {
      const sampleWord = Number(this.getAttribute('sample-word') || SAMPLE_WORD_DEFAULT);
      sr.getElementById('hex').value = fmtHex(sampleWord);
      onTop('hex');
      this._toast('已载入示例');
    });

    // 历史
    sr.getElementById('clearH').addEventListener('click', () => {
      this._history = [];
      try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch (_) {}
      this._renderHistory();
    });

    // Ctrl+S 收藏
    this.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this._saveHistory();
        this._toast('已保存当前结果');
      }
    });
  }

  // ─── 历史 ────────────────────────────────────────────────────────────────────

  _saveHistory() {
    if (!anyFieldSet(this._fields)) return;
    const snap = { word: composeWord(this._fields), parts: { ...this._fields }, ts: Date.now() };
    if (this._history[0] && this._history[0].word === snap.word) return;
    this._history.unshift(snap);
    if (this._history.length > HISTORY_MAX) this._history.length = HISTORY_MAX;
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this._history)); } catch (_) {}
    this._renderHistory();
  }

  _loadHistory() {
    try {
      const s = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (s) this._history = JSON.parse(s) || [];
    } catch (_) {}
  }

  _renderHistory() {
    const sr = this.shadowRoot;
    const l = sr.getElementById('hlist');
    if (!this._history.length) {
      l.innerHTML = '<li class="smc-hempty">尚无历史记录 · 复制即自动收藏</li>';
      return;
    }
    l.innerHTML = this._history.map((it, i) =>
      `<li><button class="recent-chip" data-h="${i}" type="button">
        ${pad(String(i + 1), 2)} · ${fmtHex(it.word)}
        <span class="smc-hts">${fmtHistoryTime(it.ts)}</span>
      </button></li>`
    ).join('');

    l.querySelectorAll('.recent-chip').forEach(el => {
      el.addEventListener('click', () => {
        const it = this._history[+el.dataset.h];
        if (!it) return;
        ORDER.forEach(k => this._fields[k] = it.parts[k]);
        this._refresh();
        this._toast('已回填 ' + fmtHex(it.word));
        this.dispatchEvent(new CustomEvent('smc-apply', {
          bubbles: true,
          composed: true,
          detail: { word: it.word, fields: { ...it.parts } },
        }));
      });
    });
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  _toast(msg) {
    const t = this.shadowRoot.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }
}

customElements.define('smc-calculator', SmcCalculator);
