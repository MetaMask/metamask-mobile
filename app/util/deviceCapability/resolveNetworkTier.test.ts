import { resolveNetworkTier } from './resolveNetworkTier';
import type { LatencyBucket, NetworkTier } from './types';

describe('resolveNetworkTier', () => {
  it.each<[NetworkTier | null]>([
    ['WIFI'],
    ['FAST_CELLULAR'],
    ['SLOW_CELLULAR'],
    [null],
  ])('resolves %s with slow latency to SLOW_CELLULAR', (transportTier) => {
    const result = resolveNetworkTier(transportTier, 'slow');

    expect(result).toEqual({ tier: 'SLOW_CELLULAR', latency: 'slow' });
  });

  it.each<[LatencyBucket]>([['unknown'], ['ok'], ['slow']])(
    'resolves NONE with %s latency to NONE and unknown latency',
    (latency) => {
      const result = resolveNetworkTier('NONE', latency);

      expect(result).toEqual({ tier: 'NONE', latency: 'unknown' });
    },
  );

  it.each<[NetworkTier | null, LatencyBucket]>([
    ['WIFI', 'ok'],
    ['FAST_CELLULAR', 'unknown'],
    ['SLOW_CELLULAR', 'ok'],
    [null, 'unknown'],
    [null, 'ok'],
  ])('keeps transport %s when latency is %s', (transportTier, latency) => {
    const result = resolveNetworkTier(transportTier, latency);

    expect(result).toEqual({ tier: transportTier, latency });
  });
});
