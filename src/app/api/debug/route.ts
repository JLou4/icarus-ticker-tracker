// Debug endpoint to check environment
export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  // List all env vars that might be the postgres connection
  const envVars = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    // Show first few chars if set (for debugging, not full string)
    POSTGRES_URL_preview: process.env.POSTGRES_URL?.substring(0, 30) + '...' || 'not set',
    DATABASE_URL_preview: process.env.DATABASE_URL?.substring(0, 30) + '...' || 'not set',
  };
  
  return NextResponse.json({ envVars });
}
