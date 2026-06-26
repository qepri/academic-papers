async function main() {
  // Check what's on the FTP/HTTPS server
  var urls = [
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/A/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/AA/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/AAA/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_archive/',
    // Try the NCBI cloud API
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-list.csv',
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/',
    // Try different file list
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_file_list.txt',
    // Try the rsync/cloud manifest
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/manifest.txt',
  ]

  for (var url of urls) {
    try {
      var resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
      var ct = resp.headers.get('content-type') || ''
      var cl = resp.headers.get('content-length') || '?'
      console.log(resp.status, ct.slice(0, 40), cl.toString().slice(0, 20), '|', url.slice(0, 70))
      if (resp.ok && url.endsWith('/')) {
        var txt = await resp.text()
        console.log('  lines:', txt.split('\n').length)
        var lines = txt.split('\n').filter(function(l) { return l.includes('oa_') || l.includes('csv') || l.includes('txt') || l.includes('PDF') })
        lines.slice(0, 5).forEach(function(l) { console.log('  >', l.trim().slice(0, 100)) })
      }
    } catch (e) {
      console.log('ERR:', e.message.slice(0, 50), '|', url.slice(0, 70))
    }
  }
}
main()
