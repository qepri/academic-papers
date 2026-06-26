async function main() {
  var ids = ['PMC13193325', 'PMC10000001', 'PMC4779791']
  for (var id of ids) {
    // Try the OA service JSON API
    var url = 'https://www.ncbi.nlm.nih.gov/pmc/tools/oa-service/oa-id.json?id=' + id
    try {
      var resp = await fetch(url, { signal: AbortSignal.timeout(20000) })
      var txt = await resp.text()
      console.log(id, 'OA API:', resp.status, txt.slice(0, 300))
    } catch (e) {
      console.log(id, 'ERR:', e.message)
    }
  }
}
main()
