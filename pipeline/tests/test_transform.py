import pytest
from pandera.errors import SchemaError

from atlas_pipeline.transform import countries_frame, observations_frame


def country(code: str, name: str, region_id: str, region: str) -> dict:
    return {"id": code, "name": name, "region": {"id": region_id, "value": region}}


def observation(code: str, year: str, value: float | None) -> dict:
    return {"countryiso3code": code, "date": year, "value": value}


def test_aggregates_are_dropped():
    raw = [
        country("ESP", "Spain", "ECS", "Europe & Central Asia"),
        country("WLD", "World", "NA", "Aggregates"),
        country("EUU", "European Union", "NA", "Aggregates"),
    ]
    assert countries_frame(raw)["code"].to_list() == ["ESP"]


def test_rows_without_country_code_are_dropped():
    raw = [observation("ESP", "2020", 83.0), observation("", "2020", 1.0)]
    assert observations_frame(raw, "life-expectancy")["code"].to_list() == ["ESP"]


def test_years_before_the_first_year_are_dropped():
    raw = [observation("ESP", "1959", 60.0), observation("ESP", "1960", 69.1)]
    assert observations_frame(raw, "life-expectancy")["year"].to_list() == [1960]


def test_missing_values_are_kept_as_null():
    raw = [observation("ESP", "2020", None)]
    assert observations_frame(raw, "life-expectancy")["value"].to_list() == [None]


def test_implausible_life_expectancy_is_rejected():
    raw = [observation("ESP", "2020", 830.0)]
    with pytest.raises(SchemaError):
        observations_frame(raw, "life-expectancy")


def test_duplicate_country_year_is_collapsed():
    raw = [observation("ESP", "2020", 83.0), observation("ESP", "2020", 83.0)]
    assert len(observations_frame(raw, "life-expectancy")) == 1
