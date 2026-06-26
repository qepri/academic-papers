const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, '..', 'data', 'articles.db')

function init () {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT,
      authors TEXT,
      source TEXT,
      year INTEGER,
      doi TEXT UNIQUE,
      pmid TEXT,
      pmcid TEXT,
      url TEXT,
      pdf_url TEXT,
      abstract TEXT,
      topics TEXT,
      source_api TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year);
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
    CREATE INDEX IF NOT EXISTS idx_articles_source_api ON articles(source_api);

    CREATE TABLE IF NOT EXISTS search_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      results_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  return db
}

function upsertArticle (db, article) {
  db.prepare(`
    INSERT INTO articles (id, title, authors, source, year, doi, pmid, pmcid, url, pdf_url, abstract, topics, source_api)
    VALUES (@id, @title, @authors, @source, @year, @doi, @pmid, @pmcid, @url, @pdf_url, @abstract, @topics, @source_api)
    ON CONFLICT(doi) DO UPDATE SET
      title = coalesce(@title, title),
      authors = coalesce(@authors, authors),
      source = coalesce(@source, source),
      year = coalesce(@year, year),
      url = coalesce(@url, url),
      pdf_url = coalesce(@pdf_url, pdf_url),
      abstract = coalesce(@abstract, abstract),
      topics = coalesce(@topics, topics),
      fetched_at = datetime('now')
  `).run(article)
}

function logSearch (db, query, count) {
  db.prepare('INSERT INTO search_log (query, results_count) VALUES (?, ?)').run(query, count)
}

module.exports = { init, upsertArticle, logSearch }
