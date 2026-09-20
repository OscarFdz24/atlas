from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"
PROCESSED_DIR = DATA_DIR / "processed"
CATALOG_PATH = DATA_DIR / "indicators.yaml"

# The World Bank publishes no User-Agent convention; a contact URL is courtesy.
USER_AGENT = "atlas-pipeline/0.1 (+https://github.com/OscarFdz24/atlas)"

FIRST_YEAR = 1960
