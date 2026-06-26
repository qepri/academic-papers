const fs = require('fs')
const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { z } = require('zod')
const rateLimit = require('express-rate-limit')

const { runSearch } = require('./search.js')
const { listArticles, getArticle, localPdfPath } = require('./articles.js')

const VERSION = require('../package.json').version
const JSONRPC_PARSE_ERROR = -32700
const JSONRPC_METHOD_NOT_FOUND = -32601
const JSONRPC_INTERNAL_ERROR = -32603
const JSONRPC_UNAUTHORIZED = -32001

function jsonRpcError (code, message, id = null) {
  return { jsonrpc: '2.0', error: { code, message }, id }
}

function createServer (db) {
  const server = new McpServer({ name: 'academic-repos', version: VERSION })

  server.registerTool('search_articles', {
    title: 'Search OA providers',
    description: 'Fan-out search across OpenAlex, Unpaywall, PMC, Europe PMC, CORE. Dedupes by DOI, upserts into local DB, returns merged results.',
    inputSchema: {
      query: z.string().min(1).max(500).describe('Search query'),
      limit: z.number().int().min(1).max(100).default(25).describe('Max merged results')
    }
  }, async ({ query, limit }) => {
    const out = await runSearch(db, query.trim(), limit)
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
  })

  server.registerTool('list_articles', {
    title: 'List/filter local articles',
    description: 'Query articles already stored in the local DB.',
    inputSchema: {
      q: z.string().max(500).optional().describe('Substring match on title/abstract'),
      source: z.string().max(200).optional().describe('Comma-separated source_api filter'),
      year_min: z.number().int().min(1800).max(2100).optional(),
      year_max: z.number().int().min(1800).max(2100).optional(),
      has_pdf: z.boolean().optional(),
      sort: z.enum(['year', 'year_asc', 'title', 'source', 'fetched']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0)
    }
  }, async (args) => {
    const out = listArticles(db, args)
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
  })

  server.registerTool('get_article', {
    title: 'Get a single article',
    description: 'Fetch one article by id, DOI, or DOI URL.',
    inputSchema: { id: z.string().min(1).max(500) }
  }, async ({ id }) => {
    const row = getArticle(db, id)
    if (!row) return { content: [{ type: 'text', text: 'not found' }], isError: true }
    return { content: [{ type: 'text', text: JSON.stringify(row, null, 2) }] }
  })

  server.registerResource(
    'article-pdf',
    new ResourceTemplate('article://{id}/pdf', { list: undefined }),
    {
      title: 'Cached PDF for an article',
      description: 'Returns the locally cached PDF for an article by id or DOI. Errors if not cached.',
      mimeType: 'application/pdf'
    },
    async (uri, { id }) => {
      const decoded = decodeURIComponent(id)
      const row = getArticle(db, decoded)
      if (!row) throw new Error('article not found')
      const pdfPath = localPdfPath(row)
      if (!fs.existsSync(pdfPath)) throw new Error('PDF not cached locally')
      const data = fs.readFileSync(pdfPath)
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/pdf',
          blob: data.toString('base64')
        }]
      }
    }
  )

  return server
}

function bearerAuth (expected) {
  return (req, res, next) => {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token || token !== expected) {
      return res.status(401).json(jsonRpcError(JSONRPC_UNAUTHORIZED, 'unauthorized'))
    }
    next()
  }
}

function mountMcp (app, db) {
  const token = process.env.MCP_TOKEN
  if (!token) {
    console.warn('[mcp] MCP_TOKEN env var not set — MCP endpoint disabled')
    return
  }
  if (token.length < 16) {
    console.warn('[mcp] MCP_TOKEN is shorter than 16 chars — set a strong token in production')
  }

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.MCP_RATE_LIMIT) || 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json(jsonRpcError(JSONRPC_INTERNAL_ERROR, 'rate limit exceeded'))
  })

  app.post('/mcp', limiter, bearerAuth(token), async (req, res) => {
    let transport
    let server
    try {
      server = createServer(db)
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => {
        try { transport && transport.close() } catch {}
        try { server && server.close() } catch {}
      })
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      console.error('[mcp]', err)
      try { transport && transport.close() } catch {}
      try { server && server.close() } catch {}
      if (!res.headersSent) {
        res.status(500).json(jsonRpcError(JSONRPC_INTERNAL_ERROR, 'internal error'))
      }
    }
  })

  app.get('/mcp', (req, res) => {
    res.status(405).json(jsonRpcError(JSONRPC_METHOD_NOT_FOUND, 'method not allowed (stateless mode)'))
  })
  app.delete('/mcp', (req, res) => {
    res.status(405).json(jsonRpcError(JSONRPC_METHOD_NOT_FOUND, 'method not allowed (stateless mode)'))
  })

  console.log('[mcp] mounted on POST /mcp (bearer auth, stateless Streamable HTTP)')
}

module.exports = { mountMcp, createServer }
