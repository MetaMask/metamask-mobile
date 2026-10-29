import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import { DEFAULT_FILTERS } from './filterDefaults';
import { matchesLivePost } from './matchesLivePost';
import type { SocialShellFilters } from './types';

const post = (
  overrides: Partial<SocialV1FeedPost> & Pick<SocialV1FeedPost, 'id' | 'item'>,
): SocialV1FeedPost => ({
  authorHandle: overrides.item.author.username,
  timestampMs: overrides.item.timestamp,
  reactions: [],
  marketCapUsd: null,
  ...overrides,
});

const filters = (
  patch: Partial<SocialShellFilters> = {},
): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

const author = (id: string, pnl30d: number) => ({
  id,
  username: id,
  winRatePercent: 50,
  pnl30d,
});

const spot = post({
  id: 'spot',
  marketCapUsd: 5_200_000_000,
  item: mockOpenSpotFeedItem({
    id: 'spot-item',
    author: author('followed-trader', 50_000),
  }),
});
const perp = post({
  id: 'perp',
  item: mockOpenPerpsFeedItem({
    id: 'perp-item',
    author: author('other-trader', 2_500),
  }),
});

const NOBODY = new Set<string>();
const FOLLOWING = new Set(['followed-trader']);

const matching = (
  applied: SocialShellFilters,
  followingProfileIds: ReadonlySet<string> = NOBODY,
) =>
  [spot, perp]
    .filter((candidate) =>
      matchesLivePost(candidate, applied, followingProfileIds),
    )
    .map((candidate) => candidate.id);

describe('matchesLivePost', () => {
  it('keeps every post for default filters', () => {
    expect(matching(DEFAULT_FILTERS)).toStrictEqual(['spot', 'perp']);
  });

  it('keeps only spot posts for the tokens chip', () => {
    expect(matching(filters({ type: 'tokens' }))).toStrictEqual(['spot']);
  });

  it('keeps only perp posts for the perps chip', () => {
    expect(matching(filters({ type: 'perps' }))).toStrictEqual(['perp']);
  });

  it('keeps only followed authors for the following cohort', () => {
    expect(
      matching(filters({ traderCohort: 'following' }), FOLLOWING),
    ).toStrictEqual(['spot']);
  });

  it('keeps nothing for the following cohort when nobody is followed', () => {
    expect(matching(filters({ traderCohort: 'following' }))).toStrictEqual([]);
  });

  it('keeps authors in the 30-day PnL band', () => {
    expect(matching(filters({ traderCohort: 'shrimp' }))).toStrictEqual([
      'perp',
    ]);
  });

  it('drops spot posts outside the market cap range and keeps perps', () => {
    expect(matching(filters({ marketCap: { min: 0, max: 1 } }))).toStrictEqual([
      'perp',
    ]);
  });
});
