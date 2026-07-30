# CicadaMixer Web

用 React + TypeScript 和 FastAPI 实现的多轨蝉鸣氛围播放器。功能与架构以 [`docs/`](./docs/README.md) 为准；任何行为或架构变化都应先更新文档。

## 环境准备

需要 Python 3 和 Node.js 24 LTS。以下命令均从项目根目录开始执行。

首次安装时可在项目内创建虚拟环境；也可以激活任意已有的 Python 虚拟环境：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cd frontend
npm install
```

## 开发运行

终端一，从项目根目录启动后端：

```bash
python -m uvicorn backend.app.main:app --reload
```

终端二，启动前端开发服务器：

```bash
cd frontend
npm run dev
```

浏览器访问 `http://127.0.0.1:5173/`。

## 单 Server 运行

先构建前端，再由 FastAPI 同时提供页面、API 和媒体：

```bash
cd frontend
npm run build
cd ..
python -m uvicorn backend.app.main:app
```

浏览器访问 `http://127.0.0.1:8000/`。

## 测试

```bash
python -m pytest -q
cd frontend
npm test
npm run build
npm run test:e2e
```

Playwright 和本机浏览器依赖说明见
[`docs/09-operations.md`](./docs/09-operations.md)。
