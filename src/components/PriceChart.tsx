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
  const { chartData, mentionIndex, tickerPerf, spyPerf, alpha } = useMemo(() => {
    if (!priceHistory.length) return { chartData: [], mentionIndex: null, tickerPerf: 0, spyPerf: 0, alpha: 0 };

    // Find the price on mention date (or closest after)
    const mentionPrice = priceHistory.find(p => p.date >= mentionDate)?.close;
    const mentionBenchmark = benchmarkHistory.find(p => p.date >= mentionDate)?.close;

    if (!mentionPrice) return { chartData: [], mentionIndex: null, tickerPerf: 0, spyPerf: 0, alpha: 0 };

    // Filter to only show data from mention date onward
    const filteredPrices = priceHistory.filter(p => p.date >= mentionDate);
    const filteredBenchmark = benchmarkHistory.filter(p => p.date >= mentionDate);

    // Create a map of benchmark prices by date
    const benchmarkMap = new Map(filteredBenchmark.map(p => [p.date, p.close]));

    // Find the mention date index value (should be 100)
    let mentionIndexValue = 100;

    // Build chart data with indexed values (100 = mention date)
    const data = filteredPrices.map(point => {
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

    // Calculate performance
    const lastData = data[data.length - 1];
    const tickerP = lastData?.[symbol] ? (lastData[symbol] as number) - 100 : 0;
    const spyP = lastData?.SPY ? (lastData.SPY as number) - 100 : 0;
    
    return { 
      chartData: data, 
      mentionIndex: mentionIndexValue,
      tickerPerf: tickerP,
      spyPerf: spyP,
      alpha: tickerP - spyP,
    };
  }, [priceHistory, benchmarkHistory, mentionDate, symbol]);

  if (chartData.length === 0) {
    return (
      <div className="chart-container flex items-center justify-center">
        <p className="text-[var(--muted)]">No price data available since mention date</p>
      </div>
    );
  }

  // Find the data point closest to mention date for the marker
  const mentionDataPoint = chartData.find(p => p.date >= mentionDate);

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
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <ReferenceLine y={100} stroke="var(--muted)" strokeDasharray="3 3" strokeOpacity={0.5} />
          
          {/* Ticker line */}
          <Line
            type="monotone"
            dataKey={symbol}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          
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
          
          {/* Mention date marker */}
          {mentionDataPoint && (
            <ReferenceDot
              x={mentionDataPoint.date}
              y={100}
              r={8}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      <p className="text-xs text-[var(--muted)] mt-2 text-center">
        Indexed to 100 at mention date ({new Date(mentionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) — dot marks mention
      </p>
    </div>
  );
}
