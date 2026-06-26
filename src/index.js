const express = require('express')
const path = require('path')
const fs = require('fs')
const { init } = require('./db.js')
const { searchHandler } = require('./search.js')
const { listArticles, getArticle, deleteArticle, localPdfPath } = require('./articles.js')
const { mountMcp } = require('./mcp.js')

const app = express()
const db = init()

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json({ limit: '256kb' }))

app.use((req, res, next) => {
  req.db = db
  next()
})

app.post('/api/search', searchHandler)

app.get('/api/articles/:id', (req, res) => {
  const row = getArticle(db, req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json({ article: row })
})

app.get('/api/articles', (req, res) => {
  res.json(listArticles(db, req.query))
})

app.delete('/api/articles/:id', (req, res) => {
  const changes = deleteArticle(db, req.params.id)
  if (!changes) return res.status(404).json({ error: 'not found' })
  res.json({ deleted: true })
})

app.get('/api/articles/:id/pdf', async (req, res, next) => {
  try {
    const row = getArticle(db, req.params.id)
    if (!row) return res.status(404).json({ error: 'not found' })

    const pdfPath = localPdfPath(row)
    if (fs.existsSync(pdfPath)) return res.sendFile(pdfPath)

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

mountMcp(app, db)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'internal error' })
})

const PORT = process.env.PORT || 3456
const server = app.listen(PORT, () => console.log(`Server listening on :${PORT}`))

process.on('SIGINT', () => { db.close(); server.close(); process.exit(0) })

module.exports = app
