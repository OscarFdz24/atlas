import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from atlas_pipeline.config import RAW_DIR, USER_AGENT

# v1 was disabled in 2020 and no v3 has been announced. Pinned on purpose.
BASE_URL = "https://api.worldbank.org/v2"
PER_PAGE = 20000

CACHE_DIR = RAW_DIR / "worldbank"
MANIFEST_PATH = CACHE_DIR / "manifest.json"


class WorldBankError(Exception):
    pass


@retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=30), reraise=True)
def _get_page(client: httpx.Client, path: str, page: int) -> tuple[dict[str, Any], list[Any]]:
    response = client.get(
        f"{BASE_URL}/{path}",
        params={"format": "json", "per_page": PER_PAGE, "page": page},
    )
    response.raise_for_status()
    payload = response.json()

    if not isinstance(payload, list) or len(payload) < 2:
        raise WorldBankError(f"unexpected response shape for {path}: {payload!r:.200}")
    return payload[0], payload[1] or []


def _fetch_all(path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60.0) as client:
        header, page_rows = _get_page(client, path, page=1)
        rows.extend(page_rows)
        for page in range(2, int(header.get("pages", 1)) + 1):
            _, page_rows = _get_page(client, path, page)
            rows.extend(page_rows)
    return rows


def _update_manifest(name: str, path: str, payload: str) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text("utf-8")) if MANIFEST_PATH.exists() else {}
    manifest[name] = {
        "url": f"{BASE_URL}/{path}",
        "fetched_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")


def _cached(name: str, path: str, *, refresh: bool) -> list[dict[str, Any]]:
    """Read from the on-disk cache unless `refresh` forces a download.

    The cache is what makes the pipeline reproducible offline and is the only
    record of what the source said on a given date: the World Bank revises
    historical values silently and publishes no changelog.
    """
    cache_file = CACHE_DIR / f"{name}.json"
    if cache_file.exists() and not refresh:
        cached: list[dict[str, Any]] = json.loads(cache_file.read_text(encoding="utf-8"))
        return cached

    rows = _fetch_all(path)
    if not rows:
        raise WorldBankError(f"no rows returned for {path}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(rows, indent=1, ensure_ascii=False, sort_keys=True)
    cache_file.write_text(payload, encoding="utf-8")
    _update_manifest(name, path, payload)
    return rows


def fetch_countries(*, refresh: bool = False) -> list[dict[str, Any]]:
    return _cached("countries", "country", refresh=refresh)


def fetch_indicator(code: str, *, refresh: bool = False) -> list[dict[str, Any]]:
    return _cached(code, f"country/all/indicator/{code}", refresh=refresh)


def cache_file_for(name: str) -> Path:
    return CACHE_DIR / f"{name}.json"
