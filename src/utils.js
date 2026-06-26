function sanitiseString (str) {
  if (!str) return null
  return String(str).replace(/\0/g, '').trim().replace(/\s+/g, ' ') || null
}

function normaliseArticle (raw, sourceApi) {
  const article = {
    id: sanitiseString(raw.id) || null,
    title: sanitiseString(raw.title) || null,
    authors: raw.authors ? JSON.stringify(raw.authors) : null,
    source: sanitiseString(raw.source) || null,
    year: raw.year ? Number(raw.year) : null,
    doi: sanitiseString(raw.doi) || null,
    pmid: sanitiseString(raw.pmid) || null,
    pmcid: sanitiseString(raw.pmcid) || null,
    url: sanitiseString(raw.url) || null,
    pdf_url: sanitiseString(raw.pdf_url) || null,
    abstract: sanitiseString(raw.abstract) || null,
    topics: Array.isArray(raw.topics) ? JSON.stringify(raw.topics) : null,
    source_api: sourceApi
  }

  article.id = article.id || article.doi || article.url || `unknown-${Date.now()}`
  return article
}

function dedupKey (article) {
  return article.doi || article.url || article.id
}

function safeName (article) {
  var raw = (article.doi || article.id || 'unknown')
  raw = raw.replace(/^https?:\/\/doi\.org\//, '')
  const doi = raw.replace(/[^a-zA-Z0-9._-]/g, '_')
  const year = article.year || 'nodate'
  const title = (article.title || 'untitled')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120) || 'untitled'
  return doi + '__' + year + '_' + title + '.pdf'
}

module.exports = { normaliseArticle, dedupKey, sanitiseString, safeName }
