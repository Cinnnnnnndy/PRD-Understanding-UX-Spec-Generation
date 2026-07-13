# Skill 盲测 · 差距分析（iter-1）

> 方法：用**当前 phase1 skill 的方法论**对原始 `preview-smc-calculator.html` 盲生成提示词（`demo-prompt.generated.md`），再据此生成 `optimized.html`，与 gold-standard `reference-optimized-demo.html` 逐能力对比。
> 问题：**达标了吗？还差在哪？**

## 一、能力覆盖对比

| # | 能力 | gold-standard | iter-1 盲生成 | 结论 |
|---|------|:---:|:---:|------|
| 1 | 完整 32-bit 位图（字段带/逐位格/位号尺/边界线） | ✓ | ✓ | ✅ 达标 |
| 2 | 位格按真实位区间着色（非半字节等分） | ✓ | ✓ | ✅ |
| 3 | HEX↔DEC 双向同步 + synced 指示 | ✓ | ✓ | ✅ |
| 4 | 字段卡按位宽成比例（6fr 16fr / 1fr 1fr 2fr） | ✓ | ✓ | ✅ |
| 5 | 每字段 DEC/HEX 读数 + 单独复制 + 语义 | ✓ | ✓ | ✅ |
| 6 | 样式化 hint 浮层（速查表） | ✓ | ✓ | ✅ |
| 7 | 拆分按钮 + 多格式导出（HEX/DEC/HEX+DEC/C/JSON）+ 实时预览 | ✓ | ✓ | ✅ |
| 8 | 最近 10 次历史（localStorage/回填/时间戳/清空/空态） | ✓ | ✓ | ✅ |
| 9 | Ctrl+S 收藏 | ✓ | ✓ | ✅ |
| 10 | 载入示例 / 重置 | ✓ | ✓ | ✅ |
| 11 | 宽松解析（0x/dec/裸 hex） | ✓ | ✓ | ✅ |
| 12 | 三态结果 + 复制动效 + toast | 部分 | ✓ | ✅（盲生成更完整） |
| 13 | 可访问性（focus-visible / aria-live / hint 可聚焦） | 弱（hover-only） | ✓ | ✅（盲生成更好） |
| 14 | 功能码语义准确性 | ✗ 占位（System/Power/Fan…） | ✓ 权威表（0x06 散热…） | ✅（盲生成更正确） |
| 15 | **openUBMC Studio shell 集成（tabbar/多视图/studio-shell.css）** | ✓ | ✗ 独立单文件 | ❌ **差距** |
| 16 | 视觉打磨细节（offset 输入即结果、bitmap-summary 行、band 省略号处理等） | 更精 | 基本到位 | ◻ craft 级差异 |

**结论：16 项里 14 项达标、2 项盲生成反而更优（a11y、数据正确性）、1 项纯 craft 差异、仅 1 项真差距。**

## 二、还差在哪（根因）

### 唯一实质差距：目标宿主 / 设计系统未知（#15）
- gold-standard 活在 openUBMC Studio shell 里（顶部 tab、多视图、共享 `studio-shell.css`、靛蓝 accent）；盲生成的是 VS Code 暗色独立单文件。
- **根因不是 checklist 漏了能力**，而是**「目标宿主/设计系统」是盲测无法从原始 HTML 推断的外部信息**——原始文件是 VS Code Webview 形态，没有任何线索表明它最终要进 Studio shell。
- 我在盲提示词里已把它列为「待确认 #1」，但 skill **没有强制在生成 Demo 前先问**——所以盲跑只能默认沿用原始的 VS Code 系统。

### craft 级差异（#16）：非 skill 能补
- 提示词能指定「offset 输入即结果」「加 summary 行」等，但最终视觉精细度取决于生成器的用心程度，不是 checklist 能保证的。属于「再迭代一版 Demo」的范畴。

## 三、本轮 skill 教训 → 待修

> **能力广度已收敛**（自检三问 + 专业级完成度清单成功盲挖出全部 14 项能力，甚至在数据正确性/a11y 上超过 gold-standard）。**唯一要补的是一个「前置确认」机制**：

**修复 F-host**：phase1 Step 3.5（产出优化后 Demo）之前，必须先确认 **目标宿主 + 设计系统**（VS Code Webview / openUBMC Studio shell / 独立页 / 其他），因为它决定整个视觉基线（accent、shell、是否多视图、是否复用既有 css）。这是优化模式 Demo 唯一无法从输入盲推、必须问用户的关键变量。盲跑时若未确认，默认沿用原始输入的设计系统并显式标注「设计系统待确认」。

## 四、是否收敛

✅ **已收敛**：能力广度一次盲跑即全覆盖；剩余 1 项差距是「外部信息缺失」而非「方法论缺陷」，已通过加「目标宿主确认」前置门解决；craft 差异靠再迭代一版 Demo，不属 skill 范畴。**无需继续循环**——再跑也不会暴露新的能力级 gap。
