import { getEventMarketListPolicy } from './getEventMarketListPolicy';

describe('getEventMarketListPolicy', () => {
  it.each(['WIFI', 'FAST_CELLULAR', 'SLOW_CELLULAR'] as const)(
    'limits render work and tab motion on LOW hardware with %s',
    (networkTier) => {
      const policy = getEventMarketListPolicy('LOW', networkTier);

      expect(policy).toEqual({
        animated: false,
        initialNumToRender: 6,
        maxToRenderPerBatch: 6,
        windowSize: 5,
      });
    },
  );

  it.each(['MID', 'HIGH', null] as const)(
    'retains product rendering defaults on %s hardware even on slow cellular',
    (hardwareTier) => {
      const policy = getEventMarketListPolicy(hardwareTier, 'SLOW_CELLULAR');

      expect(policy).toEqual({
        animated: true,
        initialNumToRender: 10,
        maxToRenderPerBatch: 10,
        windowSize: 21,
      });
    },
  );

  it.each(['LOW', 'MID', 'HIGH', null] as const)(
    'uses product defaults for unknown network on %s hardware',
    (hardwareTier) => {
      expect(getEventMarketListPolicy(hardwareTier, null)).toEqual(
        getEventMarketListPolicy('MID', 'WIFI'),
      );
    },
  );

  it.each(['LOW', 'MID', 'HIGH', null] as const)(
    'disables tab motion offline without inventing a lower hardware tier (%s)',
    (hardwareTier) => {
      const policy = getEventMarketListPolicy(hardwareTier, 'NONE');

      expect(policy.animated).toBe(false);
      expect(policy.windowSize).toBe(hardwareTier === 'LOW' ? 5 : 21);
    },
  );
});
