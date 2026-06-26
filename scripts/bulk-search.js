const { init } = require('../src/db')
const { normaliseArticle, dedupKey } = require('../src/utils')
const { logSearch } = require('../src/db')

const ADAPTER_NAMES = ['openalex', 'unpaywall', 'pmc', 'europepmc', 'core']
const db = init()

function loadAdapters () {
  return ADAPTER_NAMES.map(name => {
    try {
      return { name, fetch: require(`../src/adapters/${name}.js`).fetch }
    } catch {
      return { name, fetch: () => Promise.resolve([]) }
    }
  })
}

async function runSearch (query, limit) {
  const adapters = loadAdapters()
  const settled = await Promise.allSettled(
    adapters.map(a => a.fetch(query.trim()))
  )

  const seen = new Set()
  const articles = []

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error('  [' + adapters[i].name + ']', result.reason?.message || result.reason)
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

  const insert = db.prepare('INSERT OR IGNORE INTO articles \
    (id, title, authors, source, year, doi, pmid, pmcid, url, pdf_url, abstract, topics, source_api) \
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

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

  return { results: articles.slice(0, limit), total: articles.length, sources }
}

const queries = [
  'psychedelic experiences mystical',
  'cognitive enhancement nootropics',
  'psychedelic paranormal abilities consciousness',
  'healthspan longevity increase',
  'immune system pregnancy maternal',
  'best practices pregnancy prenatal care',
  'psychedelic therapy ptsd depression anxiety',
  'microdosing cognition focus memory',
  'parapsychology psi phenomena consciousness',
  'pregnancy nutrition exercise guidelines',
  'meditation psychedelic integration therapy',
  'adaptogens pregnancy safety',
  'prenatal health immune support',
  'breathing techniques pregnancy labor',
  'mindfulness pregnancy stress reduction'
]

async function main() {
  for (var i = 0; i < queries.length; i++) {
    var q = queries[i]
    console.log('[' + (i + 1) + '/' + queries.length + '] ' + q)
    try {
      var result = await runSearch(q, 50)
      var sources = result.sources.filter(s => s.status === 'fulfilled').map(s => s.source + ':' + s.count).join(' ')
      console.log('  -> ' + result.total + ' new | ' + sources)
    } catch (e) {
      console.log('  -> ERROR: ' + e.message)
    }
    if (i < queries.length - 1) await new Promise(r => setTimeout(r, 3000))
  }

  var total = db.prepare('SELECT COUNT(*) as count FROM articles').get().count
  console.log('\nTotal articles in DB: ' + total)
  db.close()
}

main()
