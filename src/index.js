const express = require('express')
const path = require('path')
const fs = require('fs')
const { init } = require('./db.js')
const { safeName } = require('./utils.js')

const app = express()
const db = init()

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json())

app.use((req, res, next) => {
  req.db = db
  next()
})

app.post('/api/search', (req, res, next) => {
  const searchHandler = require('./search.js')
  searchHandler(req, res, next)
})

app.get('/api/articles/:id', (req, res) => {
  const id = req.params.id
  const row = db.prepare("SELECT * FROM articles WHERE id = ? OR doi = ? OR doi = 'https://doi.org/' || ?").get(id, id, id)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json({ article: row })
})

app.get('/api/articles', (req, res) => {
  const { q, source, year_min, year_max, has_pdf, sort, limit = 50, offset = 0 } = req.query
  const conditions = []
  const params = []

  if (q) {
    conditions.push("(title LIKE ? OR abstract LIKE ?)")
    params.push(`%${q}%`, `%${q}%`)
  }
  if (source) {
    const sources = source.split(',')
    conditions.push(`source_api IN (${sources.map(function () { return '?' }).join(',')})`)
    params.push.apply(params, sources)
  }
  if (year_min) { conditions.push('year >= ?'); params.push(Number(year_min)) }
  if (year_max) { conditions.push('year <= ?'); params.push(Number(year_max)) }
  if (has_pdf === 'true') { conditions.push("pdf_url IS NOT NULL AND pdf_url != ''") }
  else if (has_pdf === 'false') { conditions.push("(pdf_url IS NULL OR pdf_url = '')") }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const sortMap = { year: 'year DESC', year_asc: 'year ASC', title: 'title ASC', source: 'source ASC', fetched: 'fetched_at DESC' }
  const order = sortMap[sort] || 'fetched_at DESC'

  const total = db.prepare('SELECT COUNT(*) as count FROM articles ' + where).get.apply(db, params).count
  const results = db.prepare('SELECT * FROM articles ' + where + ' ORDER BY ' + order + ' LIMIT ? OFFSET ?').all.apply(db, params.concat([Number(limit), Number(offset)]))

  const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
  var pdfSet = new Set()
  try { fs.readdirSync(pdfDir).filter(function (f) { return f.endsWith('.pdf') }).forEach(function (f) { pdfSet.add(f) }) } catch (e) {}
  results.forEach(function (r) {
    r.has_local_pdf = r.doi ? pdfSet.has(safeName(r)) : false
  })

  res.json({ results, total, limit: Number(limit), offset: Number(offset) })
})

app.delete('/api/articles/:id', (req, res) => {
  const id = req.params.id
  const info = db.prepare("DELETE FROM articles WHERE id = ? OR doi = ? OR doi = 'https://doi.org/' || ?").run(id, id, id)
  if (info.changes === 0) return res.status(404).json({ error: 'not found' })
  res.json({ deleted: true })
})

app.get('/api/articles/:id/pdf', async (req, res, next) => {
  try {
    const id = req.params.id
    const row = db.prepare("SELECT * FROM articles WHERE id = ? OR doi = ? OR doi = 'https://doi.org/' || ?").get(id, id, id)
    if (!row) return res.status(404).json({ error: 'not found' })

    const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
    const pdfPath = path.join(pdfDir, safeName(row))

    if (fs.existsSync(pdfPath)) {
      return res.sendFile(pdfPath)
    }

    if (!row.pdf_url) return res.status(404).json({ error: 'no pdf available' })

    const resp = await fetch(row.pdf_url, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) return res.status(502).json({ error: 'failed to fetch pdf' })

    const buffer = Buffer.from(await resp.arrayBuffer())
    if (buffer.length < 1000 || buffer.slice(0, 4).toString() !== '%PDF') {
      return res.status(502).json({ error: 'invalid pdf response' })
    }
    fs.writeFileSync(pdfPath, buffer)
    res.sendFile(pdfPath)
  } catch (err) {
    next(err)
  }
})

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM articles').get().count

  const bySource = db.prepare('SELECT source_api, COUNT(*) as count FROM articles GROUP BY source_api ORDER BY count DESC').all()
    .reduce((acc, r) => { acc[r.source_api] = r.count; return acc }, {})

  const searches = db.prepare('SELECT query FROM search_log ORDER BY created_at DESC LIMIT 10').all()
    .map(r => r.query)

  res.json({ total_articles: total, by_source: bySource, recent_searches: searches })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'internal error' })
})

const PORT = process.env.PORT || 3456
const server = app.listen(PORT, () => console.log(`Server listening on :${PORT}`))

process.on('SIGINT', () => { db.close(); server.close(); process.exit(0) })

module.exports = app
