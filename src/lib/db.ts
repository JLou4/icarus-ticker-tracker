// Database layer using Neon Serverless Postgres

import { neon } from '@neondatabase/serverless';
import { Ticker, PricePoint } from './types';

// Get database connection
function getDb() {
  // Neon/Vercel uses various env var names
  const connectionString = 
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL;
    
  if (!connectionString) {
    throw new Error('No Postgres connection string found. Set POSTGRES_URL or DATABASE_URL.');
  }
  return neon(connectionString);
}

// Initialize tables if they don't exist
export async function initDb(): Promise<void> {
  const sql = getDb();
  
  await sql`
    CREATE TABLE IF NOT EXISTS tickers (
      id SERIAL PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      company_name TEXT,
      sector TEXT,
      subsector TEXT,
      mention_date TEXT NOT NULL,
      archived BOOLEAN DEFAULT false,
      archived_at TEXT,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      updated_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL NOT NULL,
      volume BIGINT,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      UNIQUE(symbol, date)
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS benchmark_history (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL DEFAULT 'SPY',
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL NOT NULL,
      volume BIGINT,
      created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      UNIQUE(symbol, date)
    )
  `;
}

// Ticker operations
export async function getAllTickers(includeArchived = false): Promise<Ticker[]> {
  const sql = getDb();
  
  if (includeArchived) {
    const rows = await sql`SELECT * FROM tickers ORDER BY mention_date DESC`;
    return rows as Ticker[];
  }
  
  const rows = await sql`SELECT * FROM tickers WHERE archived = false ORDER BY mention_date DESC`;
  return rows as Ticker[];
}

export async function getTickerBySymbol(symbol: string): Promise<Ticker | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM tickers WHERE symbol = ${symbol.toUpperCase()} LIMIT 1`;
  return rows[0] as Ticker || null;
}

export async function addTicker(ticker: Omit<Ticker, 'id' | 'created_at' | 'updated_at'>): Promise<Ticker> {
  const sql = getDb();
  
  // First ensure table exists
  await initDb();
  
  const rows = await sql`
    INSERT INTO tickers (symbol, company_name, sector, subsector, mention_date, archived, archived_at)
    VALUES (${ticker.symbol.toUpperCase()}, ${ticker.company_name}, ${ticker.sector}, ${ticker.subsector}, ${ticker.mention_date}, ${ticker.archived || false}, ${ticker.archived_at})
    RETURNING *
  `;
  
  return rows[0] as Ticker;
}

export async function archiveTicker(symbol: string): Promise<boolean> {
  const sql = getDb();
  const now = new Date().toISOString();
  
  const result = await sql`
    UPDATE tickers 
    SET archived = true, archived_at = ${now}, updated_at = ${now}
    WHERE symbol = ${symbol.toUpperCase()}
  `;
  
  return (result as any).count > 0;
}

export async function restoreTicker(symbol: string): Promise<boolean> {
  const sql = getDb();
  const now = new Date().toISOString();
  
  const result = await sql`
    UPDATE tickers 
    SET archived = false, archived_at = NULL, updated_at = ${now}
    WHERE symbol = ${symbol.toUpperCase()}
  `;
  
  return (result as any).count > 0;
}

export async function getArchivedTickers(): Promise<Ticker[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM tickers WHERE archived = true ORDER BY archived_at DESC`;
  return rows as Ticker[];
}

// Price history operations
export async function getPriceHistory(symbol: string, startDate?: string, endDate?: string): Promise<PricePoint[]> {
  const sql = getDb();
  
  if (startDate && endDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM price_history 
      WHERE symbol = ${symbol.toUpperCase()} AND date >= ${startDate} AND date <= ${endDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  } else if (startDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM price_history 
      WHERE symbol = ${symbol.toUpperCase()} AND date >= ${startDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  } else if (endDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM price_history 
      WHERE symbol = ${symbol.toUpperCase()} AND date <= ${endDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  }
  
  const rows = await sql`
    SELECT date, open, high, low, close, volume 
    FROM price_history 
    WHERE symbol = ${symbol.toUpperCase()}
    ORDER BY date ASC
  `;
  return rows as PricePoint[];
}

export async function addPriceHistory(symbol: string, prices: PricePoint[]): Promise<void> {
  const sql = getDb();
  
  // First ensure table exists
  await initDb();
  
  for (const price of prices) {
    await sql`
      INSERT INTO price_history (symbol, date, open, high, low, close, volume)
      VALUES (${symbol.toUpperCase()}, ${price.date}, ${price.open}, ${price.high}, ${price.low}, ${price.close}, ${price.volume})
      ON CONFLICT (symbol, date) DO NOTHING
    `;
  }
}

// Benchmark operations
export async function getBenchmarkHistory(startDate?: string, endDate?: string): Promise<PricePoint[]> {
  const sql = getDb();
  
  if (startDate && endDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM benchmark_history 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  } else if (startDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM benchmark_history 
      WHERE date >= ${startDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  } else if (endDate) {
    const rows = await sql`
      SELECT date, open, high, low, close, volume 
      FROM benchmark_history 
      WHERE date <= ${endDate}
      ORDER BY date ASC
    `;
    return rows as PricePoint[];
  }
  
  const rows = await sql`
    SELECT date, open, high, low, close, volume 
    FROM benchmark_history 
    ORDER BY date ASC
  `;
  return rows as PricePoint[];
}

export async function addBenchmarkHistory(prices: PricePoint[]): Promise<void> {
  const sql = getDb();
  
  // First ensure table exists
  await initDb();
  
  for (const price of prices) {
    await sql`
      INSERT INTO benchmark_history (symbol, date, open, high, low, close, volume)
      VALUES ('SPY', ${price.date}, ${price.open}, ${price.high}, ${price.low}, ${price.close}, ${price.volume})
      ON CONFLICT (symbol, date) DO NOTHING
    `;
  }
}

// Sector operations
export async function getTickersBySector(sector: string): Promise<Ticker[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM tickers 
    WHERE archived = false AND LOWER(sector) = ${sector.toLowerCase()}
    ORDER BY mention_date DESC
  `;
  return rows as Ticker[];
}

export async function getSectorCounts(): Promise<{ sector: string; count: number }[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT sector, COUNT(*) as count 
    FROM tickers 
    WHERE archived = false AND sector IS NOT NULL
    GROUP BY sector
    ORDER BY count DESC
  `;
  return rows.map(r => ({ sector: r.sector as string, count: Number(r.count) }));
}

// Utility to check if ticker exists
export async function tickerExists(symbol: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT 1 FROM tickers WHERE symbol = ${symbol.toUpperCase()} LIMIT 1`;
  return rows.length > 0;
}
