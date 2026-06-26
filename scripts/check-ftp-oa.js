const { init } = require('../src/db')
const { safeName } = require('../src/utils')
const fs = require('fs')
const path = require('path')
const db = init()

// Check: does ncbi have a direct URL pattern for OA PDFs?
// Try the PMC OA service API with different parameter formats
async function checkOA(id) {
  // Format 1: oa-id.json
  var urls = [
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-id.json?id=' + id,
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa.json?id=' + id,
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-list.csv?id=' + id,
    // Try the FTP path pattern
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/' + id.slice(0, 7).toLowerCase() + '/' + id + '.pdf',
    // Try with lower case pmcid (no PMC prefix)
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/' + id.replace('PMC', '').slice(0, 3) + '/' + id + '.pdf',
    // Try commercial PDF pattern
    'https://www.ncbi.nlm.nih.gov/pmc/articles/' + id + '/pdf/main.pdf',
    // Try the ncbi OA file list
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_file_list.csv',
    // Try PMC ID in different directory depths
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/' + id.slice(0, 3) + '/' + id + '.pdf',
    // Try different format
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/' + id.slice(0, 2) + '/' + id.slice(2, 4) + '/' + id + '.pdf',
  ]

  for (var url of urls) {
    try {
      var resp = await fetch(url, { signal: AbortSignal.timeout(10000), method: url.endsWith('.csv') ? 'HEAD' : 'GET' })
      if (resp.status === 200) {
        var ct = resp.headers.get('content-type') || ''
        console.log('  HIT:', resp.status, ct.slice(0, 30), '|', url.slice(0, 90))
        if (ct.includes('pdf')) {
          var buf = Buffer.from(await resp.arrayBuffer())
          console.log('  PDF:', buf.length, 'bytes,', buf.slice(0, 4).toString())
        }
      }
    } catch {}
  }
}

async function main() {
  console.log('Testing OA access for PMC13193325...')
  await checkOA('PMC13193325')

  // Also check a few more to see if there's a pattern
  console.log('\n---')
  // Check the file list size (just HEAD)
  try {
    var resp = await fetch('https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_file_list.csv', { method: 'HEAD', signal: AbortSignal.timeout(10000) })
    console.log('OA file list CSV:', resp.status, resp.headers.get('content-length'), 'bytes')
  } catch(e) { console.log('OA file list CSV error:', e.message) }
}
main()
