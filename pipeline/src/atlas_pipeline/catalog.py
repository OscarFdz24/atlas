from dataclasses import dataclass
from typing import Any

import yaml

from atlas_pipeline.config import CATALOG_PATH


class CatalogError(Exception):
    pass


@dataclass(frozen=True)
class Indicator:
    id: str
    source: str
    code: str
    name_es: str
    name_en: str
    description_es: str
    unit_es: str
    unit_en: str
    decimals: int
    higher_is_better: bool
    dataset: str
    upstream_sources: str
    licence: str
    licence_checked: str


@dataclass(frozen=True)
class Source:
    key: str
    name: str
    url: str
    terms: str
    licence: str
    attribution_format: str


def _require(raw: dict[str, Any], field: str, where: str) -> Any:
    if not raw.get(field):
        raise CatalogError(f"{where}: missing required field '{field}'")
    return raw[field]


def load_catalog() -> tuple[dict[str, Source], list[Indicator]]:
    data = yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8"))

    sources = {
        key: Source(
            key=key,
            name=_require(raw, "name", f"source '{key}'"),
            url=_require(raw, "url", f"source '{key}'"),
            terms=_require(raw, "terms", f"source '{key}'"),
            licence=_require(raw, "licence", f"source '{key}'"),
            attribution_format=_require(raw, "attribution_format", f"source '{key}'"),
        )
        for key, raw in data["sources"].items()
    }

    indicators = []
    for raw in data["indicators"]:
        where = f"indicator '{raw.get('id', '?')}'"
        # An unverified licence is the one thing that must never reach the network.
        _require(raw, "licence", where)
        _require(raw, "licence_checked", where)
        if raw["source"] not in sources:
            raise CatalogError(f"{where}: unknown source '{raw['source']}'")
        indicators.append(Indicator(**raw))

    return sources, indicators


def get_indicator(indicator_id: str) -> Indicator:
    _, indicators = load_catalog()
    for indicator in indicators:
        if indicator.id == indicator_id:
            return indicator
    known = ", ".join(i.id for i in indicators)
    raise CatalogError(f"unknown indicator '{indicator_id}'. Known: {known}")
