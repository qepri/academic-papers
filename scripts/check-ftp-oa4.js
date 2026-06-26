async function main() {
  // Get the OA service page for our ID and parse the download links
  var id = 'PMC13193325'
  var resp = await fetch('https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/?id=' + id, { signal: AbortSignal.timeout(15000) })
  var html = await resp.text()
  console.log('Page length:', html.length)
  
  // Extract all links
  var re = /href="([^"]+)"/gi
  var match
  var links = []
  while ((match = re.exec(html)) !== null) {
    links.push(match[1])
  }
  console.log('Links found:', links.length)
  links.forEach(function(l) {
    if (l.includes('pdf') || l.includes('tar') || l.includes('gz') || l.includes('PMC')) {
      console.log('  ', l)
    }
  })

  // Check for deprecated notice
  if (html.includes('deprecated') || html.includes('Deprecated')) {
    console.log('\nNOTE: This service shows deprecated notice!')
    var lines = html.split('\n').filter(function(l) { return l.includes('deprecated') || l.includes('Deprecated') || l.includes('instead') || l.includes('cloud') })
    lines.forEach(function(l) { console.log('  >', l.trim().slice(0, 150)) })
  }

  // Try the PMC OA cloud service 
  console.log('\n--- Trying NCBI cloud API ---')
  var cloudUrls = [
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-id.json?id=' + id,
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-id?id=' + id,
    // Try the newer API format
    'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/?id=' + id + '&format=json&filetype=pdf',
  ]
  
  for (var url of cloudUrls) {
    try {
      var resp2 = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (resp2.ok) {
        var text = await resp2.text()
        console.log('OK:', url.slice(0, 65), 'type:', resp2.headers.get('content-type'), 'len:', text.length)
        if (text.includes(id)) console.log('  Contains ID:', text.slice(0, 200))
      } else {
        console.log(resp2.status, url.slice(0, 65))
      }
    } catch (e) {}
  }
}
main()
