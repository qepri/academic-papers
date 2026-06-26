const BASE = 'https://api.unpaywall.org/v2/search'

async function fetchArticles (query, limit = 25) {
  const url = `${BASE}?query=${encodeURIComponent(query)}&email=academic-repos@example.com`
  const res = await globalThis.fetch(url)
  if (!res.ok) return []
  const body = await res.json()
  return (body.results || []).slice(0, limit).map(mapResult)
}

function mapResult (r) {
  const w = r.response || {}
  return {
    id: w.id || w.doi || null,
    title: w.title || null,
    authors: (w.z_authors || []).map(a => ({ name: `${a.given} ${a.family}`.trim(), orcid: a.orcid })),
    source: w.journal_name || w.publisher || null,
    year: w.year || null,
    doi: w.doi || null,
    pmid: w.pmid || null,
    pmcid: w.pmcid || null,
    url: w.doi_url || null,
    pdf_url: w.best_oa_location?.url_for_pdf || null,
    abstract: w.abstract || null,
    topics: (w.subjects || []).map(s => typeof s === 'string' ? s : s.name)
  }
}

module.exports = { fetch: fetchArticles }
