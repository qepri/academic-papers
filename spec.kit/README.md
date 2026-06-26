# spec.kit — academic-repos

Implementation specs for the academic article aggregation server.

## Before any task — use skills

Read `AGENTS.md` at project root. Always `opal load <skill>` before implementing:

```
opal skills              # list available skills
opal load <skill-name>   # load a skill's instructions
```

| Skill | When to use |
|-------|-------------|
| `nodejs-backend-patterns` | Express structure, error handling, async |
| `expressjs-development` | Routing, middleware, request/response |
| `database-design` | Schema, SQL, upserts, indexing |
| `dba` | SQLite DDL, query optimization, constraints |
| `code-review-expert` | SOLID, security, performance |

## API reference

See `openapi.json` at project root for the full OpenAPI 3.1 spec.

## Workflow

1. Pick the next pending spec (lowest number)
2. Load relevant skills via `opal load`
3. Implement, verify, mark as `[x]` in the spec header
4. Run `node src/index.js` to test

## Specs

| # | File | Status |
|---|------|--------|
| 001 | `001-db.md` — Database layer | done |
| 002 | `002-utils.md` — Utility functions | done |
| 003 | `003-index.md` — Express app skeleton | done |
| 004 | `004-search.md` — Search handler (POST /api/search) | done |
| 005 | `005-adapters.md` — All 5 API adapters | done |
| 006 | `006-routes.md` — Remaining routes | done |
| 007 | `007-pdf.md` — PDF download/serve endpoint | done |

## Usage

```bash
node src/index.js
# POST /api/search  { "query": "meditation", "limit": 25 }
# GET  /api/stats
# GET  /api/articles/:id/pdf
```
