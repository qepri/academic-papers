const { init } = require('../src/db')
const { safeName } = require('../src/utils')
const fs = require('fs')
const path = require('path')

const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

const articles = db.prepare("SELECT id, doi, pdf_url, pmcid, source_api FROM articles WHERE pdf_url IS NOT NULL OR pmcid IS NOT NULL").all()
console.log(`Found ${articles.length} articles with pdf_url`)

const CONCURRENCY = 5
let completed = 0
let downloaded = 0
let skipped = 0
let failed = 0

function getUrls(article) {
  const urls = [article.pdf_url]
  if (article.pmcid) {
    urls.push(`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/pdf/`)
    urls.push(`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/pdf`)
    urls.push(`https://europepmc.org/articles/${article.pmcid}/pdf`)
  }
  return urls
}

async function downloadOne(article) {
  const name = safeName(article)
  const filePath = path.join(pdfDir, name)

  if (fs.existsSync(filePath)) { skipped++; return }

  const urls = getUrls(article)
  for (const url of urls) {
    try {
      const resp = await globalThis.fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!resp.ok) continue
      const ct = resp.headers.get('content-type') || ''
      const buffer = Buffer.from(await resp.arrayBuffer())
      if (buffer.length >= 1000 && buffer.slice(0, 4).toString() === '%PDF') {
        fs.writeFileSync(filePath, buffer)
        downloaded++
        return
      }
    } catch {}
  }
  failed++
}

async function batch() {
  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(downloadOne))
    completed += batch.length
    process.stdout.write(`\r${completed}/${articles.length} | DL:${downloaded} Skip:${skipped} Fail:${failed}  `)
  }
  console.log('\nDone')
  console.log(`Valid PDFs on disk: ${fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')).length}`)
  db.close()
}

batch()
