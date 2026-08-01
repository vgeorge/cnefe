# CNEFE Brasil

Protótipo para **apoiar o mapeamento no OpenStreetMap**: um mapa de referência das
**faces de logradouro do CNEFE 2022** (IBGE) para comparar nomes de rua com o OSM,
ao lado de qualquer editor. Clique numa via para copiar o nome; ative **Comparar**
para ver CNEFE × OSM lado a lado.

Parte do esforço da comunidade OSM Brasil de usar a CNEFE no mapeamento de
logradouros —
[discussão](https://community.openstreetmap.org/t/cnefe-2022-disponibilizacao-de-nomes-de-logradouros-para-mapeamento/140937).
A primeira camada são as faces de logradouro (nomes de rua); camadas futuras podem
incluir os pontos de endereço da CNEFE.

Dados do IBGE são de domínio público e podem ser usados no OSM, citando a fonte —
ver [CNEFE data, IBGE, Brasil import](https://wiki.openstreetmap.org/wiki/CNEFE_data,_IBGE,_Brasil_import)
na wiki do OSM.

## App

Vite + React + MapLibre, em [`app/`](app). Design em [`SPEC.md`](SPEC.md).

```bash
cd app
npm install
npm run dev      # http://localhost:5173
```

## Dados (PMTiles)

As ~13,8 milhões de faces de logradouro de todo o Brasil ficam num **único arquivo
`.pmtiles`** (tiles vetoriais MVT, z13–15). O MapLibre lê esse arquivo direto por
**range requests** HTTP (protocolo `pmtiles://`) — sem servidor de tiles: o cliente
baixa só os trechos visíveis e faz overzoom para z16+. O arquivo é hospedado num
bucket **Cloudflare R2** público (CORS + range).

O app já aponta para o R2 por padrão. Para sobrescrever (servidor local, domínio
customizado), defina `VITE_PMTILES_URL` — ver [`app/.env.example`](app/.env.example).

> Nota: a URL `pub-*.r2.dev` é rate-limited (dev). Em produção, usar domínio
> customizado no bucket.

## Fonte dos dados

IBGE — Base de Faces de Logradouros do Censo 2022:
<https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2022/base_de_faces_de_logradouros_versao_2022_censo_demografico/>
