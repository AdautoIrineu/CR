from __future__ import annotations

from pathlib import Path

import geopandas as gpd
from geoalchemy2 import WKBElement
from sqlalchemy.orm import Session

from backend.app.connectors.catalog import CATALOG
from backend.app.connectors.clients import build_connector
from backend.app.models import Layer


def ingest_source(db: Session, source_code: str, workdir: Path) -> int:
    if source_code not in CATALOG:
        raise ValueError(f"Unknown source: {source_code}")
    total = 0
    for source in sorted(CATALOG[source_code], key=lambda item: item.priority):
        if source.access == "wms":
            continue
        connector = build_connector(source)
        data_path = connector.fetch(workdir / source.code)
        frame = gpd.read_file(data_path).to_crs(epsg=4674)
        for _, row in frame.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue
            if geom.geom_type == "Polygon":
                geom = gpd.GeoSeries([geom]).unary_union
            layer = Layer(
                source=source.code,
                theme=source.theme,
                name=str(row.get("name") or row.get("nome") or source.name),
                provider_url=source.url,
                metadata_json={k: str(v) for k, v in row.drop(labels="geometry").items()},
                geom=WKBElement(geom.wkb, srid=4674),
            )
            db.add(layer)
            total += 1
    db.commit()
    return total
