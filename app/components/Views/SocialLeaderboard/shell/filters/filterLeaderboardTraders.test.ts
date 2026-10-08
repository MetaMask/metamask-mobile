import { DEFAULT_FILTERS } from './filterDefaults';
import { filterLeaderboardTraders } from './filterLeaderboardTraders';
import type { SocialShellFilters } from './types';

interface TestTrader {
  id: string;
  isFollowing: boolean;
  pnl30d?: number | null;
  pnlValue?: number;
}

const trader = (
  overrides: Partial<TestTrader> & Pick<TestTrader, 'id'>,
): TestTrader => ({
  isFollowing: false,
  pnl30d: 50_000,
  ...overrides,
});

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
    pnl30d: 50_000,
  });
  const shrimp = trader({ id: 'shrimp', pnl30d: 2_500 });
  const whale = trader({ id: 'whale', pnl30d: 220_000 });

  const all = [followed, shrimp, whale];

  it('returns every trader for default filters', () => {
    expect(filterLeaderboardTraders(all, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it('keeps followed traders for the following cohort', () => {
    const result = filterLeaderboardTraders(
      all,
      filters({ traderCohort: 'following' }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['followed']);
  });

  it('bands shrimp from 30-day PnL even when displayed pnlValue is whale-sized', () => {
    const result = filterLeaderboardTraders(
      [trader({ id: 'mismatch', pnlValue: 500_000, pnl30d: 2_500 })],
      filters({ traderCohort: 'shrimp' }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['mismatch']);
  });

  it('keeps whale-band traders from 30-day PnL', () => {
    const result = filterLeaderboardTraders(
      all,
      filters({ traderCohort: 'whale' }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['whale']);
  });

  it('treats leftover verified as a no-op', () => {
    const result = filterLeaderboardTraders(
      all,
      filters({ traderCohort: 'verified' }),
    );

    expect(result).toHaveLength(3);
  });
});
