# 系统架构

## 1. 架构原则

- 文档和契约先于实现；
- 浏览器负责播放、混音和使用本地时间的调度；
- 后端负责可信配置、校验和媒体分发；
- 首版采用同源、单体部署，避免过早引入数据库和服务拆分；
- 生态资料与程序逻辑分离，新增蝉种不要求修改选择算法。

## 2. 已实现技术栈

首版已经采用以下技术栈，变更前需更新 ADR：

- 前端：React + TypeScript + Vite；
- 后端：Python 3 + FastAPI；
- 配置：版本化 `config.json` + JSON Schema（后端读取、校验并生成安全的 Catalog JSON）；
- 测试：Vitest / Testing Library / Playwright；pytest；
- 生产入口：反向代理或 FastAPI 同源提供构建后的前端、API 和媒体。
- 字体：本地打包 Noto Sans SC / Noto Serif SC，不依赖外部字体服务。

技术栈变更必须先更新架构文档和 ADR。

## 3. 运行架构

```text
浏览器
  ├─ UI 与状态管理
  ├─ localStorage 浏览器级设置
  ├─ 自动选择纯逻辑
  ├─ 本地时间调度器
  └─ 多音轨播放器
          │
          │ HTTPS / same origin
          ▼
Web 后端
  ├─ 静态前端
  ├─ Catalog API
  ├─ 配置加载与校验
  └─ Media endpoint（Range / 缓存）
          │
          ▼
backend/config/ 版本化配置 + backend/resources/sounds/ 媒体文件
```

首版不需要数据库。目录在后端启动时载入为只读快照；更新配置或媒体后重启后端。`config.json` 是人工维护和版本控制的权威数据；Catalog API 尽量沿用相同字段，只替换后台媒体文件名、换算默认增益并补充运行时 URL/内容版本。

## 4. 前端模块边界

| 模块 | 职责 |
| --- | --- |
| `catalog` | 获取、校验 API 版本并展示蝉种 |
| `selection` | 按月份和时间计算候选、排序并按浏览器设置的合法上限截取 |
| `preferences` | 按 Catalog 约束读取、校验和保存浏览器级设置 |
| `player` | 创建循环音轨、应用默认增益、替换组合和容错 |
| `scheduler` | 计算检查点、管理自动会话、处理页面可见性 |
| `app-state` | 区分表单候选、预览组合、活动组合和播放状态 |
| `ui` | 模式、参数、列表、控制和可访问状态提示 |

选择算法不得直接读取全局时钟；调用方把月份集合和分钟数显式传入，便于测试。

播放器实现可从 `HTMLAudioElement` 开始；如需要独立增益，可通过 Web Audio `MediaElementAudioSourceNode` 接入每轨 `GainNode`。不能把 17 个媒体全部预加载。

## 5. 后端模块边界

| 模块 | 职责 |
| --- | --- |
| `settings` | 环境配置、路径和部署参数 |
| `catalog_loader` | 读取 JSON、执行 JSON Schema 与跨字段/文件校验 |
| `catalog_api` | 提供客户端所需的只读目录 |
| `media` | 通过不透明 media ID 安全提供媒体，支持 Range |
| `health` | 存活与就绪检查 |

后端不接受客户端传入任意媒体路径。API 返回由服务器生成的媒体 URL，媒体端点根据已加载目录解析 ID。

## 6. 目录结构

```text
CicadaMixerWeb/
├── docs/
├── frontend/
│   ├── src/
│   └── tests/
├── backend/
│   ├── app/
│   ├── config/
│   │   ├── config.json
│   │   └── config.schema.json
│   ├── resources/
│   │   └── sounds/
│   └── tests/
└── README.md
```

## 7. 配置启动校验

后端启动时至少检查：

- schema 版本受支持；
- ID 唯一且只含稳定安全字符；
- 中文名、学名、媒体引用不为空；
- 月份在 1–12 且不重复；
- 时间格式和区间有效；
- 配置音量为 0–100 的整数，转换后的 API 增益在 0–1；
- 排序/优先级为规定范围内整数；
- `autoEligible=true` 时月份、时段和可靠度满足要求；
- 浏览器设置约束满足 `min <= default <= max`，实时检查默认值和范围端点符合步长；
- 媒体 ID 唯一、文件存在、位于允许的媒体根目录内；
- 配置引用不存在路径穿越。

严重错误使 readiness 失败并阻止提供不完整目录；可选蝉种的单个媒体缺失是否降级为禁用，必须由显式配置决定，不能静默忽略。

## 8. 部署与缓存

- 开发环境可分开运行 Vite 和 FastAPI，通过开发代理保持 `/api` 路径一致。
- 生产默认同源并使用 HTTPS。
- 目录响应使用 `ETag` 或内容版本；前端遇到不支持的 schema 版本时显示不可用，而不是猜测字段含义。
- 媒体返回正确 `Content-Type`、`Accept-Ranges: bytes`、`Content-Length` 和条件缓存头。
- 媒体内容变化时更新媒体版本或内容哈希，避免浏览器继续使用旧缓存。

## 9. 安全与隐私

- 没有账户和服务端用户输入持久化，首版不设置身份系统。
- 自动混音上限和实时检查间隔只保存在同源 `localStorage`，不进入 API、日志或后端配置。
- 自定义时间只在客户端使用。
- 后端限制允许的方法、媒体 ID 长度和日志中的 URL 数据。
- 生产环境设置基础安全响应头；CSP 只允许同源脚本和媒体，除非文档明确增加外部来源。
- 媒体发布前必须确认版权与分发许可。

## 10. 媒体位置与运行方式

媒体源文件放在后端所有的 `backend/resources/sounds/` 目录，由 Server 管理且不能被浏览器直接枚举。实际混音仍发生在浏览器。浏览器开始播放时，会从 `/api/v1/media/{mediaId}` 请求不超过当前浏览器设置上限的媒体响应，并只输出其中的音轨。

本地单机运行的目标流程：

1. 启动一个 Web Server；
2. Server 读取 `backend/config/config.json`，按 `backend/config/config.schema.json` 校验，并检查 `backend/resources/sounds/` 中的媒体；
3. 用户访问类似 `http://127.0.0.1:8000/` 的地址；
4. 页面加载目录，用户点击播放后浏览器请求媒体并在本地混音；
5. 关闭 Server 后，尚未缓存的页面/API/媒体将不可访问。

生产环境同样是“先运行 Server，再由浏览器访问”，区别是 Server 通常持续运行在远程主机，通过 HTTPS 域名访问。若未来用对象存储/CDN 承载媒体，后端仍提供受控媒体 URL；这属于部署架构变化，需先新增 ADR。

开发环境可以分别启动前端开发服务器和后端 API，但这是开发便利。生产构建应由单一公开源提供页面和 API，让最终用户只需要打开一个网址。
