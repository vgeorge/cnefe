start=$(date +%s)

export PGHOST=localhost
export PGPORT=15432
export PGDATABASE=cnefe
export PGUSER=cnefe
export PGPASSWORD=cnefe

# DATA_DIR=./data/faces_2019/
DATA_DIR=./data/faces_2019/geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2010/base_de_faces_de_logradouros_versao_2019/SE
SHP_TMP_DIR=./tmp/shapefile/
SHP_REPROJECTED_TMP_DIR=./tmp/shapefile-reprojected/
GPKG_TMP_DIR=./tmp/geopackage/

# Clean temporary directory
rm -rf ./tmp
mkdir -p $SHP_TMP_DIR
mkdir -p $SHP_REPROJECTED_TMP_DIR
mkdir -p $GPKG_TMP_DIR

# Expand state file into temporary directory
for state_file in $(find $DATA_DIR -name "*.zip"); do
    echo $state_file
    unzip $state_file -d $SHP_TMP_DIR

    for shapefile in $(find $SHP_TMP_DIR -name "*.shp"); do

        # Get file id
        filename=$(basename $shapefile)
        filename_split=(${filename//_/ })
        fileid=${filename_split[0]}

        # Reproject to EPSG 4326
        shapefile_projected=$SHP_REPROJECTED_TMP_DIR/$fileid.shp
        ogr2ogr -t_srs EPSG:4326 $shapefile_projected $shapefile

        # Convert to Geopackage
        geopackage=$GPKG_TMP_DIR/$fileid.gpkg    
        ogrmerge.py -f GPKG -o $geopackage $shapefile_projected -single -overwrite_ds

        # Export mid-lines to CSV
        # spatialite $geopackage "select CD_SETOR from \"${fileid}\";"        
    done
done


# Print execution time
duration=$(echo "$(date +%s) - $start" | bc)
execution_time=`printf "%.2f seconds" $duration`
echo "Script Execution Time: $execution_time"



