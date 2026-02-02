// GET /api/tickers/:symbol - Get ticker details with price history
// DELETE /api/tickers/:symbol - Archive a ticker (requires auth)

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getCurrentPrice } from '@/lib/yahoo-finance';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    
    const ticker = await db.getTickerBySymbol(upperSymbol);
    
    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Ticker not found' }, { status: 404 });
    }
    
    // Get price history
    const priceHistory = await db.getPriceHistory(upperSymbol);
    
    // Get current price
    const priceData = await getCurrentPrice(upperSymbol);
    
    // Get benchmark history
    const benchmarkHistory = await db.getBenchmarkHistory();
    
    // Calculate change since mention
    const mentionDatePrice = priceHistory.find(p => p.date >= ticker.mention_date)?.close;
    const currentPrice = priceData?.price || priceHistory[priceHistory.length - 1]?.close;
    
    let changeSinceMention = null;
    let changeSinceMentionPercent = null;
    
    if (mentionDatePrice && currentPrice) {
      changeSinceMention = currentPrice - mentionDatePrice;
      changeSinceMentionPercent = ((currentPrice - mentionDatePrice) / mentionDatePrice) * 100;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...ticker,
        current_price: priceData?.price || null,
        daily_change: priceData?.change || null,
        daily_change_percent: priceData?.changePercent || null,
        change_since_mention: changeSinceMention,
        change_since_mention_percent: changeSinceMentionPercent,
        price_history: priceHistory,
        benchmark_history: benchmarkHistory,
      }
    });
  } catch (error) {
    console.error('Error fetching ticker:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch ticker' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  if (!checkAuth(request)) {
    return unauthorized();
  }
  
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    
    const success = await db.archiveTicker(upperSymbol);
    
    if (!success) {
      return NextResponse.json({ success: false, error: 'Ticker not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Archived ${upperSymbol}` 
    });
  } catch (error) {
    console.error('Error archiving ticker:', error);
    return NextResponse.json({ success: false, error: 'Failed to archive ticker' }, { status: 500 });
  }
}
