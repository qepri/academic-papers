async function main() {
  // Get full XML for an OA article
  var resp = await fetch('https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC13179547', { signal: AbortSignal.timeout(10000) })
  var xml = await resp.text()
  console.log(xml)
}
main()
