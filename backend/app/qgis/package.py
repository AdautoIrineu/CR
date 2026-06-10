from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import text
from sqlalchemy.orm import Session

QGIS_PROJECT_TEMPLATE = """<qgis projectname=\"{project_name}\" version=\"3.34\">
  <title>{project_name}</title>
  <projectlayers />
</qgis>
"""


def build_qgis_package(db: Session, project_id: str, artifact_root: Path) -> Path:
    project_dir = artifact_root / str(project_id) / "qgis"
    project_dir.mkdir(parents=True, exist_ok=True)
    project_name = db.execute(text("SELECT name FROM projects WHERE id = :id"), {"id": project_id}).scalar_one()
    gpkg = project_dir / "analise_geoespacial.gpkg"
    qgs = project_dir / "projeto.qgs"
    qgz = project_dir / "projeto.qgz"
    style = project_dir / "styles.qml"
    gpkg.write_text("GeoPackage export placeholder; configure ogr2ogr in production deployment.\n", encoding="utf-8")
    style.write_text("<qgis_style version=\"2\"/>\n", encoding="utf-8")
    qgs.write_text(QGIS_PROJECT_TEMPLATE.format(project_name=project_name), encoding="utf-8")
    with ZipFile(qgz, "w", ZIP_DEFLATED) as archive:
        archive.write(qgs, arcname="projeto.qgs")
        archive.write(style, arcname="styles.qml")
        archive.write(gpkg, arcname="analise_geoespacial.gpkg")
    return qgz
