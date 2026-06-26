const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'

async function fetchArticles (query, limit = 25) {
  const url = `${BASE}?query=${encodeURIComponent(query)}&pageSize=${limit}&format=json`
  const res = await globalThis.fetch(url)
  if (!res.ok) return []
  const body = await res.json()
  return (body.resultList?.result || []).map(mapResult)
}

function mapResult (r) {
  return {
    id: r.id || r.doi || null,
    title: r.title || null,
    authors: (r.authorList?.author || []).map(a => ({ name: a.fullName, orcid: a.orcid })),
    source: r.journalTitle || r.bookOrReportDetails?.publisher || null,
    year: r.pubYear ? Number(r.pubYear) : null,
    doi: r.doi || null,
    pmid: r.pmid || null,
    pmcid: r.pmcId || null,
    url: r.fullTextUrlList?.fullTextUrl?.[0]?.url || r.doi || null,
    pdf_url: (r.fullTextUrlList?.fullTextUrl || []).find(u => u.documentStyle === 'PDF')?.url || null,
    abstract: r.abstractText || null,
    topics: (r.keywordList?.keyword || []).map(k => typeof k === 'string' ? k : k.value || k)
  }
}

module.exports = { fetch: fetchArticles }
