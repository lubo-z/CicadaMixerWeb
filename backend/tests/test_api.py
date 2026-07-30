from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from backend.app.catalog import CatalogError, load_catalog
from backend.app.main import create_app


ROOT = Path(__file__).resolve().parents[2]


def make_client() -> TestClient:
    app = create_app(frontend_dist=ROOT / "does-not-exist")
    return TestClient(app)


def test_health_and_catalog() -> None:
    with make_client() as client:
        assert client.get("/api/v1/health/live").status_code == 200
        assert client.get("/api/v1/health/ready").status_code == 200

        response = client.get("/api/v1/catalog")
        assert response.status_code == 200
        payload = response.json()
        assert payload["schemaVersion"] == 2
        assert payload["autoMix"] == {
            "defaultTracks": 6,
            "minTracks": 1,
            "maxTracks": 10,
        }
        assert payload["liveRefresh"] == {
            "defaultMinutes": 30,
            "minMinutes": 5,
            "maxMinutes": 120,
            "stepMinutes": 5,
        }
        assert len(payload["cicadas"]) == 17
        assert sum(item["autoEligible"] for item in payload["cicadas"]) == 14
        assert "mediaFile" not in payload["cicadas"][0]
        assert payload["cicadas"][0]["defaultGain"] == 0.6
        assert payload["cicadas"][0]["media"]["url"].startswith("/api/v1/media/")

        cached = client.get(
            "/api/v1/catalog",
            headers={"If-None-Match": response.headers["etag"]},
        )
        assert cached.status_code == 304


def test_media_full_head_range_and_errors() -> None:
    with make_client() as client:
        catalog = client.get("/api/v1/catalog").json()
        media_url = catalog["cicadas"][0]["media"]["url"]

        head = client.head(media_url)
        assert head.status_code == 200
        assert int(head.headers["content-length"]) > 0
        assert head.headers["content-type"].startswith("video/mp4")

        partial = client.get(media_url, headers={"Range": "bytes=0-99"})
        assert partial.status_code == 206
        assert len(partial.content) == 100
        assert partial.headers["content-range"].startswith("bytes 0-99/")
        assert partial.headers["accept-ranges"] == "bytes"

        invalid = client.get(media_url, headers={"Range": "bytes=999999999-"})
        assert invalid.status_code == 416
        assert client.get("/api/v1/media/not_a_cicada").status_code == 404


def test_invalid_config_keeps_liveness_but_fails_readiness(tmp_path: Path) -> None:
    invalid_config = tmp_path / "config.json"
    invalid_config.write_text("{}", encoding="utf-8")
    app = create_app(
        config_path=invalid_config,
        frontend_dist=ROOT / "does-not-exist",
    )
    with TestClient(app) as client:
        assert client.get("/api/v1/health/live").status_code == 200
        assert client.get("/api/v1/health/ready").status_code == 503
        assert client.get("/api/v1/catalog").status_code == 503


@pytest.mark.parametrize(
    ("section", "values"),
    [
        ("autoMix", {"defaultTracks": 11, "minTracks": 1, "maxTracks": 10}),
        (
            "liveRefresh",
            {
                "defaultMinutes": 42,
                "minMinutes": 5,
                "maxMinutes": 120,
                "stepMinutes": 5,
            },
        ),
    ],
)
def test_rejects_invalid_browser_preference_constraints(
    tmp_path: Path,
    section: str,
    values: dict[str, int],
) -> None:
    config = json.loads(
        (ROOT / "backend/config/config.json").read_text(encoding="utf-8")
    )
    config[section] = values
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")

    with pytest.raises(CatalogError):
        load_catalog(
            config_path,
            ROOT / "backend/config/config.schema.json",
            ROOT / "backend" / "resources" / "sounds",
        )
