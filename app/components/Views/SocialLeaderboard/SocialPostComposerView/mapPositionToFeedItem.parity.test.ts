import type { FeedItem as CoreFeedItem } from '@metamask/social-controllers';
import { mockPerpFeedItem } from '../../../UI/SocialFeed/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../UI/SocialFeed/utils/mapFeedItem';
import { toSocialV1FeedItem } from '../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import type { TraderFeedRow } from '../../../UI/SocialFeed/types';
import { mapPositionToFeedItem } from './mapPositionToFeedItem';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const buildFeedRow = (core: CoreFeedItem): TraderFeedRow => {
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('fixture did not map to a FeedItem');
  }
  return { item, core };
};

const openLeveragedPerp = mockPerpFeedItem({
  positionId: 'btc-perp',
  tokenSymbol: 'BTC',
  tokenName: 'Bitcoin',
  chain: 'hyperliquid',
  tokenAddress: '',
  isOpen: true,
  positionAmount: 0.01,
  positionAmountWithLeverage: 0.4,
  perpPositionType: 'short',
  perpLeverage: 40,
  boughtUsd: 43_000,
  costBasis: 43_000,
  realizedPnl: 0,
  currentValueUSD: 450,
  pnlValueUsd: 42,
  pnlPercent: 9.4,
  trades: [
    {
      direction: 'sell',
      intent: 'enter',
      action: 'opened',
      tokenAmount: 0.01,
      usdCost: 43_000,
      timestamp: 1_700_000_000,
      transactionHash: '0x1',
      classification: 'perp',
      perpPositionType: 'short',
      perpLeverage: 40,
    },
  ],
  lastTradeAt: 1_700_000_000,
  timestamp: 1_700_000_000,
});

describe('mapPositionToFeedItem parity with the feed', () => {
  it('matches the feed mark, entry, and live source for a leveraged perp', () => {
    const feedItem = toSocialV1FeedItem(buildFeedRow(openLeveragedPerp));
    const composerItem = mapPositionToFeedItem(openLeveragedPerp, '', {
      isClosed: false,
    });

    expect(feedItem.variant).toBe('perpsOpen');
    expect(composerItem.variant).toBe('perpsOpen');
    if (
      feedItem.variant !== 'perpsOpen' ||
      composerItem.variant !== 'perpsOpen'
    ) {
      return;
    }
    expect(feedItem.markPriceLabel).toBeDefined();
    expect(composerItem.markPriceLabel).toBe(feedItem.markPriceLabel);
    expect(composerItem.entryPriceLabel).toBe(feedItem.entryPriceLabel);
    expect(composerItem.live).toEqual(feedItem.live);
  });

  it('matches the feed entry from the fills when costBasis is missing', () => {
    const noBasisPerp = { ...openLeveragedPerp, costBasis: null };
    const feedItem = toSocialV1FeedItem(buildFeedRow(noBasisPerp));
    const composerItem = mapPositionToFeedItem(noBasisPerp, '', {
      isClosed: false,
    });

    expect(feedItem.variant).toBe('perpsOpen');
    expect(composerItem.variant).toBe('perpsOpen');
    if (
      feedItem.variant !== 'perpsOpen' ||
      composerItem.variant !== 'perpsOpen'
    ) {
      return;
    }
    expect(feedItem.entryPriceLabel).toBeDefined();
    expect(composerItem.entryPriceLabel).toBe(feedItem.entryPriceLabel);
  });
});
