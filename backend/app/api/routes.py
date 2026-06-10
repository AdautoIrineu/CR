from __future__ import annotations

import shutil
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from geoalchemy2 import WKBElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.schemas import AOIRead, JobRead, OverlapRead, ProjectCreate, ProjectRead
from backend.app.connectors.catalog import CATALOG, list_sources
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.jobs.tasks import generate_artifacts, run_analysis, sync_source
from backend.app.models import AOI, AsyncJob, Overlap, Project
from backend.app.services.geometry import prepare_aoi_from_geojson, prepare_aoi_from_path

router = APIRouter(prefix="/api")


@router.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/sources")
def sources():
    return [source.__dict__ for source in list_sources()]


@router.post("/projects/{project_id}/aoi", response_model=AOIRead)
def upload_aoi(project_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    settings = get_settings()
    project_dir = settings.upload_root / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)
    target = project_dir / Path(file.filename or "aoi.geojson").name
    with target.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    prepared = prepare_aoi_from_path(target)
    aoi = AOI(
        project_id=project_id,
        name=target.stem,
        source_filename=target.name,
        area_ha=prepared["area_ha"],
        utm_epsg=prepared["utm_epsg"],
        properties_json=prepared["properties"],
        geom=WKBElement(prepared["geometry"].wkb, srid=4674),
    )
    db.add(aoi)
    db.commit()
    db.refresh(aoi)
    return aoi


@router.post("/projects/{project_id}/aoi/draw", response_model=AOIRead)
def draw_aoi(project_id: UUID, payload: dict, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    prepared = prepare_aoi_from_geojson(payload)
    aoi = AOI(
        project_id=project_id,
        name="desenho_mapa",
        area_ha=prepared["area_ha"],
        utm_epsg=prepared["utm_epsg"],
        properties_json=prepared["properties"],
        geom=WKBElement(prepared["geometry"].wkb, srid=4674),
    )
    db.add(aoi)
    db.commit()
    db.refresh(aoi)
    return aoi


def _enqueue(db: Session, kind: str, project_id: UUID | None, task_func, *args) -> AsyncJob:
    job = AsyncJob(kind=kind, project_id=project_id)
    db.add(job)
    db.commit()
    db.refresh(job)
    task = task_func.delay(str(job.id), *map(str, args))
    job.task_id = task.id
    db.commit()
    db.refresh(job)
    return job


@router.post("/sync/{source_code}", response_model=JobRead)
def enqueue_sync(source_code: str, db: Session = Depends(get_db)):
    if source_code not in CATALOG:
        raise HTTPException(status_code=404, detail="Unknown source")
    return _enqueue(db, "sync", None, sync_source, source_code)


@router.post("/projects/{project_id}/analysis", response_model=JobRead)
def enqueue_analysis(project_id: UUID, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return _enqueue(db, "analysis", project_id, run_analysis, project_id)


@router.post("/projects/{project_id}/reports", response_model=JobRead)
def enqueue_reports(project_id: UUID, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return _enqueue(db, "artifacts", project_id, generate_artifacts, project_id)


@router.get("/projects/{project_id}/overlaps", response_model=list[OverlapRead])
def list_overlaps(project_id: UUID, db: Session = Depends(get_db)):
    return db.scalars(select(Overlap).where(Overlap.project_id == project_id).order_by(Overlap.theme, Overlap.source)).all()


@router.get("/jobs/{job_id}", response_model=JobRead)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    job = db.get(AsyncJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
