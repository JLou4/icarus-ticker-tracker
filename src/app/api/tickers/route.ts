// GET /api/tickers - List all tracked tickers
// POST /api/tickers - Add a new ticker (requires auth)

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getStockInfo, getInitialHistoricalData, getCurrentPrice } from '@/lib/yahoo-finance';

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

export async function GET() {
  try {
    const tickers = await db.getAllTickers();
    
    // Enrich with current prices
    const enrichedTickers = await Promise.all(
      tickers.map(async (ticker) => {
        const priceData = await getCurrentPrice(ticker.symbol);
        const history = await db.getPriceHistory(ticker.symbol);
        
        // Calculate change since mention
        const mentionDatePrice = history.find(p => p.date >= ticker.mention_date)?.close;
        const currentPrice = priceData?.price || history[history.length - 1]?.close;
        
        let changeSinceMention = null;
        let changeSinceMentionPercent = null;
        
        if (mentionDatePrice && currentPrice) {
          changeSinceMention = currentPrice - mentionDatePrice;
          changeSinceMentionPercent = ((currentPrice - mentionDatePrice) / mentionDatePrice) * 100;
        }
        
        return {
          ...ticker,
          current_price: priceData?.price || null,
          daily_change: priceData?.change || null,
          daily_change_percent: priceData?.changePercent || null,
          change_since_mention: changeSinceMention,
          change_since_mention_percent: changeSinceMentionPercent,
        };
      })
    );
    
    // Sort by mention date (newest first)
    enrichedTickers.sort((a, b) => b.mention_date.localeCompare(a.mention_date));
    
    return NextResponse.json({ success: true, data: enrichedTickers });
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tickers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  if (!checkAuth(request)) {
    return unauthorized();
  }
  
  try {
    const body = await request.json();
    const { symbol } = body;
    
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
    }
    
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Check if already tracked
    if (await db.tickerExists(upperSymbol)) {
      return NextResponse.json({ 
        success: false, 
        error: `${upperSymbol} is already being tracked` 
      }, { status: 409 });
    }
    
    // Fetch stock info from Yahoo Finance
    const stockInfo = await getStockInfo(upperSymbol);
    
    if (!stockInfo) {
      return NextResponse.json({ 
        success: false, 
        error: `Ticker not found: ${upperSymbol}` 
      }, { status: 404 });
    }
    
    // Add ticker to database
    const ticker = await db.addTicker({
      symbol: upperSymbol,
      company_name: stockInfo.companyName,
      sector: stockInfo.sector,
      subsector: stockInfo.industry,
      mention_date: new Date().toISOString().split('T')[0],
      archived: false,
      archived_at: null,
    });
    
    // Fetch historical prices (2 years)
    const historicalPrices = await getInitialHistoricalData(upperSymbol);
    if (historicalPrices.length > 0) {
      await db.addPriceHistory(upperSymbol, historicalPrices);
    }
    
    // Also fetch SPY benchmark if not already present
    const benchmarkHistory = await db.getBenchmarkHistory();
    if (benchmarkHistory.length === 0) {
      const spyPrices = await getInitialHistoricalData('SPY');
      if (spyPrices.length > 0) {
        await db.addBenchmarkHistory(spyPrices);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: ticker,
      message: `Added ${upperSymbol} (${stockInfo.sector || 'Unknown sector'}) ✓`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding ticker:', error);
    return NextResponse.json({ success: false, error: 'Failed to add ticker' }, { status: 500 });
  }
}
