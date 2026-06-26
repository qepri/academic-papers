async function t() {
  // Try Europe PMC OA API
  var url = 'https://europepmc.org/api/oa/PMC13193325'
  try {
    var resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
    var ct = resp.headers.get('content-type') || ''
    var txt = await resp.text()
    console.log('status:', resp.status, 'type:', ct.slice(0, 50))
    if (resp.ok && ct.includes('xml')) {
      // look for PDF links
      var lines = txt.split('\n').filter(l => l.includes('pdf') || l.includes('PDF') || l.includes('Pdf'))
      lines.forEach(l => console.log(l.trim().slice(0, 200)))
    }
  } catch(e) {
    console.log('ERR:', e.message)
  }
}
t()
