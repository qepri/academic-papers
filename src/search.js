const { normaliseArticle, dedupKey } = require('./utils.js')
const { upsertArticle, logSearch } = require('./db.js')

const ADAPTER_NAMES = ['openalex', 'unpaywall', 'pmc', 'europepmc', 'core']

function loadAdapters () {
  return ADAPTER_NAMES.map(name => {
    try {
      return { name, fetch: require(`./adapters/${name}.js`).fetch }
    } catch {
      return { name, fetch: () => Promise.resolve([]) }
    }
  })
}

async function searchHandler (req, res, next) {
  try {
    const { query, limit = 50 } = req.body
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query is required' })
    }

    const db = req.db
    const adapters = loadAdapters()
    const settled = await Promise.allSettled(
      adapters.map(a => a.fetch(query.trim()))
    )

    const seen = new Set()
    const articles = []

    settled.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[${adapters[i].name}]`, result.reason)
        return
      }
      const raw = result.value
      if (!Array.isArray(raw)) return

      for (const item of raw) {
        const normalised = normaliseArticle(item, adapters[i].name)
        const key = dedupKey(normalised)
        if (key && !seen.has(key)) {
          seen.add(key)
          articles.push(normalised)
        }
      }
    })

    const responseArticles = articles.slice(0, Number(limit))
    const insert = db.prepare(`INSERT OR IGNORE INTO articles
      (id, title, authors, source, year, doi, pmid, pmcid, url, pdf_url, abstract, topics, source_api)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

    const insertMany = db.transaction((items) => {
      for (const a of items) {
        insert.run(a.id, a.title, a.authors, a.source, a.year, a.doi, a.pmid, a.pmcid, a.url, a.pdf_url, a.abstract, a.topics, a.source_api)
      }
    })

    insertMany(articles)
    logSearch(db, query, articles.length)

    const sources = settled.map((r, i) => ({
      source: adapters[i].name,
      status: r.status,
      count: r.status === 'fulfilled' && Array.isArray(r.value) ? r.value.length : 0
    }))

    res.json({ results: responseArticles, total: responseArticles.length, sources })
  } catch (err) {
    next(err)
  }
}

module.exports = { searchHandler }
