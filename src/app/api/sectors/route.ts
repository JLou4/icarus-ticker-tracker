// GET /api/sectors - List all sectors with ticker counts

import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET() {
  try {
    const sectorCounts = await db.getSectorCounts();
    
    return NextResponse.json({
      success: true,
      data: sectorCounts
    });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sectors' }, { status: 500 });
  }
}
