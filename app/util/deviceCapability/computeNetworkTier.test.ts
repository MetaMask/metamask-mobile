import { computeNetworkTier } from './computeNetworkTier';

const reachableWifi = {
  type: 'wifi',
  cellularGeneration: null,
  isInternetReachable: true,
};

describe('computeNetworkTier', () => {
  it('returns null when type is null', () => {
    const result = computeNetworkTier({
      type: null,
      cellularGeneration: null,
      isInternetReachable: true,
    });

    expect(result).toBeNull();
  });

  it('returns null when type is unknown', () => {
    const result = computeNetworkTier({
      type: 'unknown',
      cellularGeneration: null,
      isInternetReachable: true,
    });

    expect(result).toBeNull();
  });

  it.each(['vpn', 'bluetooth', 'wimax', 'other'] as const)(
    'returns null when type is %s',
    (type) => {
      const result = computeNetworkTier({
        type,
        cellularGeneration: null,
        isInternetReachable: true,
      });

      expect(result).toBeNull();
    },
  );

  it('returns null for cellular with no generation', () => {
    const result = computeNetworkTier({
      type: 'cellular',
      cellularGeneration: null,
      isInternetReachable: true,
    });

    expect(result).toBeNull();
  });

  it('returns NONE when type is none', () => {
    const result = computeNetworkTier({
      type: 'none',
      cellularGeneration: null,
      isInternetReachable: false,
    });

    expect(result).toBe('NONE');
  });

  it('returns WIFI when type is wifi', () => {
    const result = computeNetworkTier(reachableWifi);

    expect(result).toBe('WIFI');
  });

  it('returns WIFI when type is ethernet', () => {
    const result = computeNetworkTier({
      type: 'ethernet',
      cellularGeneration: null,
      isInternetReachable: true,
    });

    expect(result).toBe('WIFI');
  });

  it.each(['2g', '3g'] as const)(
    'returns SLOW_CELLULAR for cellular %s',
    (cellularGeneration) => {
      const result = computeNetworkTier({
        type: 'cellular',
        cellularGeneration,
        isInternetReachable: true,
      });

      expect(result).toBe('SLOW_CELLULAR');
    },
  );

  it.each(['4g', '5g'] as const)(
    'returns FAST_CELLULAR for cellular %s',
    (cellularGeneration) => {
      const result = computeNetworkTier({
        type: 'cellular',
        cellularGeneration,
        isInternetReachable: true,
      });

      expect(result).toBe('FAST_CELLULAR');
    },
  );

  it('returns NONE when wifi is not internet reachable', () => {
    const result = computeNetworkTier({
      ...reachableWifi,
      isInternetReachable: false,
    });

    expect(result).toBe('NONE');
  });

  it('returns null for unknown even when internet is not reachable', () => {
    const result = computeNetworkTier({
      type: 'unknown',
      cellularGeneration: null,
      isInternetReachable: false,
    });

    expect(result).toBeNull();
  });
});
