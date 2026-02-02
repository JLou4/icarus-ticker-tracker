'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Ticker {
  symbol: string;
  company_name: string | null;
  mention_date: string;
  current_price: number | null;
  daily_change_percent: number | null;
  change_since_mention_percent: number | null;
}

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
}

interface SectorData {
  sector: string;
  tickers: Ticker[];
  news: NewsItem[];
}

export default function SectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector } = use(params);
  const decodedSector = decodeURIComponent(sector);
  
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSectorData();
  }, [sector]);

  async function fetchSectorData() {
    try {
      const res = await fetch(`/api/sectors/${encodeURIComponent(decodedSector)}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching sector:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatPercent(value: number | null): string {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  function formatPrice(value: number | null): string {
    if (value === null) return '—';
    return `$${value.toFixed(2)}`;
  }

  function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading {decodedSector}...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[var(--danger)] mb-4">Sector not found</p>
          <Link href="/" className="text-[var(--primary)] hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pb-4 border-b border-[var(--card-border)]">
        <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          ← Back to All
        </Link>
      </header>

      {/* Sector Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{data.sector}</h1>
        <p className="text-[var(--muted)]">{data.tickers.length} tickers</p>
      </div>

      {/* Chart Placeholder */}
      <div className="chart-container mb-8 flex items-center justify-center">
        <div className="text-center text-[var(--muted)]">
          <p className="mb-2">📈 Sector Chart</p>
          <p className="text-sm">All {data.sector} tickers + SPY (indexed to 100)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickers */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Tickers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.tickers.map((ticker) => (
              <Link
                key={ticker.symbol}
                href={`/ticker/${ticker.symbol}`}
                className="ticker-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-bold text-lg">{ticker.symbol}</span>
                    <p className="text-sm text-[var(--muted)] truncate max-w-[150px]">
                      {ticker.company_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(ticker.current_price)}</p>
                    <p className={ticker.daily_change_percent && ticker.daily_change_percent >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatPercent(ticker.daily_change_percent)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    {new Date(ticker.mention_date).toLocaleDateString()}
                  </span>
                  <span className={`font-medium ${ticker.change_since_mention_percent && ticker.change_since_mention_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
                    Since: {formatPercent(ticker.change_since_mention_percent)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* News Sidebar */}
        <div>
          <h2 className="text-xl font-bold mb-4">📰 Sector News</h2>
          <div className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4">
            {data.news.length === 0 ? (
              <p className="text-[var(--muted)]">No recent news</p>
            ) : (
              <div className="space-y-1">
                {data.news.map((item) => (
                  <div key={item.id} className="news-item">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium">
                      {item.headline}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(item.datetime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
