from backend.app.connectors.base import LayerSource

CATALOG: dict[str, list[LayerSource]] = {
    "anm": [
        LayerSource("anm", "ANM SIGMINE processos minerários", "mineral", "arcgis-rest", "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/MapServer", priority=10),
        LayerSource("anm", "ANM SIGMINE WMS", "mineral", "wms", "https://geo.anm.gov.br/arcgis/services/SIGMINE/dados_anm/MapServer/WMSServer", priority=90),
    ],
    "sgb": [
        LayerSource("sgb", "SGB/CPRM GeoSGB geologia", "geologico", "arcgis-rest", "https://geosgb.cprm.gov.br/arcgis/rest/services", priority=20),
    ],
    "car": [
        LayerSource("car", "CAR/SICAR imóveis rurais", "fundiario", "shapefile-zip", "file:///data/imports/car", priority=30, metadata={"rpa_supported": True}),
    ],
    "sigef": [
        LayerSource("sigef", "SIGEF/INCRA Acervo Fundiário", "fundiario", "shapefile-zip", "file:///data/imports/sigef", priority=30),
    ],
    "icmbio": [
        LayerSource("icmbio", "Unidades de Conservação Federais", "ambiental", "wfs", "https://geoservicos.inde.gov.br/geoserver/ICMBio/ows", priority=10),
    ],
    "funai": [
        LayerSource("funai", "Terras Indígenas", "restricoes", "geoserver", "https://geoserver.funai.gov.br/geoserver/ows", priority=20),
    ],
    "ibama": [
        LayerSource("ibama", "IBAMA PAMGIA/dados abertos", "ambiental", "arcgis-rest", "https://pamgia.ibama.gov.br/server/rest/services", priority=20),
    ],
    "ana": [
        LayerSource("ana", "ANA SNIRH hidrografia", "hidrografia", "geoservicos", "https://www.snirh.gov.br/arcgis/rest/services", priority=20),
    ],
    "ibge": [
        LayerSource("ibge", "IBGE malhas territoriais", "localizacao", "api", "https://servicodados.ibge.gov.br/api/v3/malhas", priority=20),
        LayerSource("ibge", "IBGE ArcGIS REST", "localizacao", "arcgis-rest", "https://geoservicos.ibge.gov.br/arcgis/rest/services", priority=30),
    ],
    "mapbiomas": [
        LayerSource("mapbiomas", "MapBiomas uso e cobertura", "uso_cobertura", "raster-download", "https://brasil.mapbiomas.org/downloads", priority=30, metadata={"gee_supported": True}),
    ],
    "terrabrasilis": [
        LayerSource("terrabrasilis", "INPE TerraBrasilis desmatamento", "ambiental", "wfs", "https://terrabrasilis.dpi.inpe.br/geoserver/ows", priority=10),
        LayerSource("terrabrasilis", "INPE TerraBrasilis visualização", "ambiental", "wms", "https://terrabrasilis.dpi.inpe.br/geoserver/ows", priority=90),
    ],
}


def list_sources() -> list[LayerSource]:
    return [source for sources in CATALOG.values() for source in sources]
