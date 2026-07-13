# SMC 偏移量计算器 · 设计结构文档（UX Spec）
> 生成时间：2026-06-10 | 原则：视觉规格精确(hex/px)；数据/布局不写死实例。
> 📊 本规格另有**可视化报告形态**：`uxspec-report.html`（16:9 幻灯片，评审沟通用）。本 md 为精确源。
>
> ⚠️ **版本说明（待重做）**：本文档 + `uxspec-report.html` + `design-review.md` + `accessibility-audit.md`
> 是基于**早期较薄的优化 Demo** 反推的。优化 Demo 现已升级为 gold-standard
> `../optimized-demo/index.html`（openUBMC Studio shell + studio-shell.css），新增了
> **完整 32-bit 位图、HEX↔DEC 双向同步输入、多格式导出(C/JSON)、最近 10 次历史、字段卡按位宽布局、载入示例/重置** 等能力。
> 这些 phase2 产物需**针对新 Demo 重新反推**（组件清单、状态枚举、交互序列、Token 都要按 Studio 系统更新）。
> 重做前，以 `../phase1/demo-prompt.md` 与 gold-standard Demo 为准。

## 一、页面整体布局

### 1.1 分区结构（ASCII 树）
```
计算器面板（max-width 650px 居中，背景 #1e1e1e，padding 16px）
├── 标题区        「SMC 偏移量计算器」18px/600 #4fc1ff
├── 说明条        info，背景 #2a2d2e，左 4px #4fc1ff 边，13px
├── 结果区        渐变 #2a2d2e→#264f78，2px #4fc1ff 边，圆角 8px，padding 18px
│   ├── hex 行     标签 + 大字 24px + 复制按钮
│   ├── dec 行     标签 + 中字 15px + 复制按钮
│   ├── 位布局条   高 46px，5 段按位宽 flex 比例着色
│   └── 提示行     min-height 16px（空/警告/错误三态）
├── 字段 Section  背景 #1e1e1e，1px #454545，圆角 6px，padding 16px
│   └── grid 2 列 gap 12px：功能码(wide) / 命令码(wide) / MS · RW / 参数(wide)
├── 反解 Section  十进制输入 + 解析按钮
└── 操作行        应用(主) + 取消(次) + toast
```

### 1.2 间距系统
| 用途 | 值 |
|------|----|
| Section 间距 | 14px |
| Section 内边距 | 16px |
| 字段网格 gap | 12px |
| 字段内 label↔控件 | 5px |
| 结果行 gap | 8px |

## 二、组件清单

### 结果区（ResultPanel）
```
尺寸：宽 100%，高 auto；背景 linear-gradient(135deg,#2a2d2e,#264f78)
边框：2px solid #4fc1ff，圆角 8px；padding 18px
```
内部（从上到下）：hex 行（标签 12px #9d9d9d / 值 24px/700 mono / 复制按钮）→ dec 行（值 15px/500）→ 位布局条 → 提示行。
**空/加载状态：** 无加载（本地计算）；空=未输入态见状态枚举。

### 位布局条（BitBar）
```
高 46px，1px #454545 边，圆角 6px，flex 容器
5 段 flex:6/16/1/1/8，背景 #0071e3/#5e5ce6/#1a7f42/#b06000/#86868b
段内白字：字段名 11px/700 + 位宽 9px
```
**交互热点：** 对应字段 focus/hover → 该段 `filter:brightness(1.25)` + 2px 白 outline(inset)。
> ⚠️ 段宽按真实位宽(6/16/1/1/8)，**不可**按十六进制字符等分。

### 功能码选择器（FunctionSelect, select）
```
高 34px，背景 #3c3c3c，1px #6b6b6b，圆角 4px；focus border #007fd4
选项文本：0xNN · 中文标签
下方语义注记 fnote 12px：defined #9d9d9d / reserved·undefined #cca700
```

### Hex 输入（命令码 / 参数）
```
hexwrap：flex，背景 #3c3c3c，1px #6b6b6b，圆角 4px
  0x 前缀：#9d9d9d，右 1px #6b6b6b 分隔
  input：透明底，大写，14px mono，padding 7px 10px
invalid：边框 #f48771，文字 #f48771
```

### 分段控件（MS / RW, seg2）
```
两按钮等分，1px #6b6b6b 边分隔；高 34px
未选：背景 #3c3c3c 文字 #9d9d9d；选中：背景 #0e639c 文字 #fff
```

### 按钮
```
主操作：#0e639c / hover #1177bb / #fff；禁用 #2d2d2d/#6b6b6b
次操作：#3a3d41 / hover #45494e / #cccccc
复制：#3a3d41 + 1px #454545；done 态文字+边 #4caf50
圆角 4px，min-height 36px（复制 26px）
```

## 三、色彩 Token
| Token | hex | 用途 |
|-------|-----|------|
| bg-page | #1e1e1e | 页面/面板背景 |
| bg-quote | #2a2d2e | 说明条/标签底/结果渐变起点 |
| bg-sel | #264f78 | 结果渐变终点 |
| in-bg | #3c3c3c | 输入框背景 |
| in-bd | #6b6b6b | 输入框边框 |
| accent | #4fc1ff | 强调/标题/结果有效值 |
| focus | #007fd4 | focus 边框/outline |
| btn / btn-h | #0e639c / #1177bb | 主按钮 |
| btn2 / btn2-h | #3a3d41 / #45494e | 次按钮 |
| text / text2 | #cccccc / #9d9d9d | 主/次文字 |
| border | #454545 | 部件边框 |
| err / warn / ok | #f48771 / #cca700 / #4caf50 | 错误/警告/成功 |

## 四、字体规格
| 用途 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| 页面标题 | 18px | 600 | #4fc1ff |
| Section header | 13px | 600 | #4fc1ff |
| 结果 hex | 24px | 700 | #4fc1ff（mono） |
| 结果 dec | 15px | 500 | #cccccc（mono） |
| label / 控件文字 | 13–14px | 400 | #cccccc |
| 错误/警告/注记 | 12px | 400 | #f48771 / #cca700 |
| bits 标签 | 11px | 400 | #9d9d9d |

## 五、非静态区域
| 区域 | 组件 | 类型 | 空状态处理 |
|------|------|------|----------|
| 结果区 | hex/dec/位条 | 实时计算 | 未输入=占位灰 0x--------；零值=合法蓝 |
| 提示行 | hint | 条件渲染 | 空/警告(取低32位)/错误(点名字段) 三态 |
| 功能码注记 | fnote | 条件渲染 | 按区段(defined/reserved/oem/undefined)变色 |
| 操作 toast | toast | 条件渲染 | 默认隐藏；应用成功/失败显示 |

## 六、数据 Schema
> 只写结构，不写实例。字段命名与 data-structure.md 一致。
```typescript
// SmcFields — 来源：本地用户输入 / 反解偏移量；无远程数据源
interface SmcFields {
  function: number   // 0x00–0x3F（6-bit, 位31–26）
  command: number    // 0x0000–0xFFFF（16-bit, 位25–10）
  ms: 0 | 1          // 位9
  rw: 0 | 1          // 位8
  parameter: number  // 0x00–0xFF（8-bit, 位7–0）
}
// 应用事件 payload
interface SmcApplyDetail { offsetHex: string; offsetDec: number; fields: SmcFields }
```
数据来源：纯本地（无 API）| 加载时机：无 | 更新策略：字段变更实时(250ms 防抖)。

## 七、布局策略
无拓扑/流程图/树形结构，不适用自动布局引擎。位布局条为**固定比例 flex**（6:16:1:1:8），非算法布局。

## 八、交互操作规格 + 状态枚举

### 8.4 逐组件状态枚举表
> 必覆盖 default/hover/focus/active/disabled/error/empty/loading，不存在写「不适用」。

#### 主操作按钮「应用」
| 状态 | 触发 | 视觉（hex/px） | 行为约束 |
|------|------|---------------|---------|
| default | 全字段合法 | 背景 #0e639c，文字 #fff | 可点 |
| hover | 鼠标移入 | 背景 #1177bb | 非持久 |
| focus | Tab/点击 | outline 2px #007fd4，offset 2px | 键盘可见 |
| active | 按下 | 背景 #0e639c | 松开恢复 |
| disabled | 任一字段非法/缺失 | 背景 #2d2d2d，文字 #6b6b6b，cursor not-allowed | 不响应 |
| error | 不适用 | — | — |
| empty | 不适用 | — | — |
| loading | 不适用（本地计算） | — | — |

#### Hex 输入（命令码/参数）
| 状态 | 触发 | 视觉 | 行为约束 |
|------|------|------|---------|
| default | 加载 | 背景 #3c3c3c，边框 #6b6b6b | — |
| hover | 移入 | 同 default | — |
| focus | 聚焦 | border/outline #007fd4，对应位段高亮 | — |
| active | 输入 | 实时过滤非 hex、转大写、截断 maxLen | — |
| disabled | 不适用 | — | — |
| error | blur 后 > maxValue | 边框 #f48771，文字 #f48771，下方「⚠ 超出范围」 | 修正后清除 |
| empty | 清空 | 占位符 #8b8b8b 显示 | 结果跳未输入态 |
| loading | 不适用 | — | — |

#### 分段控件（MS/RW）
| 状态 | 触发 | 视觉 | 行为约束 |
|------|------|------|---------|
| default(未选) | — | 背景 #3c3c3c，文字 #9d9d9d | — |
| selected | 点击/解析回填 | 背景 #0e639c，文字 #fff，aria-pressed=true | 互斥单选 |
| focus | Tab | outline 2px #007fd4(inset) | 键盘可达 |
| disabled/error/empty/loading | 不适用 | — | — |

#### 功能码选择器
| 状态 | 触发 | 视觉 | 行为约束 |
|------|------|------|---------|
| default | — | 背景 #3c3c3c，边框 #6b6b6b；注记 #9d9d9d | — |
| focus | 聚焦 | border #007fd4 | — |
| reserved/undefined | 选中 0x20 或空洞值 | 注记变 #cca700 提示 | 校验放行但提示 |
| error | 不适用（下拉受限于合法项） | — | — |
| disabled/empty/loading | 不适用 | — | — |

#### 复制按钮
| 状态 | 触发 | 视觉 | 行为约束 |
|------|------|------|---------|
| default | — | 背景 #3a3d41，边框 #454545 | — |
| hover | 移入 | 背景 #45494e | — |
| focus | Tab | outline 2px #007fd4 | — |
| done | 复制成功 | 文字「已复制 ✓」#4caf50，边 #4caf50，持续 800ms | 自动恢复 |
| disabled/error/empty/loading | 不适用 | — | — |

## 九、关键交互序列 + 数据流

### 正向编码（填字段 → 命令字）
1. **触发**：用户改任一字段（条件：无）。
2. **即时反馈**：250ms 防抖；hex 输入实时过滤/截断。
3. **计算**：本地 `encodeOffset`（同步，<1ms）。
4. **成功**：结果区 hex/dec 更新（蓝），位条对应段高亮可联动。
5. **失败**：字段超范围 → 该字段红边框+⚠，结果区红并点名字段，应用禁用。
6. **逆操作**：取消复位全字段为 0。

### 反向解码（偏移量 → 字段）
1. **触发**：十进制框输入后点「解析」或回车。
2. **即时反馈**：解析输入（支持 0x）。
3. **处理**：`parseOffsetInput` → `decodeOffset`，本地同步。
4. **成功**：回填 5 字段 + 结果区同步；溢出则警告色「取低 32 位」。
5. **失败**：空/负/非法 → offset-err「⚠ 无效的偏移量」。
6. **逆操作**：可继续编辑字段或取消。

### 应用（结果 → 宿主）
1. **触发**：点「应用」（条件：全字段合法）。
2. **处理**：`dispatchEvent('smc-apply', {offsetHex,offsetDec,fields})`。
3. **成功**：success toast；宿主侧 `postMessage` 回写目标。
4. **失败**：有非法字段 → error toast，不抛事件。

```
用户输入 → 字段状态(本地) → encodeOffset → 结果+位条
偏移量输入 → parseOffsetInput → decodeOffset → 回填字段 → encodeOffset → 结果
应用 → CustomEvent('smc-apply') → 宿主 postMessage → 写回寄存器/单元格
```

## ⚠️ 待设计师/规格确认
1. [ ] 复制成功反馈时长（当前 800ms）与是否加微动效。
2. [ ] 功能码未定义空洞（0x0A–0x1F 等）：仅警告 vs 拦截？（来自 D6）
3. [ ] 「应用」后宿主的真实写回目标与失败反馈文案。
4. [ ] 是否保留原始 hex 直填功能码作为高级输入路径。
5. [ ] 窄面板(<360px)下 2 列网格是否降级为单列。
