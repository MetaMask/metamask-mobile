import {
  getPositionsRefreshIntervalMs,
  POSITIONS_REFRESH_INTERVAL_MS,
} from './positionsRefreshInterval';

describe('getPositionsRefreshIntervalMs', () => {
  it('polls every 30 seconds on a healthy network', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: 'HIGH',
        networkTier: 'WIFI',
      }),
    ).toBe(POSITIONS_REFRESH_INTERVAL_MS);
    expect(POSITIONS_REFRESH_INTERVAL_MS).toBe(30_000);
  });

  it('keeps the 30 second cadence on fast cellular', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: 'MID',
        networkTier: 'FAST_CELLULAR',
      }),
    ).toBe(30_000);
  });

  it('backs off to 60 seconds on slow cellular', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: 'HIGH',
        networkTier: 'SLOW_CELLULAR',
      }),
    ).toBe(60_000);
  });

  it('backs off to 120 seconds on slow cellular with low hardware', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: 'LOW',
        networkTier: 'SLOW_CELLULAR',
      }),
    ).toBe(120_000);
  });

  it('stops polling when the network is offline', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: 'HIGH',
        networkTier: 'NONE',
      }),
    ).toBeUndefined();
  });

  it('treats an unknown hardware tier as not low', () => {
    expect(
      getPositionsRefreshIntervalMs({
        hardwareTier: null,
        networkTier: 'SLOW_CELLULAR',
      }),
    ).toBe(60_000);
  });

  it('keeps the default cadence when the network tier is unknown', () => {
    expect(
      getPositionsRefreshIntervalMs({ hardwareTier: 'LOW', networkTier: null }),
    ).toBe(POSITIONS_REFRESH_INTERVAL_MS);
  });
});
