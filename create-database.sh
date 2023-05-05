if echo '\l' | psql -U postgres cnefe > /dev/null; then
    echo "ok - postgres cnefe database exists"
else
    echo "
        CREATE DATABASE cnefe;
    " | psql -U postgres
fi


psql -d cnefe -c "
  CREATE TABLE IF NOT EXISTS addresses(
    sectorId text NOT NULL,
    sectorSituation text,
    addressType text,
    addressTitle text,
    addressName text,
    addressNumber text,
    addressModifier text,
    element1 text,
    value1 text,
    element2 text,
    value2 text,
    element3 text,
    value3 text,
    element4 text,
    value4 text,
    element5 text,
    value5 text,
    element6 text,
    value7 text,
    lat text,
    lon text,
    locality text,
    blank text,
    specie text,
    identification text,
    indicator text,
    collectiveIdentification text,
    block text,
    face text,
    cep text
  );
  DELETE FROM addresses;
"

DATA_DIR=~/dev/openaddresses/scripts/br/downloads/ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Cadastro_Nacional_de_Enderecos_Fins_Estatisticos
for file in $(find $DATA_DIR -name "??.zip"); do
  unzip -p $file | gawk -v FIELDWIDTHS='15 1 20 30 60 8 7 20 10 20 10 20 10 20 10 20 10 20 10 15 15 60 60 2 40 1 30 3 3 8' -v OFS=';' '{ $1=$1; print }' | psql -d cnefe -c "
    set client_encoding = 'latin1';
    COPY addresses from stdin DELIMITER ';';
  "
done
