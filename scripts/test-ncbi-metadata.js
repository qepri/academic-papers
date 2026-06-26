async function main() {
  // Check article metadata for PDF links
  var url = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13193325/'
  try {
    var resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
    var html = await resp.text()

    // Find citation_pdf_url meta tag
    var m = html.match(/citation_pdf_url[^>]+content="([^"]+)"/)
    if (m) console.log('citation_pdf_url:', m[1])

    // Find full-text PDF link
    m = html.match(/<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>[^<]*full[^<]*text[^<]*<\/a>/i)
    if (m) console.log('Full text PDF link:', m[1])

    // Find download link  
    m = html.match(/<a[^>]+href="([^"]*download[^"]*)"[^>]*>/i)
    if (m) console.log('Download link:', m[1])

    // Check for PMC OA service link
    m = html.match(/oa[_-]service[^"']*["']?[^"']*pdf[^"']*/i)
    if (m) console.log('OA service found:', m[0])

    // Try different patterns
    var re = /href="([^"]*\/pmc\/articles\/[^"]*\.pdf[^"]*)"/gi
    while ((m = re.exec(html)) !== null) {
      console.log('PMC PDF href:', m[1])
    }

    // Check for JS variable with pdfUrl
    m = html.match(/pdfUrl['"]?\s*[:=]\s*['"]([^'"]+)['"]/)
    if (m) console.log('pdfUrl JS:', m[1])

    // The "Download PDF" button
    var re2 = /href="([^"]*)"[^>]*>.*?download.*?pdf.*?<\/a>/gi
    while ((m = re2.exec(html)) !== null) {
      console.log('Download PDF button:', m[1])
    }

  } catch (e) {
    console.log('ERR:', e.message)
  }
}
main()
