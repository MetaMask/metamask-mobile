import { getHomepageSectionMountMode } from './homepageSectionMountPolicy';

describe('getHomepageSectionMountMode', () => {
  it.each([
    ['LOW', 'NONE', 'when_network_available'],
    ['MID', 'NONE', 'when_network_available'],
    ['HIGH', 'NONE', 'when_network_available'],
    [null, 'NONE', 'when_network_available'],
    ['LOW', 'SLOW_CELLULAR', 'after_primary_content'],
    ['MID', 'SLOW_CELLULAR', 'after_primary_content'],
    ['HIGH', 'SLOW_CELLULAR', 'after_primary_content'],
    [null, 'SLOW_CELLULAR', 'after_primary_content'],
    ['LOW', 'FAST_CELLULAR', 'after_primary_content'],
    ['LOW', 'WIFI', 'after_primary_content'],
    ['MID', 'FAST_CELLULAR', 'immediate'],
    ['MID', 'WIFI', 'immediate'],
    ['HIGH', 'FAST_CELLULAR', 'immediate'],
    ['HIGH', 'WIFI', 'immediate'],
    [null, 'FAST_CELLULAR', 'immediate'],
    [null, 'WIFI', 'immediate'],
    ['LOW', null, 'immediate'],
    ['MID', null, 'immediate'],
    ['HIGH', null, 'immediate'],
    [null, null, 'immediate'],
  ] as const)(
    'hardware=%s and network=%s uses %s',
    (hardwareTier, networkTier, expectedMode) => {
      expect(
        getHomepageSectionMountMode({
          hardwareTier,
          networkTier,
        }),
      ).toBe(expectedMode);
    },
  );
});
