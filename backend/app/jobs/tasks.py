from __future__ import annotations

from backend.app.core.config import get_settings
from backend.app.core.database import SessionLocal
from backend.app.jobs.celery_app import celery_app
from backend.app.models import AsyncJob, JobStatus
from backend.app.qgis.package import build_qgis_package
from backend.app.reports.generator import build_report
from backend.app.services.analysis import run_project_intersections
from backend.app.services.ingestion import ingest_source


def _mark(job_id: str, status: JobStatus, **fields):
    with SessionLocal() as db:
        job = db.get(AsyncJob, job_id)
        if job:
            job.status = status
            for key, value in fields.items():
                setattr(job, key, value)
            db.commit()


@celery_app.task(name="sync_source")
def sync_source(job_id: str, source_code: str):
    settings = get_settings()
    _mark(job_id, JobStatus.running)
    try:
        with SessionLocal() as db:
            count = ingest_source(db, source_code, settings.upload_root / "sync")
        _mark(job_id, JobStatus.done, result_json={"features": count})
    except Exception as exc:
        _mark(job_id, JobStatus.failed, error=str(exc))
        raise


@celery_app.task(name="run_analysis")
def run_analysis(job_id: str, project_id: str):
    _mark(job_id, JobStatus.running)
    try:
        with SessionLocal() as db:
            count = run_project_intersections(db, project_id)
        _mark(job_id, JobStatus.done, result_json={"overlaps": count})
    except Exception as exc:
        _mark(job_id, JobStatus.failed, error=str(exc))
        raise


@celery_app.task(name="generate_artifacts")
def generate_artifacts(job_id: str, project_id: str):
    settings = get_settings()
    _mark(job_id, JobStatus.running)
    try:
        with SessionLocal() as db:
            report = build_report(db, project_id, settings.artifact_root)
            qgz = build_qgis_package(db, project_id, settings.artifact_root)
        _mark(job_id, JobStatus.done, result_json={"report_docx": str(report), "qgis_qgz": str(qgz)})
    except Exception as exc:
        _mark(job_id, JobStatus.failed, error=str(exc))
        raise
