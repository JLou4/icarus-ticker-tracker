// GET /api/sectors/:sector - Get tickers in a sector with news

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getCurrentPrice } from '@/lib/yahoo-finance';

// Finnhub API for sector news
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

async function getSectorNews(sector: string) {
  if (!FINNHUB_API_KEY) return [];
  
  try {
    // Map GICS sectors to Finnhub categories
    const categoryMap: Record<string, string> = {
      'Information Technology': 'technology',
      'Health Care': 'healthcare',
      'Financials': 'finance',
      'Energy': 'energy',
      'Consumer Discretionary': 'retail',
      'Consumer Staples': 'retail',
      'Industrials': 'industrial',
      'Materials': 'materials',
      'Utilities': 'utilities',
      'Real Estate': 'realty',
      'Communication Services': 'media',
    };
    
    const category = categoryMap[sector] || 'general';
    
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) return [];
    
    const news = await response.json();
    return news.slice(0, 10).map((item: any) => ({
      id: item.id?.toString() || Math.random().toString(),
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      datetime: item.datetime,
    }));
  } catch (error) {
    console.error('Error fetching sector news:', error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
) {
  try {
    const { sector } = await params;
    const decodedSector = decodeURIComponent(sector);
    
    const tickers = await db.getTickersBySector(decodedSector);
    
    // Enrich with current prices
    const enrichedTickers = await Promise.all(
      tickers.map(async (ticker) => {
        const priceData = await getCurrentPrice(ticker.symbol);
        const history = await db.getPriceHistory(ticker.symbol);
        
        const mentionDatePrice = history.find(p => p.date >= ticker.mention_date)?.close;
        const currentPrice = priceData?.price || history[history.length - 1]?.close;
        
        let changeSinceMentionPercent = null;
        if (mentionDatePrice && currentPrice) {
          changeSinceMentionPercent = ((currentPrice - mentionDatePrice) / mentionDatePrice) * 100;
        }
        
        return {
          ...ticker,
          current_price: priceData?.price || null,
          daily_change: priceData?.change || null,
          daily_change_percent: priceData?.changePercent || null,
          change_since_mention_percent: changeSinceMentionPercent,
        };
      })
    );
    
    // Get sector news
    const news = await getSectorNews(decodedSector);
    
    return NextResponse.json({
      success: true,
      data: {
        sector: decodedSector,
        tickers: enrichedTickers,
        news,
      }
    });
  } catch (error) {
    console.error('Error fetching sector:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sector' }, { status: 500 });
  }
}
