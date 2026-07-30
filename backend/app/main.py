from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .catalog import Catalog, CatalogError, load_catalog


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "backend" / "config" / "config.json"
DEFAULT_SCHEMA = PROJECT_ROOT / "backend" / "config" / "config.schema.json"
DEFAULT_SOUNDS = PROJECT_ROOT / "backend" / "resources" / "sounds"
DEFAULT_FRONTEND = PROJECT_ROOT / "frontend" / "dist"


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        {"error": {"code": code, "message": message}},
        status_code=status_code,
    )


def create_app(
    *,
    config_path: Path = DEFAULT_CONFIG,
    schema_path: Path = DEFAULT_SCHEMA,
    sounds_dir: Path = DEFAULT_SOUNDS,
    frontend_dist: Path = DEFAULT_FRONTEND,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            app.state.catalog = load_catalog(config_path, schema_path, sounds_dir)
            app.state.catalog_error = None
        except CatalogError as exc:
            app.state.catalog = None
            app.state.catalog_error = str(exc)
        yield

    app = FastAPI(
        title="CicadaMixer Web API",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.catalog = None
    app.state.catalog_error = "目录尚未加载"

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "media-src 'self'; connect-src 'self'; img-src 'self' data:; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        return response

    def current_catalog() -> Catalog | None:
        return app.state.catalog

    @app.get("/api/v1/health/live")
    async def health_live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/v1/health/ready")
    async def health_ready() -> Response:
        if current_catalog() is None:
            return error_response(
                "CATALOG_UNAVAILABLE",
                app.state.catalog_error or "蝉鸣目录暂时不可用",
                503,
            )
        return JSONResponse({"status": "ready"})

    @app.get("/api/v1/catalog")
    async def get_catalog(request: Request) -> Response:
        catalog = current_catalog()
        if catalog is None:
            return error_response(
                "CATALOG_UNAVAILABLE",
                "蝉鸣目录暂时不可用",
                503,
            )
        etag = f'"{catalog.version}"'
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers={"ETag": etag})
        return JSONResponse(
            catalog.response,
            headers={
                "ETag": etag,
                "Cache-Control": "no-cache",
            },
        )

    @app.api_route("/api/v1/media/{media_id}", methods=["GET", "HEAD"])
    async def get_media(media_id: str) -> Response:
        catalog = current_catalog()
        if catalog is None:
            return error_response(
                "CATALOG_UNAVAILABLE",
                "蝉鸣目录暂时不可用",
                503,
            )
        media = catalog.media.get(media_id)
        if media is None:
            return error_response("MEDIA_NOT_FOUND", "找不到指定媒体", 404)
        return FileResponse(
            media.path,
            media_type=media.content_type,
            headers={
                "ETag": f'"sha256:{media.version}"',
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        )

    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend_fallback(path: str) -> Response:
        index = frontend_dist / "index.html"
        requested = (frontend_dist / path).resolve()
        if (
            path
            and requested.is_file()
            and requested.is_relative_to(frontend_dist.resolve())
        ):
            return FileResponse(requested)
        if index.is_file():
            return FileResponse(index)
        return error_response(
            "FRONTEND_NOT_BUILT",
            "前端尚未构建，请使用 Vite 开发服务器或先执行前端构建",
            404,
        )

    return app


app = create_app()
