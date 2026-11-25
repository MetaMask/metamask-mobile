import {
  addBoundedChaseAnalyticsKey,
  CHASE_METAMETRICS_MAX_REPORTED_KEYS,
} from './chaseAnalytics';

describe('chaseAnalytics', () => {
  it('evicts the oldest analytics key at the retention limit', () => {
    const keys = new Set(
      Array.from(
        { length: CHASE_METAMETRICS_MAX_REPORTED_KEYS },
        (_, index) => `chase-${index}`,
      ),
    );

    addBoundedChaseAnalyticsKey(keys, 'chase-new');

    expect(keys.size).toBe(CHASE_METAMETRICS_MAX_REPORTED_KEYS);
    expect(keys.has('chase-0')).toBe(false);
    expect(keys.has('chase-new')).toBe(true);
  });
});
