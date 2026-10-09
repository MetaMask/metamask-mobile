import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../../UI/SocialFeed/types';
import { DEFAULT_FILTERS } from './filterDefaults';
import { filterSocialV1FeedPosts } from './filterSocialV1FeedPosts';
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

describe('filterSocialV1FeedPosts', () => {
  const spot = post({
    id: 'spot',
    marketCapUsd: 5_200_000_000,
    item: mockOpenSpotFeedItem({
      id: 'spot-item',
      author: {
        id: 'spot-trader',
        username: 'spot',
        winRatePercent: 50,
        pnl30d: 50_000,
      },
    }),
  });
  const perp = post({
    id: 'perp',
    marketCapUsd: null,
    item: mockOpenPerpsFeedItem({
      id: 'perp-item',
      author: {
        id: 'perp-trader',
        username: 'perp',
        winRatePercent: 50,
        pnl30d: 50_000,
      },
    }),
  });
  const shrimp = post({
    id: 'shrimp',
    marketCapUsd: 5_200_000_000,
    item: mockOpenSpotFeedItem({
      id: 'shrimp-item',
      author: {
        id: 'shrimp-trader',
        username: 'shrimp',
        winRatePercent: 40,
        pnl30d: 2_500,
      },
    }),
  });

  const all = [spot, perp, shrimp];

  it('returns every post for default filters', () => {
    const result = filterSocialV1FeedPosts(all, DEFAULT_FILTERS);

    expect(result.map((item) => item.id)).toStrictEqual([
      'spot',
      'perp',
      'shrimp',
    ]);
  });

  it('keeps only spot posts for the tokens chip', () => {
    const result = filterSocialV1FeedPosts(all, filters({ type: 'tokens' }));

    expect(result.map((item) => item.id)).toStrictEqual(['spot', 'shrimp']);
  });

  it('keeps only perp posts for the perps chip', () => {
    const result = filterSocialV1FeedPosts(all, filters({ type: 'perps' }));

    expect(result.map((item) => item.id)).toStrictEqual(['perp']);
  });

  it('keeps shrimp-band authors from 30-day PnL', () => {
    const result = filterSocialV1FeedPosts(
      all,
      filters({ traderCohort: 'shrimp' }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['shrimp']);
  });

  it('drops spot posts whose market cap is outside the slider', () => {
    const result = filterSocialV1FeedPosts(
      all,
      filters({ marketCap: { min: 0, max: 1 } }),
    );

    expect(result.map((item) => item.id)).toStrictEqual(['perp']);
  });

  it('ignores leftover verification and 24h volume', () => {
    const result = filterSocialV1FeedPosts(
      all,
      filters({
        verification: 'verified',
        volume24h: { min: 10, max: 20 },
      }),
    );

    expect(result).toHaveLength(3);
  });
});
