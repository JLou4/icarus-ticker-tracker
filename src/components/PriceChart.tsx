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
} from 'recharts';

interface PricePoint {
  date: string;
  close: number;
}

interface PriceChartProps {
  symbol: string;
  priceHistory: PricePoint[];
  benchmarkHistory: PricePoint[];
  mentionDate: string;
}

export default function PriceChart({
  symbol,
  priceHistory,
  benchmarkHistory,
  mentionDate,
}: PriceChartProps) {
  const chartData = useMemo(() => {
    if (!priceHistory.length) return [];

    // Find the price on mention date (or closest after)
    const mentionPrice = priceHistory.find(p => p.date >= mentionDate)?.close;
    const mentionBenchmark = benchmarkHistory.find(p => p.date >= mentionDate)?.close;

    if (!mentionPrice) return [];

    // Filter to only show data from mention date onward
    const filteredPrices = priceHistory.filter(p => p.date >= mentionDate);
    const filteredBenchmark = benchmarkHistory.filter(p => p.date >= mentionDate);

    // Create a map of benchmark prices by date
    const benchmarkMap = new Map(filteredBenchmark.map(p => [p.date, p.close]));

    // Build chart data with indexed values (100 = mention date)
    return filteredPrices.map(point => {
      const indexedPrice = (point.close / mentionPrice) * 100;
      const benchClose = benchmarkMap.get(point.date);
      const indexedBenchmark = benchClose && mentionBenchmark
        ? (benchClose / mentionBenchmark) * 100
        : null;

      return {
        date: point.date,
        [symbol]: Number(indexedPrice.toFixed(2)),
        SPY: indexedBenchmark ? Number(indexedBenchmark.toFixed(2)) : null,
        rawPrice: point.close,
      };
    });
  }, [priceHistory, benchmarkHistory, mentionDate, symbol]);

  if (chartData.length === 0) {
    return (
      <div className="chart-container flex items-center justify-center">
        <p className="text-[var(--muted)]">No price data available</p>
      </div>
    );
  }

  const latestData = chartData[chartData.length - 1];
  const tickerPerf = latestData?.[symbol] ? (latestData[symbol] as number) - 100 : 0;
  const spyPerf = latestData?.SPY ? (latestData.SPY as number) - 100 : 0;
  const alpha = tickerPerf - spyPerf;

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Performance Since Mention</h3>
        <div className="flex gap-4 text-sm">
          <span className={tickerPerf >= 0 ? 'text-positive' : 'text-negative'}>
            {symbol}: {tickerPerf >= 0 ? '+' : ''}{tickerPerf.toFixed(1)}%
          </span>
          <span className={spyPerf >= 0 ? 'text-positive' : 'text-negative'}>
            SPY: {spyPerf >= 0 ? '+' : ''}{spyPerf.toFixed(1)}%
          </span>
          <span className={alpha >= 0 ? 'text-positive' : 'text-negative'}>
            α: {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)}`,
              name
            ]}
            labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          />
          <Legend />
          <ReferenceLine y={100} stroke="var(--muted)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey={symbol}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="SPY"
            stroke="var(--muted)"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <p className="text-xs text-[var(--muted)] mt-2 text-center">
        Indexed to 100 at mention date ({new Date(mentionDate).toLocaleDateString()})
      </p>
    </div>
  );
}
