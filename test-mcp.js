/* Smoke test for MCP endpoint. Run: MCP_TOKEN=test-token-1234567890 node test-mcp.js */
const assert = require('assert')
const http = require('http')

process.env.MCP_TOKEN = process.env.MCP_TOKEN || 'test-token-1234567890'
process.env.PORT = process.env.PORT || '3457'

const app = require('./src/index.js')
// The require already calls app.listen — wait briefly then probe.

const BASE = `http://127.0.0.1:${process.env.PORT}/mcp`

function req (method, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE, { method, headers }, (res) => {
      let buf = ''
      res.on('data', (c) => { buf += c })
      res.on('end', () => resolve({ status: res.statusCode, body: buf, headers: res.headers }))
    })
    r.on('error', reject)
    if (body) r.write(body)
    r.end()
  })
}

function parseSse (body) {
  // Streamable HTTP responses come back as SSE; collect data: lines and JSON-parse.
  const lines = body.split('\n').filter(l => l.startsWith('data: '))
  if (!lines.length) return JSON.parse(body)
  return JSON.parse(lines.map(l => l.slice(6)).join(''))
}

async function run () {
  await new Promise(r => setTimeout(r, 200)) // let server boot

  // 1. No auth → 401
  const noAuth = await req('POST', { 'Content-Type': 'application/json' }, '{}')
  assert.strictEqual(noAuth.status, 401, 'expected 401 without bearer')
  console.log('OK  401 without auth')

  // 2. Wrong token → 401
  const badAuth = await req('POST', { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' }, '{}')
  assert.strictEqual(badAuth.status, 401, 'expected 401 with bad bearer')
  console.log('OK  401 with bad token')

  // 3. GET → 405
  const getResp = await req('GET', { Authorization: `Bearer ${process.env.MCP_TOKEN}` })
  assert.strictEqual(getResp.status, 405, 'expected 405 on GET')
  console.log('OK  405 on GET (stateless)')

  // 4. initialize → 200
  const initBody = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } }
  })
  const init = await req('POST', {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${process.env.MCP_TOKEN}`
  }, initBody)
  assert.strictEqual(init.status, 200, `initialize expected 200, got ${init.status}: ${init.body.slice(0, 200)}`)
  const initParsed = parseSse(init.body)
  assert.ok(initParsed.result && initParsed.result.serverInfo, 'initialize result missing serverInfo')
  assert.strictEqual(initParsed.result.serverInfo.name, 'academic-repos')
  console.log('OK  initialize →', initParsed.result.serverInfo.name, initParsed.result.serverInfo.version)

  // 5. tools/list → contains our three tools
  const listBody = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  const list = await req('POST', {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${process.env.MCP_TOKEN}`
  }, listBody)
  assert.strictEqual(list.status, 200, `tools/list expected 200, got ${list.status}`)
  const listParsed = parseSse(list.body)
  const names = (listParsed.result.tools || []).map(t => t.name).sort()
  assert.deepStrictEqual(names, ['get_article', 'list_articles', 'search_articles'])
  console.log('OK  tools/list →', names.join(', '))

  // 6. tools/call list_articles (read-only, no network)
  const callBody = JSON.stringify({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'list_articles', arguments: { limit: 1 } }
  })
  const call = await req('POST', {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${process.env.MCP_TOKEN}`
  }, callBody)
  assert.strictEqual(call.status, 200, `tools/call expected 200, got ${call.status}: ${call.body.slice(0, 300)}`)
  const callParsed = parseSse(call.body)
  assert.ok(callParsed.result && callParsed.result.content, 'tools/call missing result.content')
  const payload = JSON.parse(callParsed.result.content[0].text)
  assert.ok('results' in payload && 'total' in payload, 'list_articles payload shape unexpected')
  console.log('OK  tools/call list_articles →', payload.total, 'rows in DB')

  console.log('\nAll MCP smoke checks passed.')
  process.exit(0)
}

run().catch((err) => {
  console.error('FAIL', err)
  process.exit(1)
})
