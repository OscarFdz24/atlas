import pytest

from atlas_pipeline.catalog import CatalogError, get_indicator, load_catalog


def test_every_indicator_has_a_verified_licence():
    """The rule that keeps this project legal: no licence, no download."""
    _, indicators = load_catalog()
    assert indicators
    for indicator in indicators:
        assert indicator.licence
        assert indicator.licence_checked


def test_every_indicator_points_at_a_known_source():
    sources, indicators = load_catalog()
    for indicator in indicators:
        assert indicator.source in sources


def test_unknown_indicator_is_rejected():
    with pytest.raises(CatalogError):
        get_indicator("does-not-exist")
