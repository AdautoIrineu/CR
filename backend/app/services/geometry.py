from __future__ import annotations

import json
import math
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import fiona
from pyproj import CRS, Transformer
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform, unary_union
from shapely.wkb import dumps as wkb_dumps

SIRGAS_2000 = CRS.from_epsg(4674)
WGS84 = CRS.from_epsg(4326)


def utm_epsg_for_lon_lat(longitude: float, latitude: float) -> int:
    """Return the SIRGAS 2000 UTM EPSG code for a lon/lat coordinate in Brazil."""
    zone = int(math.floor((longitude + 180) / 6) + 1)
    return (31900 if latitude < 0 else 31960) + zone


def normalize_to_multipolygon(geometry: Any) -> MultiPolygon:
    geom = shape(geometry) if isinstance(geometry, dict) else geometry
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    if geom.geom_type == "MultiPolygon":
        return geom
    if geom.geom_type == "GeometryCollection":
        polygons = [g for g in geom.geoms if g.geom_type in {"Polygon", "MultiPolygon"}]
        merged = unary_union(polygons)
        return normalize_to_multipolygon(merged)
    msg = f"Unsupported AOI geometry type: {geom.geom_type}"
    raise ValueError(msg)


def reproject_geometry(geom: Any, source_crs: CRS | str | int | None, target_crs: CRS | str | int) -> Any:
    source = CRS.from_user_input(source_crs or WGS84)
    target = CRS.from_user_input(target_crs)
    if source == target:
        return geom
    transformer = Transformer.from_crs(source, target, always_xy=True)
    return transform(transformer.transform, geom)


def area_ha_in_local_utm(geom_4674: MultiPolygon) -> tuple[float, int]:
    centroid = geom_4674.centroid
    epsg = utm_epsg_for_lon_lat(centroid.x, centroid.y)
    geom_utm = reproject_geometry(geom_4674, SIRGAS_2000, epsg)
    return geom_utm.area / 10_000, epsg


def to_ewkb_hex(geom_4674: MultiPolygon) -> str:
    return wkb_dumps(geom_4674, hex=True, srid=4674)


def feature_collection_to_multipolygon(payload: dict[str, Any]) -> tuple[MultiPolygon, dict[str, Any]]:
    if payload.get("type") == "FeatureCollection":
        features = payload.get("features", [])
        geoms = [normalize_to_multipolygon(feature["geometry"]) for feature in features if feature.get("geometry")]
        if not geoms:
            raise ValueError("FeatureCollection without polygon geometries")
        return normalize_to_multipolygon(unary_union(geoms)), {"feature_count": len(features)}
    if payload.get("type") == "Feature":
        return normalize_to_multipolygon(payload["geometry"]), payload.get("properties", {})
    return normalize_to_multipolygon(payload), {}


def read_vector_file(path: Path) -> tuple[MultiPolygon, CRS, dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix in {".geojson", ".json"}:
        payload = json.loads(path.read_text(encoding="utf-8"))
        geom, props = feature_collection_to_multipolygon(payload)
        crs_name = payload.get("crs", {}).get("properties", {}).get("name", "EPSG:4326")
        return geom, CRS.from_user_input(crs_name), props
    if suffix == ".zip" or suffix == ".kmz":
        with TemporaryDirectory() as tmp:
            with zipfile.ZipFile(path) as archive:
                archive.extractall(tmp)
            candidates = [p for p in Path(tmp).rglob("*") if p.suffix.lower() in {".shp", ".kml", ".geojson", ".json"}]
            if not candidates:
                raise ValueError("ZIP/KMZ does not contain SHP, KML or GeoJSON data")
            return read_vector_file(candidates[0])
    with fiona.open(path) as src:
        crs = CRS.from_user_input(src.crs_wkt or src.crs or "EPSG:4326")
        geoms = [normalize_to_multipolygon(feature["geometry"]) for feature in src if feature.get("geometry")]
        if not geoms:
            raise ValueError("Vector file without polygon geometries")
        return normalize_to_multipolygon(unary_union(geoms)), crs, {"feature_count": len(geoms)}


def prepare_aoi_from_path(path: Path) -> dict[str, Any]:
    geom, source_crs, props = read_vector_file(path)
    geom_4674 = normalize_to_multipolygon(reproject_geometry(geom, source_crs, SIRGAS_2000))
    area_ha, utm_epsg = area_ha_in_local_utm(geom_4674)
    return {
        "geometry": geom_4674,
        "geojson": mapping(geom_4674),
        "area_ha": area_ha,
        "utm_epsg": utm_epsg,
        "properties": props | {"source_crs": source_crs.to_string()},
    }


def prepare_aoi_from_geojson(payload: dict[str, Any]) -> dict[str, Any]:
    geom, props = feature_collection_to_multipolygon(payload)
    geom_4674 = normalize_to_multipolygon(reproject_geometry(geom, WGS84, SIRGAS_2000))
    area_ha, utm_epsg = area_ha_in_local_utm(geom_4674)
    return {
        "geometry": geom_4674,
        "geojson": mapping(geom_4674),
        "area_ha": area_ha,
        "utm_epsg": utm_epsg,
        "properties": props | {"source_crs": "EPSG:4326"},
    }
