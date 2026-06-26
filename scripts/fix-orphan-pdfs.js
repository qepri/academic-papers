const fs = require('fs')
const path = require('path')
const { init } = require('../src/db')
const { safeName } = require('../src/utils')

const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'))

var allArticles = db.prepare('SELECT * FROM articles').all()
var nameMap = {}
allArticles.forEach(function(a) { nameMap[safeName(a)] = a })

var renamed = 0, skipped = 0

files.forEach(function(f) {
  if (nameMap[f]) { skipped++; return }
  var prefix = f.split('__')[0]
  var match = allArticles.find(function(a) { return safeName(a).split('__')[0] === prefix })
  if (!match) { return }
  var correct = safeName(match)
  var oldPath = path.join(pdfDir, f)
  var newPath = path.join(pdfDir, correct)
  if (fs.existsSync(newPath)) {
    fs.unlinkSync(oldPath)
  } else {
    fs.renameSync(oldPath, newPath)
  }
  renamed++
})

console.log('Renamed:', renamed, 'Skipped:', skipped)
console.log('Total:', fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf')).length)
db.close()
