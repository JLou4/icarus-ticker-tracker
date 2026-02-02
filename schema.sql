-- Icarus Ticker Tracker Database Schema
-- Cloudflare D1 (SQLite)

-- Tracked tickers
CREATE TABLE IF NOT EXISTS tickers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    company_name TEXT,
    sector TEXT,
    subsector TEXT,
    mention_date TEXT NOT NULL,  -- ISO date when Jack first mentioned it
    archived INTEGER DEFAULT 0,   -- 0 = active, 1 = archived
    archived_at TEXT,             -- ISO date when archived
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Price history (daily closes)
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,           -- ISO date
    open REAL,
    high REAL,
    low REAL,
    close REAL NOT NULL,
    volume INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(symbol, date),
    FOREIGN KEY (symbol) REFERENCES tickers(symbol)
);

-- SPY benchmark prices (same structure)
CREATE TABLE IF NOT EXISTS benchmark_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL DEFAULT 'SPY',
    date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL NOT NULL,
    volume INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(symbol, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickers_symbol ON tickers(symbol);
CREATE INDEX IF NOT EXISTS idx_tickers_sector ON tickers(sector);
CREATE INDEX IF NOT EXISTS idx_tickers_archived ON tickers(archived);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(symbol, date);
CREATE INDEX IF NOT EXISTS idx_benchmark_history_date ON benchmark_history(date);
