default:
    @just --list

# Build every indicator from the cache
data:
    cd pipeline && uv run atlas build-all

# Re-download from the sources, ignoring the cache
refresh:
    cd pipeline && uv run atlas build-all --refresh

catalog:
    cd pipeline && uv run atlas catalog

test:
    cd pipeline && uv run pytest

# Everything CI runs
check:
    cd pipeline && uv run ruff format --check .
    cd pipeline && uv run ruff check .
    cd pipeline && uv run mypy
    cd pipeline && uv run pytest

fix:
    cd pipeline && uv run ruff format .
    cd pipeline && uv run ruff check . --fix
