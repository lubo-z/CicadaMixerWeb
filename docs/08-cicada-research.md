# 蝉类月份与鸣叫时段研究基线

研究日期：2026-07-24  
纳入 Web 文档：2026-07-29  
来源：桌面版 `Cicada_Research.md`  
用途：为自动模式提供可追溯的初始数据；不是野外调查指南。

## 1. 方法与限制

媒体覆盖 17 个学名，多数为台湾物种或台湾录音。资料优先级为：

1. 台湾种级论文与自动录音实测；
2. 台湾政府、国家公园、博物馆或生命大百科；
3. 可追溯到专业图鉴或分类论文的教育资料；
4. 属级习性或其他地区资料，仅作低置信度暂定。

月份表示成虫出现或有鸣叫记录的范围，不保证范围内每天都鸣叫。声音还受温度、湿度、降雨、海拔、纬度、光照与都市灯光影响。固定时钟窗口是软件近似，并非太阳高度模型。

Shieh 等 2015 年研究在 2011 年每天 05:30–19:00 每半小时录音 5 分钟，提供台湾特定城市和山地地点的物种日内与半月活动表。数据很有价值，但不能外推成全台湾绝对边界；研究没有覆盖 19:00–05:30，也不能据此证明夜间绝对无鸣叫。

本文件继承旧版研究结果，尚未在本次 Web 文档整理中重新访问或独立核验外部来源。后续若研究结论变化，必须先更新本文件、配置和变更日志。

## 2. 证据等级

- **高**：台湾种级研究直接给出月份和/或时刻。
- **中**：可靠台湾资料给出范围，时段有种级或属级支持。
- **低**：只有邻近地区、属级习性、单次标本或间接资料。
- **未知**：当前未找到足以配置自动模式的资料。

`auto_eligible` 表达的是配置证据是否足以进入自动模式，不是物种是否真实会鸣叫。

## 3. 物种结论

| 学名 | 中文名 | 活跃月份 | 软件时段 | 证据 | 自动 | 依据摘要 |
| --- | --- | --- | --- | --- | ---: | --- |
| *Purana apicalis* | 台湾姬蝉 | 5–9 | 05:30–08:00 | 高 | 是 | 台湾分类研究直接记载月份和清晨鸣叫。 |
| *Tanna sozanensis* | 阳明山暮蝉 | 暂定 5–9 | 05:00–07:30；16:30–19:00 | 中 | 是 | 可靠资料描述黎明、黄昏、阴天鸣叫；月份仍需补强。 |
| *Meimuna opalifera* | 寒蝉 | 6–11，8–10 较多 | 06:30–18:30 | 高 | 是 | 台湾生命大百科与自动录音支持。 |
| *Cryptotympana holsti* | 台湾熊蝉 | 5–11，6–7 强 | 06:30–18:00 | 高 | 是 | 台湾山地自动录音支持月份和日间活动。 |
| *Tanna ornatipennis* | 纹翅暮蝉 | 7–8 | 16:30–19:00 | 高 | 是 | 台湾种级资料给出月份与傍晚鸣叫。 |
| *Tanna taipinensis* | 太平暮蝉 | 5–10 | 12:30–19:00 | 高 | 是 | 台湾山地实测集中于下午至黄昏。 |
| *Platypleura kaempferi* / *Planopleura kaempferi* | 蟪蛄 | 暂定 4–9 | 06:00–18:30 | 低 | 否 | 缺少明确的台湾种级月份边界。 |
| *Platypleura takasagona* / *Planopleura takasagona* | 小蟪蛄 | 4–8 | 05:30–18:30 | 高 | 是 | 台湾生命大百科和自动录音支持。 |
| *Platypleura hilpa* | 黄蟪蛄 | 未定 | 未定 | 未知 | 否 | 不能用同属数据代替种级事实。 |
| *Cryptotympana atrata* | 红脉熊蝉 | 6–9 | 06:00–18:30 | 高 | 是 | 台湾属级月份与城市自动录音支持。 |
| *Meimuna iwasakii* | 岩崎寒蝉 | 未定 | 暂定 06:00–18:30 | 低 | 否 | 缺少可靠的台湾种级月份资料。 |
| *Mogannia formosana* | 黑翅草蝉 | 5–9 | 07:00–15:00 | 高 | 是 | 台湾山地自动录音支持。 |
| *Euterpnosia varicolor* | 太平姬春蝉 | 5–6 | 06:00–18:30 | 高 | 是 | 分类修订和晴天鸣叫资料支持；保留分类历史说明。 |
| *Leptosemia sakaii* | 细蝉 | 5–7 | 07:00–18:30 | 高 | 是 | 台湾分类研究和自动录音支持。 |
| *Hyalessa maculaticollis* | 斑透翅蝉（Min-min） | 7–9 | 06:00–18:30 | 中 | 是 | 采用日本资料，不代表台湾季相，UI 必须说明。 |
| *Mogannia hebes* | 草蝉 | 3–9 | 06:00–18:30 | 中 | 是 | 台湾生命大百科给出月份，属级资料支持日间鸣叫。 |
| *Semia watanabei* | 渡边幽蝉 | 4–6 | 06:30–19:00 | 高 | 是 | 台湾山地实测，黄昏活动较明显。 |

为避免把单年零星观测切得过窄，月份取有活动的半月区间并结合其他来源；日内窗口取有重复活动的连续区段，不把单个极小非零值机械扩张。活动率不直接用作播放音量。

## 4. 来源目录

| ID | 来源 | 用途 |
| --- | --- | --- |
| `shieh_2015` | Shieh, Liang & Chiu (2015), *Acoustic and Temporal Partitioning of Cicada Assemblages in City and Mountain Environments*, [PLOS ONE DOI](https://doi.org/10.1371/journal.pone.0116794) | 台湾多种蝉的日内和半月活动 |
| `lee_2003_part2` | Lee & Hayashi (2003), *Taxonomic Review of Cicadidae from Taiwan, Part 2: Dundubiini*, [可访问版本](https://citeseerx.ist.psu.edu/document?doi=d3cecb395f5af9270b87569c4675e8c642450d08) | 台湾姬蝉与细蝉 |
| `taieol_meimuna_opalifera` | [台湾生命大百科：寒蝉](https://taieol.tw/pages/93280/articles) | 寒蝉月份 |
| `taieol_mogannia_hebes` | [台湾生命大百科：草蝉](https://taieol.tw/pages/93298/articles) | 草蝉月份 |
| `taieol_planopleura_takasagona` | [台湾生命大百科：小蟪蛄](https://taieol.tw/pages/93250/articles) | 接受名/异名和月份 |
| `nps_taiwan_cicadas` | [台湾国家公园主题网：台湾常见蝉类](https://www.taiwan.nps.gov.tw/home/zh-tw/quarterly/7938/7013) | 熊蝉属月份、暮蝉属时段 |
| `froghome_cicadas` | [夜间动物声音资讯网：蝉](https://www.froghome.org/Night/cicada/index.html) | 属级日间/晨昏习性和阳明山暮蝉 |
| `moe_tanna_ornatipennis` | [教育百科：纹翅暮蝉](https://pedia.cloud.edu.tw/Entry/Detail/?title=Tanna%20ornatipennis%20Esaki%2C%201933) | 纹翅暮蝉月份和傍晚鸣叫 |
| `euterpnosia_varicolor_review` | [Redescription of Euterpnosia varicolor](https://www.readkong.com/page/redescription-of-euterpnosia-varicolor-and-description-of-1752142) | 太平姬春蝉月份 |
| `japan_hyalessa_sources` | [大阪市立自然史博物馆](https://www2.omnh.jp/learning/ent/semi/minminzemi.html)、[日本环境省](https://www.env.go.jp/garden/kokyogaien/news/2018/09/post_294.html) | 斑透翅蝉日本月份和日间鸣叫 |

## 5. 后续研究

- 为蟪蛄找到台湾种级成虫月份和日内资料；
- 为黄蟪蛄找到台湾或金门种级物候资料；
- 为岩崎寒蝉找到媒体实际录音地区对应的物候资料；
- 补强阳明山暮蝉的种级月份范围；
- 核对中文名与当前台湾物种名录的接受学名；
- 试听每个媒体，确认内容与标示物种一致。
