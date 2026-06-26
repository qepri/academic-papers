const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const fs = require('fs')
const path = require('path')

async function main() {
  var pmcid = 'PMC13193325'
  var pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

  var pdfBuffer = null

  var browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    var page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    // Intercept PDF responses
    page.on('response', async (resp) => {
      var ct = resp.headers()['content-type'] || ''
      if (ct.includes('application/pdf') || ct.includes('application/octet-stream')) {
        try { pdfBuffer = await resp.buffer(); console.log('PDF captured:', pdfBuffer.length, 'bytes, type:', ct) }
        catch (e) { console.log('PDF buffer error:', e.message) }
      }
    })

    var url = 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + pmcid + '/'
    console.log('Navigating to:', url)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    console.log('Title:', await page.title())

    var content = await page.content()
    console.log('Page has reCAPTCHA:', content.includes('recaptcha') || content.includes('Checking your browser'))

    if (!content.includes('recaptcha')) {
      // Try to get citation_pdf_url
      var citationPdf = await page.$eval('meta[name="citation_pdf_url"]', function(m) { return m.content }).catch(function() { return null })
      console.log('citation_pdf_url:', citationPdf)

      // Navigate directly to the PDF
      if (citationPdf) {
        console.log('Navigating to PDF URL...')
        await page.goto(citationPdf, { waitUntil: 'networkidle0', timeout: 60000 })
        await new Promise(r => setTimeout(r, 5000))
      }
    }

  } finally {
    await browser.close()
  }

  if (pdfBuffer && pdfBuffer.length >= 1000 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
    var fp = path.join(pdfDir, pmcid + '.pdf')
    fs.writeFileSync(fp, pdfBuffer)
    console.log('SUCCESS - Saved PDF:', pmcid + '.pdf')
  } else {
    console.log('FAIL - No PDF captured')
  }
}

main().catch(console.error)
