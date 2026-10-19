import { DEFAULT_FILTERS } from './filterDefaults';
import { filterLeaderboardTraders } from './filterLeaderboardTraders';
import type { SocialShellFilters } from './types';

interface TestTrader {
  id: string;
  isFollowing: boolean;
}

const trader = (
  overrides: Partial<TestTrader> & Pick<TestTrader, 'id'>,
): TestTrader => ({ isFollowing: false, ...overrides });

const filters = (
  patch: Partial<SocialShellFilters> = {},
): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe('filterLeaderboardTraders', () => {
  const followed = trader({
    id: 'followed',
    isFollowing: true,
  });

  const unfollowed = trader({ id: 'unfollowed' });
  const all = [followed, unfollowed];

  it('returns every trader for default filters', () => {
    expect(filterLeaderboardTraders(all, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it('keeps followed traders when following is selected', () => {
    const result = filterLeaderboardTraders(
      all,
      filters({ following: 'following' }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['followed']);
  });
});
