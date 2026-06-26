async function main() {
  // The OA web service returns JSON with download links
  // Try different API URL patterns from the OA service page
  var id = 'PMC13193325'
  
  var urls = [
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-id.json?id=' + id,
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/?id=' + id + '&format=json',
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa.json?filetype=pdf&id=' + id,
    // Try the FTP directly with the pattern from the example
    // The example had: 8e/71/WJR-9-27.PMC5334499.pdf
    // where 8e/71 is the directory, WJR-9-27 is the journal abbreviation
    // Let me check what the actual FTP structure is
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/',
    // Try the OA package directory
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/',
    // Also check if there's a simpler API
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-list.csv?id=' + id,
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-list.xml?id=' + id,
  ]

  for (var url of urls) {
    try {
      var resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
      var ct = resp.headers.get('content-type') || ''
      if (resp.ok) {
        var txt = await resp.text()
        console.log('HIT:', resp.status, url.slice(0, 70))
        // Check if response contains the id
        if (txt.includes(id)) {
          console.log('  Found ID in response!', txt.slice(0, 300))
        } else {
          console.log('  Response sample:', txt.slice(0, 200))
        }
      } else {
        console.log(resp.status, url.slice(0, 70))
      }
    } catch (e) {
      console.log('ERR:', url.slice(0, 70))
    }
  }

  // Try ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/ to see actual directory listing
  // The 404 earlier suggests oa_pdf is not at the root, maybe inside oa_package?
  var dirs = [
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/',
    'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/',
  ]
  for (var dir of dirs) {
    try {
      var resp = await fetch(dir, { signal: AbortSignal.timeout(10000) })
      if (resp.ok) {
        var html = await resp.text()
        var links = html.match(/href="[^"]+"/g) || []
        console.log('\n' + dir)
        links.slice(1, 10).forEach(function(l) { console.log('  ', l) })
      }
    } catch {}
  }
}
main()
