# 002 — Utility functions

**Status**: [x] done

## Objective

Create `src/utils.js` — helpers to normalise adapter responses and deduplicate articles.

## Files

- `src/utils.js` (create)

## Spec

- `normaliseArticle(raw, sourceApi)` — takes a raw article object from any adapter and returns a consistent shape: `{ id, title, authors, source, year, doi, pmid, pmcid, url, pdf_url, abstract, topics }`
  - `authors` serialised as JSON array of `{ name, orcid }`
  - `topics` serialised as JSON array of strings
  - Gracefully handle missing fields (default to null / [])
- `dedupKey(article)` — returns `doi || url || id` for dedup comparison
- `sanitiseString(str)` — trim, collapse whitespace, strip null bytes

## Acceptance

- `normaliseArticle({ title: "  Test  ", authors: [{ name: "A" }] }, "openalex")` returns a properly shaped object
- `sanitiseString(" a\x00b  c ")` → `"a b c"`

## Skills

Invoke these before implementation:

- `nodejs-backend-patterns` — pure function patterns, error handling
