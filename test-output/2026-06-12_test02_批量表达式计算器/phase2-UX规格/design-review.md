# 管道表达式批量评估器 · 设计审查报告
> 对象：`DEMO-优化版/index.html`（PTO Design System 内联版，2026-07-08 重新生成）  
> 日期：2026-07-08 | 阶段二 Step 2.1  
> 方法：逐行读取 Demo HTML/CSS/JS，按五维检查框架审查

---

## 问题清单

| # | 维度 | 位置/组件 | 问题描述 | 优先级 | 建议方案 |
|---|------|---------|---------|-------|---------|
| R1 | 信息架构 | 历史记录面板 | `pushHistory` 最多保存 **8 条**（`h.slice(0, 8)`），与 Prompt 规格（最多 20 条）不符 | 🔴 Critical | 将 `8` 改为 `20` |
| R2 | 信息架构 | 管道处理阶段 | 阶段间箭头仅有 `▼` 无文字标注，视觉方向感弱，在玻璃主题下 `bar` 细线 2px 几乎不可见 | 🟡 Important | 箭头加「传入下一阶段」tooltip；或加粗到 3px / 改为虚线 |
| R3 | 功能正确性 | 字符串函数 | `_luaPatToRegex` 中 `magic = '^$()%.[]*+-?'` 仍将 `+` 列入 magic 集，导致 `%d+` 量词被转义为 `\+` 失效（原始 Bug E5，**Prompt 要求修复但 Demo 未修复**） | 🔴 Critical | 将 magic 集改为 `'^$()%.[]*?'`（移除 `+`、`-`、`*`），使 `+`/`*`/`?` 作为 regex 量词正常工作 |
| R4 | 视觉一致性 | 操作符面板 | 三组操作符点颜色用内联 `style="background:var(--primary)..."` 硬编码，无 CSS class；玻璃主题下 primary 变为 `#6fa1ff` 但点颜色不会跟随 token 变化 | 🟡 Important | 改为 `.op-dot-input / .op-dot-string / .op-dot-custom` class，颜色跟随 token |
| R5 | 视觉一致性 | 参数警告消息 | `.param-msg.show` 使用 `display:block`，与相邻 `.inline-msg.show` 使用 `display:flex` 不一致，导致内部 icon 对齐方式不同 | 🟢 Minor | 统一改为 `display:flex; align-items:center; gap:6px` |
| R6 | 反馈与状态 | 通过率 badge | 点击 pass-badge 仅触发 `setFilter('mismatch')`，不能切换回「全部」视图；第二次点击无效果，行为不可预测 | 🟡 Important | 增加切换逻辑：若当前筛选已是 mismatch，则 `setFilter('all')` |
| R7 | 反馈与状态 | Toast 通知 | Toast 用 CSS transition 显示（`opacity: 0→1`），但无持久化确认机制；错误类 Toast（如复制失败）与成功类 Toast 视觉无差异 | 🟢 Minor | 错误 toast 加 `border-color:var(--danger)`；或分 `showToast(msg, type)` |
| R8 | 反馈与状态 | 加载历史恢复 | `restoreHistory` 内联 onclick 字符串拼接：`` onclick="restoreHistory('${esc(x.expr).replace(/'/g,"\\'")}')" ``，若表达式含 `"` 字符仍有 XSS 风险 | 🔴 Critical | 改为 data-index 模式：`onclick="restoreHistoryAt(${idx})"` 并在函数内从 `loadHistory()[idx]` 读取 expr |
| R9 | 工程工具特定 | 批量执行数量 | 批量模式 `executeBatch` 调用 `setTimeout(r, 0)` 仅让出一帧，1000+ 用例时阻塞 UI 100-300ms；用例行数无上限提示 | 🟡 Important | 超过 500 条时显示 warning「数据量较大，执行时界面可能短暂无响应」；或分块（每 200 条一帧） |
| R10 | 工程工具特定 | normOut 比较 | `normOut` 剥除首尾引号：`"7.00"` 和 `7.00` 均视为匹配，但用户可能期望严格字符串匹配 | 🟢 Minor | 结果表格底部加「比较规则：去首尾引号、合并空格」说明文字 |

---

## 设计亮点（已做好，勿破坏）

| 亮点 | 位置 | 说明 |
|------|------|------|
| ✅ PTO Design System 三主题 | CSS token 层 | foundation → semantic → component 三层 token，三主题切换零硬编码，架构优雅 |
| ✅ 操作符面板 localStorage 状态记忆 | `OP_OPEN_KEY` | 折叠状态跨会话持久化，专业用户体感一致 |
| ✅ 示例卡片隐藏逻辑 | `updateDebugResults()` | 参数填齐后自动隐藏空态，填写过程不受干扰 |
| ✅ 数据流轨迹 in/out 格式 | `sio-${i}` | 每阶段展示「入 {val} → 出 {val} [类型]」，配合类型 chip（number/string/bool），调试体感好 |
| ✅ inline 校验 debounce | `onExprInput()` 300ms | 替代 alert，输入停顿后才校验，不打断思路 |
| ✅ 全中文 UI | 全文 | 无英文标签残留，国际化一致 |
| ✅ 键盘快捷键 | `keydown` 监听 | Ctrl+Enter / F5，专业用户友好 |
| ✅ 参数 touched 状态 | `_touched` flag | 未触碰前不显示参数警告，避免过早报错 |
| ✅ 虚拟滚动 | ROW_H=36, BUF=10 | 大数据集下性能稳定；行绝对定位方案正确 |
| ✅ postMessage 桥 | `window.message` 监听 | setTemplateVars / setExpression / setBadgeTypes 三通道已实现 |

---

## 需要工程阶段修复的问题（汇总）

| # | 问题 | 在 `design-review.md` 位置 | 修复责任 |
|---|------|--------------------------|---------|
| R1 | 历史最多 8 条 → 应为 20 条 | 代码 `h.slice(0, 8)` | 前端 |
| R3 | gsub 量词 bug：`+*?` 被转义 | `_luaPatToRegex` magic 集 | 前端 |
| R8 | restoreHistory onclick XSS 风险 | renderHistory innerHTML | 前端 |
