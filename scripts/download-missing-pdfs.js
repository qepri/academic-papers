const { init } = require('../src/db')
const { safeName } = require('../src/utils')
const fs = require('fs')
const path = require('path')

const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

const existing = new Set(fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')))

const articles = db.prepare("SELECT doi, pdf_url, pmcid, title, year FROM articles WHERE source_api = 'pmc' AND pmcid IS NOT NULL").all()
const todo = articles.filter(a => !existing.has(safeName(a)))
console.log('PMC articles to download:', todo.length)
console.log('Existing PDFs:', existing.size)

const CONCURRENCY = 20
const TIMEOUT = 60000
var dl = 0, fail = 0

async function downloadOne(article) {
  var name = safeName(article)
  var fp = path.join(pdfDir, name)
  if (fs.existsSync(fp)) return

  var url = 'https://europepmc.org/articles/' + article.pmcid + '?pdf=render'

  try {
    var resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), redirect: 'follow' })
    if (!resp.ok) { fail++; return }
    var ct = resp.headers.get('content-type') || ''
    if (!ct.includes('pdf') && !ct.includes('octet-stream')) { fail++; return }
    var buf = Buffer.from(await resp.arrayBuffer())
    if (buf.length >= 1000 && buf.slice(0, 4).toString() === '%PDF') {
      fs.writeFileSync(fp, buf)
      dl++
    } else {
      fail++
    }
  } catch {
    fail++
  }
}

async function batch() {
  for (var i = 0; i < todo.length; i += CONCURRENCY) {
    var batch = todo.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(downloadOne))
    process.stdout.write('\r' + Math.min(i + CONCURRENCY, todo.length) + '/' + todo.length + ' DL:' + dl + ' Fail:' + fail)
  }
  console.log('\nDone')
  console.log('New PDFs:', dl)
  console.log('Total on disk:', fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')).length)
  db.close()
}

batch()
