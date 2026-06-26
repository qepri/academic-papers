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

## MCP endpoint (for LLM agents)

This server is also an **MCP server** so an LLM agent can search,
filter, and read academic papers as tools + resources.

### Connection

- **URL**: `POST http://<host>:<port>/mcp`
- **Transport**: Streamable HTTP, stateless (no session ID)
- **Auth**: `Authorization: Bearer <MCP_TOKEN>` (required — server refuses
  to mount the endpoint if `MCP_TOKEN` is unset)
- **Server name**: `academic-repos`
- **Rate limit**: 30 req/min/IP (override `MCP_RATE_LIMIT`)

Start with MCP enabled:

```bash
MCP_TOKEN=<strong-random-token> pnpm start
```

Claude Desktop / MCP-Inspector / agent config:

```json
{
  "mcpServers": {
    "academic-repos": {
      "url": "http://localhost:3456/mcp",
      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
    }
  }
}
```

### Tools

All tools return JSON-as-text in `content[0].text` — `JSON.parse` it.

#### 1. `search_articles` — hit the public APIs

Use when the agent needs fresh results from OpenAlex / Unpaywall / PMC /
Europe PMC / CORE. Side effect: upserts results into the local DB.

```json
{ "query": "psilocybin depression", "limit": 25 }
```

| Field   | Type   | Range    | Notes                                  |
|---------|--------|----------|----------------------------------------|
| `query` | string | 1–500    | required                               |
| `limit` | int    | 1–100    | default 25, after dedup across sources |

Returns: `{ results: Article[], total: number, sources: [{source, status, count, error}] }`

#### 2. `list_articles` — query what's already cached locally

Use first for anything the user might've searched before — cheaper and
returns the `has_local_pdf` flag.

```json
{ "q": "mushroom", "has_pdf": true, "year_min": 2020, "limit": 50, "offset": 0 }
```

| Field      | Type    | Notes                                              |
|------------|---------|----------------------------------------------------|
| `q`        | string  | substring on title + abstract                      |
| `source`   | string  | comma-separated: `openalex,pmc,europepmc,...`      |
| `year_min` | int     | inclusive                                          |
| `year_max` | int     | inclusive                                          |
| `has_pdf`  | bool    | filter by whether `pdf_url` is set                 |
| `sort`     | enum    | `year` `year_asc` `title` `source` `fetched`       |
| `limit`    | int     | 1–200, default 50                                  |
| `offset`   | int     | ≥0, default 0                                      |

Returns: `{ results: Article[], total: number, limit, offset }`.
Each article has `has_local_pdf: bool` indicating a cached PDF exists.

#### 3. `get_article` — single article by id, DOI, or DOI URL

```json
{ "id": "10.1002/brb3.71187" }
```

Accepts: raw DOI (`10.x/y`), DOI URL (`https://doi.org/...`), or
internal `id`. Returns the full Article row or an `isError: true` result.

### Resource: PDF content

URI template: **`article://{id}/pdf`** where `{id}` is the URL-encoded DOI
or id. The agent reads PDFs via the standard MCP `resources/read` call —
**not** as a tool.

```json
{
  "method": "resources/read",
  "params": { "uri": "article://10.1002%2Fbrb3.71187/pdf" }
}
```

Returns `contents[0].blob` (base64 PDF, `application/pdf`). Errors if the
PDF is not cached locally (server doesn't fetch on-demand via MCP — keep
that to the HTTP `/api/articles/:id/pdf` route).

### Article shape

```ts
{
  id: string,           // internal — usually the DOI
  title: string,
  authors: string,      // JSON-encoded [{name, orcid}]
  source: string,       // journal/publisher
  year: number | null,
  doi: string | null,
  pmid: string | null,
  pmcid: string | null,
  url: string | null,   // landing page
  pdf_url: string | null,
  abstract: string | null,
  topics: string,       // JSON-encoded string[]
  source_api: 'openalex' | 'unpaywall' | 'pmc' | 'europepmc' | 'core',
  fetched_at: string,   // SQLite datetime
  has_local_pdf?: boolean  // only on list_articles / get_article
}
```

### Suggested agent workflow

1. **Cheap first**: call `list_articles` with `q=<topic>` — instant, no
   network, returns the `has_local_pdf` flag.
2. **Refresh if thin**: if results < expected, call `search_articles` to
   pull fresh hits from the public APIs (they auto-cache).
3. **Read a paper**: pick an article with `has_local_pdf: true`, then
   `resources/read` `article://<encoded-doi>/pdf`. For uncached PDFs,
   tell the user to fetch via the HTTP `/api/articles/:id/pdf` route.

### Smoke test

```bash
MCP_TOKEN=test-token-1234567890 pnpm test:mcp
```

## Layout

```
src/                Express app, adapters, DB
public/             Frontend (index.html + app.js)
scripts/            Ad-hoc PDF downloaders / probes (not part of the server)
spec.kit/           Per-module specs
data/               SQLite DB + cached PDFs (gitignored)
```
