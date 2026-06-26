async function main() {
  // Try the old programmatic OA API from the example links
  var id = 'PMC13193325'
  var url = 'https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=' + id
  console.log('Fetching:', url)
  var resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
  var text = await resp.text()
  console.log('Status:', resp.status, 'Content-Type:', resp.headers.get('content-type'), 'Length:', text.length)
  console.log('\nResponse:')
  console.log(text.slice(0, 2000))

  // Also try a known OA article to verify the API works
  console.log('\n\n=== Testing with known OA article PMC5334499 ===')
  var resp2 = await fetch('https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC5334499', { signal: AbortSignal.timeout(15000) })
  console.log(await resp2.text())
}
main()
