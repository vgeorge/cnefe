DATA_DIR=/data/geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2010/base_de_faces_de_logradouros_versao_2019/SE
SHP_DIR=/tmp/shapefile/
SHP_4326_DIR=/tmp/shapefile-4326/
SPATIALITE_DIR=/tmp/spatialite/
CSV_DIR=/output

# Clean temporary directory
rm -rf $SHP_DIR && mkdir -p $SHP_DIR
rm -rf $SHP_4326_DIR && mkdir -p $SHP_4326_DIR
rm -rf $SPATIALITE_DIR && mkdir -p $SPATIALITE_DIR
rm -rf $CSV_DIR && mkdir -p $CSV_DIR

# Expand state file into temporary directory
for state_file in $(find $DATA_DIR -name "*.zip"); do
    unzip $state_file -d $SHP_DIR

    for shapefile in $(find $SHP_DIR -name "*.shp"); do

        # Get file id
        filename=$(basename $shapefile)
        filename_split=(${filename//_/ })
        fileid=${filename_split[0]}

        # Reproject to EPSG 4326
        shapefile_4326=$SHP_4326_DIR/$fileid.shp
        ogr2ogr -t_srs EPSG:4326 $shapefile_4326 $shapefile

        # Convert to Spatialite
        spatialite_file=$SPATIALITE_DIR/$fileid.sqlite
        spatialite_tool -i -shp $SHP_4326_DIR/$fileid -d $spatialite_file -t faces -c ISO-8859-1

        # Export mid-lines to CSV
        csv_file=$CSV_DIR/$fileid.csv
        spatialite $spatialite_file "select CD_SETOR, AsText(ST_Line_Interpolate_Point(Geometry, 0.5)) from faces;" > $CSV_DIR/$fileid.csv
    done
done
