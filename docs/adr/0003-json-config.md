# ADR-0003：采用 JSON 配置与 JSON Schema

- 状态：已接受
- 日期：2026-07-29
- 决策者：项目负责人

## 背景

React + TypeScript 前端和 Catalog API 都使用 JSON。项目需要一个可校验、可版本控制且不向浏览器暴露后台路径的权威配置。

“直接读取发给前端”不能理解为把服务器原始配置作为不受控静态文件公开：`mediaFile` 是后端文件引用，必须先做 schema、路径、来源和文件存在性校验，并替换为受控媒体 URL。

## 决策

1. 权威配置为后端资源 `backend/config/config.json`，采用 camelCase 字段。
2. `backend/config/config.schema.json` 使用 JSON Schema Draft 2020-12，供编辑器、CI 和后端校验。
3. 后端启动时读取配置并校验；验证失败时 readiness 返回失败，不提供不完整目录。
4. Catalog API 最大程度保持配置字段结构，只做必要转换：
   - 不返回后台 `mediaFile` 路径；
   - 返回 media ID、展示文件名、受控 URL、Content-Type 和内容版本；
   - 将 `volume`（0–100）转换成 `defaultGain`（0–1）；
   - 增加 `catalogVersion`。
5. 前端只读取 Catalog API，不直接请求 `backend/config/config.json`。

## 理由

- JSON 是浏览器、TypeScript 和 HTTP API 的原生数据格式；
- 单一字段命名和结构减少转换代码与契约漂移；
- JSON Schema 可统一编辑器提示、CI 和服务端基础校验；
- 后端边界继续保护文件路径并执行跨字段校验。

## 代价

- 标准 JSON 不支持注释；研究说明必须保存在 `evidenceNote`、`sourceIds` 和文档中；
- 原始配置与 Catalog API 仍存在少量必要差异，不能完全原样透传。

## 复审条件

- 需要让前端完全静态部署且不运行应用后端；
- 引入在线配置编辑或数据库；
- 配置规模大到需要拆分、引用或增量加载；
- JSON Schema 无法满足新的配置维护需求。
