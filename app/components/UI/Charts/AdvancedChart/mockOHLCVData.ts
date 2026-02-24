import type { OHLCVBar } from './AdvancedChart.types';

export const INTERVAL_SECONDS = {
  '1': 60,
  '5': 300,
  '15': 900,
  '60': 3600,
  '240': 14400,
  D: 86400,
} as const;

export type Resolution = keyof typeof INTERVAL_SECONDS;

/**
 * Generates realistic mock OHLCV data for testing.
 */
export const generateMockOHLCVData = (
  count: number = 100,
  startPrice: number = 30.5,
  resolution: Resolution = '5',
  volatility: number = 0.02,
): OHLCVBar[] => {
  const bars: OHLCVBar[] = [];
  let lastClose = startPrice;
  const intervalSeconds = INTERVAL_SECONDS[resolution];
  const now = Math.floor(Date.now() / 1000);

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = (now - i * intervalSeconds) * 1000;

    const open = lastClose;
    const trendBias = Math.random() > 0.5 ? 0.001 : -0.001;
    const change = (Math.random() - 0.5 + trendBias) * volatility * lastClose;
    const close = Math.max(0.01, open + change);

    const highExtension = Math.random() * 0.005 * lastClose;
    const lowExtension = Math.random() * 0.005 * lastClose;
    const high = Math.max(open, close) + highExtension;
    const low = Math.max(0.01, Math.min(open, close) - lowExtension);

    const baseVolume = 1000 + Math.random() * 2000;
    const volumeMultiplier = 1 + Math.abs(change / lastClose) * 10;
    const volume = Math.floor(baseVolume * volumeMultiplier);

    bars.push({
      time: timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    lastClose = close;
  }

  return bars;
};

export const SAMPLE_OHLCV_DATA: OHLCVBar[] = [
  {
    time: 1769029491000,
    open: 30.72,
    high: 30.91,
    low: 30.35,
    close: 30.54,
    volume: 1117,
  },
  {
    time: 1769029496000,
    open: 30.54,
    high: 30.55,
    low: 30.37,
    close: 30.49,
    volume: 1474,
  },
  {
    time: 1769029501000,
    open: 30.49,
    high: 30.62,
    low: 30.41,
    close: 30.58,
    volume: 1289,
  },
  {
    time: 1769029506000,
    open: 30.58,
    high: 30.73,
    low: 30.52,
    close: 30.71,
    volume: 1632,
  },
  {
    time: 1769029511000,
    open: 30.71,
    high: 30.85,
    low: 30.68,
    close: 30.79,
    volume: 1445,
  },
];

/**
 * Generates deterministic mock OHLCV data for a specific symbol.
 */
export const generateMockDataForSymbol = (
  symbol: string,
  count: number = 100,
): OHLCVBar[] => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    const char = symbol.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }

  const startPrice = 10 + Math.abs(hash % 4990);

  const isStablecoin =
    symbol.includes('USD') &&
    (symbol.includes('USDT') ||
      symbol.includes('USDC') ||
      symbol.includes('DAI'));
  const volatility = isStablecoin ? 0.001 : 0.02;

  return generateMockOHLCVData(count, startPrice, '5', volatility);
};

export const DEFAULT_MOCK_OHLCV_DATA = generateMockOHLCVData(100, 30.5, '5');
