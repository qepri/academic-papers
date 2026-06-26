const BASE = 'https://api.openalex.org/works'

async function fetchArticles (query, limit = 25) {
  const url = `${BASE}?filter=has_content.pdf:true&search=${encodeURIComponent(query)}&per_page=${limit}`
  let res
  try {
    res = await globalThis.fetch(url, { signal: AbortSignal.timeout(10000) })
  } catch { return [] }
  if (!res.ok) return []
  let body
  try {
    body = await res.json()
  } catch { return [] }
  return (body.results || []).map(mapWork)
}

function mapWork (w) {
  return {
    id: w.id ? w.id.split('/').pop() : null,
    title: w.title || null,
    authors: (w.authorships || []).map(a => ({ name: a.author?.display_name, orcid: a.author?.orcid })),
    source: w.primary_location?.source?.display_name || null,
    year: w.publication_year || null,
    doi: w.doi || null,
    pmid: null,
    pmcid: null,
    url: w.primary_location?.landing_page_url || null,
    pdf_url: w.open_access?.pdf_url || w.primary_location?.pdf_url || null,
    abstract: reconstructAbstract(w.abstract_inverted_index),
    topics: (w.concepts || []).map(c => c.display_name)
  }
}

function reconstructAbstract (inverted) {
  if (!inverted) return null
  let maxPos = 0
  let totalEntries = 0
  for (const positions of Object.values(inverted)) {
    for (const pos of positions) {
      if (pos > maxPos) maxPos = pos
      totalEntries++
      if (totalEntries > 50000 || maxPos > 5000) return null
    }
  }
  const words = []
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words[pos] = word
  }
  return words.filter(Boolean).join(' ')
}

module.exports = { fetch: fetchArticles }
