import type { NetworkTier } from '../../../../hooks/useNetworkTier';
import type { HardwareTier } from '../../../../util/deviceCapability';
import { canPrefetchFollowingSuggestions } from './followingSuggestionsPrefetch';

describe('canPrefetchFollowingSuggestions', () => {
  it.each<[HardwareTier | null, NetworkTier | null, boolean]>([
    ['HIGH', 'WIFI', true],
    ['HIGH', 'FAST_CELLULAR', true],
    ['HIGH', 'SLOW_CELLULAR', true],
    ['HIGH', null, true],
    ['MID', 'WIFI', true],
    ['MID', 'FAST_CELLULAR', true],
    ['MID', 'SLOW_CELLULAR', true],
    ['MID', null, true],
    ['LOW', 'WIFI', false],
    ['LOW', 'FAST_CELLULAR', false],
    ['LOW', 'SLOW_CELLULAR', false],
    ['LOW', null, true],
    [null, 'WIFI', true],
    [null, 'FAST_CELLULAR', true],
    [null, 'SLOW_CELLULAR', true],
    [null, null, true],
    ['HIGH', 'NONE', false],
    ['MID', 'NONE', false],
    ['LOW', 'NONE', false],
    [null, 'NONE', false],
  ])(
    'hardware %s and network %s allows prefetch: %s',
    (hardwareTier, networkTier, expected) => {
      expect(canPrefetchFollowingSuggestions(hardwareTier, networkTier)).toBe(
        expected,
      );
    },
  );
});
