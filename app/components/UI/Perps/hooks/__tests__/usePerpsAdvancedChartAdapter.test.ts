import type { CandleData } from '@metamask/perps-controller';
import {
  convertCandlesToOHLCVBars,
  INTERVAL_MS,
} from '../usePerpsAdvancedChartAdapter';

type TestCandle = CandleData['candles'][number];

describe('convertCandlesToOHLCVBars', () => {
  it('converts valid string-typed candles to numeric OHLCVBars', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '500',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      time: 1000000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 500,
    });
  });

  it('uses 0 for volume when volume field is absent', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
      } as unknown as TestCandle,
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].volume).toBe(0);
  });

  it('drops bars with non-finite OHLC values', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: 'NaN',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 2000000,
        open: 'invalid',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 3000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '200',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(3000000);
  });

  it('returns empty array for empty candles', () => {
    expect(convertCandlesToOHLCVBars([])).toEqual([]);
  });

  it('preserves millisecond timestamps without multiplication', () => {
    const candles: TestCandle[] = [
      {
        time: 1_700_000_000_000,
        open: '42000',
        high: '43000',
        low: '41000',
        close: '42500',
        volume: '1000',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].time).toBe(1_700_000_000_000);
  });
});

describe('INTERVAL_MS', () => {
  it('has correct millisecond values for key intervals', () => {
    expect(INTERVAL_MS['1m']).toBe(60_000);
    expect(INTERVAL_MS['1h']).toBe(3_600_000);
    expect(INTERVAL_MS['4h']).toBe(14_400_000);
    expect(INTERVAL_MS['1d']).toBe(86_400_000);
    expect(INTERVAL_MS['1w']).toBe(604_800_000);
  });
});
