# CHANGELOG · 管道表达式批量评估器

---

## [v1.0.0-engineering] — 2026-06-12

### 阶段二：工程化交付（本轮）

**新增**
- 工程级 Web Component `<pipe-batch-evaluator>`（Custom Element + Shadow DOM，`src/components/PipeBatchEvaluator/index.js`）
- 核心业务逻辑提取为纯函数（`src/utils/pipeEvalLogic.js`），与 UI 完全解耦
- 格式化工具 `src/utils/formatters.js`（历史时间格式 M/D HH:MM / 通过率文案 / 类型推断）
- 校验工具 `src/utils/validators.js`（表达式语法 / 参数空值 / 模板变量名格式）
- 枚举常量 `src/constants/enums.js`（参数类型 / 执行状态 / 筛选选项 / 存储 key）
- 单元测试 `src/test/pipeEvalLogic.test.js`（34 个，全部通过，`node:test` 零依赖）
- 设计文档套件：`design-structure.md` / `design-review.md` / `accessibility-audit.md` / `tech-selection.md`
- 可视化 UX 规格报告 `REPORT-UX规格报告.html`（9 张幻灯片，1280×720，机会点落地对照）
- 接入指南 `INTEGRATION.md`（postMessage 协议 / 文件放置 / 联调待确认 5 条）

**可访问性修复（来自 accessibility-audit.md，前端独立修复）**
- A2：`#expr-msg` 添加 `aria-live="polite"` + 错误时 `role="alert"`
- A3：操作符面板折叠控制改为 `<button aria-expanded aria-controls>`
- A4：模板变量面板折叠控制改为 `<button aria-expanded aria-controls>`
- A5：`badge-select` 添加 `aria-label="参数 $N 类型"`
- A6：`input-field` 添加 `aria-label` + `aria-describedby` 关联警告消息
- A7：`#tc-load-err` 添加 `role="alert" aria-live="assertive"`
- A8：`pass-badge` 添加 `aria-label="通过率 n/t，点击筛选不匹配项"`
- A9：主题切换按钮添加 `aria-pressed`
- A10：虚拟表格添加完整 ARIA 表格语义（`role="table/rowgroup/row/columnheader/cell"`）

**从 Demo → 工程的设计调整**
- 历史记录时间戳：超过 24 小时显示 `M/D HH:MM` 格式（修复 D7）
- 历史记录上限：20 条 FIFO 淘汰（修复设计审查 §⚠️ 待确认第3条）
- 折叠面板使用 `aria-expanded` 控制，替代纯 CSS `display: none`（无障碍兼容）

**待后续迭代**
- D6：用例 > 200 条时添加处理进度指示
- D1：折叠态展示操作符数量 badge
- D2：textarea 修改后显示「已修改未应用」持续提示
- `string.gsub` Lua 量词缺陷修复（另立工单，修复将影响所有含 `%d+` 的测试用例）

---

## [v2.0.0-demo] — 2026-06-12

### Demo 五镜走查版（v2）

**新增（B11–B15 五镜落地）**
- B11：右栏空态展示 3 张可点击示例卡片（一键填入演示）
- B12：操作符 Chip 面板（输入/字符串/自定义分组，hover 签名 tooltip，点击插入光标处）
- B13：双栏布局（左 55% 操作 / 右 45% 反馈），≤1024px 退化单栏
- B14：管道数据流轨迹（输入行 + 阶段间竖线箭头 + 每阶段 入→操作→出 + 类型 chip）
- B15：通过率摘要 badge（✓/✗ n/t），行级状态色（mismatch 红 / errored 橙）

---

## [v1.0.0-demo] — 2026-06-12

### Demo 初版（B1–B10 P0/P1 修复）

**新增**
- B1/F2：表达式 inline 实时校验（300ms debounce），替换 alert()
- B2：参数为空行内 warning 提示
- C1：Ctrl/Cmd+Enter 应用表达式 · F5 执行批量
- C5/B3：模板变量折叠面板 + postMessage 通道
- F1：全界面中文化（11 处英文 → 中文）
- F5/B5：参数徽章动态类型（SYNC/REF/CONST/LITERAL/TEMPLATE）
- C2：表达式历史（localStorage，点击恢复）
- C3：批量结果筛选（全部/匹配/不匹配/错误 chips）
- F3/B8：顶栏重构 56px → 44px 紧凑 toolbar
- F4/B10：全面 token 化（约 30 处硬编码颜色 → PTO 语义 token）
- F6/B9：章节标题 Emoji → 线性 SVG 图标
- 间距统一为 `--space-1..6` 体系
- dark/light/glass 三主题切换（原生支持）
