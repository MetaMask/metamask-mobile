import type { NetworkTier } from './types';

describe('networkTierSnapshot', () => {
  let snapshot: typeof import('./networkTierSnapshot');

  beforeEach(() => {
    jest.isolateModules(() => {
      snapshot = jest.requireActual('./networkTierSnapshot');
    });
  });

  it('is null before the first update', () => {
    expect(snapshot.getNetworkTierSnapshot()).toBeNull();
  });

  it.each<NetworkTier>(['NONE', 'SLOW_CELLULAR', 'FAST_CELLULAR', 'WIFI'])(
    'returns %s after it is stored',
    (tier) => {
      snapshot.updateNetworkTierSnapshot(tier);

      expect(snapshot.getNetworkTierSnapshot()).toBe(tier);
    },
  );

  it('returns the latest tier after several updates', () => {
    snapshot.updateNetworkTierSnapshot('WIFI');
    snapshot.updateNetworkTierSnapshot('SLOW_CELLULAR');

    expect(snapshot.getNetworkTierSnapshot()).toBe('SLOW_CELLULAR');
  });

  it('goes back to null when an unclassified tier is stored', () => {
    snapshot.updateNetworkTierSnapshot('WIFI');
    snapshot.updateNetworkTierSnapshot(null);

    expect(snapshot.getNetworkTierSnapshot()).toBeNull();
  });
});
