async function main() {
  // Try Europe PMC API for article metadata with PDF links
  var url = 'https://www.ebi.ac.uk/europepmc/webservices/rest/article/PMC13193325?format=json'
  try {
    var resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
    var txt = await resp.text()
    console.log('Europe PMC API:', resp.status)
    if (resp.ok) {
      try {
        var j = JSON.parse(txt)
        var result = j.result?.resultList?.result?.[0]
        if (result) {
          console.log('title:', result.title)
          console.log('pdfUrl:', result.pdfUrl)
          console.log('fullTextUrl:', result.fullTextUrl)
          console.log('hasPDF:', result.hasPDF)
          console.log('source:', result.source)
          // Also check other links
          var keys = Object.keys(result).filter(function(k) { return k.includes('pdf') || k.includes('PDF') || k.includes('text') || k.includes('Text') || k.includes('download') || k.includes('link') })
          keys.forEach(function(k) { console.log(k + ':', result[k]) })
        } else {
          console.log('No result found in response')
          console.log(txt.slice(0, 500))
        }
      } catch (e) {
        console.log('JSON parse error:', e.message)
        console.log(txt.slice(0, 500))
      }
    } else {
      console.log(txt.slice(0, 500))
    }
  } catch (e) {
    console.log('ERR:', e.message)
  }

  // Also try the full text XML endpoint
  console.log('\n--- Full text XML ---')
  var url2 = 'https://www.ebi.ac.uk/europepmc/webservices/rest/article/PMC13193325/fullTextXML'
  try {
    var resp2 = await fetch(url2, { signal: AbortSignal.timeout(30000) })
    console.log('Full text XML:', resp2.status, resp2.headers.get('content-type'))
    // just check headers, don't download full XML
  } catch (e) {
    console.log('ERR:', e.message)
  }
}
main()
