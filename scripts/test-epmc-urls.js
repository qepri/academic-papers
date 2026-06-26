async function main() {
  var pmcid = 'PMC13193325'
  var urls = [
    'https://europepmc.org/backend/ptpmcrender/pmc/articles/' + pmcid,
    'https://europepmc.org/backend/ptpmcrender?articleId=' + pmcid,
    'https://www.ebi.ac.uk/europepmc/webservices/rest/article/' + pmcid + '/fullTextXML',
    'https://europepmc.org/articles/' + pmcid + '?pdf=render',
    'https://europepmc.org/articles/' + pmcid + '/pdf',
    'https://www.ebi.ac.uk/europepmc/api/search?query=PMCID:' + pmcid
  ]

  for (var url of urls) {
    try {
      var resp = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' })
      var ct = resp.headers.get('content-type') || ''
      var firstBytes = null
      if (ct.includes('pdf')) {
        var buf = Buffer.from(await resp.arrayBuffer())
        firstBytes = buf.slice(0, 4).toString()
      }
      console.log(url.slice(0, 65) + ' | ' + resp.status + ' | ' + ct.slice(0, 25) + (firstBytes ? ' | ' + firstBytes : ''))
    } catch (e) {
      console.log(url.slice(0, 65) + ' | ERR: ' + e.message)
    }
  }
}
main()
