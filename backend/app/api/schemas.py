from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AOIRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    area_ha: float
    utm_epsg: int
    properties_json: dict

    class Config:
        from_attributes = True


class JobRead(BaseModel):
    id: UUID
    task_id: str | None
    kind: str
    status: str
    project_id: UUID | None
    result_json: dict
    error: str | None

    class Config:
        from_attributes = True


class OverlapRead(BaseModel):
    id: UUID
    source: str
    theme: str
    layer_name: str
    area_ha: float
    percent_aoi: float
    attributes_json: dict

    class Config:
        from_attributes = True
