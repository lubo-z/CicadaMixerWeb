# 媒体与蝉种清单

## 1. 当前资源概况

项目 `backend/resources/sounds/` 中有 17 个 MP4 文件，总大小 80,040,301 bytes（约 80.0 MB 或 76.3 MiB）。系统 `file` 工具将它们识别为 `ISO Media, MP4 v2`。

当前环境没有 `ffprobe`，因此尚未确认每个文件是否有音轨、音频编码、声道、采样率、时长、响度、是否含视频轨，以及目标浏览器能否解码。实现前必须完成媒体审计。

## 2. 名称映射

下表按原说明中的顺序映射。映射基于学名和文件名，属于文档基线；生态数据仍待补齐。

| # | 中文名 | 学名 | 文件名 | 大小（bytes） |
| ---: | --- | --- | --- | ---: |
| 1 | 台湾姬蝉 | Purana apicalis | `Purana apicalis - Cicadas in Taiwan.mp4` | 2,205,170 |
| 2 | 阳明山暮蝉 | Tanna sozanensis | `Tanna sozanensis.mp4` | 4,579,136 |
| 3 | 寒蝉 | Meimuna opalifera | `Meimuna opalifera - Cicadas in Taiwan.mp4` | 7,098,479 |
| 4 | 台湾熊蝉 | Cryptotympana holsti | `Cryptotympana holsti - Cicadas in Taiwan.mp4` | 5,264,018 |
| 5 | 纹翅暮蝉 | Tanna ornatipennis | `Tanna ornatipennis - Cicadas in Taiwan│ Audio only.mp4` | 583,548 |
| 6 | 太平暮蝉 | Tanna taipinensis | `Tanna taipinensis - Cicadas in Taiwan.mp4` | 4,506,265 |
| 7 | 蟪蛄 | Platypleura kaempferi | `Platypleura kaempferi - Cicadas in Taiwan.mp4` | 1,999,947 |
| 8 | 小蟪蛄 | Platypleura takasagona | `Platypleura takasagona - Cicadas in Taiwan.mp4` | 6,884,961 |
| 9 | 黄蟪蛄 | Platypleura hilpa | `Platypleura hilpa - Cicadas in Taiwan.mp4` | 3,769,697 |
| 10 | 红脉熊蝉 | Cryptotympana atrata | `Cryptotympana atrata - Cicadas in Taiwan.mp4` | 9,604,739 |
| 11 | 岩崎寒蝉 | Meimuna iwasakii | `Meimuna iwasakii - Cicadas in Taiwan.mp4` | 7,460,088 |
| 12 | 黑翅草蝉 | Mogannia formosana | `Mogannia formosana - Cicadas in Taiwan.mp4` | 3,554,822 |
| 13 | 太平姬春蝉 | Euterpnosia varicolor | `Euterpnosia varicolor - Cicadas in Taiwan.mp4` | 3,643,040 |
| 14 | 细蝉 | Leptosemia sakaii | `Leptosemia sakaii - Cicadas in Taiwan.mp4` | 4,729,567 |
| 15 | 斑透翅蝉 | Hyalessa maculaticollis | `Min-min cicada singing _ Hyalessa maculaticollis.mp4` | 2,621,987 |
| 16 | 草蝉 | Mogannia hebes | `Mogannia hebes - Cicadas in Taiwan.mp4` | 3,611,161 |
| 17 | 渡边幽蝉 | Semia watanabei | `Semia watanabei - Cicadas in Taiwan.mp4` | 7,923,676 |

## 3. 实施前媒体审计

为每个文件记录：

- 容器和音频 codec；
- 是否存在视频轨及其码率占比；
- 时长、采样率、声道；
- integrated loudness、true peak 和循环接缝；
- Chrome、Firefox、Safari 的解码结果；
- 来源、作者、许可、署名和允许 Web 分发的证据；
- 内容哈希，用作缓存版本。

审计失败的文件不得标为自动可用。若 MP4 中包含高码率视频，应评估在取得许可的前提下生成音频专用衍生文件，以降低带宽；这属于媒体处理决策，实施前需记录来源和转换参数。

## 4. 已采用的初始生态配置

下表来自 `backend/config/config.json` 和研究文档。它是首版自动模式的配置基线，不代表普遍、精确的野外预测；完整依据和限制见 `08-cicada-research.md`。

| 中文名 | 活跃月份 | 峰值月份 | 鸣叫区间 | 音量 | 证据 | 自动 |
| --- | --- | --- | --- | ---: | --- | ---: |
| 台湾姬蝉 | 5–9 | — | 05:30–08:00 | 60 | 高 | 是 |
| 阳明山暮蝉 | 5–9 | 6–8 | 05:00–07:30；16:30–19:00 | 58 | 中 | 是 |
| 寒蝉 | 6–11 | 8–10 | 06:30–18:30 | 58 | 高 | 是 |
| 台湾熊蝉 | 5–11 | 6–7 | 06:30–18:00 | 54 | 高 | 是 |
| 纹翅暮蝉 | 7–8 | — | 16:30–19:00 | 60 | 高 | 是 |
| 太平暮蝉 | 5–10 | — | 12:30–19:00 | 60 | 高 | 是 |
| 蟪蛄 | 4–9（暂定） | — | 06:00–18:30 | 56 | 低 | 否 |
| 小蟪蛄 | 4–8 | 5–6 | 05:30–18:30 | 54 | 高 | 是 |
| 黄蟪蛄 | 未定 | — | 未定 | 56 | 未知 | 否 |
| 红脉熊蝉 | 6–9 | 6–7 | 06:00–18:30 | 52 | 高 | 是 |
| 岩崎寒蝉 | 未定 | — | 06:00–18:30（暂定） | 58 | 低 | 否 |
| 黑翅草蝉 | 5–9 | 5–6 | 07:00–15:00 | 58 | 高 | 是 |
| 太平姬春蝉 | 5–6 | — | 06:00–18:30 | 58 | 高 | 是 |
| 细蝉 | 5–7 | 5–6 | 07:00–18:30 | 58 | 高 | 是 |
| 斑透翅蝉（Min-min） | 7–9 | 8 | 06:00–18:30 | 56 | 中（日本资料） | 是 |
| 草蝉 | 3–9 | — | 06:00–18:30 | 58 | 中 | 是 |
| 渡边幽蝉 | 4–6 | 5 | 06:30–19:00 | 60 | 高 | 是 |

`音量` 沿用桌面版的 0–100 整数。Web API 将其除以 100 转换为每轨 0–1 默认增益。
