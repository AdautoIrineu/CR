from pathlib import Path


def test_catalog_contains_required_sources():
    catalog = Path("backend/app/connectors/catalog.py").read_text(encoding="utf-8")
    for source in ["anm", "sgb", "car", "sigef", "icmbio", "funai", "ibama", "ana", "ibge", "mapbiomas", "terrabrasilis"]:
        assert f'"{source}"' in catalog


def test_api_exposes_core_routes():
    routes = Path("backend/app/api/routes.py").read_text(encoding="utf-8")
    for route in ["/projects", "/aoi", "/analysis", "/reports", "/overlaps", "/sync/{source_code}"]:
        assert route in routes
