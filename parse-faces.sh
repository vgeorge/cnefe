start=$(date +%s)

export PGHOST=localhost
export PGPORT=15432
export PGDATABASE=cnefe
export PGUSER=cnefe
export PGPASSWORD=cnefe

# DATA_DIR=./data/faces_2019/
DATA_DIR=./data/faces_2019/geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2010/base_de_faces_de_logradouros_versao_2019/SE
STATE_TMP_DIR=./tmp/state_expanded/

rm -rf ./tmp

# Check database connection
if echo '\l' |  psql > /dev/null; then
    echo "ok - postgres database exists"
else
    echo "error - can't connect to postgres database"
    exit 1
fi

# Create main table
echo "
  CREATE TABLE IF NOT EXISTS faces_2019 (
    cd_setor text,
    cd_quadra text,
    cd_face text,
    nm_tip_log text,
    nm_tit_log text,
    nm_log text,
    tot_res integer,
    tot_geral integer,
    geom geometry
  );
  TRUNCATE TABLE faces_2019;
" | psql

# Expand state file into temporary directory
for state_file in $(find $DATA_DIR -name "*.zip"); do
    echo $state_file
    mkdir -p $STATE_TMP_DIR
    unzip $state_file -d $STATE_TMP_DIR
    
    # Ingest each shapefile into temporary table and then insert records 
    # with "cd_geo" field in main table
    for file in $(find $STATE_TMP_DIR -name "*.shp"); do
        echo $file
        
        # echo "
        #     DROP TABLE IF EXISTS faces_2019_temp;
        # " | psql

        # shp2pgsql -a -D $file faces_2019 | psql

        # ogr2ogr -f "CSV" MyLayer.csv $file -sql "select CD_SETOR,CD_QUADRA,CD_FACE,NM_TIP_LOG,NM_TIT_LOG,NM_LOG,TOT_RES,TOT_GERAL "

        ogr2ogr -f "CSV" parse-faces.csv tmp/state_expanded/2800308_faces_de_logradouros_2019.shp -sql "select CD_SETOR,CD_QUADRA,CD_FACE,NM_TIP_LOG,NM_TIT_LOG,NM_LOG,TOT_RES,TOT_GERAL from '2800308_faces_de_logradouros_2019.shp'"

        ogrmerge.py -f GPKG -o merged.gpkg -single -overwrite_ds  $STATE_TMP_DIR/*.shp
        

        ogr2ogr \
            -f "PostgreSQL" \
            PG:"host=localhost port=15432 dbname=cnefe user=cnefe password=cnefe" \
            merged.gpkg \
            -overwrite \
            -progress \
            -t_srs EPSG:4326 \
            -nln faces_2019 \
            -nlt MULTIPOLYGON \
            -lco GEOMETRY_NAME=geom

        # ogrmerge.py \
        #     -f PostgreSQL PG:"host=localhost user=cnefe password=cnefe dbname=cnefe port=15432" \
        #     -o cnefe \
        #     -nln faces_2019 \
        #     -lco GEOMETRY_NAME=geom \
        #     -single $STATE_TMP_DIR/*.shp

        exit 0

        # echo "
        #     INSERT into faces_2019 
        #         SELECT 
        #             concat(cd_setor, cd_quadra, cd_face) as cd_geo, 
        #             cd_setor, 
        #             cd_quadra, 
        #             cd_face, 
        #             nm_tip_log, 
        #             nm_tit_log, 
        #             nm_log, 
        #             tot_res, 
        #             tot_geral, 
        #             ST_LineInterpolatePoint( ST_LineMerge( geom ) , 0.5) as geom
        #         FROM public.faces_2019_temp;
        # " | psql            
    done
    
    # Clear temp dir
    rm -rf $STATE_TMP_DIR
done


# Print execution time
duration=$(echo "$(date +%s) - $start" | bc)
execution_time=`printf "%.2f seconds" $duration`
echo "Script Execution Time: $execution_time"




# # Create main table
# echo "
#   CREATE TABLE IF NOT EXISTS faces_2019 (
#     cd_geo text,
#     cd_setor text,
#     cd_quadra text,
#     cd_face text,
#     nm_tip_log text,
#     nm_tit_log text,
#     nm_log text,
#     tot_res integer,
#     tot_geral integer,
#     geom geometry(Point)
#   );
#   TRUNCATE TABLE faces_2019;
# " | psql

# # Expand state file into temporary directory
# for state_file in $(find $DATA_DIR -name "*.zip"); do
#     echo $state_file
#     mkdir -p $STATE_TMP_DIR
#     unzip $state_file -d $STATE_TMP_DIR
    
#     # Ingest each shapefile into temporary table and then insert records 
#     # with "cd_geo" field in main table
#     for file in $(find $STATE_TMP_DIR -name "*.shp"); do
#         echo $file
        
#         echo "
#             DROP TABLE IF EXISTS faces_2019_temp;
#         " | psql

#         shp2pgsql -D $file faces_2019_temp | psql

#         echo "
#             INSERT into faces_2019 
#                 SELECT 
#                     concat(cd_setor, cd_quadra, cd_face) as cd_geo, 
#                     cd_setor, 
#                     cd_quadra, 
#                     cd_face, 
#                     nm_tip_log, 
#                     nm_tit_log, 
#                     nm_log, 
#                     tot_res, 
#                     tot_geral, 
#                     ST_LineInterpolatePoint( ST_LineMerge( geom ) , 0.5) as geom
#                 FROM public.faces_2019_temp;
#         " | psql            
#     done
    
#     # Clear temp dir
#     rm -rf $STATE_TMP_DIR
# done


# # Print execution time
# duration=$(echo "$(date +%s) - $start" | bc)
# execution_time=`printf "%.2f seconds" $duration`
# echo "Script Execution Time: $execution_time"




# Add municipalities


echo "     - Ingesting..."
ogr2ogr \
  -f "PostgreSQL" \
  PG:"host=localhost port=15432 dbname=uow_reporter user=uow_reporter password=uow_reporter" \
  ${WORKING_DIR}/BRMUE250GC_SIR.shp \
  -overwrite \
  -progress \
  -t_srs EPSG:4326 \
  -nln municipalities \
  -nlt MULTIPOLYGON \
  -lco GEOMETRY_NAME=geom