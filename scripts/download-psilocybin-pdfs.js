const { init } = require('../src/db')
const { safeName } = require('../src/utils')
const fs = require('fs')
const path = require('path')
const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')

const articles = db.prepare("SELECT doi, pdf_url, pmcid, source_api FROM articles WHERE (title LIKE '%psilocybin%' OR title LIKE '%cubensis%' OR title LIKE '%psychedelic%' OR title LIKE '%microdos%') AND pdf_url IS NOT NULL").all()
console.log('Candidate articles:', articles.length)

const existing = new Set(fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')))
const todo = articles.filter(a => !existing.has(safeName(a)))
console.log('New PDFs to try:', todo.length)

if (todo.length === 0) { console.log('Nothing to download'); db.close(); process.exit(0) }

var dl = 0, fail = 0

async function main() {
  for (var i = 0; i < todo.length; i += 5) {
    var batch = todo.slice(i, i + 5)
    await Promise.allSettled(batch.map(async (a) => {
      var name = safeName(a)
      var fp = path.join(pdfDir, name)
      if (fs.existsSync(fp)) return

      var urls = [a.pdf_url]
      if (a.pmcid) urls.push('https://www.ncbi.nlm.nih.gov/pmc/articles/' + a.pmcid + '/pdf/')

      for (var url of urls) {
        try {
          var resp = await globalThis.fetch(url, { signal: AbortSignal.timeout(20000) })
          if (!resp.ok) continue
          var ct = resp.headers.get('content-type') || ''
          var buf = Buffer.from(await resp.arrayBuffer())
          if (buf.length >= 1000 && buf.slice(0, 4).toString() === '%PDF') {
            fs.writeFileSync(fp, buf)
            dl++
            return
          }
          // try pmcid/ as well (landing page redirect)
          if (buf.length > 5000 && a.pmcid && url.includes('ncbi') && !url.endsWith('/pdf/')) continue
        } catch {}
      }
      fail++
    }))
    process.stdout.write('\r' + Math.min(i + 5, todo.length) + '/' + todo.length + ' DL:' + dl + ' Fail:' + fail)
  }
  console.log('\nDone')
  console.log('New PDFs downloaded:', dl)
  console.log('Total PDFs on disk:', fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')).length)
  db.close()
}
main()
