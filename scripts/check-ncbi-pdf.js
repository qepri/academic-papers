async function t() {
  const resp = await fetch('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13193325/', { signal: AbortSignal.timeout(15000) })
  const html = await resp.text()

  // find all hrefs containing 'pdf'
  const re = /href="([^"]*pdf[^"]*)"/gi
  let m
  while ((m = re.exec(html)) !== null) {
    console.log('PDF href:', m[1])
  }

  // find download links
  const re2 = /href="([^"]*download[^"]*)"/gi
  while ((m = re2.exec(html)) !== null) {
    console.log('Download href:', m[1])
  }

  // check for the pdfUrl or data-pdf
  const re3 = /data-pdf-url="([^"]*)"/gi
  while ((m = re3.exec(html)) !== null) {
    console.log('data-pdf-url:', m[1])
  }

  console.log('Total HTML length:', html.length)
}
t()
