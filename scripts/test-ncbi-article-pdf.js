async function main() {
  // Test: does the article page have a direct PDF download link?
  var url = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13193325/'
  try {
    var resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
    var html = await resp.text()
    console.log('Article page fetched:', html.length, 'bytes')

    // Find all links containing 'pdf' (case-insensitive)
    var re = /href="([^"]*pdf[^"]*)"/gi
    var match
    var count = 0
    while ((match = re.exec(html)) !== null && count < 20) {
      console.log('  PDF link:', match[1].slice(0, 120))
      count++
    }

    // Find all links containing 'download'
    var re2 = /href="([^"]*download[^"]*)"/gi
    while ((match = re2.exec(html)) !== null && count < 25) {
      console.log('  DL link:', match[1].slice(0, 120))
      count++
    }
  } catch (e) {
    console.log('ERR:', e.message)
  }
}
main()
