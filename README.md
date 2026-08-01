# CNEFE Brasil

Visualizador web dos dados do **CNEFE** (Cadastro Nacional de Endereços para
Fins Estatísticos, IBGE) para comparar com o **OpenStreetMap**, lado a lado com
qualquer editor.

A primeira camada mostra as **faces de logradouro do Censo 2022** (nomes de rua).
Camadas futuras podem incluir os **pontos de endereço** do CNEFE.

Dados do IBGE são de domínio público e podem ser usados no OSM, citando a fonte —
ver [CNEFE data, IBGE, Brasil import](https://wiki.openstreetmap.org/wiki/CNEFE_data,_IBGE,_Brasil_import)
na wiki do OSM.

## App

Vite + React + MapLibre. Fica em [`prototype/app`](prototype/app).

```bash
cd prototype/app
npm install
npm run dev      # http://localhost:5173
```

### Dados (PMTiles)

O mapa lê um único arquivo `.pmtiles` (MVT vetorial, leitura por range HTTP). Em
produção ele é hospedado em um bucket **Cloudflare R2** público. Configure a URL
via variável de ambiente:

```bash
# prototype/app/.env.local
VITE_PMTILES_URL=https://<seu-bucket-r2>.r2.dev/national.pmtiles
```

Ver [`prototype/app/.env.example`](prototype/app/.env.example). Sem a variável, o
app procura `national.pmtiles` na própria origem.

O host precisa suportar **CORS** e **range requests** (o R2 público atende os
dois). Para desenvolvimento local há um servidor simples em
`data/faces2022/serve.mjs`.

## Fonte dos dados

IBGE — Base de Faces de Logradouros do Censo 2022:
<https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_setores_censitarios/censo_2022/base_de_faces_de_logradouros_versao_2022_censo_demografico/>
