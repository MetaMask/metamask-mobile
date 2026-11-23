import { strings } from '../../../../../locales/i18n';
import { mockPerpFeedItem } from '../../SocialFeed/mocks/coreFeed.mock';
import {
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedAbbreviatedUsd,
} from '../../SocialFeed/utils/formatters';
import { mapHoldersToRankedTraders } from './mapHoldersToRankedTraders';

const notFollowing = () => false;

const buildHolder = (
  profileId: string,
  overrides: Parameters<typeof mockPerpFeedItem>[0] = {},
) =>
  mockPerpFeedItem({
    positionId: `pos-${profileId}`,
    isOpen: true,
    positionValueUSD: 10_000,
    pnlValueUsd: 250,
    pnlPercent: 2.5,
    ...overrides,
    actor: {
      profileId,
      address: `0x${profileId}`,
      name: `${profileId}.eth`,
      imageUrl: null,
      followerCount: 12,
    },
  });

describe('mapHoldersToRankedTraders', () => {
  it('keeps the server order and ranks from it', () => {
    const rows = mapHoldersToRankedTraders(
      [
        buildHolder('big', { positionValueUSD: 40_000, pnlValueUsd: -50 }),
        buildHolder('small', { positionValueUSD: 10_000, pnlValueUsd: 900 }),
      ],
      notFollowing,
    );

    expect(rows.map((row) => [row.id, row.rank, row.overallRank])).toEqual([
      ['big', 1, 1],
      ['small', 2, 2],
    ]);
  });

  it('shows the position size uncolored over the dollar and percent P&L', () => {
    const [row] = mapHoldersToRankedTraders([buildHolder('a')], notFollowing);

    expect(row.displayMetric).toEqual({
      label: formatAbbreviatedUsd(10_000),
      isPositive: true,
      isNeutral: true,
    });
    expect(row.secondaryMetric).toEqual({
      label: `${formatSignedAbbreviatedUsd(250)} (${formatPercent(2.5, { decimals: 1 })})`,
      isPositive: true,
    });
  });

  it('colors a losing position as a loss', () => {
    const [row] = mapHoldersToRankedTraders(
      [buildHolder('a', { pnlValueUsd: -120, pnlPercent: -1.2 })],
      notFollowing,
    );

    expect(row.secondaryMetric?.isPositive).toBe(false);
  });

  it('falls back to whichever P&L figure is present', () => {
    const [percentOnly, valueOnly, neither] = mapHoldersToRankedTraders(
      [
        buildHolder('a', { pnlValueUsd: null, pnlPercent: -3 }),
        buildHolder('b', { pnlValueUsd: 40, pnlPercent: null }),
        buildHolder('c', { pnlValueUsd: null, pnlPercent: null }),
      ],
      notFollowing,
    );

    expect(percentOnly.secondaryMetric).toEqual({
      label: formatPercent(-3, { decimals: 1 }),
      isPositive: false,
    });
    expect(valueOnly.secondaryMetric).toEqual({
      label: formatSignedAbbreviatedUsd(40),
      isPositive: true,
    });
    expect(neither.secondaryMetric).toBeUndefined();
  });

  it('shows a dash when the API omits the position size', () => {
    const [row] = mapHoldersToRankedTraders(
      [buildHolder('a', { positionValueUSD: undefined })],
      notFollowing,
    );

    expect(row.displayMetric.label).toBe(formatAbbreviatedUsd(undefined));
  });

  it('lists a profile once, at its largest position', () => {
    const rows = mapHoldersToRankedTraders(
      [
        buildHolder('a', { positionValueUSD: 50_000 }),
        buildHolder('b'),
        buildHolder('a', { positionId: 'pos-a-2', positionValueUSD: 1_000 }),
      ],
      notFollowing,
    );

    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(rows[0].displayMetric.label).toBe(formatAbbreviatedUsd(50_000));
  });

  it('tags each holder with their leverage and side', () => {
    const [long, short, unknownLeverage, spot] = mapHoldersToRankedTraders(
      [
        buildHolder('a', { perpPositionType: 'long', perpLeverage: 20 }),
        buildHolder('b', { perpPositionType: 'short', perpLeverage: 5 }),
        buildHolder('c', { perpPositionType: 'short', perpLeverage: null }),
        buildHolder('d', { perpPositionType: null }),
      ],
      notFollowing,
    );

    expect(long.nameTag).toEqual({
      label: `20x ${strings('social_leaderboard.trader_position.long')}`,
      isPositive: true,
    });
    expect(short.nameTag).toEqual({
      label: `5x ${strings('social_leaderboard.trader_position.short')}`,
      isPositive: false,
    });
    expect(unknownLeverage.nameTag).toEqual({
      label: strings('social_leaderboard.trader_position.short'),
      isPositive: false,
    });
    expect(spot.nameTag).toBeUndefined();
  });

  it('carries the trader identity and follow state', () => {
    const [row] = mapHoldersToRankedTraders(
      [buildHolder('a')],
      (profileId) => profileId === 'a',
    );

    expect(row).toEqual(
      expect.objectContaining({
        address: '0xa',
        username: 'a.eth',
        avatarUri: undefined,
        followerCount: 12,
        isFollowing: true,
      }),
    );
  });
});
