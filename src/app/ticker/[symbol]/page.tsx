'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface TickerDetail {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  subsector: string | null;
  mention_date: string;
  current_price: number | null;
  daily_change: number | null;
  daily_change_percent: number | null;
  change_since_mention: number | null;
  change_since_mention_percent: number | null;
  price_history: { date: string; close: number }[];
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
}

export default function TickerDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [ticker, setTicker] = useState<TickerDetail | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickerDetail();
    fetchNews();
  }, [symbol]);

  async function fetchTickerDetail() {
    try {
      const res = await fetch(`/api/tickers/${symbol.toUpperCase()}`);
      const data = await res.json();

      if (data.success) {
        setTicker(data.data);
      } else {
        setError(data.error || 'Failed to load ticker');
      }
    } catch (err) {
      setError('Failed to load ticker');
    } finally {
      setLoading(false);
    }
  }

  async function fetchNews() {
    try {
      // Fetch company news from Finnhub
      const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      if (!apiKey) return;

      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol.toUpperCase()}&from=${getDateDaysAgo(7)}&to=${getTodayDate()}&token=${apiKey}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setNews(data.slice(0, 10).map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          headline: item.headline,
          summary: item.summary,
          source: item.source,
          url: item.url,
          datetime: item.datetime,
        })));
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    }
  }

  function getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
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
          <p className="text-[var(--muted)]">Loading {symbol.toUpperCase()}...</p>
        </div>
      </div>
    );
  }

  if (error || !ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[var(--danger)] mb-4">{error || 'Ticker not found'}</p>
          <Link href="/" className="text-[var(--primary)] hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          ← Back
        </Link>
        <button
          className="px-4 py-2 text-sm text-[var(--danger)] border border-[var(--danger)] rounded-lg hover:bg-[var(--danger)] hover:text-white transition-colors"
          onClick={() => {
            if (confirm(`Archive ${ticker.symbol}?`)) {
              // Would call DELETE /api/tickers/:symbol with auth
              alert('Archive functionality requires authentication');
            }
          }}
        >
          Untrack
        </button>
      </header>

      {/* Ticker Info */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{ticker.symbol}</h1>
          {ticker.sector && (
            <span className="sector-badge">{ticker.sector}</span>
          )}
        </div>
        <p className="text-lg text-[var(--muted)]">{ticker.company_name}</p>
        {ticker.subsector && (
          <p className="text-sm text-[var(--muted)]">{ticker.subsector}</p>
        )}
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--card-border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Current Price</p>
          <p className="text-2xl font-bold">{formatPrice(ticker.current_price)}</p>
        </div>
        <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--card-border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Today</p>
          <p className={`text-2xl font-bold ${ticker.daily_change_percent && ticker.daily_change_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatPercent(ticker.daily_change_percent)}
          </p>
        </div>
        <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--card-border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Since Mention</p>
          <p className={`text-2xl font-bold ${ticker.change_since_mention_percent && ticker.change_since_mention_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatPercent(ticker.change_since_mention_percent)}
          </p>
        </div>
        <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--card-border)]">
          <p className="text-sm text-[var(--muted)] mb-1">Mentioned</p>
          <p className="text-lg font-semibold">
            {new Date(ticker.mention_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="chart-container mb-8 flex items-center justify-center">
        <div className="text-center text-[var(--muted)]">
          <p className="mb-2">📈 Individual Chart</p>
          <p className="text-sm">{ticker.symbol} vs SPY (indexed to 100)</p>
          <p className="text-sm mt-2">
            {ticker.price_history?.length || 0} data points loaded
          </p>
        </div>
      </div>

      {/* News Section */}
      <div className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-6">
        <h2 className="text-xl font-bold mb-4">📰 News</h2>
        
        {news.length === 0 ? (
          <p className="text-[var(--muted)]">No recent news available</p>
        ) : (
          <div className="space-y-1">
            {news.map((item) => (
              <div key={item.id} className="news-item">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium">
                  {item.headline}
                </a>
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] mt-1">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(item.datetime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
