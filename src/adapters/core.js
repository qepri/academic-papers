const BASE = 'https://api.core.ac.uk/v3/discover'

async function fetchArticles (query, limit = 25) {
  const apiKey = process.env.CORE_API_KEY
  if (!apiKey) return []

  const url = `${BASE}?q=${encodeURIComponent(query)}&limit=${limit}`
  const res = await globalThis.fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) return []
  const body = await res.json()
  return (body.results || []).map(mapResult)
}

function mapResult (r) {
  return {
    id: r.id ? String(r.id) : null,
    title: r.title || null,
    authors: (r.authors || []).map(a => ({ name: a.name, orcid: a.orcid })),
    source: r.publisher || r.journal?.name || null,
    year: r.year || null,
    doi: r.doi || null,
    pmid: null,
    pmcid: null,
    url: r.sourceFulltextUrls?.[0] || r.urls?.[0] || null,
    pdf_url: r.downloadUrl || r.fulltextUrls?.[0] || null,
    abstract: r.abstract || null,
    topics: r.subjects || []
  }
}

module.exports = { fetch: fetchArticles }
