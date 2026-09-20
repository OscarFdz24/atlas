from typing import ClassVar

import pandera.polars as pa
from pandera.typing.polars import Series

from atlas_pipeline.config import FIRST_YEAR


class CountrySchema(pa.DataFrameModel):
    code: Series[str] = pa.Field(str_matches=r"^[A-Z]{3}$", unique=True)
    name: Series[str]
    region: Series[str]


class ObservationSchema(pa.DataFrameModel):
    code: Series[str] = pa.Field(str_matches=r"^[A-Z]{3}$")
    year: Series[int] = pa.Field(ge=FIRST_YEAR, le=2100)
    value: Series[float] = pa.Field(nullable=True)

    class Config:
        unique: ClassVar[list[str]] = ["code", "year"]


class LifeExpectancySchema(ObservationSchema):
    value: Series[float] = pa.Field(ge=10.0, le=100.0, nullable=True)


SCHEMAS: dict[str, type[ObservationSchema]] = {
    "life-expectancy": LifeExpectancySchema,
}


def schema_for(indicator_id: str) -> type[ObservationSchema]:
    return SCHEMAS.get(indicator_id, ObservationSchema)
