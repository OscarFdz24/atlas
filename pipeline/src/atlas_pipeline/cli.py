import typer
from rich.console import Console

from atlas_pipeline.catalog import get_indicator, load_catalog
from atlas_pipeline.sources import worldbank
from atlas_pipeline.transform import build_indicator, write_indicator, write_web_bundle

app = typer.Typer(help="Atlas data pipeline.", no_args_is_help=True)
console = Console()


@app.command("catalog")
def show_catalog() -> None:
    """List the whitelisted indicators and their verified licences."""
    sources, indicators = load_catalog()
    for source in sources.values():
        console.print(f"[bold]{source.key}[/bold]  {source.name}  ({source.licence})")
    console.print()
    for indicator in indicators:
        console.print(
            f"  {indicator.id:<20} {indicator.code:<16} {indicator.name_es}  "
            f"[dim]{indicator.licence}, verificada {indicator.licence_checked}[/dim]"
        )


@app.command()
def fetch(
    indicator_id: str = typer.Argument(..., help="Indicator id from data/indicators.yaml"),
    refresh: bool = typer.Option(False, "--refresh", help="Ignore the cache and re-download"),
) -> None:
    """Download an indicator into the raw cache."""
    indicator = get_indicator(indicator_id)
    countries = worldbank.fetch_countries(refresh=refresh)
    rows = worldbank.fetch_indicator(indicator.code, refresh=refresh)
    console.print(f"{len(countries)} countries, {len(rows)} observations")
    console.print(f"cached in {worldbank.cache_file_for(indicator.code)}")


@app.command()
def build(
    indicator_id: str = typer.Argument(..., help="Indicator id from data/indicators.yaml"),
    refresh: bool = typer.Option(False, "--refresh", help="Ignore the cache and re-download"),
) -> None:
    """Validate an indicator and write the JSON the website consumes."""
    sources, _ = load_catalog()
    indicator = get_indicator(indicator_id)
    payload = build_indicator(indicator, sources[indicator.source], refresh=refresh)
    size = write_indicator(payload)
    console.print(
        f"[green]{indicator.id}[/green]: {len(payload['countries'])} countries, "
        f"{payload['yearRange'][0]}-{payload['yearRange'][1]}, {size / 1024:.0f} KiB"
    )


@app.command("web")
def web() -> None:
    """Write the catalogue and per-indicator series the website consumes."""
    sources, indicators = load_catalog()
    n_ind, n_countries = write_web_bundle(indicators, sources)
    console.print(f"[green]ok[/green] {n_ind} indicadores, {n_countries} países en web/public/data")


@app.command("build-all")
def build_all(
    refresh: bool = typer.Option(False, "--refresh", help="Ignore the cache and re-download"),
) -> None:
    """Build every indicator in the catalogue."""
    sources, indicators = load_catalog()
    for indicator in indicators:
        payload = build_indicator(indicator, sources[indicator.source], refresh=refresh)
        write_indicator(payload)
        console.print(f"[green]ok[/green] {indicator.id}")
