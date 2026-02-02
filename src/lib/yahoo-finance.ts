// Yahoo Finance integration using yahoo-finance2
import yahooFinance from 'yahoo-finance2';
import { PricePoint } from './types';

// Suppress the deprecation notice (if method exists)
try {
  // @ts-ignore - suppressNotices may not exist in all versions
  yahooFinance.suppressNotices?.(['yahooSurvey']);
} catch {
  // Ignore if not available
}

export interface StockInfo {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  currentPrice: number;
  previousClose: number;
}

export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  try {
    const quote = await yahooFinance.quote(symbol) as any;
    
    if (!quote) return null;
    
    // Get additional info for sector
    let sector = null;
    let industry = null;
    
    try {
      const profile = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile'] }) as any;
      sector = profile?.assetProfile?.sector || null;
      industry = profile?.assetProfile?.industry || null;
    } catch (e) {
      // Sector info not available for ETFs, etc.
      console.log(`No sector info for ${symbol}`);
    }
    
    return {
      symbol: quote.symbol || symbol,
      companyName: quote.longName || quote.shortName || symbol,
      sector,
      industry,
      currentPrice: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
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
    const history = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as any;
    
    if (!history.quotes) return [];
    
    return history.quotes
      .filter((q: any) => q.close !== null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split('T')[0],
        open: q.open || null,
        high: q.high || null,
        low: q.low || null,
        close: q.close!,
        volume: q.volume || null,
      }));
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    return [];
  }
}

export async function getCurrentPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const quote = await yahooFinance.quote(symbol) as any;
    
    if (!quote || !quote.regularMarketPrice) return null;
    
    return {
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
    };
  } catch (error) {
    console.error(`Error fetching current price for ${symbol}:`, error);
    return null;
  }
}

export async function validateTicker(symbol: string): Promise<boolean> {
  try {
    const quote = await yahooFinance.quote(symbol) as any;
    return !!quote && !!quote.regularMarketPrice;
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
