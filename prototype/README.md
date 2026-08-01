# CNEFE Brasil — app

Mapa de referência das **faces de logradouro do CNEFE 2022** (IBGE) para comparar
nomes de rua com o OpenStreetMap, ao lado de qualquer editor. Apoia o mapeamento
de logradouros da comunidade OSM Brasil
([discussão](https://community.openstreetmap.org/t/cnefe-2022-disponibilizacao-de-nomes-de-logradouros-para-mapeamento/140937)).

- `app/` — React + Vite + MapLibre. Ver [`app/`](app).
- `SPEC.md` — decisões de design (painel + linguagem visual OSM for Cities).

## Rodar

```
cd app
npm install
npm run dev      # http://localhost:5173
```

Os dados vêm de um único `national.pmtiles` (faces de logradouro de todo o Brasil,
z13–15). Em produção o app aponta para o bucket **Cloudflare R2** público; para
desenvolvimento, configure `app/.env.local` (ver `app/.env.example`).
