# Base de dados do CNEFE

O Cadastro Nacional de Endereços para Fins Estatísticos, CNEFE, é a lista de endereços brasileiros identificados no Censo 2010.

Veja a descrição disponível no site do IBGE:

> [O Cadastro Nacional de Endereços para Fins Estatísticos – CNEFE apresenta uma lista com 78.056.411 endereços urbanos e rurais, distribuídos pelos 316 574 setores censitários, classificados por tipo: unidades residenciais, unidades de ensino, unidades de saúde e outros. A listagem contém, apenas, os endereços com identificação do nome do logradouro, número, complemento e coordenadas nos setores rurais, sem mencionar informação econômica ou social correspondente àquele endereço.](http://www.ibge.gov.br/home/estatistica/populacao/censo2010/cnefe/default_cnefe.shtm)

A lista está em um formato de arquivo de texto de coluna fixa, divididos por setores. A objetivo deste repositório é oferecer uma maneira de importar esta base de dados ao PostgreSQL.

## Scripts

### Para baixar arquivos originais

No diretório do repositório, rode:

    ./baixar.sh

O script irá criar o diretório `dados/cnefe` e baixar os [arquivos originais](ftp://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Cadastro_Nacional_de_Enderecos_Fins_Estatisticos) nele.

### Para importar o PostgreSQL

Antes de rodar, configure o PostgreSQL e se necessário altere o script com os dados conexão corretos:

    ./importar.sh
