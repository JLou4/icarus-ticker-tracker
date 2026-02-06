// POST /api/refresh - Refresh price history for all tickers
// Fetches latest prices and updates the database

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getHistoricalPrices } from '@/lib/yahoo-finance';

const API_KEY = process.env.ICARUS_API_KEY;

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  return token === API_KEY;
}

export async function POST(request: NextRequest) {
  // Check authentication
  if (!checkAuth(request)) {
    return unauthorized();
  }
  
  try {
    const tickers = await db.getAllTickers();
    const results: { symbol: string; added: number; error?: string }[] = [];
    
    // Fetch last 7 days of data for each ticker
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const ticker of tickers) {
      try {
        const prices = await getHistoricalPrices(ticker.symbol, sevenDaysAgo);
        
        if (prices.length > 0) {
          await db.addPriceHistory(ticker.symbol, prices);
          results.push({ symbol: ticker.symbol, added: prices.length });
        } else {
          results.push({ symbol: ticker.symbol, added: 0, error: 'No data returned' });
        }
      } catch (error) {
        results.push({ 
          symbol: ticker.symbol, 
          added: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Also refresh SPY benchmark
    try {
      const spyPrices = await getHistoricalPrices('SPY', sevenDaysAgo);
      if (spyPrices.length > 0) {
        await db.addBenchmarkHistory(spyPrices);
        results.push({ symbol: 'SPY (benchmark)', added: spyPrices.length });
      }
    } catch (error) {
      results.push({ 
        symbol: 'SPY (benchmark)', 
        added: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const errors = results.filter(r => r.error);
    
    return NextResponse.json({ 
      success: true, 
      message: `Refreshed ${tickers.length} tickers, added ${totalAdded} price points`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('Error refreshing prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Failed to refresh prices', details: errorMessage }, { status: 500 });
  }
}

// GET endpoint for Vercel cron (no auth required for cron)
export async function GET(request: NextRequest) {
  // Check for Vercel cron header
  const cronSecret = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  
  // Allow if it's a Vercel cron request or has valid API key
  if (!vercelCron && cronSecret !== `Bearer ${API_KEY}`) {
    return unauthorized();
  }
  
  // Reuse POST logic
  return POST(request);
}
