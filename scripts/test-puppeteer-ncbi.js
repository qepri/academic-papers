const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')

async function main() {
  var pmcid = 'PMC13193325'
  var pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

  var browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,  // visible browser to avoid bot detection
    args: ['--no-sandbox']
  })

  try {
    var page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    // Intercept PDF responses
    var pdfBuffer = null
    page.on('response', async (resp) => {
      var ct = resp.headers()['content-type'] || ''
      if (ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
        try { pdfBuffer = await resp.buffer(); console.log('  PDF captured:', pdfBuffer.length, 'bytes') }
        catch (e) { console.log('  PDF buffer error:', e.message) }
      }
    })

    // Try article page first (not the /pdf/ endpoint)
    var articleUrl = 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + pmcid + '/'
    console.log('Navigating to article page...')
    await page.goto(articleUrl, { waitUntil: 'networkidle0', timeout: 60000 })
    console.log('Title:', await page.title())

    // Look for download PDF link/button
    var links = await page.$$eval('a[href*="pdf" i]', function(els) {
      return els.map(function(el) { return { href: el.href, text: el.textContent.trim().slice(0, 50) } })
    })
    console.log('PDF links on page:')
    links.forEach(function(l) { console.log('  -', l.text.slice(0, 40) + ' -> ' + l.href) })

    // Click the first download PDF link
    for (var link of links) {
      if (link.href.includes('pdf') && !link.href.includes('/pdf/')) {
        console.log('Clicking:', link.href)
        await page.goto(link.href, { waitUntil: 'networkidle0', timeout: 60000 })
        await new Promise(r => setTimeout(r, 3000))
        break
      }
    }

    // Also try the citation_pdf_url meta tag
    var citationPdf = await page.$eval('meta[name="citation_pdf_url"]', function(m) { return m.content }).catch(function() { return null })
    if (citationPdf) console.log('citation_pdf_url:', citationPdf)

    // Check for the "Download PDF" button in the tools menu
    var downloadBtn = await page.$eval('a[data-tool-name="download_pdf"]', function(el) { return el.href }).catch(function() { return null })
    if (downloadBtn) console.log('Download PDF button:', downloadBtn)

  } finally {
    await browser.close()
  }

  if (pdfBuffer && pdfBuffer.length >= 1000 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
    var fp = path.join(pdfDir, pmcid + '.pdf')
    fs.writeFileSync(fp, pdfBuffer)
    console.log('Saved PDF:', pmcid + '.pdf')
  } else {
    console.log('No PDF captured')
  }
}

main().catch(console.error)
