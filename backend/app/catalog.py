from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


class CatalogError(RuntimeError):
    """Raised when the catalog cannot be loaded safely."""


@dataclass(frozen=True)
class MediaEntry:
    cicada_id: str
    file_name: str
    path: Path
    content_type: str
    version: str


@dataclass(frozen=True)
class Catalog:
    response: dict[str, Any]
    version: str
    media: dict[str, MediaEntry]


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CatalogError(f"无法读取 JSON：{path.name}: {exc}") from exc
    if not isinstance(value, dict):
        raise CatalogError(f"{path.name} 的顶层必须是对象")
    return value


def _ensure_unique(items: list[dict[str, Any]], key: str, label: str) -> None:
    values = [item[key] for item in items]
    if len(values) != len(set(values)):
        raise CatalogError(f"{label}的 {key} 必须唯一")


def _parse_minutes(value: str) -> int:
    hours, minutes = (int(part) for part in value.split(":"))
    return hours * 60 + minutes


def _validate_cross_fields(config: dict[str, Any], sounds_dir: Path) -> None:
    auto_mix = config["autoMix"]
    if not (
        auto_mix["minTracks"]
        <= auto_mix["defaultTracks"]
        <= auto_mix["maxTracks"]
    ):
        raise CatalogError("自动混音默认值必须位于允许范围内")

    live_refresh = config["liveRefresh"]
    minimum = live_refresh["minMinutes"]
    maximum = live_refresh["maxMinutes"]
    default = live_refresh["defaultMinutes"]
    step = live_refresh["stepMinutes"]
    if not minimum <= default <= maximum:
        raise CatalogError("实时检查默认值必须位于允许范围内")
    if (default - minimum) % step or (maximum - minimum) % step:
        raise CatalogError("实时检查默认值和最大值必须与最小值按步长对齐")

    cicadas = config["cicadas"]
    _ensure_unique(cicadas, "id", "蝉种")
    _ensure_unique(cicadas, "displayOrder", "蝉种")
    _ensure_unique(config["dayPeriods"], "id", "每日时段")

    source_ids = set(config["sources"])
    media_files: set[str] = set()
    sounds_root = sounds_dir.resolve()

    for period in config["dayPeriods"]:
        for window in period["windows"]:
            start, end = window.split("-", 1)
            if _parse_minutes(start) == _parse_minutes(end):
                raise CatalogError(f"每日时段 {period['id']} 存在空时间窗口")

    for cicada in cicadas:
        cicada_id = cicada["id"]
        peaks = set(cicada["peakMonths"])
        active = set(cicada["activeMonths"])
        if not peaks <= active:
            raise CatalogError(f"{cicada_id} 的峰值月份必须属于活跃月份")
        missing_sources = set(cicada["sourceIds"]) - source_ids
        if missing_sources:
            raise CatalogError(f"{cicada_id} 引用了未知来源：{sorted(missing_sources)}")
        if cicada["autoEligible"] and (
            not active
            or not cicada["callingWindows"]
            or cicada["evidenceLevel"] == "unknown"
        ):
            raise CatalogError(f"{cicada_id} 的自动播放资料不完整")
        for window in cicada["callingWindows"]:
            start, end = window.split("-", 1)
            if _parse_minutes(start) == _parse_minutes(end):
                raise CatalogError(f"{cicada_id} 存在空鸣叫窗口")

        file_name = cicada["mediaFile"]
        if file_name in media_files:
            raise CatalogError(f"多个蝉种引用了同一媒体：{file_name}")
        media_files.add(file_name)
        media_path = (sounds_dir / file_name).resolve()
        if media_path.parent != sounds_root:
            raise CatalogError(f"{cicada_id} 的媒体路径超出媒体资源目录")
        if not media_path.is_file():
            raise CatalogError(f"{cicada_id} 的媒体文件不存在：{file_name}")


def load_catalog(config_path: Path, schema_path: Path, sounds_dir: Path) -> Catalog:
    config = _load_json(config_path)
    schema = _load_json(schema_path)

    try:
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(
            schema, format_checker=FormatChecker()
        ).validate(config)
    except Exception as exc:
        raise CatalogError(f"配置不符合 JSON Schema：{exc}") from exc

    _validate_cross_fields(config, sounds_dir)

    canonical = json.dumps(
        config, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    catalog_hash = hashlib.sha256(canonical).hexdigest()
    version = f"sha256:{catalog_hash}"

    response = {
        key: deepcopy(value)
        for key, value in config.items()
        if key not in {"$schema", "cicadas"}
    }
    response["catalogVersion"] = version
    response["cicadas"] = []
    media: dict[str, MediaEntry] = {}

    for raw in config["cicadas"]:
        if not raw["enabled"]:
            continue
        cicada = deepcopy(raw)
        file_name = cicada.pop("mediaFile")
        volume = cicada.pop("volume")
        media_path = (sounds_dir / file_name).resolve()
        media_hash = _sha256_file(media_path)
        entry = MediaEntry(
            cicada_id=cicada["id"],
            file_name=file_name,
            path=media_path,
            content_type="video/mp4",
            version=media_hash,
        )
        media[cicada["id"]] = entry
        cicada["defaultGain"] = volume / 100
        cicada["media"] = {
            "id": cicada["id"],
            "url": f"/api/v1/media/{cicada['id']}?v={media_hash}",
            "contentType": entry.content_type,
            "fileName": file_name,
        }
        response["cicadas"].append(cicada)

    return Catalog(response=response, version=version, media=media)
