# 004 — Search handler

**Status**: [x] done

## Objective

Create `src/search.js` — orchestrates adapter calls via `Promise.allSettled`, deduplicates, upserts into SQLite, returns results.

## Files

- `src/search.js` (create)
- `src/index.js` (update — mount real handler)

## Spec

- Export `async function searchHandler(req, res, next)`
- Parse body: `{ query, topics, limit }` (limit defaults to 50)
- Validate: `query` must be non-empty string
- Call all 5 adapters in parallel via `Promise.allSettled`:

```js
const adapters = [openalex, unpaywall, pmc, europepmc, core]
const results = await Promise.allSettled(
  adapters.map(a => a.fetch(query))
)
```

- Collect `fulfilled` results, log `rejected` reasons to console
- Flatten + dedup by `doi || url`
- Upsert each article into SQLite via `upsertArticle`
- Count results, log search via `logSearch`
- Respond `{ results: [...], total, sources: [...] }`
- In `src/index.js`: replace the 501 placeholder with the real handler

## Acceptance

- `POST /api/search { "query": "meditation" }` returns 200 with results array (even if some adapters fail)
- Failed adapters don't block successful ones
- Duplicate DOIs across adapters are merged into one row

## Skills

Invoke these before implementation:

- `nodejs-backend-patterns` — async patterns, error handling middleware
- `expressjs-development` — route handlers, request validation
- `database-design` — upsert patterns, data flow
- `dba` — INSERT OR REPLACE, query patterns
