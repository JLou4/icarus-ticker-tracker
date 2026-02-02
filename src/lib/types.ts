// Core types for Icarus Ticker Tracker

export interface Ticker {
  id: number;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  subsector: string | null;
  mention_date: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface TickerWithPrices extends Ticker {
  prices: PricePoint[];
  current_price: number | null;
  daily_change: number | null;
  daily_change_percent: number | null;
  change_since_mention: number | null;
  change_since_mention_percent: number | null;
}

export interface Sector {
  name: string;
  ticker_count: number;
  tickers: Ticker[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  related: string[];
}

export interface ChartData {
  symbol: string;
  data: {
    time: string;
    value: number; // Indexed value (100 = start)
  }[];
  mention_date: string;
  color: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Time range options
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL' | 'SINCE_MENTION';

// GICS Sectors
export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
] as const;

export type GICSSector = typeof GICS_SECTORS[number];
