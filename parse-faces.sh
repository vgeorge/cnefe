#!/bin/bash

DATA_DIR=/data
SHP_DIR=/workdir/shapefile/
SPATIALITE_DIR=/workdir/spatialite/
CSV_DIR=/workdir/csv/
ZIP_DIR=/output/zip

# Clean zip directory
rm -rf $ZIP_DIR && mkdir -p $ZIP_DIR

for state_file in $(find $DATA_DIR -name "*.zip"); do

    # Clean work directories
    rm -rf $SHP_DIR && mkdir -p $SHP_DIR
    rm -rf $SPATIALITE_DIR && mkdir -p $SPATIALITE_DIR
    rm -rf $CSV_DIR && mkdir -p $CSV_DIR

    # Expand state file into temporary directory
    unzip $state_file -d $SHP_DIR

    # Get state id from filename
    state_filename=$(basename $state_file)
    state_id=${state_filename:0:2}

    for shapefile in $(find $SHP_DIR -name "*.shp"); do

        # Get file id
        filename=$(basename $shapefile)
        filename_split=(${filename//_/ })
        fileid=${filename_split[0]}
        echo "Parsing $shapefile"

        # Convert to Spatialite
        echo "Converting to Spatialite..."
        spatialite_file=$SPATIALITE_DIR/$fileid.sqlite
        spatialite_tool -i -shp $SHP_DIR/${fileid}_faces_de_logradouros_2019 -d $spatialite_file -t faces -c ISO-8859-1

        # Export midpoints to CSV
        echo "Exporting midpoints to CSV..."
        csv_file=$CSV_DIR/$fileid.csv
        spatialite -csv -header $spatialite_file "select CD_SETOR,CD_QUADRA,CD_FACE,NM_TIP_LOG,NM_TIT_LOG,NM_LOG,TOT_RES,TOT_GERAL, X(ST_Line_Interpolate_Point(Geometry, 0.5)) as lng, X(ST_Line_Interpolate_Point(Geometry, 0.5)) as lat from faces;" > $CSV_DIR/$fileid.csv
    done

    zip -j $ZIP_DIR/$state_id $CSV_DIR/*.csv
done
