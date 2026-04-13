import {
  formatTime,
  findLiveMarket,
  findNearestMarket,
} from './TimeSlotPicker.utils';
import { PredictMarket, Recurrence } from '../../types';

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-updown-5m',
  title: 'BTC Up/Down 5m',
  description: 'Will BTC go up?',
  endDate: '2026-04-09T12:05:00.000Z',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [],
  liquidity: 1000,
  volume: 5000,
  ...overrides,
});

describe('formatTime', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatTime('2026-04-09T12:05:00.000Z');

    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an empty string for an invalid date string', () => {
    const result = formatTime('not-a-date');

    expect(result).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    const result = formatTime('');

    expect(result).toBe('');
  });
});

describe('findLiveMarket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the market with the soonest future endDate', () => {
    const now = Date.now();
    const markets = [
      createMarket({
        id: 'future-far',
        endDate: new Date(now + 600_000).toISOString(),
      }),
      createMarket({
        id: 'future-near',
        endDate: new Date(now + 120_000).toISOString(),
      }),
      createMarket({
        id: 'past',
        endDate: new Date(now - 60_000).toISOString(),
      }),
    ];

    const result = findLiveMarket(markets);

    expect(result?.id).toBe('future-near');
  });

  it('returns undefined when all markets have past endDates', () => {
    const now = Date.now();
    const markets = [
      createMarket({
        id: 'past-1',
        endDate: new Date(now - 120_000).toISOString(),
      }),
      createMarket({
        id: 'past-2',
        endDate: new Date(now - 60_000).toISOString(),
      }),
    ];

    const result = findLiveMarket(markets);

    expect(result).toBeUndefined();
  });

  it('returns undefined when markets array is empty', () => {
    const result = findLiveMarket([]);

    expect(result).toBeUndefined();
  });

  it('skips markets without an endDate', () => {
    const now = Date.now();
    const markets = [
      createMarket({ id: 'no-end', endDate: undefined }),
      createMarket({
        id: 'future',
        endDate: new Date(now + 120_000).toISOString(),
      }),
    ];

    const result = findLiveMarket(markets);

    expect(result?.id).toBe('future');
  });
});

describe('findNearestMarket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the market whose endDate is closest to now', () => {
    const now = Date.now();
    const markets = [
      createMarket({
        id: 'far-future',
        endDate: new Date(now + 600_000).toISOString(),
      }),
      createMarket({
        id: 'near-past',
        endDate: new Date(now - 30_000).toISOString(),
      }),
      createMarket({
        id: 'near-future',
        endDate: new Date(now + 45_000).toISOString(),
      }),
    ];

    const result = findNearestMarket(markets);

    expect(result?.id).toBe('near-past');
  });

  it('returns undefined when markets array is empty', () => {
    const result = findNearestMarket([]);

    expect(result).toBeUndefined();
  });

  it('falls back to first market when none have an endDate', () => {
    const markets = [
      createMarket({ id: 'first', endDate: undefined }),
      createMarket({ id: 'second', endDate: undefined }),
    ];

    const result = findNearestMarket(markets);

    expect(result?.id).toBe('first');
  });

  it('skips markets without endDate when others have one', () => {
    const now = Date.now();
    const markets = [
      createMarket({ id: 'no-end', endDate: undefined }),
      createMarket({
        id: 'future',
        endDate: new Date(now + 120_000).toISOString(),
      }),
    ];

    const result = findNearestMarket(markets);

    expect(result?.id).toBe('future');
  });
});
