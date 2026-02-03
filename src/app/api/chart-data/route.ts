// GET /api/chart-data - Get price history for all tickers + benchmark for charting

export const runtime = 'edge';

import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET() {
  try {
    const tickers = await db.getAllTickers();
    const benchmarkHistory = await db.getBenchmarkHistory();
    
    // Fetch price history for each ticker
    const tickersWithHistory = await Promise.all(
      tickers.map(async (ticker) => {
        const priceHistory = await db.getPriceHistory(ticker.symbol);
        return {
          symbol: ticker.symbol,
          mentionDate: ticker.mention_date,
          priceHistory,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        tickers: tickersWithHistory,
        benchmark: benchmarkHistory,
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
