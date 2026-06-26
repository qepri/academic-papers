# 003 — Express app skeleton

**Status**: [x] done

## Objective

Create `src/index.js` — Express 5 app with middleware, JSON parsing, and route mounting skeleton.

## Files

- `src/index.js` (create)

## Spec

- Import `express` and `./db.js`
- Call `init()` to get db instance
- Mount middleware: `express.json()`
- Mount routes:
  - `POST /api/search` → `./search.js` handler (placeholder: returns 501)
  - `GET /api/articles/:id` → inline placeholder (returns 501)
  - `GET /api/articles` → inline placeholder (returns 501)
  - `DELETE /api/articles/:id` → inline placeholder (returns 501)
  - `GET /api/stats` → inline placeholder (returns 501)
- Attach `req.db` via middleware so route handlers access the instance
- Global error handler middleware (captures thrown errors, returns 500 JSON)
- Listen on `process.env.PORT || 3000`
- Log `Server listening on :${port}`
- Export `app` for testing

## Acceptance

- `node src/index.js` starts the server
- `curl http://localhost:3000/api/stats` returns `501` JSON
- Graceful shutdown on SIGINT (close db, exit)

## Skills

Invoke these before implementation:

- `expressjs-development` — routing patterns, middleware, error handling
- `nodejs-backend-patterns` — Express app structure, error middleware
- `code-review-expert` — review for SOLID, error boundaries
