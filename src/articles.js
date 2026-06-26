const path = require('path')
const fs = require('fs')
const { safeName } = require('./utils.js')

const PDF_DIR = path.join(__dirname, '..', 'data', 'pdfs')
const SORT_MAP = {
  year: 'year DESC',
  year_asc: 'year ASC',
  title: 'title ASC',
  source: 'source ASC',
  fetched: 'fetched_at DESC'
}

function annotatePdfFlag (rows) {
  let pdfSet = new Set()
  try {
    for (const f of fs.readdirSync(PDF_DIR)) if (f.endsWith('.pdf')) pdfSet.add(f)
  } catch (e) { /* dir may not exist yet */ }
  for (const r of rows) r.has_local_pdf = r.doi ? pdfSet.has(safeName(r)) : false
  return rows
}

function listArticles (db, opts = {}) {
  const { q, source, year_min, year_max, has_pdf, sort } = opts
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200)
  const offset = Math.max(Number(opts.offset) || 0, 0)

  const conditions = []
  const params = []

  if (q) {
    conditions.push('(title LIKE ? OR abstract LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  if (source) {
    const sources = String(source).split(',').filter(Boolean)
    if (sources.length) {
      conditions.push(`source_api IN (${sources.map(() => '?').join(',')})`)
      params.push(...sources)
    }
  }
  if (year_min != null && year_min !== '') { conditions.push('year >= ?'); params.push(Number(year_min)) }
  if (year_max != null && year_max !== '') { conditions.push('year <= ?'); params.push(Number(year_max)) }
  if (has_pdf === true || has_pdf === 'true') conditions.push("pdf_url IS NOT NULL AND pdf_url != ''")
  else if (has_pdf === false || has_pdf === 'false') conditions.push("(pdf_url IS NULL OR pdf_url = '')")

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const order = SORT_MAP[sort] || 'fetched_at DESC'

  const total = db.prepare('SELECT COUNT(*) AS count FROM articles ' + where).get(...params).count
  const rows = db.prepare('SELECT * FROM articles ' + where + ' ORDER BY ' + order + ' LIMIT ? OFFSET ?')
    .all(...params, limit, offset)

  return { results: annotatePdfFlag(rows), total, limit, offset }
}

function getArticle (db, id) {
  const row = db.prepare(
    "SELECT * FROM articles WHERE id = ? OR doi = ? OR doi = 'https://doi.org/' || ?"
  ).get(id, id, id)
  if (!row) return null
  annotatePdfFlag([row])
  return row
}

function deleteArticle (db, id) {
  return db.prepare(
    "DELETE FROM articles WHERE id = ? OR doi = ? OR doi = 'https://doi.org/' || ?"
  ).run(id, id, id).changes
}

function localPdfPath (article) {
  return path.join(PDF_DIR, safeName(article))
}

module.exports = { listArticles, getArticle, deleteArticle, localPdfPath, PDF_DIR }
