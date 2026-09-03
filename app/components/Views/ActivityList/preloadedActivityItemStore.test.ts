import type { ActivityListItem } from '../../../util/activity-adapters';
import {
  getPreloadedActivityItem,
  stashPreloadedActivityItem,
} from './preloadedActivityItemStore';

const makeItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'perpsOpenLong',
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 1,
    hash: '0xabc',
    data: {},
    ...overrides,
  }) as ActivityListItem;

describe('preloadedActivityItemStore', () => {
  it('round-trips a stashed row by its returned key', () => {
    const item = makeItem();
    const key = stashPreloadedActivityItem(item);
    expect(getPreloadedActivityItem(key)).toBe(item);
  });

  it('returns a unique key per stash so rows never collide', () => {
    const a = makeItem({ hash: '0xa' });
    const b = makeItem({ hash: '0xb' });
    const keyA = stashPreloadedActivityItem(a);
    const keyB = stashPreloadedActivityItem(b);

    expect(keyA).not.toBe(keyB);
    expect(getPreloadedActivityItem(keyA)).toBe(a);
    expect(getPreloadedActivityItem(keyB)).toBe(b);
  });

  it('returns undefined for a missing or unknown key', () => {
    expect(getPreloadedActivityItem(undefined)).toBeUndefined();
    expect(getPreloadedActivityItem('not-a-real-key')).toBeUndefined();
  });

  it('evicts the oldest entry once the cap is exceeded', () => {
    const firstKey = stashPreloadedActivityItem(makeItem({ hash: '0xfirst' }));
    // Cap is 10; stashing 10 newer rows pushes the first one out.
    for (let i = 0; i < 10; i += 1) {
      stashPreloadedActivityItem(makeItem({ hash: `0x${i}` }));
    }
    expect(getPreloadedActivityItem(firstKey)).toBeUndefined();
  });
});
