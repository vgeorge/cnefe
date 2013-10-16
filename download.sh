#!/bin/bash

# Change the following line if IBGE changes files location
IBGE_FTP="ftp://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Cadastro_Nacional_de_Enderecos_Fins_Estatisticos/"

# Create directory 
mkdir torrent-package

# Fetch files 
( cd torrent-package && wget ftp-url --continue --no-host-directories --cut-dirs=3 --recursive -A.zip $IBGE_FTP)