# SMC 偏移量计算器 · 工程接入指南

---

## 前置条件

| 项目 | 要求 |
|------|------|
| Node.js | 18+（仅用于运行测试；页面本身无 Node 依赖） |
| 浏览器 | Chromium 90+ / Firefox 89+ / Safari 15+（Custom Element + Shadow DOM + CSS `color-mix()`） |
| 宿主环境 | VS Code Webview / 现代浏览器 / Electron / 任何支持 Web Component 的容器 |
| 模块加载 | `type="module"`（ES Module），**不能用 `file://` 直接打开**；需 HTTP 服务 |

---

## 安装依赖 / 文件放置

本工具**零 npm 依赖**。将以下文件复制到目标工程：

```
src/
├── components/SmcCalculator/index.js   → 组件主体
├── utils/smcCodec.js                   → 编解码纯函数
├── utils/formatters.js                 → 格式化工具
├── utils/validators.js                 → 字段校验
└── constants/enums.js                  → 枚举与常量
```

启动本地服务（开发/验证用）：
```bash
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

---

## 配置

在宿主 HTML 中注册并使用组件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 1. 引入 PTO 设计系统（或通过 CSS 自定义属性覆盖 token） -->
  <link rel="stylesheet" href="path/to/pto-design-system/css/style.css"/>
  <!-- 2. 注册 Web Component -->
  <script type="module" src="src/components/SmcCalculator/index.js"></script>
</head>
<body>
  <!-- 3. 使用组件 -->
  <smc-calculator></smc-calculator>
</body>
</html>
```

**若宿主无 PTO 设计系统**：组件通过 Shadow DOM 内联了所有必要的 CSS 自定义属性默认值，可独立渲染（视觉颜色使用内置深色主题）。PTO CSS 主要提供更精细的 token 覆盖。

**可选属性：**
```html
<!-- 设置自定义示例值（默认 0x18040600） -->
<smc-calculator sample-word="0x30440100"></smc-calculator>
```

---

## 接口定义对接

### 输出事件（组件 → 宿主）

本工具为**纯本地离线计算工具，无 HTTP 后端**。结果通过 `CustomEvent` 向宿主广播：

```javascript
// 监听复制事件（每次用户点击复制时触发）
document.querySelector('smc-calculator').addEventListener('smc-copy', e => {
  console.log('用户复制了：', e.detail.text);
  console.log('格式：',       e.detail.fmt);   // 'hex'|'dec'|'both'|'c'|'json'
});

// 监听历史回填事件（用户点击历史条目时触发）
document.querySelector('smc-calculator').addEventListener('smc-apply', e => {
  console.log('回填的 32-bit word：', e.detail.word);
  console.log('各字段值：',           e.detail.fields);
  // e.detail.fields = { func, cmd, ms, rw, param } 均为 number
});
```

### VS Code Webview 集成（postMessage 桥）

```javascript
// Webview 侧：监听组件事件并转发给扩展主体
const vscode = acquireVsCodeApi();
document.querySelector('smc-calculator').addEventListener('smc-copy', e => {
  vscode.postMessage({ type: 'smc-copy', payload: e.detail });
});
```

```javascript
// 扩展主体侧（extension.ts）：接收来自 Webview 的消息
panel.webview.onDidReceiveMessage(msg => {
  if (msg.type === 'smc-copy') {
    // msg.payload.text, msg.payload.fmt
  }
});
```

---

## 业务逻辑说明

核心业务规则位于 `src/utils/`，与 UI 完全解耦：

| 模块 | 职责 |
|------|------|
| `smcCodec.js` | 编解码：`composeWord(fields)` / `decomposeWord(word)` / `parseLoose(raw, bits)` |
| `formatters.js` | 格式化：`formatOutput(word, fmt)` / `describeFuncCode(v)` / `fmtHistoryTime(ts)` |
| `validators.js` | 校验：`validateField(key, value)` / `validateWord(word)` |
| `constants/enums.js` | 常量：字段定义、功能码表、格式枚举 |

纯函数可在扩展主体或 Node.js 环境中直接 import 使用：

```javascript
import { composeWord, decomposeWord } from './src/utils/smcCodec.js';
const word = composeWord({ func: 0x06, cmd: 0x0100, ms: 0, rw: 1, param: 0x00 });
```

---

## 前后端边界

| 功能 | 前端负责 | 外部依赖 | 说明 |
|------|---------|---------|------|
| 编解码计算 | ✅ 前端完全独立 | 无 | 纯位运算 |
| 格式化输出 | ✅ 前端完全独立 | 无 | HEX/DEC/C/JSON |
| 历史持久化 | ✅ localStorage | 无 | 跨会话保留 |
| 功能码语义 | ✅ 前端硬编码（FUNC_TABLE） | 无 | 静态表，变更需更新 enums.js |
| Webview 桥 | 发送 CustomEvent | VS Code API | 宿主侧监听 postMessage |
| 剪贴板写入 | `navigator.clipboard.writeText()` | 浏览器安全上下文 | Webview 内通常可用 |

---

## 枚举值 / 魔法值说明

所有枚举集中在 `src/constants/enums.js`，不在组件内硬编码：

```javascript
import { FUNC_TABLE, FUNC_OEM_MIN, FUNC_OEM_MAX } from './src/constants/enums.js';

// 扩展功能码表（如收到新规范版本）
FUNC_TABLE[0x0A] = '新功能分类';
```

功能码特殊规则（编码进 `describeFuncCode()`）：
- `0x00–0x09`：已定义功能码，正常显示
- `0x20`：Reserved，显示 warn 橙色
- `0x37–0x3F`：OEM 范围，显示 warn 橙色 + OEM 标识
- 其余 `0x0A–0x1F` / `0x21–0x36`：未定义，显示 warn

---

## 与外部系统联调待确认项

1. [ ] 若功能码表需动态从固件文档 API 拉取，需替换 `FUNC_TABLE` 静态对象为异步加载
2. [ ] 若需要多实例隔离历史（多个窗口/工具），需为 `HISTORY_STORAGE_KEY` 加实例前缀（如 `pto.smc.${instanceId}.history.v1`）
3. [ ] VS Code Webview 内 `navigator.clipboard` 在某些安全策略下可能受限，需用 `vscode.postMessage` 桥接剪贴板写入
4. [ ] `color-mix()` 兼容性：Chromium 111+ / Firefox 113+ / Safari 16.2+；老版 Electron 需确认内嵌 Chromium 版本

---

## 已知限制

来自设计审查与可访问性审查的遗留项（需后续迭代处理）：

| 来源 | 问题 | 优先级 |
|------|------|--------|
| 设计审查 D1 | hint 浮层功能码列表在迭代3已扩展为完整表（工程版已修复） | 已修复 |
| 设计审查 D2 | MS/RW 分段控件 null 初始态视觉暗示选中（待产品决策） | 🟡 |
| 设计审查 D3 | 历史时间戳跨日显示（工程版 formatters.fmtHistoryTime 已修复） | 已修复 |
| 可访问性 A1/A2 | 格式菜单 ARIA + 键盘导航（工程版已修复） | 已修复 |
| 可访问性 A5 | 字段复制 toast 反馈（工程版已修复） | 已修复 |
