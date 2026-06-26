async function main() {
  // Check the POW mechanism - try to get the article cookie
  var cookieJar = {}

  // 1. Visit article page first to get session cookies
  var articleUrl = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13193325/'
  var resp = await fetch(articleUrl, {
    signal: AbortSignal.timeout(30000),
    redirect: 'follow'
  })
  var cookies = resp.headers.get('set-cookie') || ''
  console.log('Article page cookies:', cookies.slice(0, 200))
  // note: fetch in Node.js doesn't always expose Set-Cookie well

  // 2. Try downloading the POW script to see what algorithm it uses
  var powScript = 'https://cdn.ncbi.nlm.nih.gov/pmc/pd-medc-pmc-cloudpmc-viewer/production/674d4f95/var/data/static/assets/pow-o51sQKbL.js'
  var scriptResp = await fetch(powScript, { signal: AbortSignal.timeout(15000) })
  var script = await scriptResp.text()
  console.log('\nPOW script length:', script.length)

  // look for the key functions
  var lines = script.split('\n').filter(function(l) {
    return l.includes('init') || l.includes('challenge') || l.includes('hash') || l.includes('difficulty') || l.includes('solve') || l.includes('cookie')
  })
  lines.forEach(function(l) { console.log('  >', l.trim().slice(0, 150)) })

  // Try the PDF URL with a real browser User-Agent
  console.log('\n--- Trying with browser UA ---')
  var pdfUrl = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13193325/pdf/'
  var resp2 = await fetch(pdfUrl, {
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  var buf = Buffer.from(await resp2.arrayBuffer())
  var ct = resp2.headers.get('content-type') || ''
  console.log('Status:', resp2.status, 'Type:', ct, 'Len:', buf.length)
  if (buf.length < 2000) console.log('Body:', buf.slice(0, 300).toString())
}
main().catch(function(e) { console.log('FATAL:', e.message) })
