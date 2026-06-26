const { init } = require('../src/db')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const { safeName } = require('../src/utils')
const db = init()
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs')

// Map FTP URL to HTTPS deprecated URL
function ftpToHttps(ftpUrl) {
  return ftpUrl
    .replace('ftp://', 'https://')
    .replace('/pub/pmc/oa_pdf/', '/pub/pmc/deprecated/oa_pdf/')
    .replace('/pub/pmc/oa_package/', '/pub/pmc/deprecated/oa_package/')
}

// Extract PDF from tar.gz bytes (simple approach: find %PDF header, save everything)
function extractPdfFromTarGz(buffer, pmcid) {
  try {
    // Decompress gzip
    var decompressed = zlib.gunzipSync(buffer)
    // Find %PDF header
    var pdfStart = decompressed.indexOf(Buffer.from('%PDF'))
    if (pdfStart === -1) return null
    
    // Find %%EOF (note: it could be at various positions)
    var pdfEnd = decompressed.lastIndexOf(Buffer.from('%%EOF'))
    if (pdfEnd === -1) return null
    pdfEnd += 5 // include %%EOF
    
    return decompressed.slice(pdfStart, pdfEnd)
  } catch (e) {
    console.log('    TGZ extract error:', e.message.slice(0, 50))
    return null
  }
}

async function downloadPdf(url, article) {
  var httpsUrl = ftpToHttps(url)
  try {
    var resp = await fetch(httpsUrl, { signal: AbortSignal.timeout(60000) })
    if (!resp.ok) {
      console.log('    HTTP ' + resp.status + ' for ' + (article ? article.pmcid : ''))
      return null
    }
    var buffer = Buffer.from(await resp.arrayBuffer())
    var filename = safeName({doi: article.doi, year: article.year, title: article.title})
    var filepath = path.join(pdfDir, filename)
    
    if (url.includes('.pdf')) {
      // Direct PDF
      if (buffer.slice(0, 4).toString() !== '%PDF') {
        console.log('    Not a valid PDF (no %PDF header) for ' + (article.pmcid || ''))
        return null
      }
      fs.writeFileSync(filepath, buffer)
      console.log('    Downloaded PDF (' + buffer.length + ' bytes): ' + filename)
      return filename
    } else {
      // TGZ - extract PDF
      var pdfData = extractPdfFromTarGz(buffer, article.pmcid || '')
      if (!pdfData) {
        console.log('    No PDF found in TGZ for ' + (article.pmcid || ''))
        return null
      }
      if (pdfData.slice(0, 4).toString() !== '%PDF') {
        console.log('    Extracted data is not valid PDF for ' + (article.pmcid || ''))
        return null
      }
      fs.writeFileSync(filepath, pdfData)
      console.log('    Extracted PDF (' + pdfData.length + ' bytes from TGZ ' + buffer.length + '): ' + filename)
      return filename
    }
  } catch (e) {
    console.log('    Download error:', e.message.slice(0, 50))
    return null
  }
}

async function main() {
  // Get existing PDF filenames to skip already-downloaded
  var existing = new Set()
  fs.readdirSync(pdfDir).forEach(function(f) {
    if (f.endsWith('.pdf')) existing.add(f)
  })
  console.log('Existing PDFs:', existing.size)
  
  // Get all PMC articles from DB without local PDFs
  var articles = db.prepare(`
    SELECT a.doi, a.pmcid, a.title, a.year
    FROM articles a
    WHERE a.source_api = 'pmc'
      AND a.pmcid IS NOT NULL AND a.pmcid != ''
    GROUP BY a.pmcid
    ORDER BY a.year DESC
  `).all()
  
  // Filter to only those without a local PDF file
  var missing = articles.filter(function(a) {
    if (!a.doi) return true
    var safeDoi = a.doi.replace(/^https?:\/\/doi\.org\//, '').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 80)
    return !Array.from(existing).some(function(f) { return f.startsWith(safeDoi) })
  })
  
  console.log('PMC articles missing local PDF:', missing.length)
  console.log('')
  
  var oaCount = 0
  var nonOaCount = 0
  var skipCount = 0
  var errorCount = 0
  var downloaded = 0
  
  for (var i = 0; i < missing.length; i++) {
    var a = missing[i]
    var pmcid = a.pmcid.startsWith('PMC') ? a.pmcid : 'PMC' + a.pmcid
    var title = (a.title || '').slice(0, 50)
    
    process.stdout.write(i + '/' + missing.length + ' ' + pmcid + ' ' + title + '... ')
    
    try {
      var resp = await fetch('https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=' + pmcid, { signal: AbortSignal.timeout(15000) })
      var xml = await resp.text()
      
      if (xml.includes('is not Open Access')) {
        console.log('NOT OA')
        nonOaCount++
        continue
      }
      
      // Count links
      var tgzMatch = xml.match(/<link format="tgz"[^>]*href="([^"]+)"/)
      var pdfMatch = xml.match(/<link format="pdf"[^>]*href="([^"]+)"/)
      
      if (pdfMatch) {
        oaCount++
        console.log('OA-pdf ' + (a.year || '?') + ' ' + (a.doi || '').slice(0, 40))
        var result = await downloadPdf(pdfMatch[1], a)
        if (result) downloaded++
      } else if (tgzMatch) {
        oaCount++
        console.log('OA-tgz ' + (a.year || '?') + ' ' + (a.doi || '').slice(0, 40))
        var result = await downloadPdf(tgzMatch[1], a)
        if (result) downloaded++
      } else {
        console.log('OA but no links found')
        skipCount++
      }
    } catch (e) {
      console.log('ERROR: ' + e.message.slice(0, 60))
      errorCount++
    }
  }
  
  console.log('\n=== Done ===')
  console.log('Total checked:', missing.length)
  console.log('OA accessible:', oaCount)
  console.log('Non-OA:', nonOaCount)
  console.log('Downloaded:', downloaded)
  console.log('Errors:', errorCount)
  console.log('Total PDFs now:', fs.readdirSync(pdfDir).filter(function(f) { return f.endsWith('.pdf') }).length)
}

main()
