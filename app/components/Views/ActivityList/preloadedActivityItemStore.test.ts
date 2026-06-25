import type { ActivityListItem } from '../../../util/activity-adapters';
import {
  getPreloadedActivityItem,
  setPreloadedActivityItem,
} from './preloadedActivityItemStore';

const makeItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'perpsOpenLong',
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 1,
    hash: '0xAbC',
    data: {},
    ...overrides,
  }) as ActivityListItem;

describe('preloadedActivityItemStore', () => {
  it('round-trips a stashed item by chain + hash (hash matched case-insensitively)', () => {
    const stored = makeItem({ hash: '0xAbC' });
    setPreloadedActivityItem(stored);
    expect(getPreloadedActivityItem('eip155:42161', '0xabc')).toBe(stored);
  });

  it('returns undefined for a wrong chain or unknown hash', () => {
    setPreloadedActivityItem(makeItem({ hash: '0xfeed' }));
    expect(getPreloadedActivityItem('eip155:1', '0xfeed')).toBeUndefined();
    expect(getPreloadedActivityItem('eip155:42161', '0xnope')).toBeUndefined();
  });

  it('ignores items without a hash', () => {
    setPreloadedActivityItem(makeItem({ hash: undefined }));
    expect(getPreloadedActivityItem('eip155:42161', undefined)).toBeUndefined();
  });
});
