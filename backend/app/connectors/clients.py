from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import urlencode

import requests
from owslib.wfs import WebFeatureService

from backend.app.connectors.base import ConnectorError, LayerSource


class ArcGISRestConnector:
    def __init__(self, source: LayerSource):
        self.source = source

    def fetch(self, output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        params = urlencode({"f": "geojson", "where": "1=1", "outFields": "*", "returnGeometry": "true"})
        layer = self.source.layer or "0"
        url = f"{self.source.url.rstrip('/')}/{layer}/query?{params}"
        response = requests.get(url, timeout=120)
        response.raise_for_status()
        path = output_dir / f"{self.source.code}_{self.source.theme}.geojson"
        path.write_bytes(response.content)
        return path


class WFSConnector:
    def __init__(self, source: LayerSource):
        self.source = source

    def fetch(self, output_dir: Path) -> Path:
        if not self.source.layer:
            raise ConnectorError(f"WFS source {self.source.name} requires a layer/typeName")
        output_dir.mkdir(parents=True, exist_ok=True)
        wfs = WebFeatureService(url=self.source.url, version="2.0.0")
        response = wfs.getfeature(typename=[self.source.layer], outputFormat="application/json")
        path = output_dir / f"{self.source.code}_{self.source.layer.replace(':', '_')}.geojson"
        path.write_bytes(response.read())
        return path


class LocalArchiveConnector:
    def __init__(self, source: LayerSource):
        self.source = source

    def fetch(self, output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        local_root = Path(self.source.url.removeprefix("file://"))
        archives = sorted(local_root.glob("*.zip"), reverse=True)
        if not archives:
            raise ConnectorError(f"No ZIP shapefile found in {local_root}")
        target = output_dir / archives[0].name
        shutil.copy2(archives[0], target)
        return target


def build_connector(source: LayerSource):
    if source.access == "arcgis-rest":
        return ArcGISRestConnector(source)
    if source.access in {"wfs", "geoserver"}:
        return WFSConnector(source)
    if source.access == "shapefile-zip":
        return LocalArchiveConnector(source)
    raise ConnectorError(f"Access method {source.access} is configured for visualization/manual import only")
