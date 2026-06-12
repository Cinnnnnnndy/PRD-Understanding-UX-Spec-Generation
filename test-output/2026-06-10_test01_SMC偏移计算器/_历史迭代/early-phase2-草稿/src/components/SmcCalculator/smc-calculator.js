// <smc-calculator> —— SMC 偏移量计算器工程组件（原生 Web Component，Shadow DOM 隔离样式）
// 落实 design-review.md / accessibility-audit.md 的前端可独立修复项：
//   语义常驻控件 / 位布局条 / 一键复制 / 空·零·错三态分色 / ≥12px / 图标+颜色双通道 / aria-live
// 应用结果通过 CustomEvent('smc-apply') 抛给宿主（Webview postMessage 桥的前端侧）。
import { FIELD_DEFS, FIELD_ORDER, FUNCTION_LABELS, BIT_LABELS, FIELD_COLORS } from '../../constants/enums.js';
import { encodeOffset, decodeOffset, isValidField, isValidFields, parseHex, toHex, parseOffsetInput } from '../../utils/smcCodec.js';
import { describeFunction, formatOffsetHex } from '../../utils/formatters.js';

const STYLE = `
:host{--bg:#1e1e1e;--panel:#1e1e1e;--quote:#2a2d2e;--in-bg:#3c3c3c;--in-bd:#6b6b6b;
  --accent:#4fc1ff;--focus:#007fd4;--btn:#0e639c;--btn-h:#1177bb;--btn2:#3a3d41;--btn2-h:#45494e;
  --txt:#cccccc;--txt2:#9d9d9d;--bd:#454545;--err:#f48771;--warn:#cca700;--ok:#4caf50;--sel:#264f78;
  display:block;color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
*{box-sizing:border-box}
.wrap{max-width:650px;margin:0 auto;padding:16px}
.mono{font-family:'Consolas','Courier New',ui-monospace,monospace}
.section{background:var(--panel);border:1px solid var(--bd);border-radius:6px;padding:16px;margin-bottom:14px}
.sh{font-size:13px;font-weight:600;color:var(--accent);padding-left:9px;border-left:3px solid var(--accent);margin-bottom:12px}
/* result */
.result{background:linear-gradient(135deg,var(--quote),var(--sel));border:2px solid var(--accent);border-radius:8px;padding:18px;margin-bottom:14px}
.r-row{display:flex;align-items:center;justify-content:center;gap:8px;margin:4px 0}
.r-label{font-size:12px;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px;min-width:64px;text-align:right}
.r-val{font-size:24px;font-weight:700}
.r-val.dec{font-size:15px;font-weight:500;color:var(--txt)}
.r-val.ok{color:var(--accent)}.r-val.empty{color:#8b8b8b}.r-val.err{color:var(--err)}
.copy{background:var(--btn2);color:var(--txt);border:1px solid var(--bd);border-radius:4px;font-size:12px;
  padding:3px 9px;cursor:pointer;min-height:26px}
.copy:hover{background:var(--btn2-h)}
.copy:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.copy.done{color:var(--ok);border-color:var(--ok)}
.r-hint{font-size:12px;color:var(--err);text-align:center;min-height:16px;margin-top:6px}
.r-hint.warn{color:var(--warn)}
/* bit bar */
.bitbar{display:flex;height:46px;border:1px solid var(--bd);border-radius:6px;overflow:hidden;margin-top:12px}
.seg{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-size:11px;
  border-right:1px solid rgba(255,255,255,.35);transition:filter .15s, outline .15s;outline:0 solid transparent}
.seg:last-child{border-right:none}
.seg b{font-weight:700}.seg small{font-size:9px;opacity:.9}
.seg.hot{filter:brightness(1.25);outline:2px solid #fff;outline-offset:-2px}
/* fields */
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.f{display:flex;flex-direction:column;gap:5px}
.f.wide{grid-column:span 2}
label{font-size:13px;display:flex;align-items:center;gap:6px}
.bits{font-size:11px;color:var(--txt2);background:var(--quote);padding:1px 5px;border-radius:3px}
select,.hexwrap input,.dec input{font-size:14px;color:var(--txt);background:var(--in-bg);border:1px solid var(--in-bd);border-radius:4px}
select{padding:7px 8px;min-height:34px}
select:focus-visible,.hexwrap:focus-within,.dec input:focus-visible{outline:2px solid var(--focus);outline-offset:-1px;border-color:var(--focus)}
.hexwrap{display:flex;align-items:center;background:var(--in-bg);border:1px solid var(--in-bd);border-radius:4px}
.hexwrap .px{padding:7px 8px;color:var(--txt2);border-right:1px solid var(--in-bd)}
.hexwrap input{flex:1;border:none;background:transparent;text-transform:uppercase;padding:7px 10px;outline:none}
.hexwrap input::placeholder{text-transform:none;color:#8b8b8b}
.hexwrap.invalid{border-color:var(--err)}
.hexwrap.invalid input{color:var(--err)}
.seg2{display:flex;border:1px solid var(--in-bd);border-radius:4px;overflow:hidden}
.seg2 button{flex:1;background:var(--in-bg);color:var(--txt2);border:none;border-right:1px solid var(--in-bd);
  padding:7px 4px;font-size:13px;cursor:pointer;min-height:34px}
.seg2 button:last-child{border-right:none}
.seg2 button[aria-pressed="true"]{background:var(--btn);color:#fff}
.seg2 button:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
.ferr{font-size:12px;color:var(--err);min-height:15px;display:flex;align-items:center;gap:4px}
.fnote{font-size:12px;color:var(--txt2);min-height:15px}
.fnote.reserved,.fnote.undefined{color:var(--warn)}
/* decimal */
.dec{display:flex;gap:8px}.dec input{flex:1;padding:8px 12px}
.btn{padding:9px 18px;font-size:13px;border:none;border-radius:4px;cursor:pointer;min-height:36px}
.btn:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.btn-2{background:var(--btn2);color:var(--txt)}.btn-2:hover{background:var(--btn2-h)}
.row{display:flex;gap:12px;margin-top:6px}
.btn-1{background:var(--btn);color:#fff}.btn-1:hover{background:var(--btn-h)}
.btn-1:disabled{background:#2d2d2d;color:#6b6b6b;cursor:not-allowed}
.toast{margin-top:12px;padding:10px 14px;border-radius:4px;font-size:13px;display:none}
.toast.show{display:block}
.toast.success{background:#1e3a1e;border-left:3px solid var(--ok);color:#81c784}
.toast.error{background:#3a1e1e;border-left:3px solid var(--err);color:var(--err)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.info{padding:12px;background:var(--quote);border-left:4px solid var(--accent);border-radius:4px;font-size:13px;margin-bottom:16px;line-height:1.5}
.title{font-size:18px;font-weight:600;color:var(--accent);margin-bottom:14px}
`;

const FN_OPTIONS = (() => {
  const opts = Object.entries(FUNCTION_LABELS).map(([v, l]) =>
    `<option value="${+v}">0x${(+v).toString(16).toUpperCase().padStart(2, '0')} · ${l}</option>`);
  // OEM 区段 0x37–0x3F 合并入一个分组提示项由 JS 动态补
  return opts.join('');
})();

export class SmcCalculator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    /** @type {import('../../utils/smcCodec.js').SmcFields} */
    this.fields = { function: 0, command: 0, ms: 0, rw: 0, parameter: 0 };
    this._timer = null;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>${this._template()}`;
    this._bind();
    this._update();
  }

  _template() {
    return `
    <div class="wrap">
      <div class="title">SMC 偏移量计算器</div>
      <div class="info"><strong>命令字格式：</strong>功能码(6) | 命令码(16) | 读取方式(1) | 读写方向(1) | 参数(8) = 32 位</div>

      <div class="result" role="group" aria-label="实时计算结果">
        <div class="r-row">
          <span class="r-label">16 进制</span>
          <span class="r-val ok mono" id="hex" aria-live="polite">0x00000000</span>
          <button class="copy" id="copyHex" type="button" aria-label="复制十六进制结果">复制</button>
        </div>
        <div class="r-row">
          <span class="r-label">10 进制</span>
          <span class="r-val dec mono" id="dec" aria-live="polite">0</span>
          <button class="copy" id="copyDec" type="button" aria-label="复制十进制结果">复制</button>
        </div>
        <div class="bitbar" id="bitbar" aria-hidden="true"></div>
        <div class="r-hint" id="hint" role="status" aria-live="polite"></div>
      </div>

      <div class="section">
        <div class="sh">组成字段</div>
        <div class="grid">
          <div class="f wide">
            <label for="function">功能码 (Function) <span class="bits">6-bit</span></label>
            <select id="function"></select>
            <div class="fnote" id="function-note"></div>
          </div>
          <div class="f wide">
            <label for="command">命令码 (Command) <span class="bits">16-bit</span></label>
            <div class="hexwrap" id="command-wrap"><span class="px mono">0x</span>
              <input class="mono" id="command" maxlength="4" placeholder="0000" inputmode="text" autocomplete="off"></div>
            <div class="ferr" id="command-err"></div>
          </div>
          <div class="f">
            <span id="ms-label" style="font-size:13px;display:flex;gap:6px;align-items:center">读取方式 (MS) <span class="bits">1-bit</span></span>
            <div class="seg2" role="group" aria-labelledby="ms-label" id="ms">
              <button type="button" data-v="0" aria-pressed="true">多读</button>
              <button type="button" data-v="1" aria-pressed="false">单读</button>
            </div>
          </div>
          <div class="f">
            <span id="rw-label" style="font-size:13px;display:flex;gap:6px;align-items:center">读写方向 (RW) <span class="bits">1-bit</span></span>
            <div class="seg2" role="group" aria-labelledby="rw-label" id="rw">
              <button type="button" data-v="0" aria-pressed="true">写操作</button>
              <button type="button" data-v="1" aria-pressed="false">读操作</button>
            </div>
          </div>
          <div class="f wide">
            <label for="parameter">参数 (Parameter) <span class="bits">8-bit</span></label>
            <div class="hexwrap" id="parameter-wrap"><span class="px mono">0x</span>
              <input class="mono" id="parameter" maxlength="2" placeholder="00" inputmode="text" autocomplete="off"></div>
            <div class="ferr" id="parameter-err"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="sh">从偏移量反解</div>
        <div class="dec">
          <input class="mono" id="offset" placeholder="如 809893888 或 0x30460000" autocomplete="off" aria-label="十进制或十六进制偏移量">
          <button class="btn btn-2" id="parse" type="button">↓ 解析到字段</button>
        </div>
        <div class="ferr" id="offset-err"></div>
      </div>

      <div class="row">
        <button class="btn btn-1" id="apply" type="button">✓ 应用</button>
        <button class="btn btn-2" id="cancel" type="button">✕ 取消</button>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </div>`;
  }

  _bind() {
    const r = this.shadowRoot;
    // 功能码下拉（含动态 OEM/未定义项）
    this._fnSelect = r.getElementById('function');
    this._fnSelect.innerHTML = FN_OPTIONS;
    this._fnSelect.addEventListener('change', () => { this.fields.function = +this._fnSelect.value; this._syncFnNote(); this._update(); });

    // 命令码 / 参数 hex 输入
    ['command', 'parameter'].forEach((f) => {
      const input = r.getElementById(f);
      const def = FIELD_DEFS[f];
      input.addEventListener('input', () => {
        let v = input.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, def.maxLen);
        input.value = v;
        const n = parseHex(v);
        this.fields[f] = Number.isNaN(n) ? NaN : n;
        this._validateField(f);
        this._debounced();
      });
      input.addEventListener('focus', () => this._hot(f, true));
      input.addEventListener('blur', () => { this._hot(f, false); this._validateField(f, true); });
    });

    // MS / RW 分段
    ['ms', 'rw'].forEach((f) => {
      const grp = r.getElementById(f);
      grp.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        this.fields[f] = +b.dataset.v;
        grp.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        this._update();
      });
    });

    r.getElementById('parse').addEventListener('click', () => this._parse());
    r.getElementById('offset').addEventListener('keydown', (e) => { if (e.key === 'Enter') this._parse(); });
    r.getElementById('apply').addEventListener('click', () => this._apply());
    r.getElementById('cancel').addEventListener('click', () => this._reset());
    r.getElementById('copyHex').addEventListener('click', (e) => this._copy(e.target, formatOffsetHex(encodeOffset(this.fields))));
    r.getElementById('copyDec').addEventListener('click', (e) => this._copy(e.target, String(encodeOffset(this.fields) >>> 0)));

    this._renderBitbar();
    this._writeFields();
  }

  _debounced() { clearTimeout(this._timer); this._timer = setTimeout(() => this._update(), 250); }

  _validateField(f, onBlur = false) {
    const wrap = this.shadowRoot.getElementById(`${f}-wrap`);
    const err = this.shadowRoot.getElementById(`${f}-err`);
    if (!wrap) return true;
    const ok = isValidField(f, this.fields[f]);
    wrap.classList.toggle('invalid', !ok && (onBlur || !Number.isNaN(this.fields[f])));
    err.textContent = ok ? '' : (onBlur || !Number.isNaN(this.fields[f]) ? '⚠ 超出范围' : '');
    return ok;
  }

  _syncFnNote() {
    const note = this.shadowRoot.getElementById('function-note');
    const d = describeFunction(this.fields.function);
    note.textContent = d.label;
    note.className = `fnote ${d.kind}`;
  }

  _hot(field, on) {
    const seg = this.shadowRoot.querySelector(`.seg[data-f="${field}"]`);
    if (seg) seg.classList.toggle('hot', on);
  }

  _renderBitbar() {
    const bar = this.shadowRoot.getElementById('bitbar');
    bar.innerHTML = FIELD_ORDER.map((f) => {
      const d = FIELD_DEFS[f];
      const small = d.bits > 1 ? `<small>${d.bits}b</small>` : '';
      return `<div class="seg" data-f="${f}" style="flex:${d.bits};background:${FIELD_COLORS[f]}"><b>${d.label}</b>${small}</div>`;
    }).join('');
  }

  _writeFields() {
    this._fnSelect.value = String(this.fields.function);
    this._syncFnNote();
    this.shadowRoot.getElementById('command').value = toHex(this.fields.command || 0, FIELD_DEFS.command.maxLen);
    this.shadowRoot.getElementById('parameter').value = toHex(this.fields.parameter || 0, FIELD_DEFS.parameter.maxLen);
    ['ms', 'rw'].forEach((f) => this.shadowRoot.getElementById(f).querySelectorAll('button')
      .forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === this.fields[f]))));
  }

  _update() {
    const r = this.shadowRoot;
    const hexEl = r.getElementById('hex'), decEl = r.getElementById('dec'), hint = r.getElementById('hint');
    const apply = r.getElementById('apply');
    const missing = FIELD_ORDER.some((f) => Number.isNaN(this.fields[f]));
    const valid = isValidFields(this.fields);
    hexEl.className = 'r-val mono ' + (missing ? 'empty' : valid ? 'ok' : 'err');
    if (missing) {
      hexEl.textContent = '0x--------'; decEl.textContent = '—';
      hint.className = 'r-hint'; hint.textContent = '请补全所有字段';
      apply.disabled = true;
    } else if (!valid) {
      const bad = FIELD_ORDER.filter((f) => !isValidField(f, this.fields[f])).map((f) => FIELD_DEFS[f].label);
      hexEl.textContent = '0x--------'; decEl.textContent = '—';
      hint.className = 'r-hint'; hint.textContent = `⚠ 字段超出范围：${bad.join('、')}`;
      apply.disabled = true;
    } else {
      const off = encodeOffset(this.fields);
      hexEl.textContent = formatOffsetHex(off); decEl.textContent = String(off >>> 0);
      hint.className = 'r-hint'; hint.textContent = '';
      apply.disabled = false;
    }
  }

  _parse() {
    const raw = this.shadowRoot.getElementById('offset').value;
    const err = this.shadowRoot.getElementById('offset-err');
    const hint = this.shadowRoot.getElementById('hint');
    const res = parseOffsetInput(raw);
    if (!res.ok) { err.textContent = `⚠ ${res.error}`; return; }
    err.textContent = '';
    this.fields = decodeOffset(res.truncated);
    this._writeFields();
    ['command', 'parameter'].forEach((f) => this._validateField(f));
    this._update();
    if (res.overflow) { hint.className = 'r-hint warn'; hint.textContent = `⚠ 输入超过 32 位，已取低 32 位 (${res.truncated})`; }
  }

  _apply() {
    if (!isValidFields(this.fields)) { this._toast('error', '存在无效字段，请检查输入'); return; }
    const off = encodeOffset(this.fields);
    const detail = { offsetHex: formatOffsetHex(off), offsetDec: off >>> 0, fields: { ...this.fields } };
    this.dispatchEvent(new CustomEvent('smc-apply', { detail, bubbles: true, composed: true }));
    this._toast('success', `已应用：${detail.offsetHex} (${detail.offsetDec})`);
  }

  _reset() {
    this.fields = { function: 0, command: 0, ms: 0, rw: 0, parameter: 0 };
    this._writeFields();
    this.shadowRoot.getElementById('offset').value = '';
    ['command', 'parameter'].forEach((f) => { this.shadowRoot.getElementById(`${f}-wrap`).classList.remove('invalid'); this.shadowRoot.getElementById(`${f}-err`).textContent = ''; });
    this.shadowRoot.getElementById('offset-err').textContent = '';
    this.shadowRoot.getElementById('toast').className = 'toast';
    this._update();
  }

  async _copy(btn, text) {
    try { await navigator.clipboard.writeText(text); } catch { /* 宿主无剪贴板权限时静默 */ }
    const old = btn.textContent; btn.textContent = '已复制 ✓'; btn.classList.add('done');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 800);
  }

  _toast(kind, msg) {
    const t = this.shadowRoot.getElementById('toast');
    t.className = `toast show ${kind}`; t.textContent = msg;
  }
}

customElements.define('smc-calculator', SmcCalculator);
