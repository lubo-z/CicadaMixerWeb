# 数据模型、选择规则与 API

## 1. 配置模型

配置文件是生态资料和播放器默认值的权威来源。首版使用 `backend/config/config.json`，其结构由同目录的 `config.schema.json`（JSON Schema Draft 2020-12）约束。两者属于后端资源：后端启动时读取并校验，前端不直接访问原始配置文件。

```json
{
  "$schema": "./config.schema.json",
  "schemaVersion": 2,
  "autoMix": {
    "defaultTracks": 6,
    "minTracks": 1,
    "maxTracks": 10
  },
  "liveRefresh": {
    "defaultMinutes": 30,
    "minMinutes": 5,
    "maxMinutes": 120,
    "stepMinutes": 5
  },
  "seasons": {
    "spring": [3, 4, 5],
    "summer": [6, 7, 8],
    "autumn": [9, 10, 11],
    "winter": [12, 1, 2]
  },
  "dayPeriods": [
    {
      "id": "dawn",
      "labelZh": "黎明",
      "windows": ["05:00-07:30"]
    }
  ],
  "sources": {
    "lee_2003_part2": {
      "title": "Taxonomic Review of Cicadidae from Taiwan, Part 2: Dundubiini",
      "url": "https://citeseerx.ist.psu.edu/document?doi=d3cecb395f5af9270b87569c4675e8c642450d08",
      "accessed": "2026-07-24"
    }
  },
  "cicadas": [
    {
      "id": "purana_apicalis",
      "displayOrder": 10,
      "enabled": true,
      "autoEligible": true,
      "autoPriority": 78,
      "commonNameZh": "台湾姬蝉",
      "scientificName": "Purana apicalis",
      "mediaFile": "Purana apicalis - Cicadas in Taiwan.mp4",
      "volume": 60,
      "activeMonths": [5, 6, 7, 8, 9],
      "peakMonths": [],
      "callingWindows": ["05:30-08:00"],
      "evidenceLevel": "high",
      "evidenceNote": "台湾种级文献：成虫5–9月，雄虫通常约05:30–08:00鸣叫。",
      "sourceIds": ["lee_2003_part2"]
    }
  ]
}
```

### 字段约束

| 字段 | 约束 |
| --- | --- |
| `$schema` | 编辑器/工具使用的相对 JSON Schema 路径 |
| `schemaVersion` | Web 配置 schema 当前为 2；后端只接受明确支持的版本 |
| `autoMix` | 浏览器自动混音上限的只读约束；满足 `1 <= minTracks <= defaultTracks <= maxTracks` |
| `liveRefresh` | 浏览器实时检查间隔的只读约束；满足 `1 <= minMinutes <= defaultMinutes <= maxMinutes`，默认值和范围端点均与 `stepMinutes` 对齐 |
| `id` | 沿用稳定 snake_case 标识；显示名称变化不改 ID |
| `mediaFile` | `backend/resources/sounds/` 下的单个文件名，不允许目录分隔符或路径穿越 |
| `activeMonths` | 去重后的 1–12；未知时为空 |
| `peakMonths` | `activeMonths` 的子集；首版作为资料和 UI 信息，不改变过滤 |
| `callingWindows` | 一个或多个左闭右开区间；允许跨午夜 |
| `evidenceLevel` | `high`、`medium`、`low`、`unknown` |
| `evidenceNote` | 面向用户/维护者的简短依据和限制 |
| `sourceIds` | 必须引用 `sources` 中存在的来源 |
| `autoEligible` | 仅资料足以自动选择时为 true |
| `enabled` | false 时不出现在客户端目录 |
| `volume` | 0–100 的整数；API 转换为 `defaultGain = volume / 100` |
| `autoPriority` | 整数，越大越优先 |
| `displayOrder` | 整数升序展示 |

未知生态数据必须用空数组/`unknown` 表达，不能用全月份或全天代替。资料不足的蝉仍可 `enabled: true`、`autoEligible: false`，供手动模式选择。

`catalogVersion` 不要求人工写入配置，由后端根据规范化 JSON 内容生成内容哈希。每个媒体的 API 版本也由文件内容哈希生成。首版每种蝉只有一个媒体，因此运行时 media ID 可与 cicada ID 相同；未来若支持一个物种多份媒体，再通过 schema/ADR 显式拆分。

JSON Schema 负责字段类型、必填项、格式、枚举、数值范围和数组唯一性。后端仍须完成 JSON Schema 无法可靠表达的交叉校验：浏览器设置默认值/范围/步长一致、ID 全局唯一、峰值月份属于活动月份、来源 ID 存在、自动项目资料完整，以及媒体文件真实存在。

### 浏览器级设置数据

Catalog 的 `autoMix` 和 `liveRefresh` 是后端只读约束，不是当前用户值。前端使用键 `cicadaMixer.preferences.v1` 在同源 `localStorage` 保存：

```json
{
  "version": 1,
  "maxAutoTracks": 6,
  "autoRefreshMinutes": 30
}
```

前端逐项校验整数、范围和步长；无效项回退至 Catalog 默认值。此对象不通过 API 上传，后端不提供写配置或写用户设置的接口。

## 2. 月份匹配

调用方把时节转换成目标月份集合：

- 当前月份：`{本地当前月}`
- 春季：`{3,4,5}`
- 夏季：`{6,7,8}`
- 秋季：`{9,10,11}`
- 冬季：`{12,1,2}`

若 `activeMonths ∩ targetMonths` 非空，则月份匹配。

## 3. 时间匹配

时间统一转换为从午夜开始的整数分钟 `0..1439`。

- 普通区间 `start < end`：`start <= value < end`
- 跨午夜区间 `start > end`：`value >= start OR value < end`
- `start == end` 是无效配置，不解释为全天

“实时”和“自定义时间”使用一个具体分钟值。固定时段（如黎明）使用时段范围与蝉鸣区间“存在交集”作为匹配条件，使用户可以试听该时段内可能出现的组合。

## 4. 自动选择算法

输入：

- 已启用的目录快照；
- 目标月份集合；
- 具体时间，或固定时段的一个/多个范围；
- `maxTracks`，取经 Catalog 约束校验后的浏览器设置；首版默认 6、范围 1–10。

处理：

1. 过滤 `enabled=true`、`autoEligible=true` 且媒体存在的项目。
2. 过滤月份不匹配的项目。
3. 过滤时间不匹配的项目。
4. 按以下键稳定排序：
   1. `autoPriority` 降序；
   2. `evidenceLevel`：high、medium、low、unknown；
   3. `displayOrder` 升序；
   4. `id` 字典序升序。
5. 取前 `maxTracks` 个。

这是在未获得原程序精确排序规则时的基线规则。若找回旧配置或算法，应先更新需求、本文和 ADR，再实现变化。

## 5. HTTP API

所有 API 使用 `/api/v1` 前缀。成功响应为 JSON，时间字符串均采用 `HH:MM`。

### `GET /api/v1/catalog`

返回客户端所需的只读目录。服务器内部绝对路径不得返回。

示例：

```json
{
  "schemaVersion": 2,
  "catalogVersion": "sha256:EXAMPLE",
  "autoMix": {
    "defaultTracks": 6,
    "minTracks": 1,
    "maxTracks": 10
  },
  "liveRefresh": {
    "defaultMinutes": 30,
    "minMinutes": 5,
    "maxMinutes": 120,
    "stepMinutes": 5
  },
  "seasons": {
    "spring": [3, 4, 5],
    "summer": [6, 7, 8],
    "autumn": [9, 10, 11],
    "winter": [12, 1, 2]
  },
  "dayPeriods": [
    {
      "id": "dawn",
      "labelZh": "黎明",
      "windows": ["05:00-07:30"]
    }
  ],
  "sources": {
    "lee_2003_part2": {
      "title": "Taxonomic Review of Cicadidae from Taiwan, Part 2: Dundubiini",
      "url": "https://citeseerx.ist.psu.edu/document?doi=d3cecb395f5af9270b87569c4675e8c642450d08",
      "accessed": "2026-07-24"
    }
  },
  "cicadas": [
    {
      "id": "purana_apicalis",
      "commonNameZh": "台湾姬蝉",
      "scientificName": "Purana apicalis",
      "media": {
        "id": "purana_apicalis",
        "url": "/api/v1/media/purana_apicalis?v=VERSION",
        "contentType": "video/mp4",
        "fileName": "Purana apicalis - Cicadas in Taiwan.mp4"
      },
      "activeMonths": [5, 6, 7, 8, 9],
      "peakMonths": [],
      "callingWindows": ["05:30-08:00"],
      "evidenceLevel": "high",
      "evidenceNote": "台湾种级文献：成虫5–9月，雄虫通常约05:30–08:00鸣叫。",
      "sourceIds": ["lee_2003_part2"],
      "autoEligible": true,
      "defaultGain": 0.6,
      "displayOrder": 10,
      "autoPriority": 78
    }
  ]
}
```

响应：

- `200`：有效目录；
- `503`：目录未成功加载；返回标准错误体。

目录支持 `ETag` 和 `If-None-Match`，未变化时返回 `304`。

Catalog 只返回设置约束，不读取浏览器当前值。首版没有修改后端配置或保存用户设置的 API。

### `GET /api/v1/media/{mediaId}`

根据已校验的 media ID 返回文件：

- 支持 `GET`、`HEAD` 和单一字节范围请求；
- 合法范围返回 `206` 和 `Content-Range`；
- 不可满足范围返回 `416`；
- 未知 ID 返回 `404`；
- Content-Type 来自经过校验的媒体元数据；
- 不接受文件路径查询参数。

### `GET /api/v1/health/live`

进程存活返回 `200`。

### `GET /api/v1/health/ready`

配置和目录成功加载、媒体根目录可访问时返回 `200`，否则返回 `503`。

## 6. 错误格式

```json
{
  "error": {
    "code": "CATALOG_UNAVAILABLE",
    "message": "蝉鸣目录暂时不可用",
    "requestId": "可选的追踪标识"
  }
}
```

客户端根据稳定 `code` 处理，不解析 `message`。错误响应不得包含绝对文件路径、堆栈或配置内容。

## 7. API 兼容规则

- 在 v1 中增加客户端可忽略的可选字段是兼容变更。
- 删除/重命名字段、改变字段含义或选择语义是破坏性变更，需要新 API/schema 版本。
- 配置 schema 和 API schema 可以分别演进，但转换必须有后端测试。
- OpenAPI 文件由后端契约生成或校验；实现开始后应纳入版本控制。
