const fs = require('fs')
const path = require('path')
const { init } = require('../src/db')
const { safeName } = require('../src/utils')

const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'))

function oldPrefix (article) {
  return (article.doi || article.id || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_')
}

const articles = db.prepare('SELECT * FROM articles').all()
var renamed = 0, skipped = 0, notfound = 0

files.forEach(f => {
  const oldPath = path.join(pdfDir, f)
  const prefix = f.split('__').slice(0, -1).join('__')
  const row = articles.find(a => oldPrefix(a) === prefix)

  if (!row) {
    notfound++
    return
  }

  const correct = safeName(row)
  const dest = path.join(pdfDir, correct)

  if (f === correct) { skipped++; return }

  if (fs.existsSync(dest)) {
    fs.unlinkSync(oldPath)
  } else {
    fs.renameSync(oldPath, dest)
  }
  renamed++
})

console.log('Renamed:', renamed, 'Skipped:', skipped, 'No match:', notfound)
console.log('Total PDFs:', fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')).length)
db.close()
