from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True)
class LayerSource:
    code: str
    name: str
    theme: str
    access: str
    url: str
    layer: str | None = None
    priority: int = 100
    metadata: dict[str, Any] = field(default_factory=dict)


class Connector(Protocol):
    source: LayerSource

    def fetch(self, output_dir: Path) -> Path:
        """Fetch source data and return a local vector/raster path."""


class ConnectorError(RuntimeError):
    pass
