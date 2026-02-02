// POST /api/tickers/:symbol/restore - Restore an archived ticker

import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  if (!checkAuth(request)) {
    return unauthorized();
  }
  
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    
    const success = await db.restoreTicker(upperSymbol);
    
    if (!success) {
      return NextResponse.json({ success: false, error: 'Ticker not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Restored ${upperSymbol}` 
    });
  } catch (error) {
    console.error('Error restoring ticker:', error);
    return NextResponse.json({ success: false, error: 'Failed to restore ticker' }, { status: 500 });
  }
}
