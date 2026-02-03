'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  ReferenceDot,
} from 'recharts';

interface PricePoint {
  date: string;
  close: number;
}

interface TickerData {
  symbol: string;
  mentionDate: string;
  priceHistory: PricePoint[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL' | 'SINCE_MENTION';

interface MultiTickerChartProps {
  tickers: TickerData[];
  benchmark: PricePoint[];
  visibleTickers: Set<string>;
  timeRange: TimeRange;
  colors: Map<string, string>;
}

function getStartDate(timeRange: TimeRange, tickers: TickerData[]): string {
  const now = new Date();
  
  switch (timeRange) {
    case '1M':
      now.setMonth(now.getMonth() - 1);
      return now.toISOString().split('T')[0];
    case '3M':
      now.setMonth(now.getMonth() - 3);
      return now.toISOString().split('T')[0];
    case '6M':
      now.setMonth(now.getMonth() - 6);
      return now.toISOString().split('T')[0];
    case '1Y':
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString().split('T')[0];
    case 'YTD':
      return `${now.getFullYear()}-01-01`;
    case 'ALL':
    case 'SINCE_MENTION':
      // Find earliest mention date among visible tickers
      const visibleTickerData = tickers.filter(t => true); // all for calculation
      if (visibleTickerData.length === 0) return now.toISOString().split('T')[0];
      const earliest = visibleTickerData.reduce((min, t) => 
        t.mentionDate < min ? t.mentionDate : min, 
        visibleTickerData[0].mentionDate
      );
      return earliest;
    default:
      return now.toISOString().split('T')[0];
  }
}

export default function MultiTickerChart({
  tickers,
  benchmark,
  visibleTickers,
  timeRange,
  colors,
}: MultiTickerChartProps) {
  const isSinceMention = timeRange === 'SINCE_MENTION';
  
  const { chartData, mentionMarkers } = useMemo(() => {
    if (!tickers.length) return { chartData: [], mentionMarkers: [] };

    const startDate = getStartDate(timeRange, tickers);
    
    // Create a map of all dates
    const allDates = new Set<string>();
    
    // Collect all dates from visible tickers and benchmark
    tickers.forEach(t => {
      if (visibleTickers.has(t.symbol)) {
        t.priceHistory
          .filter(p => p.date >= startDate)
          .forEach(p => allDates.add(p.date));
      }
    });
    
    benchmark
      .filter(p => p.date >= startDate)
      .forEach(p => allDates.add(p.date));
    
    const sortedDates = Array.from(allDates).sort();
    if (sortedDates.length === 0) return { chartData: [], mentionMarkers: [] };
    
    // For SINCE_MENTION mode, each ticker uses its own mention date as baseline
    // For other modes, all tickers use the same start date
    const tickerMaps = new Map<string, Map<string, number>>();
    const baselinePrices = new Map<string, number>();
    const markers: { symbol: string; date: string; value: number; color: string }[] = [];
    
    tickers.forEach(t => {
      if (visibleTickers.has(t.symbol)) {
        const priceMap = new Map(t.priceHistory.map(p => [p.date, p.close]));
        tickerMaps.set(t.symbol, priceMap);
        
        // Baseline: use mention date for SINCE_MENTION, otherwise start date
        const baselineDate = isSinceMention ? t.mentionDate : startDate;
        const baseline = t.priceHistory.find(p => p.date >= baselineDate)?.close;
        if (baseline) baselinePrices.set(t.symbol, baseline);
        
        // Track mention date markers for SINCE_MENTION mode
        if (isSinceMention && t.mentionDate >= startDate) {
          markers.push({
            symbol: t.symbol,
            date: t.mentionDate,
            value: 100, // Always 100 at mention date
            color: colors.get(t.symbol) || 'var(--primary)',
          });
        }
      }
    });
    
    // Benchmark map and baseline
    const benchmarkMap = new Map(benchmark.map(p => [p.date, p.close]));
    const benchmarkBaseline = benchmark.find(p => p.date >= startDate)?.close;
    
    // Build chart data
    const data = sortedDates.map(date => {
      const point: Record<string, string | number | null> = { date };
      
      // Add each visible ticker (indexed to 100)
      tickerMaps.forEach((priceMap, symbol) => {
        const price = priceMap.get(date);
        const baseline = baselinePrices.get(symbol);
        if (price && baseline) {
          point[symbol] = Number(((price / baseline) * 100).toFixed(2));
        }
      });
      
      // Add SPY benchmark (indexed to 100)
      const benchPrice = benchmarkMap.get(date);
      if (benchPrice && benchmarkBaseline) {
        point['SPY'] = Number(((benchPrice / benchmarkBaseline) * 100).toFixed(2));
      }
      
      return point;
    });
    
    return { chartData: data, mentionMarkers: markers };
  }, [tickers, benchmark, visibleTickers, timeRange, colors, isSinceMention]);

  if (chartData.length === 0) {
    return (
      <div className="chart-container flex items-center justify-center">
        <p className="text-[var(--muted)]">No data to display. Add some tickers to get started.</p>
      </div>
    );
  }

  // Calculate performance for visible tickers
  const performances = useMemo(() => {
    if (chartData.length < 2) return [];
    
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    
    const perfs: { symbol: string; perf: number; color: string }[] = [];
    
    visibleTickers.forEach(symbol => {
      const start = firstPoint[symbol] as number | undefined;
      const end = lastPoint[symbol] as number | undefined;
      if (start && end) {
        perfs.push({
          symbol,
          perf: end - start,
          color: colors.get(symbol) || 'var(--primary)',
        });
      }
    });
    
    // Add SPY
    const spyStart = firstPoint['SPY'] as number | undefined;
    const spyEnd = lastPoint['SPY'] as number | undefined;
    if (spyStart && spyEnd) {
      perfs.push({
        symbol: 'SPY',
        perf: spyEnd - spyStart,
        color: 'var(--muted)',
      });
    }
    
    return perfs.sort((a, b) => b.perf - a.perf);
  }, [chartData, visibleTickers, colors]);

  return (
    <div className="chart-container">
      {/* Performance summary */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        {performances.map(p => (
          <span
            key={p.symbol}
            className={p.perf >= 0 ? 'text-positive' : 'text-negative'}
            style={{ color: p.symbol !== 'SPY' ? p.color : undefined }}
          >
            {p.symbol}: {p.perf >= 0 ? '+' : ''}{p.perf.toFixed(1)}%
          </span>
        ))}
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `${val.toFixed(0)}`}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
            formatter={(value, name) => [
              typeof value === 'number' ? `${value.toFixed(1)}` : '—',
              name
            ]}
            labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          <ReferenceLine y={100} stroke="var(--muted)" strokeDasharray="3 3" strokeOpacity={0.5} />
          
          {/* Render line for each visible ticker */}
          {Array.from(visibleTickers).map(symbol => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={colors.get(symbol) || 'var(--primary)'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
          
          {/* SPY benchmark */}
          <Line
            type="monotone"
            dataKey="SPY"
            stroke="var(--muted)"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
            activeDot={{ r: 3 }}
          />
          
          {/* Mention date markers (only in SINCE_MENTION mode) */}
          {isSinceMention && mentionMarkers.map(m => (
            <ReferenceDot
              key={`mention-${m.symbol}`}
              x={m.date}
              y={m.value}
              r={6}
              fill={m.color}
              stroke="var(--background)"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      <p className="text-xs text-[var(--muted)] mt-2 text-center">
        {isSinceMention 
          ? 'Each ticker indexed to 100 at its mention date (dots show mention dates)'
          : 'All tickers indexed to 100 at start of period'
        }
      </p>
    </div>
  );
}
