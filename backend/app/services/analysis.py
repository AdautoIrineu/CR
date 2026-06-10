from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def run_project_intersections(db: Session, project_id: str) -> int:
    """Intersect every AOI in a project with every available analysis layer."""
    db.execute(text("DELETE FROM overlaps WHERE project_id = :project_id"), {"project_id": project_id})
    result = db.execute(
        text(
            """
            INSERT INTO overlaps (
                id, project_id, aoi_id, layer_id, source, theme, layer_name,
                area_ha, percent_aoi, geom, attributes_json, created_at
            )
            SELECT
                gen_random_uuid(), a.project_id, a.id, l.id, l.source, l.theme, l.name,
                ST_Area(ST_Transform(ST_Intersection(a.geom, l.geom), a.utm_epsg)) / 10000.0 AS area_ha,
                CASE WHEN a.area_ha > 0 THEN
                    (ST_Area(ST_Transform(ST_Intersection(a.geom, l.geom), a.utm_epsg)) / 10000.0) / a.area_ha * 100.0
                ELSE 0 END AS percent_aoi,
                ST_Multi(ST_CollectionExtract(ST_Intersection(a.geom, l.geom), 3)) AS geom,
                l.metadata_json,
                now()
            FROM aois a
            JOIN layers l ON ST_Intersects(a.geom, l.geom)
            WHERE a.project_id = :project_id
              AND NOT ST_IsEmpty(ST_CollectionExtract(ST_Intersection(a.geom, l.geom), 3))
            """
        ),
        {"project_id": project_id},
    )
    db.commit()
    return result.rowcount or 0
