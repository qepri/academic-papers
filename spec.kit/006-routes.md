# 006 — Remaining routes

**Status**: [x] done

## Objective

Implement the remaining API routes in `src/index.js`: GET article by ID, GET articles list with filters, DELETE article, GET stats.

## Files

- `src/index.js` (update — replace 501 placeholders)

## Spec

### `GET /api/articles/:id`

- Fetch article by `id` (TEXT PRIMARY KEY) or `doi`
- Return `{ article }` or 404 `{ error: "not found" }`

### `GET /api/articles`

- Query params: `?topic=&source=&year=&limit=50&offset=0`
- Build WHERE clause dynamically from non-empty params
  - `topic` → `WHERE topics LIKE '%"topic"%'` (JSON array contains)
  - `source` → `WHERE source = ?`
  - `year` → `WHERE year = ?`
- Return `{ results: [...], total, limit, offset }`
- Include `total` count (execute `SELECT COUNT(*)` with same WHERE)

### `DELETE /api/articles/:id`

- Delete by `id`
- Return `{ deleted: true }` or 404

### `GET /api/stats`

- Return:
```json
{
  "total_articles": 123,
  "by_source": { "openalex": 50, "pmc": 30, ... },
  "by_topic": { "meditation": 20, "adaptogens": 10, ... },
  "recent_searches": ["meditation", "breathing exercises"]
}
```

- `recent_searches` → last 10 from `search_log`

## Acceptance

- Each route returns correct data shape
- Filters work correctly (empty filter = all articles)
- Invalid ID returns 404
- Stats query is a single SQL pass

## Skills

Invoke these before implementation:

- `expressjs-development` — route params, query strings, response patterns
- `database-design` — query patterns, JSON search in SQLite
- `dba` — `LIKE` / JSON query patterns, count queries, indexing
- `nodejs-backend-patterns` — route organisation, error handling
- `code-review-expert` — SQL injection prevention (use parameterised queries), edge cases
