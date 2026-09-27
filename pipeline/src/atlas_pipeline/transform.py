import json
from datetime import UTC, datetime
from typing import Any

import polars as pl

from atlas_pipeline.catalog import Indicator, Source
from atlas_pipeline.config import FIRST_YEAR, PROCESSED_DIR, REPO_ROOT
from atlas_pipeline.schemas import CountrySchema, schema_for
from atlas_pipeline.sources import worldbank

# The World Bank returns aggregates (World, "Euro area", income groups) mixed in
# with real countries. Aggregates carry this sentinel as their region id.
AGGREGATE_REGION_ID = "NA"


def countries_frame(raw: list[dict[str, Any]]) -> pl.DataFrame:
    frame = pl.DataFrame(
        [
            {
                "code": row["id"],
                "name": row["name"],
                "region": row["region"]["value"].strip(),
            }
            for row in raw
            if row["region"]["id"] != AGGREGATE_REGION_ID
        ]
    )
    return CountrySchema.validate(frame)


def observations_frame(raw: list[dict[str, Any]], indicator_id: str) -> pl.DataFrame:
    frame = (
        pl.DataFrame(
            [
                {
                    "code": row["countryiso3code"],
                    "year": int(row["date"]),
                    "value": None if row["value"] is None else float(row["value"]),
                }
                for row in raw
                if row["countryiso3code"]
            ],
            schema={"code": pl.String, "year": pl.Int64, "value": pl.Float64},
        )
        .filter(pl.col("year") >= FIRST_YEAR)
        .unique(subset=["code", "year"], keep="first")
        .sort("code", "year")
    )
    return schema_for(indicator_id).validate(frame)


def _attribution(source: Source, indicator: Indicator) -> str:
    return source.attribution_format.format(
        dataset=indicator.dataset, source=indicator.upstream_sources
    )


def build_indicator(
    indicator: Indicator, source: Source, *, refresh: bool = False
) -> dict[str, Any]:
    countries = countries_frame(worldbank.fetch_countries(refresh=refresh))
    observations = observations_frame(
        worldbank.fetch_indicator(indicator.code, refresh=refresh), indicator.id
    )

    merged = countries.join(observations, on="code", how="inner").drop_nulls("value")

    per_country = []
    for (code,), group in merged.group_by(["code"], maintain_order=True):
        rows = group.sort("year")
        latest = rows.row(-1, named=True)
        per_country.append(
            {
                "code": code,
                "name": latest["name"],
                "region": latest["region"],
                "values": dict(zip(rows["year"].cast(pl.String), rows["value"], strict=True)),
                "latest": {"year": latest["year"], "value": latest["value"]},
            }
        )

    years = sorted(merged["year"].unique().to_list())
    return {
        "id": indicator.id,
        "name": {"es": indicator.name_es, "en": indicator.name_en},
        "description": {"es": indicator.description_es},
        "unit": {"es": indicator.unit_es, "en": indicator.unit_en},
        "decimals": indicator.decimals,
        "higherIsBetter": indicator.higher_is_better,
        "source": {
            "name": source.name,
            "url": source.url,
            "terms": source.terms,
            "licence": indicator.licence,
            "dataset": indicator.dataset,
            "attribution": _attribution(source, indicator),
            "modified": "Values reformatted and aggregates removed by the Atlas project.",
            "endorsement": "The World Bank does not endorse this project or its use of the data.",
        },
        "generatedAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "yearRange": [years[0], years[-1]],
        "countries": sorted(per_country, key=lambda c: c["code"]),
    }


def write_web_bundle(indicators: list[Indicator], sources: dict[str, Source]) -> tuple[int, int]:
    """Split the processed data the way the browser wants it: one small
    catalogue loaded at startup, and one file per indicator fetched on demand.
    Shipping all 20 series up front would be 2 MB before the globe draws.
    """
    out = REPO_ROOT / "web/public/data"
    (out / "series").mkdir(parents=True, exist_ok=True)

    catalog: dict[str, Any] = {"indicators": [], "countries": {}, "sources": {}}

    for key, source in sources.items():
        catalog["sources"][key] = {"name": source.name, "url": source.url, "terms": source.terms}

    for indicator in indicators:
        payload = json.loads(
            (PROCESSED_DIR / "indicators" / f"{indicator.id}.json").read_text(encoding="utf-8")
        )
        series = {}
        for row in payload["countries"]:
            catalog["countries"].setdefault(
                row["code"], {"name": row["name"], "region": row["region"]}
            )
            series[row["code"]] = {
                y: round(v, indicator.decimals) for y, v in row["values"].items()
            }

        (out / "series" / f"{indicator.id}.json").write_text(
            json.dumps(series, separators=(",", ":")), encoding="utf-8"
        )
        catalog["indicators"].append(
            {
                "id": indicator.id,
                "theme": indicator.theme,
                "name": indicator.name_es,
                "unit": indicator.unit_es,
                "decimals": indicator.decimals,
                "higherIsBetter": indicator.higher_is_better,
                "description": " ".join(indicator.description_es.split()),
                "code": indicator.code,
                "upstream": indicator.upstream_sources,
                "licence": indicator.licence,
                "years": payload["yearRange"],
                "attribution": _attribution(sources[indicator.source], indicator),
            }
        )

    catalog["countries"] = dict(sorted(catalog["countries"].items()))
    (out / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    return len(catalog["indicators"]), len(catalog["countries"])


def write_indicator(payload: dict[str, Any]) -> int:
    out_dir = PROCESSED_DIR / "indicators"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{payload['id']}.json"
    out_file.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    return out_file.stat().st_size
