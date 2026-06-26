const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

async function fetchArticles (query, limit = 25) {
  const ids = await searchIds(query, limit)
  if (ids.length === 0) return []
  return fetchSummaries(ids)
}

async function searchIds (query, max) {
  const url = `${EUTILS}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=${max}&format=json`
  const res = await globalThis.fetch(url)
  if (!res.ok) return []
  const body = await res.json()
  return body.esearchresult?.idlist || []
}

async function fetchSummaries (ids) {
  const url = `${EUTILS}/esummary.fcgi?db=pmc&id=${ids.join(',')}&format=json`
  const res = await globalThis.fetch(url)
  if (!res.ok) return []
  const body = await res.json()
  const results = body.result || {}
  const uids = results.uids || []
  return uids.map(uid => mapSummary(results[uid]))
}

function mapSummary (s) {
  if (!s) return {}
  const ids = (s.articleids || []).reduce((acc, a) => { acc[a.idtype || a.type] = a.value; return acc }, {})
  return {
    id: ids.pmcid || ids.pmid || null,
    title: s.title || null,
    authors: (s.authors || []).map(a => ({ name: a.name, orcid: null })),
    source: s.fulljournalname || s.source || null,
    year: s.pubdate ? parseInt(s.pubdate) || null : null,
    doi: ids.doi || null,
    pmid: ids.pmid || null,
    pmcid: ids.pmcid || null,
    url: ids.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${ids.pmcid}` : null,
    pdf_url: ids.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${ids.pmcid}/pdf` : null,
    abstract: s.elf_long || null,
    topics: []
  }
}

module.exports = { fetch: fetchArticles }
