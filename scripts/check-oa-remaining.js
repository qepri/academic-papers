const { init } = require('../src/db')
const path = require('path')
const fs = require('fs')
const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')

// Existing PDF filenames (first part is DOI)
var existing = new Set()
fs.readdirSync(pdfDir).forEach(function(f) {
  if (f.endsWith('.pdf')) existing.add(f)
})
console.log('PDF files on disk:', existing.size)

// Articles by source_api
var apis = db.prepare("SELECT source_api, COUNT(*) as c FROM articles GROUP BY source_api").all()
console.log('\nArticles by source_api:')
apis.forEach(function(a) { console.log('  ' + a.source_api + ': ' + a.c) })

// PMC articles with pdf_url that start with europepmc
var pmcPdf = db.prepare("SELECT pdf_url FROM articles WHERE source_api = 'pmc' AND pdf_url LIKE '%europepmc%' LIMIT 3").all()
console.log('\nSample PMC pdf_urls:')
pmcPdf.forEach(function(r) { console.log('  ' + r.pdf_url) })

// Find PMC articles with pdf_url NOT matching any local file
// We need to check by DOI since filenames use DOI
var pmcWithoutFile = db.prepare(`
  SELECT a.doi, a.pmcid, a.pdf_url
  FROM articles a
  WHERE a.source_api = 'pmc'
    AND a.pdf_url IS NOT NULL 
    AND a.pdf_url != ''
  GROUP BY a.doi
`).all()

// Filter to those without matching local file
var missingDownloads = []
pmcWithoutFile.forEach(function(a) {
  if (!a.doi) return
  var safeDoi = a.doi.replace(/^https?:\/\/doi\.org\//, '')
  var matches = Array.from(existing).filter(function(f) { return f.startsWith(safeDoi) })
  if (matches.length === 0) missingDownloads.push(a)
})

console.log('\nPMC articles with pdf_url BUT no local file:', missingDownloads.length)

// Check first 10 via OA API
async function checkOA() {
  var batch = missingDownloads.slice(0, 10)
  console.log('\nChecking first 10 via OA API:')
  
  for (var a of batch) {
    var pmcid = a.pmcid
    if (!pmcid || !pmcid.startsWith('PMC')) continue
    
    try {
      var resp = await fetch('https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=' + pmcid, { signal: AbortSignal.timeout(10000) })
      var xml = await resp.text()
      if (xml.includes('is not Open Access')) {
        console.log('  ' + pmcid + ': NOT Open Access (Europe PMC link: ' + a.pdf_url.slice(0, 50) + '...)')
      } else if (xml.includes('<record id')) {
        var match = xml.match(/href="(ftp:[^"]*\.pdf)"/)
        var ftpUrl = match ? match[1] : 'no ftp link'
        console.log('  ' + pmcid + ': OA ACCESSIBLE via ' + ftpUrl)
      }
    } catch (e) {
      console.log('  ' + pmcid + ': ERROR ' + e.message)
    }
  }

  // Total articles across ALL sources without local PDF
  var allMissingDois = []
  var allArticles = db.prepare("SELECT doi, source_api, pdf_url FROM articles WHERE pdf_url IS NOT NULL AND pdf_url != '' GROUP BY doi").all()
  allArticles.forEach(function(a) {
    if (!a.doi) return
    var safeDoi = a.doi.replace(/^https?:\/\/doi\.org\//, '')
    var matches = Array.from(existing).filter(function(f) { return f.startsWith(safeDoi) })
    if (matches.length === 0) allMissingDois.push(a)
  })
  
  console.log('\nTotal distinct articles with pdf_url but no local file:', allMissingDois.length)
  
  // by source_api
  var byApi = {}
  allMissingDois.forEach(function(a) {
    byApi[a.source_api] = (byApi[a.source_api] || 0) + 1
  })
  console.log('Breakdown by source_api:')
  Object.keys(byApi).sort().forEach(function(k) { console.log('  ' + k + ': ' + byApi[k]) })
}
checkOA()
