# 运行、测试与实施状态

## 1. 环境与项目路径

- Python 3 虚拟环境：位置不限，执行命令前激活；
- Node.js：24 LTS，通过当前 `PATH` 提供；
- 后端配置：`backend/config/`
- 媒体根目录：`backend/resources/sounds/`
- 前端生产构建：`frontend/dist/`

Python 直接依赖固定在 `backend/requirements*.txt`；前端依赖由 `frontend/package.json` 和 `package-lock.json` 管理。

首次安装可从项目根目录执行：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cd frontend
npm install
```

也可以使用项目外的虚拟环境；后续命令只依赖已激活环境中的 `python` 和当前 `PATH` 中的 Node.js，不依赖固定安装位置。

### 使用上级目录的 Python 与 Node.js 环境

若 Python 虚拟环境和 Node.js 分发包分别位于项目上级目录的 `.venv/` 与 `.node/`，可从项目根目录执行：

```bash
export CICADA_OLD_PATH="$PATH"
source ../.venv/bin/activate
export PATH="$(cd ../.node/bin && pwd -P):$PATH"
```

Node.js 没有类似 Python `activate` 的内置命令；把其 `bin` 目录加入当前终端的 `PATH` 即可。这里先转换为绝对路径，是为了进入 `frontend/` 后仍能正确找到同一个 Node.js，但仓库文件中没有写死任何本机位置。

验证当前工具来源：

```bash
python --version
node --version
npm --version
command -v python
command -v node
```

该设置只影响当前终端。Python 环境可用 `deactivate` 退出；Node.js 路径可恢复为修改前的值：

```bash
deactivate
export PATH="$CICADA_OLD_PATH"
unset CICADA_OLD_PATH
```

## 2. 开发运行

从项目根启动后端：

```bash
python -m uvicorn backend.app.main:app --reload
```

另一个终端启动前端：

```bash
cd frontend
npm run dev
```

访问 `http://127.0.0.1:5173/`。Vite 将 `/api` 代理到 `127.0.0.1:8000`。

## 3. 单 Server 运行

```bash
cd frontend
npm run build
cd ..
python -m uvicorn backend.app.main:app
```

访问 `http://127.0.0.1:8000/`。FastAPI 同源提供生产页面、Catalog API 和媒体。

## 4. 测试命令

```bash
python -m pytest -q

cd frontend
npm test
npm run build
```

Playwright 首次需要安装 Chromium：

```bash
npx playwright install chromium
```

若系统缺少 Chromium 运行库，可在具备相应权限的开发机上安装浏览器及系统依赖：

```bash
npx playwright install --with-deps chromium
```

运行端到端测试：

```bash
npm run test:e2e
```

## 5. 已实现

- JSON Schema、跨字段、来源和媒体存在性启动校验；
- 17 种蝉 Catalog、内容版本和默认增益转换；
- `GET/HEAD` 媒体响应、单字节范围、206/416、ETag 和长缓存；
- liveness/readiness、统一 API 错误和基本安全响应头；
- FastAPI 同源提供 Vite 生产构建；
- 手动候选与活动组合分离、原子替换和停止；
- 手动“清空已选”只清候选、不影响当前活动组合；
- 月份、季节、具体时间、固定时段相交和按浏览器合法上限稳定排序；
- 自动上限和实时间隔按 Catalog 约束保存为浏览器级设置，无后端写入；
- 实时可配置间隔对齐调度、无变化不中断、空组合等待、可见性恢复；
- 单轨失败降级、全部失败保留旧手动组合、异步会话取消；
- 中文资料、来源、媒体名、键盘控件、ARIA 状态和响应式布局；
- 本地中文字体，不访问第三方字体服务。

## 6. 已验证

- pytest：Catalog、设置约束、健康检查、ETag、HEAD、Range、416、404、无效配置降级；
- Vitest：时间边界、跨午夜、固定时段相交、稳定排序、可配置更新点、浏览器设置校验和 React 关键状态；
- Playwright：桌面与移动 Chromium 的手动组合、清空候选、候选延迟应用、设置持久化、自动只读预览、Catalog 和 Range；
- Chrome for Testing 能实际请求、解码并启动当前第一条生产 MP4；
- 单 Server 的根页面、17 种 Catalog、安全头和 100-byte Range 已实际请求验证。

## 7. 发布前仍需完成

- 对 17 个文件逐一做时长、codec、声道、响度、循环接缝和人工听测；
- 确认所有媒体的来源、版权、署名与 Web 分发许可；
- 在真实 Safari、Firefox、iOS Safari 和 Android Chrome 验证；
- 完成至少 60 分钟实时自动更新稳定性测试；
- 确认公网/局域网部署位置、HTTPS、域名和备份方案。
