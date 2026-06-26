# academic-repos

Express 5 + SQLite server that aggregates open-access academic articles from
multiple providers, dedupes by DOI, and serves them via a small web UI.

## Stack

- Node.js ≥ 18, Express 5
- better-sqlite3 (WAL, synchronous, no ORM)
- Vanilla web components + Tailwind via CDN — no build step

## Run

```bash
pnpm install
pnpm start          # http://localhost:3456
```

`PORT` env var overrides the default.

## Adapters

One file per provider in [src/adapters/](src/adapters/), each exporting
`fetch(query)` and returning a normalised shape. Search fans out with
`Promise.allSettled`, so a failing provider doesn't break the request.

| Source     | Auth          |
|------------|---------------|
| OpenAlex   | none          |
| Unpaywall  | email in URL  |
| PMC        | none (eutils) |
| Europe PMC | none          |
| CORE       | `CORE_API_KEY` env var (skipped if unset) |

## Routes

```
POST   /api/search              { query, limit }   fan-out, upsert, return merged
GET    /api/articles            ?q=&source=&year_min=&year_max=&has_pdf=&sort=&limit=&offset=
GET    /api/articles/:id        single article
DELETE /api/articles/:id
GET    /api/articles/:id/pdf    local file if cached, else fetch + cache
GET    /api/stats               counts by source, recent queries
```

Full spec in [openapi.json](openapi.json).

## Layout

```
src/                Express app, adapters, DB
public/             Frontend (index.html + app.js)
scripts/            Ad-hoc PDF downloaders / probes (not part of the server)
spec.kit/           Per-module specs
data/               SQLite DB + cached PDFs (gitignored)
```
