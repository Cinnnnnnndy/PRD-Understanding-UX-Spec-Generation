# 设计系统委托验证 · iter-1 功能规格 × PTO（Workflow B 迁移对照表）

> 目的：证明「功能规格（iter-1 generated demo）× 可插拔设计系统（PTO）」能产出对齐 PTO 视觉的 Demo——**不重写功能，只把视觉委托给 PTO 的 token/class**。
> 这张表正是 PTO `SKILL.md` Workflow B 第 4 步要求的产物（含强制的「要删的旧装饰」列）。功能规格（§B/§C）完全不动。

## 迁移对照表

| iter-1 demo 元素 | PTO 等价 | 用的 class / token | 要删的旧装饰 |
|---|---|---|---|
| 页头 `.head` + 标题/副标题 | layout header（透明） | `layout-header` / `layout-header-brand` / `--text-title-1` / `--foreground-secondary` | 无（PTO 默认透明 header，去掉自定义底色） |
| `.btn`（重置） | ghost 按钮 | `btn btn-ghost` | 自定义边框/底色 |
| `.btn`（载入示例） | secondary 按钮 | `btn`（默认 secondary） | 自定义 `--bd2` 边框 |
| `.card`（offset/位图/字段/历史 4 张面板） | panel shell | `panel-shell` + `panel-shell-header` + `panel-shell-body`（或 `panel-shell-quiet`） | 私有 `--elev1` 底 + `1px --bd` 描边 + `--radius-lg` 自定义 |
| `.sh`（section header 左竖条） | panel-shell-header / section title | `panel-shell-header` + `panel-shell-title`（`--text-title-2`） | **删左侧 3px accent 竖条**（PTO 不用左竖条装饰，改用标题排版分层） |
| `.owrap`（HEX/DEC 输入） | 输入框 | `--input-bg`(`--surface-1`) / `--input-border` / `--radius-md`；focus `--focus-ring` | 私有 `--accent-soft` 3px ring → 换 `--focus-ring` |
| `.owrap.synced .sync ●` | 状态点用语义色 | `--primary`（同步）/ `--foreground-muted`（空） | 硬编码 `--accent` |
| 拆分复制按钮 + `.menu` 格式菜单 | solid 按钮 + 下拉菜单 pattern | `btn btn-solid` + `graph-menu` / `graph-menu-item`（已有 hover/active 态） | 私有 `.menu`/`.mi` 阴影与圆角 → 用 `--shadow-lg`/`--radius-md` |
| 32-bit 位图 `.bg`/`.cell`/`.band` | 模块自有布局（允许） + 语义色 | grid 布局保留（module-local 允许）；字段色用 `--warning`/`--primary`/`--accent`/`--success`/`--ark-orange-500`；置位高亮用 `color-mix(... 22%)` | 硬编码 `rgba(245,158,107,.22)` 等 → 改 `color-mix(in srgb, var(--warning) 22%, transparent)` |
| 字段卡 `.fc`（顶 2px hue 边） | 中性 surface 卡 + 小色块 tag | `--surface-2` 卡底 + swatch/tag 用语义色；`node-tag`/`io-chip` 语言 | **删顶部 2px 彩色边**（PTO components.css 原则：避免大面积彩色，类型信号只用小 tag/swatch） |
| 字段 DEC/HEX 读数 | stat chip / mono 文本 | `stat-chip` 或 `--text-mono` + `--foreground` | 无 |
| 单字段复制按钮 `.fcopy` | icon 按钮 | `btn btn-ghost btn-icon` | 私有 `--bd` 边 |
| MS/RW 二选一 | 分段控件 | `segmented-control` + `btn`（`is-selected`） | 私有 `.seg2` 实现 |
| hint 浮层 `.pop` | 下拉/popover 语言 | `graph-menu` 风格容器 + `--panel-shell-bg`/`--shadow-lg` | 硬编码 `#0d0f15` 底 |
| 历史 `.hitem` / 空态 | **PTO 已有现成组件** | `recent-row` / `recent-chip`（点击回填）/ `empty-card`（空态）/ `sample-row` | 私有 `.hitem`/`.hempty` 全部替换 |
| toast `.toast` | 反馈 toast | PTO toast/notification 语言（或保留 module-local + token 化） | 硬编码底色/阴影 → `--background-elevated`/`--shadow-lg` |
| 所有 `#xxxxxx` / `13px` / `rgba()` | token 化 | `var(--surface-*)` / `var(--space-*)` / `var(--radius-*)` | 全部硬编码值 |

## 结论

- **功能规格 0 改动**：位图、双向同步、多格式导出、历史、示例/重置、逐字段操作、键盘加速——§B/§C 一字未动。
- **视觉 100% 委托 PTO**：颜色→语义 token，间距/圆角/字体→token，按钮/分段/卡片/菜单/历史→PTO 现成 class（历史和示例甚至命中 PTO 已有的 `recent-chip`/`empty-card`/`sample-row`）。
- **强制删旧装饰**：左竖条 section header、字段卡顶部彩色边、私有阴影/ring——按 PTO `retrofit-container-audit.md` 清除。
- **可替换性验证**：换设计系统时，本表换成「× 新设计系统」，左列（功能元素）不变，右列（映射）重写即可。

> 说明：本表是委托机制的证明（Workflow B 前半）；按用户要求未重建整份 PTO 像素级 Demo——目标是「之后每次都能对齐」的提示词机制，已在 phase1 skill §A 槽位固化。要真正产出 PTO 渲染版，喂 demo-prompt.md + `design-systems/pto-design-system/` 给生成器跑完 Workflow B 后半即可。
