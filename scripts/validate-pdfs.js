const fs = require('fs')
const path = require('path')

const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'))

let valid = 0
let removed = 0

for (const f of files) {
  const fp = path.join(pdfDir, f)
  const buf = fs.readFileSync(fp)

  // PDF must start with %PDF
  const isPdf = buf.slice(0, 4).toString() === '%PDF'

  if (!isPdf) {
    const preview = buf.slice(0, 100).toString().replace(/\n/g, ' ').trim()
    console.log(`REMOVED ${f}: not a PDF (starts with "${preview.slice(0, 60)}")`)
    fs.unlinkSync(fp)
    removed++
  } else {
    valid++
  }
}

console.log(`\n${valid} valid PDFs, ${removed} corrupted removed`)
