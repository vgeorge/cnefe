# Dados do CNEFE

Segundo o site do IBGE:

> [O Cadastro Nacional de Endereços para Fins Estatísticos – CNEFE apresenta uma lista com 78.056.411 endereços urbanos e rurais, distribuídos pelos 316 574 setores censitários, classificados por tipo: unidades residenciais, unidades de ensino, unidades de saúde e outros. A listagem contém, apenas, os endereços com identificação do nome do logradouro, número, complemento e coordenadas nos setores rurais, sem mencionar informação econômica ou social correspondente àquele endereço.](http://www.ibge.gov.br/home/estatistica/populacao/censo2010/cnefe/default_cnefe.shtm)

## Dados originais

Para baixar todos os dados do CNEFE em uma máquina, clone este repositório e execute:

    ./cnefe-original.sh

O script irá criar um diretório `data/cnefe-original` e baixar os [arquivos originais](ftp://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Cadastro_Nacional_de_Enderecos_Fins_Estatisticos) dentro dele.
