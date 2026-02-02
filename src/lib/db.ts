// Database abstraction layer
// For now using in-memory store, will migrate to D1/SQLite
// This allows us to build the UI first and add persistence later

import { Ticker, PricePoint } from './types';

// In-memory storage (will be replaced with D1)
let tickers: Map<string, Ticker> = new Map();
let priceHistory: Map<string, PricePoint[]> = new Map();
let benchmarkHistory: PricePoint[] = [];

// Initialize with some test data for development
const initTestData = () => {
  // This will be removed once we have real data
};

// Ticker operations
export async function getAllTickers(includeArchived = false): Promise<Ticker[]> {
  const all = Array.from(tickers.values());
  if (includeArchived) return all;
  return all.filter(t => !t.archived);
}

export async function getTickerBySymbol(symbol: string): Promise<Ticker | null> {
  return tickers.get(symbol.toUpperCase()) || null;
}

export async function addTicker(ticker: Omit<Ticker, 'id' | 'created_at' | 'updated_at'>): Promise<Ticker> {
  const now = new Date().toISOString();
  const newTicker: Ticker = {
    ...ticker,
    id: tickers.size + 1,
    symbol: ticker.symbol.toUpperCase(),
    archived: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
  tickers.set(newTicker.symbol, newTicker);
  return newTicker;
}

export async function archiveTicker(symbol: string): Promise<boolean> {
  const ticker = tickers.get(symbol.toUpperCase());
  if (!ticker) return false;
  
  ticker.archived = true;
  ticker.archived_at = new Date().toISOString();
  ticker.updated_at = new Date().toISOString();
  return true;
}

export async function restoreTicker(symbol: string): Promise<boolean> {
  const ticker = tickers.get(symbol.toUpperCase());
  if (!ticker) return false;
  
  ticker.archived = false;
  ticker.archived_at = null;
  ticker.updated_at = new Date().toISOString();
  return true;
}

export async function getArchivedTickers(): Promise<Ticker[]> {
  return Array.from(tickers.values()).filter(t => t.archived);
}

// Price history operations
export async function getPriceHistory(symbol: string, startDate?: string, endDate?: string): Promise<PricePoint[]> {
  const history = priceHistory.get(symbol.toUpperCase()) || [];
  
  if (!startDate && !endDate) return history;
  
  return history.filter(p => {
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });
}

export async function addPriceHistory(symbol: string, prices: PricePoint[]): Promise<void> {
  const existing = priceHistory.get(symbol.toUpperCase()) || [];
  const existingDates = new Set(existing.map(p => p.date));
  
  const newPrices = prices.filter(p => !existingDates.has(p.date));
  priceHistory.set(symbol.toUpperCase(), [...existing, ...newPrices].sort((a, b) => a.date.localeCompare(b.date)));
}

// Benchmark operations
export async function getBenchmarkHistory(startDate?: string, endDate?: string): Promise<PricePoint[]> {
  if (!startDate && !endDate) return benchmarkHistory;
  
  return benchmarkHistory.filter(p => {
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    return true;
  });
}

export async function addBenchmarkHistory(prices: PricePoint[]): Promise<void> {
  const existingDates = new Set(benchmarkHistory.map(p => p.date));
  const newPrices = prices.filter(p => !existingDates.has(p.date));
  benchmarkHistory = [...benchmarkHistory, ...newPrices].sort((a, b) => a.date.localeCompare(b.date));
}

// Sector operations
export async function getTickersBySector(sector: string): Promise<Ticker[]> {
  return Array.from(tickers.values()).filter(
    t => !t.archived && t.sector?.toLowerCase() === sector.toLowerCase()
  );
}

export async function getSectorCounts(): Promise<{ sector: string; count: number }[]> {
  const counts = new Map<string, number>();
  
  for (const ticker of tickers.values()) {
    if (ticker.archived || !ticker.sector) continue;
    counts.set(ticker.sector, (counts.get(ticker.sector) || 0) + 1);
  }
  
  return Array.from(counts.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}

// Utility to check if ticker exists
export async function tickerExists(symbol: string): Promise<boolean> {
  return tickers.has(symbol.toUpperCase());
}

// Export for testing/debugging
export function _getStore() {
  return { tickers, priceHistory, benchmarkHistory };
}

// Clear all data (for testing)
export function _clearStore() {
  tickers = new Map();
  priceHistory = new Map();
  benchmarkHistory = [];
}
