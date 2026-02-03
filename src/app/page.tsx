'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MultiTickerChart from '@/components/MultiTickerChart';

interface Ticker {
  id: number;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  mention_date: string;
  current_price: number | null;
  daily_change_percent: number | null;
  change_since_mention_percent: number | null;
}

interface Sector {
  sector: string;
  count: number;
}

interface ChartTickerData {
  symbol: string;
  mentionDate: string;
  priceHistory: { date: string; close: number }[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL' | 'SINCE_MENTION';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'YTD', value: 'YTD' },
  { label: 'ALL', value: 'ALL' },
  { label: 'Since Mention', value: 'SINCE_MENTION' },
];

// Generate consistent colors for tickers
const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function getTickerColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export default function Home() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [chartTickers, setChartTickers] = useState<ChartTickerData[]>([]);
  const [benchmarkHistory, setBenchmarkHistory] = useState<{ date: string; close: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [visibleTickers, setVisibleTickers] = useState<Set<string>>(new Set());
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create color map for tickers
  const tickerColors = new Map<string, string>();
  tickers.forEach((t, i) => {
    tickerColors.set(t.symbol, COLORS[i % COLORS.length]);
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [tickersRes, sectorsRes, chartRes] = await Promise.all([
        fetch('/api/tickers'),
        fetch('/api/sectors'),
        fetch('/api/chart-data'),
      ]);

      const tickersData = await tickersRes.json();
      const sectorsData = await sectorsRes.json();
      const chartData = await chartRes.json();

      if (tickersData.success) {
        setTickers(tickersData.data);
        setVisibleTickers(new Set(tickersData.data.map((t: Ticker) => t.symbol)));
      }

      if (sectorsData.success) {
        setSectors(sectorsData.data);
      }
      
      if (chartData.success) {
        setChartTickers(chartData.data.tickers);
        setBenchmarkHistory(chartData.data.benchmark);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function toggleTicker(symbol: string) {
    setVisibleTickers(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
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

  const filteredTickers = selectedSector
    ? tickers.filter(t => t.sector === selectedSector)
    : tickers;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading tickers...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            <span className="text-[var(--primary)]">🔥</span> Icarus Ticker Tracker
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Sector dropdown */}
          <select
            value={selectedSector || ''}
            onChange={(e) => setSelectedSector(e.target.value || null)}
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector} ({s.count})
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--card-border)] rounded-lg hover:border-[var(--primary)] transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {/* Archived link */}
          <Link
            href="/archived"
            className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            📦 Archived
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="mb-6 text-[var(--muted)]">
        Tracking <span className="text-[var(--foreground)] font-semibold">{tickers.length}</span> tickers
        across <span className="text-[var(--foreground)] font-semibold">{sectors.length}</span> sectors
      </div>

      {tickers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-[var(--muted)] mb-4">No tickers tracked yet</p>
          <p className="text-[var(--muted)]">
            Text Icarus <code className="bg-[var(--card)] px-2 py-1 rounded">track AAPL</code> to start tracking
          </p>
        </div>
      ) : (
        <>
          {/* Time Range Selector */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Price Performance</h2>
            <div className="flex gap-2">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.value}
                  onClick={() => setTimeRange(tr.value)}
                  className={`time-range-btn ${timeRange === tr.value ? 'active' : ''}`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Ticker Chart */}
          <div className="mb-6">
            <MultiTickerChart
              tickers={chartTickers}
              benchmark={benchmarkHistory}
              visibleTickers={visibleTickers}
              timeRange={timeRange}
              colors={tickerColors}
            />
          </div>

          {/* Ticker Visibility Toggles */}
          <div className="mb-6 p-4 bg-[var(--card)] rounded-lg border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Show/Hide Tickers</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibleTickers(new Set(filteredTickers.map(t => t.symbol)))}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Show All
                </button>
                <button
                  onClick={() => setVisibleTickers(new Set())}
                  className="text-xs text-[var(--muted)] hover:underline"
                >
                  Hide All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {filteredTickers.map((ticker, index) => (
                <label
                  key={ticker.symbol}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleTickers.has(ticker.symbol)}
                    onChange={() => toggleTicker(ticker.symbol)}
                    className="ticker-checkbox"
                    style={{ borderColor: getTickerColor(index) }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: getTickerColor(index) }}
                  >
                    {ticker.symbol}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Ticker Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTickers.map((ticker, index) => (
              <Link
                key={ticker.symbol}
                href={`/ticker/${ticker.symbol}`}
                className="ticker-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getTickerColor(index) }}
                      />
                      <span className="font-bold text-lg">{ticker.symbol}</span>
                    </div>
                    <p className="text-sm text-[var(--muted)] truncate max-w-[180px]">
                      {ticker.company_name || ticker.symbol}
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
                  {ticker.sector && (
                    <span className="sector-badge">{ticker.sector}</span>
                  )}
                  <span className={`font-medium ${ticker.change_since_mention_percent && ticker.change_since_mention_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
                    Since: {formatPercent(ticker.change_since_mention_percent)}
                  </span>
                </div>

                <p className="text-xs text-[var(--muted)] mt-2">
                  Mentioned: {new Date(ticker.mention_date).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
