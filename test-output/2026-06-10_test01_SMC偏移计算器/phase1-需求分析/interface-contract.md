# SMC 偏移量计算器 · 接口契约

> ⚠️ 本功能**没有 HTTP/REST 后端**。它是纯本地计算器，运行在 VS Code Webview 里。
> 「接口」体现为两类边界：①Webview ↔ 扩展宿主的消息桥；②纯函数计算契约。
> （这是 phase1 Step 1.3.2 模板未覆盖的形态，见末尾「对 skill 的反馈」。）

## A. 纯函数计算契约（本地，无网络）

```typescript
// 字段配置（来自 fieldConfig）
interface FieldConfig { maxLen: number; maxValue: number }
const FIELD_CONFIG = {
  function:  { maxLen: 2, maxValue: 0x3F },
  command:   { maxLen: 4, maxValue: 0xFFFF },
  ms:        { maxLen: 1, maxValue: 0x1 },
  rw:        { maxLen: 1, maxValue: 0x1 },
  parameter: { maxLen: 2, maxValue: 0xFF },
}

interface SmcFields {
  function:  number  // 0x00–0x3F
  command:   number  // 0x0000–0xFFFF
  ms:        number  // 0/1
  rw:        number  // 0/1
  parameter: number  // 0x00–0xFF
}

// 编码：字段 → 32 位命令字
function encodeOffset(fn, cmd, ms, rw, param): number
//   = ((fn<<26)|(cmd<<10)|(ms<<9)|(rw<<8)|param) >>> 0

// 解码：32 位命令字 → 字段
function decodeOffset(offset32: number): SmcFields

// 校验：单字段是否在范围内
function isValidField(field: keyof SmcFields, value: number): boolean
```

## B. Webview ↔ 扩展宿主 消息桥（待确认草案）

当前 standalone 文件里，「应用 / 取消」只更新页面内 DOM；在真实 VS Code 插件里它们应通过 `postMessage` 与扩展宿主通信。下表是**草案，待与插件后端确认**：

| 触发 | 方向 | 消息（草案） | 说明 |
|------|------|------------|------|
| 点「✓ 应用」且字段合法 | Webview → Host | `{ type: 'applyOffset', offsetHex: '0x30460000', offsetDec: 809893888 }` | 把计算结果回填到调用方（如寄存器表单元格） |
| 点「✕ 取消」 | Webview → Host | `{ type: 'cancel' }` | 关闭面板/放弃 |
| 宿主带初值打开 | Host → Webview | `{ type: 'init', offsetDec: 809893888 }` | 用既有值预填并解析到字段 |

> 当前 standalone 版本中以上消息**全部缺失**——`applyBtn` 只是把结果写进页面提示条与十进制输入框。工程化时需补齐宿主桥（或确认它就是个独立工具页，不回写）。

## 字段 → UI 状态映射

```
fields(function/command/ms/rw/parameter) 任一 input
  → 实时（300ms 防抖）→ encodeOffset
    → 全部合法  → #realTimeHex = 0x________（蓝），#realTimeDec = 十进制
    → 任一非法  → #realTimeHex = 0x--------（红），#realTimeDec = '-'

十进制偏移量输入 + 点「↓ 解析到组成字段」
  → parseInt（支持 0x 前缀）
    → NaN / <0      → #offsetDecimal-error「无效的10进制偏移量」
    → > 0xFFFFFFFF  → #offsetDecimal-warning「超过 32 位…取低 32 位」+ 继续解析
    → 正常          → decodeOffset → 回填 5 字段 → 触发实时计算

单字段 input
  → 即时：toUpperCase + 去非 [0-9A-F] + 截断到 maxLen
  → blur：超 maxValue → input.invalid（红字）+ 字段级「超出范围」
```

## 前后端责任划分

| 功能 | 前端（Webview）负责 | 宿主/后端负责 | 联调验证点 |
|------|--------------------|--------------|----------|
| 位字段编解码 | 全部（纯本地计算） | 无 | — |
| 字段格式/范围校验 | 全部（长度、十六进制、maxValue） | 功能码 × 命令码的**业务合法性**（若有规格表） | 后端规格表是否需要前端拦截非法组合 |
| 应用结果回写 | 触发 `applyOffset` 消息 | 接收并写入目标（寄存器/表单） | 回写目标、失败反馈 |
| 功能码语义表 | 当前硬编码在 tooltip | 理想由宿主提供枚举字典 | 标签来源、国际化 |

## 待联调确认事项

1. [ ] 真实部署是「VS Code Webview 嵌入」还是「独立工具页」？决定是否需要 `postMessage` 宿主桥。
2. [ ] 「应用」后结果写到哪里？需不需要把 hex/dec 一起回传？
3. [ ] 功能码枚举（含 Reserved/OEM 区段）是前端硬编码还是宿主下发？影响国际化与后续维护。
4. [ ] 是否需要拦截「合法范围内但语义未定义」的功能码（如 `0x1F`）？

## 对 skill 的反馈（测试发现）

- phase1 Step 1.3.2 的 `interface-contract.md` 模板默认输入有 **REST 接口**（`GET /api/feature`、分页 cursor/offset）。本输入是**离线纯函数 + Webview 消息桥**，整张模板的「请求方式/路径/分页策略」都不适用。Skill 应增加一类「无 HTTP 后端」分支：纯函数契约 + 宿主桥（Webview postMessage / Electron IPC / CLI stdin）也是合法的接口形态。
