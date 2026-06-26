async function main() {
  // Try the known OA article from earlier
  var tests = [
    // Original FTP URL (HTTPS equivalent)
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/8e/71/WJR-9-27.PMC5334499.pdf',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/8e/71/PMC5334499.tar.gz',
    // With deprecated prefix
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/deprecated/oa_pdf/8e/71/WJR-9-27.PMC5334499.pdf',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/deprecated/oa_package/8e/71/PMC5334499.tar.gz',
  ]
  
  for (var url of tests) {
    try {
      var resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
      var ct = resp.headers.get('content-type') || ''
      var cl = resp.headers.get('content-length') || '?'
      console.log(resp.status, cl, ct.slice(0, 30), '|', url.slice(0, 90))
    } catch (e) {
      console.log('ERR:', url.slice(0, 70), e.message.slice(0, 40))
    }
  }
}
main()
