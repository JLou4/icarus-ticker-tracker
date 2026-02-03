// Yahoo Finance integration using direct fetch (edge-compatible)
// Uses v8 API endpoints which work better from server environments

import { PricePoint } from './types';

export interface StockInfo {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  currentPrice: number;
  previousClose: number;
}

const YF_BASE = 'https://query1.finance.yahoo.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };

export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  try {
    // Use v8 chart API for basic info (more reliable from servers)
    const chartUrl = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const chartRes = await fetch(chartUrl, { headers: HEADERS });
    
    if (!chartRes.ok) return null;
    
    const chartData = await chartRes.json() as any;
    const meta = chartData?.chart?.result?.[0]?.meta;
    
    if (!meta) return null;
    
    // Try to get sector/industry from quoteSummary (may fail on some servers)
    let sector = null;
    let industry = null;
    
    try {
      const profileUrl = `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile`;
      const profileRes = await fetch(profileUrl, { headers: HEADERS });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json() as any;
        const profile = profileData?.quoteSummary?.result?.[0]?.assetProfile;
        sector = profile?.sector || null;
        industry = profile?.industry || null;
      }
    } catch {
      console.log(`No sector info for ${symbol}`);
    }
    
    return {
      symbol: meta.symbol || symbol,
      companyName: meta.longName || meta.shortName || symbol,
      sector,
      industry,
      currentPrice: meta.regularMarketPrice || 0,
      previousClose: meta.chartPreviousClose || meta.previousClose || 0,
    };
  } catch (error) {
    console.error(`Error fetching stock info for ${symbol}:`, error);
    return null;
  }
}

export async function getHistoricalPrices(
  symbol: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<PricePoint[]> {
  try {
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);
    
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    
    const res = await fetch(url, { headers: HEADERS });
    
    if (!res.ok) return [];
    
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return [];
    
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    const prices: PricePoint[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close?.[i] != null) {
        prices.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open?.[i] || null,
          high: quote.high?.[i] || null,
          low: quote.low?.[i] || null,
          close: quote.close[i],
          volume: quote.volume?.[i] || null,
        });
      }
    }
    
    return prices;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    return [];
  }
}

export async function getCurrentPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: HEADERS });
    
    if (!res.ok) return null;
    
    const data = await res.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;
    
    if (!meta?.regularMarketPrice) return null;
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;
    
    return {
      price: currentPrice,
      change,
      changePercent,
    };
  } catch (error) {
    console.error(`Error fetching current price for ${symbol}:`, error);
    return null;
  }
}

export async function validateTicker(symbol: string): Promise<boolean> {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: HEADERS });
    
    if (!res.ok) return false;
    
    const data = await res.json() as any;
    return !!data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  } catch {
    return false;
  }
}

// Get 2 years of historical data for a new ticker
export async function getInitialHistoricalData(symbol: string): Promise<PricePoint[]> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return getHistoricalPrices(symbol, twoYearsAgo);
}
