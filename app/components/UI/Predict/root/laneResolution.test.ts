import type { PredictConfig } from '../../PredictNext/config/predictConfig';
import {
  hasLegacyMarketListParams,
  resolveActiveVenue,
  resolvePredictMarketListLane,
  resolvePredictRootLane,
} from './laneResolution';

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: false },
});

describe('temporary Predict lane resolution', () => {
  it.each([
    [false, true, 'kalshi'],
    [true, false, 'polymarket'],
    [true, true, 'polymarket'],
    [false, false, 'polymarket'],
  ] as const)(
    'resolves polymarket=%s kalshi=%s to %s',
    (polymarket, kalshi, expected) => {
      const result = resolveActiveVenue(config(polymarket, kalshi));

      expect(result).toBe(expected);
    },
  );

  it('falls back to Polymarket when the new architecture is disabled', () => {
    const disabled = { ...config(false, true), enabled: false };

    const result = resolveActiveVenue(disabled);

    expect(result).toBe('polymarket');
  });

  it.each([
    { feedId: 'sports' as const },
    { tabId: 'basketball' },
    { query: 'election' },
  ])('recognizes legacy market-list parameters', (params) => {
    const result = hasLegacyMarketListParams(params);

    expect(result).toBe(true);
  });

  it('keeps a parameterized market list on Polymarket', () => {
    const result = resolvePredictMarketListLane(config(false, true), {
      query: 'election',
    });

    expect(result).toBe('polymarket');
  });

  it('routes a generic market list to Kalshi', () => {
    const result = resolvePredictMarketListLane(config(false, true));

    expect(result).toBe('kalshi');
  });

  it('keeps a specific child route on Polymarket', () => {
    const result = resolvePredictRootLane(config(false, true), {
      screen: 'PredictMarketDetails',
    });

    expect(result).toBe('polymarket');
  });
});
