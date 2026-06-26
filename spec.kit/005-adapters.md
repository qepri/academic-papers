# 005 — API adapters

**Status**: [x] done

## Objective

Create 5 single-file adapters in `src/adapters/`, each fetching articles from one open-access API and returning normalised results.

## Files (create each)

- `src/adapters/openalex.js`
- `src/adapters/unpaywall.js`
- `src/adapters/pmc.js`
- `src/adapters/europepmc.js`
- `src/adapters/core.js`

## Spec

Each adapter exports `async function fetch(query, limit = 25)` that:

1. Constructs the API URL with query params
2. Fetches via `fetch()` (Node 18+ built-in)
3. Parses JSON response
4. Maps to array of `{ id, title, authors, source, year, doi, pmid, pmcid, url, pdf_url, abstract, topics }`
5. Returns the array (empty array on error — never throw)

### OpenAlex

```
GET https://api.openalex.org/works?filter=has_content.pdf:true&search=QUERY&per_page=25
```

Fields mapping:
- `id` → `work.id` (extract last segment after `/`)
- `title` → `work.title`
- `authors` → `work.authorships[].author.display_name`
- `source` → `work.primary_location.source.display_name`
- `year` → `work.publication_year`
- `doi` → `work.doi`
- `url` → `work.primary_location.landing_page_url`
- `pdf_url` → first `work.open_access.pdf_url` if any
- `abstract` → `work.abstract_inverted_index` (you'll need to reconstruct)
- `topics` → `work.concepts[].display_name`

### Unpaywall

```
GET https://api.unpaywall.org/v2/search?query=QUERY&email=academic-repos@example.com
```

### PMC (PubMed Central)

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=QUERY&retmax=25&format=json
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=ID1,ID2&format=json
```

Two-step: search for IDs, then fetch summaries.

### Europe PMC

```
GET https://www.ebi.ac.uk/europepmc/api/search?query=QUERY&pageSize=25&format=json
```

### CORE

```
GET https://api.core.ac.uk/v3/discover?q=QUERY&limit=25
```

CORE needs an API key via `Authorization: Bearer` header. If no `CORE_API_KEY` env var, return empty array (no crash).

## Acceptance

- Each adapter can be tested in isolation: `node -e "require('./src/adapters/openalex').fetch('meditation').then(r => console.log(r.length))"`
- Failed fetch (network, parse) returns `[]`, never throws
- CORE gracefully skips if no API key

## Skills

Invoke these before implementation:

- `nodejs-backend-patterns` — async patterns, `node-fetch`/`fetch` usage, error boundaries
- `code-review-expert` — error handling, edge case coverage, security (no key leaking)
