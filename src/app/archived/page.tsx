'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArchivedTicker {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  mention_date: string;
  archived_at: string | null;
}

export default function ArchivedPage() {
  const [tickers, setTickers] = useState<ArchivedTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedTickers();
  }, []);

  async function fetchArchivedTickers() {
    try {
      const res = await fetch('/api/tickers?archived=true');
      const data = await res.json();

      if (data.success) {
        // Filter to only archived
        setTickers(data.data.filter((t: any) => t.archived));
      }
    } catch (error) {
      console.error('Error fetching archived tickers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(symbol: string) {
    // Would call POST /api/tickers/:symbol/restore with auth
    alert(`Restore ${symbol} - requires authentication`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading archived tickers...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">📦 Archived Tickers</h1>
        </div>
      </header>

      {tickers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-[var(--muted)] mb-4">No archived tickers</p>
          <p className="text-[var(--muted)]">
            Tickers you untrack will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickers.map((ticker) => (
            <div
              key={ticker.symbol}
              className="flex items-center justify-between p-4 bg-[var(--card)] rounded-lg border border-[var(--card-border)]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{ticker.symbol}</span>
                  {ticker.sector && (
                    <span className="sector-badge">{ticker.sector}</span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {ticker.company_name}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Originally mentioned: {new Date(ticker.mention_date).toLocaleDateString()}
                  {ticker.archived_at && (
                    <span> • Archived: {new Date(ticker.archived_at).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRestore(ticker.symbol)}
                className="px-4 py-2 text-sm text-[var(--primary)] border border-[var(--primary)] rounded-lg hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
