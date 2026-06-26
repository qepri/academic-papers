async function main() {
  var pmcids = ['PMC13193325', 'PMC10000001', 'PMC13191834']
  for (var id of pmcids) {
    var url = 'https://europepmc.org/articles/' + id + '?pdf=render'
    try {
      var start = Date.now()
      var resp = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'follow' })
      var elapsed = Date.now() - start
      var buf = Buffer.from(await resp.arrayBuffer())
      var ct = resp.headers.get('content-type') || ''
      console.log(id, 'status:', resp.status, 'type:', ct.slice(0, 30), 'len:', buf.length, 'time:', elapsed + 'ms', 'pdf:', buf.slice(0, 4).toString())
    } catch (e) {
      console.log(id, 'ERR:', e.message)
    }
  }
}
main()
