from __future__ import annotations

from pathlib import Path

from backend.app.catalog import load_catalog


ROOT = Path(__file__).resolve().parents[2]


def test_catalog_media_and_cross_references() -> None:
    catalog = load_catalog(
        ROOT / "backend" / "config" / "config.json",
        ROOT / "backend" / "config" / "config.schema.json",
        ROOT / "backend" / "resources" / "sounds",
    )

    assert len(catalog.media) == 17
    assert catalog.version.startswith("sha256:")
    ids = [item["id"] for item in catalog.response["cicadas"]]
    assert len(ids) == len(set(ids))
    assert set(ids) == set(catalog.media)
    assert all(entry.path.is_file() for entry in catalog.media.values())
