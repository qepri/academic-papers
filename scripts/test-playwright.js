const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function main() {
  var pmcid = 'PMC13193325'
  var pdfDir = path.join(__dirname, '..', 'data', 'pdfs')
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })

  var browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  })

  try {
    var context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    })

    var page = await context.newPage()

    // Listen for PDF responses
    var pdfBuffer = null
    page.on('response', async (resp) => {
      var ct = resp.headers()['content-type'] || ''
      if (ct.includes('application/pdf')) {
        try { pdfBuffer = await resp.body(); console.log('PDF captured:', pdfBuffer.length, 'bytes') }
        catch (e) {}
      }
    })

    var url = 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + pmcid + '/'
    console.log('Navigating to:', url)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    console.log('Title:', await page.title())

    var content = await page.content()
    var blocked = content.includes('recaptcha') || content.includes('Checking your browser')
    console.log('Blocked by Cloudflare:', blocked)

    if (!blocked) {
      // Try to get the direct PDF URL
      var citationPdf = await page.$eval('meta[name="citation_pdf_url"]', function(el) { return el.content }).catch(function() { return null })
      console.log('citation_pdf_url:', citationPdf)

      if (citationPdf) {
        console.log('Navigating to PDF URL...')
        await page.goto(citationPdf, { waitUntil: 'networkidle0', timeout: 60000 })
        await page.waitForTimeout(5000)
      }
    }

    // Final check
    if (pdfBuffer && pdfBuffer.length >= 1000 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
      var fp = path.join(pdfDir, pmcid + '.pdf')
      fs.writeFileSync(fp, pdfBuffer)
      console.log('SUCCESS - Saved PDF:', pmcid + '.pdf')
    } else {
      console.log('FAIL - No PDF captured')
    }

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
