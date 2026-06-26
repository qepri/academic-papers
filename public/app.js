// ─── utils ───────────────────────────────────────────────────────────
var api = {
  search: function (params) { return fetch('/api/articles?' + new URLSearchParams(params)).then(function (r) { return r.json() }) },
  stats: function () { return fetch('/api/stats').then(function (r) { return r.json() }) },
  triggerSearch: function (body) { return fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json() }) },
  pdfUrl: function (id) { return '/api/articles/' + encodeURIComponent(id) + '/pdf' },
  articleDetail: function (id) { return fetch('/api/articles/' + encodeURIComponent(id)).then(function (r) { return r.json() }) }
}

// ─── App State ───────────────────────────────────────────────────────
var state = {
  articles: [],
  total: 0,
  loading: false,
  view: 'list',
  filters: { q: '', source: '', year_min: '', year_max: '', has_pdf: '', sort: '' },
  detail: null,
  detailIndex: -1,
  error: null
}

// ─── App Shell ───────────────────────────────────────────────────────
class AppShell extends HTMLElement {
  connectedCallback () {
    this.innerHTML = '\
<div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">\
  <app-header></app-header>\
  <search-form></search-form>\
  <results-view></results-view>\
  <article-detail></article-detail>\
</div>'
    this.addEventListener('search', function (e) { doSearch(e.detail) })
    this.addEventListener('clear-filters', function () { clearFilters() })
    this.addEventListener('view-change', function (e) { setView(e.detail) })
    this.addEventListener('open-detail', function (e) { openDetail(e.detail) })
    this.addEventListener('close-detail', function () { closeDetail() })
    this.addEventListener('prev-detail', function () { navigateDetail(-1) })
    this.addEventListener('next-detail', function () { navigateDetail(1) })
    this.addEventListener('trigger-api-search', function (e) { triggerApiSearch(e.detail) })
    doSearch(state.filters)
  }
}
customElements.define('app-shell', AppShell)

// ─── App Header ──────────────────────────────────────────────────────
class AppHeader extends HTMLElement {
  connectedCallback () {
    this.renderSkeleton()
    api.stats().then(function (s) {
      if (!s) return
      var hasPdf = s.by_source ? Object.values(s.by_source).reduce(function (a, b) { return a + b }, 0) : 0
      var pdfTotal = s.total_articles || 0
      this.innerHTML = '\
<div class="mb-4 sm:mb-6">\
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">\
    <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Academic Article Repository</h1>\
    <div class="flex flex-wrap gap-2 text-xs sm:text-sm">\
      <span class="inline-flex items-center px-2.5 py-1 border border-black">' + pdfTotal + ' articles</span>\
      <span class="inline-flex items-center px-2.5 py-1 border border-black">' + (s.by_source ? Object.keys(s.by_source).length : 0) + ' sources</span>\
    </div>\
  </div>\
  <div class="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-500">\
    <span>recent:</span>\
    ' + (s.recent_searches || []).slice(0, 5).map(function (q) { return '<span class="inline-block px-2 py-0.5 bg-gray-100">' + esc(q) + '</span>' }).join('') + '\
  </div>\
</div>'
    }.bind(this))
  }
  renderSkeleton () {
    this.innerHTML = '\
<div class="mb-4 sm:mb-6">\
  <div class="skeleton h-7 w-64 mb-2"></div>\
  <div class="skeleton h-4 w-48"></div>\
</div>'
  }
}
customElements.define('app-header', AppHeader)

// ─── Search Form ─────────────────────────────────────────────────────
var searchFormTemplate = '\
<div class="mb-4 sm:mb-6 border border-black p-3 sm:p-4">\
  <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">\
    <input type="text" id="sq" placeholder="Search titles & abstracts..." class="flex-1 border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black">\
    <button id="sbtn" class="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800">Search</button>\
    <button id="apibtn" class="px-4 py-2 border border-black text-sm hover:bg-gray-100">+ New API Search</button>\
    <button id="clrbtn" class="px-4 py-2 border border-black text-sm hover:bg-gray-100">Clear</button>\
  </div>\
  <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 text-xs sm:text-sm">\
    <div>\
      <label class="block text-xs text-gray-500 mb-0.5">Source</label>\
      <select id="fsource" class="w-full border border-black px-2 py-1.5 bg-white text-sm">\
        <option value="">All</option>\
        <option value="openalex">OpenAlex</option>\
        <option value="pmc">PMC</option>\
        <option value="europepmc">Europe PMC</option>\
      </select>\
    </div>\
    <div>\
      <label class="block text-xs text-gray-500 mb-0.5">Year from</label>\
      <input type="number" id="fyearmin" placeholder="2000" class="w-full border border-black px-2 py-1.5 text-sm">\
    </div>\
    <div>\
      <label class="block text-xs text-gray-500 mb-0.5">Year to</label>\
      <input type="number" id="fyearmax" placeholder="2026" class="w-full border border-black px-2 py-1.5 text-sm">\
    </div>\
    <div>\
      <label class="block text-xs text-gray-500 mb-0.5">PDF</label>\
      <select id="fpdf" class="w-full border border-black px-2 py-1.5 bg-white text-sm">\
        <option value="">All</option>\
        <option value="true">Has PDF</option>\
        <option value="false">No PDF</option>\
      </select>\
    </div>\
    <div>\
      <label class="block text-xs text-gray-500 mb-0.5">Sort</label>\
      <select id="fsort" class="w-full border border-black px-2 py-1.5 bg-white text-sm">\
        <option value="">Newest</option>\
        <option value="year">Year (desc)</option>\
        <option value="year_asc">Year (asc)</option>\
        <option value="title">Title A-Z</option>\
      </select>\
    </div>\
  </div>\
</div>'

class SearchForm extends HTMLElement {
  connectedCallback () {
    this.innerHTML = searchFormTemplate
    this.qs('#sbtn').addEventListener('click', function () { this.dispatch() }.bind(this))
    this.qs('#sq').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.dispatch() }.bind(this))
    this.qs('#clrbtn').addEventListener('click', function () { this.clear() }.bind(this))
    this.qs('#apibtn').addEventListener('click', function () {
      var q = this.qs('#sq').value.trim()
      if (!q) return
      this.dispatchEvent(new CustomEvent('trigger-api-search', { bubbles: true, detail: { query: q } }))
    }.bind(this))
  }
  qs (s) { return this.querySelector(s) }
  dispatch () {
    this.dispatchEvent(new CustomEvent('search', { bubbles: true, detail: {
      q: this.qs('#sq').value.trim(),
      source: this.qs('#fsource').value,
      year_min: this.qs('#fyearmin').value,
      year_max: this.qs('#fyearmax').value,
      has_pdf: this.qs('#fpdf').value,
      sort: this.qs('#fsort').value
    }}))
  }
  clear () {
    this.qs('#sq').value = ''
    this.qs('#fsource').value = ''
    this.qs('#fyearmin').value = ''
    this.qs('#fyearmax').value = ''
    this.qs('#fpdf').value = ''
    this.qs('#fsort').value = ''
    this.dispatchEvent(new CustomEvent('clear-filters', { bubbles: true }))
  }
  setFilters (f) {
    this.qs('#sq').value = f.q || ''
    this.qs('#fsource').value = f.source || ''
    this.qs('#fyearmin').value = f.year_min || ''
    this.qs('#fyearmax').value = f.year_max || ''
    this.qs('#fpdf').value = f.has_pdf || ''
    this.qs('#fsort').value = f.sort || ''
  }
}
customElements.define('search-form', SearchForm)

// ─── Results View (container + view switcher) ────────────────────────
class ResultsView extends HTMLElement {
  connectedCallback () {
    this.render()
  }
  render () {
    this.innerHTML = '\
<div>\
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">\
    <div class="text-sm text-gray-500"><span id="rcount">0</span> results</div>\
    <div class="flex gap-0.5 border border-black">\
      <button data-v="list" class="view-btn active px-3 py-1 text-sm border-r border-black last:border-r-0 hover:bg-gray-100">List</button>\
      <button data-v="table" class="view-btn px-3 py-1 text-sm border-r border-black last:border-r-0 hover:bg-gray-100">Table</button>\
      <button data-v="grid" class="view-btn px-3 py-1 text-sm border-r border-black last:border-r-0 hover:bg-gray-100">Grid</button>\
    </div>\
  </div>\
  <div id="rcontainer" class="min-h-[200px]">\
    <div class="text-center py-12 text-gray-400 text-sm">Enter a search to find articles</div>\
  </div>\
  <div id="pload" class="hidden text-center py-8"><div class="skeleton h-4 w-32 mx-auto mb-2"></div><div class="skeleton h-4 w-48 mx-auto"></div></div>\
</div>'

    this.querySelectorAll('[data-v]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        this.querySelectorAll('[data-v]').forEach(function (b) { b.classList.remove('active') })
        btn.classList.add('active')
        this.dispatchEvent(new CustomEvent('view-change', { bubbles: true, detail: btn.dataset.v }))
      }.bind(this))
    }.bind(this))
  }
  setLoading (v) {
    this.qs('#pload').classList.toggle('hidden', !v)
    if (v) this.qs('#rcontainer').innerHTML = ''
  }
  setEmpty () {
    this.qs('#rcontainer').innerHTML = '<div class="text-center py-12 text-gray-400 text-sm">No articles match your filters</div>'
  }
  setError (msg) {
    this.qs('#rcontainer').innerHTML = '<div class="text-center py-12 text-red-500 text-sm">' + esc(msg) + '</div>'
  }
  renderArticles (articles, total, view) {
    this.qs('#rcount').textContent = total
    if (!articles.length) return this.setEmpty()

    var html = ''
    if (view === 'list') html = renderListView(articles)
    else if (view === 'table') html = renderTableView(articles)
    else html = renderGridView(articles)

    this.qs('#rcontainer').innerHTML = html

    // Wire up detail clicks
    this.qs('#rcontainer').querySelectorAll('[data-detail-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.dataset.detailIdx)
        this.dispatchEvent(new CustomEvent('open-detail', { bubbles: true, detail: idx }))
      }.bind(this))
    }.bind(this))
  }
  qs (s) { return this.querySelector(s) }
}
customElements.define('results-view', ResultsView)

// ─── View renderers ──────────────────────────────────────────────────
function renderListView (articles) {
  return '<div class="space-y-2">' + articles.map(function (a, i) {
    return '\
<div data-detail-id="' + esc(a.id) + '" data-detail-idx="' + i + '" class="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 border border-black cursor-pointer hover:bg-gray-50">\
  <div class="flex-1 min-w-0">\
    <div class="font-medium text-sm leading-snug mb-0.5">' + esc(a.title || 'Untitled') + '</div>\
    <div class="text-xs text-gray-500 truncate">' + esc(a.authors ? JSON.parse(a.authors).slice(0, 3).join('; ') : '') + '</div>\
    <div class="mt-1 flex flex-wrap gap-1.5 text-xs">\
      <span class="px-1.5 py-0.5 bg-gray-100">' + esc(a.year || '?') + '</span>\
      <span class="px-1.5 py-0.5 bg-gray-100">' + esc(a.source || a.source_api || '?') + '</span>\
      ' + (a.has_local_pdf ? '<span class="px-1.5 py-0.5 bg-black text-white">PDF</span>' : '') + '\
      ' + (a.doi ? '<span class="px-1.5 py-0.5 bg-gray-100 truncate max-w-[200px]">' + esc(a.doi) + '</span>' : '') + '\
    </div>\
  </div>\
  <div class="flex flex-row sm:flex-col gap-1.5 sm:shrink-0">\
    ' + (a.has_local_pdf ? '<a href="' + api.pdfUrl(a.id) + '" target="_blank" class="px-2.5 py-1 text-xs border border-black hover:bg-gray-100 text-center" onclick="event.stopPropagation()">PDF</a>' : '') + '\
    ' + (a.url ? '<a href="' + esc(a.url) + '" target="_blank" class="px-2.5 py-1 text-xs border border-black hover:bg-gray-100 text-center" onclick="event.stopPropagation()">Open</a>' : '') + '\
  </div>\
</div>'
  }).join('') + '</div>'
}

function renderTableView (articles) {
  return '\
<div class="overflow-x-auto">\
  <table class="w-full text-xs border-collapse">\
    <thead>\
      <tr class="border-b-2 border-black">\
        <th class="text-left py-2 px-2 font-medium">Title</th>\
        <th class="text-left py-2 px-2 font-medium whitespace-nowrap">Year</th>\
        <th class="text-left py-2 px-2 font-medium whitespace-nowrap">Source</th>\
        <th class="text-left py-2 px-2 font-medium whitespace-nowrap">DOI</th>\
        <th class="text-center py-2 px-2 font-medium whitespace-nowrap">PDF</th>\
      </tr>\
    </thead>\
    <tbody>' + articles.map(function (a, i) {
      return '\
<tr data-detail-id="' + esc(a.id) + '" data-detail-idx="' + i + '" class="border-b border-gray-200 cursor-pointer hover:bg-gray-50">\
  <td class="py-2 px-2 max-w-xs truncate">' + esc(a.title || 'Untitled') + '</td>\
  <td class="py-2 px-2 whitespace-nowrap">' + (a.year || '?') + '</td>\
  <td class="py-2 px-2 whitespace-nowrap">' + esc(a.source_api || '?') + '</td>\
  <td class="py-2 px-2 max-w-[150px] truncate">' + (a.doi ? esc(a.doi) : '-') + '</td>\
  <td class="py-2 px-2 text-center">' + (a.has_local_pdf ? '<a href="' + api.pdfUrl(a.id) + '" target="_blank" class="underline" onclick="event.stopPropagation()">PDF</a>' : '-') + '</td>\
</tr>'
    }).join('') + '\
    </tbody>\
  </table>\
</div>'
}

function renderGridView (articles) {
  return '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">' + articles.map(function (a, i) {
    return '\
<div data-detail-id="' + esc(a.id) + '" data-detail-idx="' + i + '" class="border border-black p-3 cursor-pointer hover:bg-gray-50 flex flex-col">\
  <div class="font-medium text-sm leading-snug mb-1 line-clamp-3">' + esc(a.title || 'Untitled') + '</div>\
  <div class="text-xs text-gray-500 mb-2 line-clamp-1">' + esc(a.authors ? JSON.parse(a.authors).slice(0, 2).join('; ') : '') + '</div>\
  <div class="mt-auto flex flex-wrap gap-1.5 text-xs">\
    <span class="px-1.5 py-0.5 bg-gray-100">' + (a.year || '?') + '</span>\
    <span class="px-1.5 py-0.5 bg-gray-100 truncate max-w-[120px]">' + esc(a.source || a.source_api || '?') + '</span>\
    ' + (a.has_local_pdf ? '<span class="px-1.5 py-0.5 bg-black text-white">PDF</span>' : '') + '\
  </div>\
</div>'
  }).join('') + '</div>'
}

// ─── Article Detail ──────────────────────────────────────────────────
class ArticleDetail extends HTMLElement {
  connectedCallback () {
    this.classList.add('fixed', 'inset-0', 'z-50', 'hidden', 'detail-overlay', 'flex', 'items-center', 'justify-center', 'p-3', 'sm:p-6')
    this.addEventListener('click', function (e) { if (e.target === this) closeDetail() }.bind(this))
    this.renderShell()
  }
  renderShell () {
    this.innerHTML = '\
<div class="bg-white border border-black w-full max-w-2xl max-h-[90vh] flex flex-col">\
  <div class="flex items-center justify-between p-3 sm:p-4 border-b border-black">\
    <div class="flex gap-2">\
      <button id="dprev" class="px-2 py-1 border border-black text-sm hover:bg-gray-100">&larr; Prev</button>\
      <button id="dnext" class="px-2 py-1 border border-black text-sm hover:bg-gray-100">Next &rarr;</button>\
    </div>\
    <span id="dcounter" class="text-xs text-gray-500"></span>\
    <button id="dclose" class="px-2 py-1 border border-black text-sm hover:bg-gray-100">&times;</button>\
  </div>\
  <div id="dbody" class="flex-1 overflow-y-auto p-3 sm:p-4 text-sm space-y-3">\
    <div class="skeleton h-5 w-48"></div>\
    <div class="skeleton h-3 w-full"></div>\
    <div class="skeleton h-3 w-3/4"></div>\
  </div>\
</div>'
    this.qs('#dclose').addEventListener('click', function () { closeDetail() })
    this.qs('#dprev').addEventListener('click', function () { this.dispatchEvent(new CustomEvent('prev-detail', { bubbles: true })) }.bind(this))
    this.qs('#dnext').addEventListener('click', function () { this.dispatchEvent(new CustomEvent('next-detail', { bubbles: true })) }.bind(this))
  }
  show (article, idx, total) {
    this.qs('#dcounter').textContent = (idx + 1) + ' / ' + total
    this.qs('#dprev').disabled = idx === 0
    this.qs('#dnext').disabled = idx === total - 1

    var authors = ''
    try { authors = JSON.parse(article.authors || '[]').join('; ') } catch (e) {}

    var topics = ''
    try { topics = JSON.parse(article.topics || '[]').join(', ') } catch (e) {}

    this.qs('#dbody').innerHTML = '\
<div>\
  <h2 class="text-base font-bold leading-snug mb-2">' + esc(article.title || 'Untitled') + '</h2>\
  ' + (authors ? '<div class="text-xs text-gray-500 mb-3">' + esc(authors) + '</div>' : '') + '\
  <div class="flex flex-wrap gap-1.5 mb-3 text-xs">\
    <span class="px-2 py-0.5 bg-gray-100">' + (article.year || '?') + '</span>\
    <span class="px-2 py-0.5 bg-gray-100">' + esc(article.source || article.source_api || '?') + '</span>\
    ' + (article.has_local_pdf ? '<span class="px-2 py-0.5 bg-black text-white">PDF on disk</span>' : '') + '\
  </div>\
  <div class="space-y-1 text-xs">\
    ' + (article.doi ? '<div><span class="font-medium">DOI:</span> <span class="text-gray-600 break-all">' + esc(article.doi) + '</span></div>' : '') + '\
    ' + (article.pmid ? '<div><span class="font-medium">PMID:</span> ' + esc(article.pmid) + '</div>' : '') + '\
    ' + (article.pmcid ? '<div><span class="font-medium">PMCID:</span> ' + esc(article.pmcid) + '</div>' : '') + '\
    ' + (article.source_api ? '<div><span class="font-medium">Source API:</span> ' + esc(article.source_api) + '</div>' : '') + '\
    ' + (topics ? '<div><span class="font-medium">Topics:</span> ' + esc(topics) + '</div>' : '') + '\
  </div>\
  ' + (article.abstract ? '\
    <div class="mt-3">\
      <div class="font-medium text-xs mb-1">Abstract</div>\
      <div class="text-xs text-gray-600 leading-relaxed">' + esc(article.abstract) + '</div>\
    </div>' : '') + '\
  <div class="mt-4 flex flex-wrap gap-2">\
    ' + (article.has_local_pdf ? '<a href="' + api.pdfUrl(article.id) + '" target="_blank" class="px-3 py-1.5 bg-black text-white text-sm hover:bg-gray-800 no-underline">Download PDF</a>' : '') + '\
    ' + (article.pdf_url ? '<a href="' + esc(article.pdf_url) + '" target="_blank" class="px-3 py-1.5 border border-black text-sm hover:bg-gray-100 no-underline">Open PDF URL</a>' : '') + '\
    ' + (article.url ? '<a href="' + esc(article.url) + '" target="_blank" class="px-3 py-1.5 border border-black text-sm hover:bg-gray-100 no-underline">Open Article</a>' : '') + '\
    ' + (article.doi ? '<button onclick="copyDOI(\'' + esc(article.doi) + '\')" class="px-3 py-1.5 border border-black text-sm hover:bg-gray-100">Copy DOI</button>' : '') + '\
  </div>\
</div>'

    this.classList.remove('hidden')
  }
  hide () {
    this.classList.add('hidden')
  }
  qs (s) { return this.querySelector(s) }
}
customElements.define('article-detail', ArticleDetail)

// ─── App Logic ───────────────────────────────────────────────────────
function doSearch (filters) {
  state.filters = filters
  state.loading = true
  state.error = null

  var params = { limit: 100, offset: 0 }
  if (filters.q) params.q = filters.q
  if (filters.source) params.source = filters.source
  if (filters.year_min) params.year_min = filters.year_min
  if (filters.year_max) params.year_max = filters.year_max
  if (filters.has_pdf) params.has_pdf = filters.has_pdf
  if (filters.sort) params.sort = filters.sort

  var rv = document.querySelector('results-view')
  if (rv) rv.setLoading(true)

  api.search(params).then(function (data) {
    state.articles = data.results || []
    state.total = data.total || 0
    state.loading = false
    if (rv) {
      rv.setLoading(false)
      rv.renderArticles(state.articles, state.total, state.view)
    }
  }).catch(function (err) {
    state.loading = false
    state.error = err.message
    if (rv) {
      rv.setLoading(false)
      rv.setError(err.message)
    }
  })
}

function clearFilters () {
  state.filters = { q: '', source: '', year_min: '', year_max: '', has_pdf: '', sort: '' }
  doSearch(state.filters)
}

function setView (v) {
  state.view = v
  var rv = document.querySelector('results-view')
  if (rv) rv.renderArticles(state.articles, state.total, v)
}

function openDetail (idx) {
  if (idx < 0 || idx >= state.articles.length) return
  state.detailIndex = idx
  state.detail = state.articles[idx]
  var d = document.querySelector('article-detail')
  if (d) d.show(state.detail, idx, state.articles.length)
}

function closeDetail () {
  state.detail = null
  state.detailIndex = -1
  var d = document.querySelector('article-detail')
  if (d) d.hide()
}

function navigateDetail (dir) {
  var idx = state.detailIndex + dir
  if (idx < 0 || idx >= state.articles.length) return
  openDetail(idx)
}

function triggerApiSearch (data) {
  var btn = document.querySelector('[data-v="list"]')
  var rv = document.querySelector('results-view')
  if (rv) rv.setLoading(true)
  if (rv) rv.qs('#rcontainer').innerHTML = '<div class="text-center py-8 text-sm text-gray-500">Searching APIs for &ldquo;' + esc(data.query) + '&rdquo;...</div>'

  api.triggerSearch({ query: data.query, limit: 50 }).then(function () {
    var sf = document.querySelector('search-form')
    if (sf) sf.setFilters({ q: data.query, source: '', year_min: '', year_max: '', has_pdf: '', sort: '' })
    doSearch({ q: data.query, source: '', year_min: '', year_max: '', has_pdf: '', sort: '' })
  }).catch(function (err) {
    if (rv) {
      rv.setLoading(false)
      rv.setError(err.message)
    }
  })
}

function esc (s) {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function copyDOI (doi) {
  navigator.clipboard.writeText(doi).then(function () {
    var el = document.activeElement
    if (el) {
      var orig = el.textContent
      el.textContent = 'Copied!'
      setTimeout(function () { el.textContent = orig }, 1500)
    }
  })
}
