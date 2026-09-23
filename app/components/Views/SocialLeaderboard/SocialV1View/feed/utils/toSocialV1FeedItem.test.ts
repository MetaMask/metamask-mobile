import type { FeedItem as CoreFeedItem } from '@metamask/social-controllers';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import {
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../../../FeedView/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../FeedView/utils/mapFeedItem';
import { MOCK_MARKER } from '../mockMarker';
import { toSocialV1FeedItem } from './toSocialV1FeedItem';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

/** Runs a raw API row through the real V0 mapper, as the hook does. */
const buildRow = (core: CoreFeedItem): TraderFeedRow => {
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('fixture did not map to a FeedItem');
  }
  return { item, core };
};

const SECOND = 1;
const HOUR_IN_SECONDS = 3600;

describe('toSocialV1FeedItem', () => {
  describe('variant mapping', () => {
    it('maps an open spot row to the open spot card', () => {
      const row = buildRow(mockSpotFeedItem());

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('spotOpen');
    });

    // A fully sold spot position takes the same closed treatment as a closed
    // perp -- hero realized P&L, exit price, no Copy trade.
    it('maps a fully sold spot row to the closed spot card', () => {
      const row = buildRow(
        mockSpotFeedItem({
          isOpen: false,
          positionAmount: 0,
          soldUsd: 130_000,
          // The triggering fill is the one whose timestamp matches the row's,
          // so point the row at the closing fill.
          timestamp: 1_700_086_400,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 1000,
              usdCost: 100_000,
              timestamp: 1_700_000_000,
              transactionHash: '0xa',
              classification: 'spot',
            },
            {
              direction: 'sell',
              intent: 'exit',
              action: 'closed',
              tokenAmount: 1000,
              usdCost: 130_000,
              timestamp: 1_700_086_400,
              transactionHash: '0xb',
              classification: 'spot',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('spotClosed');
    });

    it('maps an open perp row to the open perps card', () => {
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: true,
          positionAmount: 5,
          currentValueUSD: 60000,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 5,
              usdCost: 50600,
              timestamp: 1_700_000_000,
              transactionHash: '0xopen',
              classification: 'perp',
              perpPositionType: 'long',
              perpLeverage: 8,
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsOpen');
    });

    it('maps a closed perp row to the closed perps card', () => {
      const row = buildRow(mockPerpFeedItem({ isOpen: false }));

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsClosed');
    });

    // A partial exit leaves exposure on the table, so the row keeps the open
    // card rather than reading as a completed trade.
    it('keeps a reduced perp position on the open card', () => {
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: true,
          positionAmount: 2,
          currentValueUSD: 24000,
          trades: [
            {
              direction: 'sell',
              intent: 'exit',
              action: 'reduced',
              tokenAmount: 3,
              usdCost: 36000,
              timestamp: 1_700_000_400,
              transactionHash: '0xreduce',
              classification: 'perp',
              perpPositionType: 'long',
              perpLeverage: 8,
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsOpen');
    });
  });

  describe('real fields', () => {
    it('carries the API identity, time and id without a mock marker', () => {
      const core = mockPerpFeedItem();
      const row = buildRow(core);

      const result = toSocialV1FeedItem(row);

      expect(result.id).toBe(`${core.positionId}-${core.timestamp}`);
      expect(result.author.id).toBe(core.actor.profileId);
      expect(result.author.username).toBe(core.actor.name);
      expect(result.author.address).toBe(core.actor.address);
      expect(result.timestamp).toBe(core.timestamp * 1000);
      expect(result.asset.symbol).toBe(core.tokenSymbol);
    });

    it('carries value, P&L and leverage straight from the mapped row', () => {
      const row = buildRow(mockPerpFeedItem());

      const result = toSocialV1FeedItem(row);

      expect(result.valueLabel).toBe(row.item.valueLabel);
      expect(result.valueLabel).not.toContain(MOCK_MARKER);
      expect(result.pnlLabel).toBe(row.item.pnlLabel);
      expect(result.pnlLabel).not.toContain(MOCK_MARKER);
      expect(result.variant === 'perpsClosed' && result.leverageLabel).toBe(
        '8x',
      );
    });

    it('derives an unmarked average entry price from the entry fills', () => {
      // Two entry fills: $50,000 for 10 and $60,000 for 10 -> $5,500 average.
      const row = buildRow(
        mockPerpFeedItem({
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 10,
              usdCost: 50_000,
              timestamp: 1_700_000_000,
              transactionHash: '0xa',
              classification: 'perp',
              perpPositionType: 'long',
            },
            {
              direction: 'buy',
              intent: 'enter',
              action: 'added',
              tokenAmount: 10,
              usdCost: 60_000,
              timestamp: 1_700_000_100,
              transactionHash: '0xb',
              classification: 'perp',
              perpPositionType: 'long',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      // The last fill's `added` action keeps the position open, which is the
      // point: a partial add must not read as a completed trade.
      expect(result.variant).toBe('perpsOpen');
      if (result.variant !== 'perpsOpen') return;
      expect(result.entryPriceLabel).toBe('$5,500');
      expect(result.entryPriceLabel).not.toContain(MOCK_MARKER);
    });

    it('derives an unmarked exit price from the last exit fill', () => {
      // Closing fill: $88,000 for 5 -> $17,600.
      const row = buildRow(mockPerpFeedItem({ isOpen: false }));

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsClosed');
      if (result.variant !== 'perpsClosed') return;
      expect(result.exitPriceLabel).toBe('$17,600');
      expect(result.exitPriceLabel).not.toContain(MOCK_MARKER);
    });

    it('derives an unmarked hold time from the first and last fills', () => {
      const openedAt = 1_700_000_000;
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: false,
          timestamp: openedAt + 8 * HOUR_IN_SECONDS,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 5,
              usdCost: 50_000,
              timestamp: openedAt,
              transactionHash: '0xa',
              classification: 'perp',
              perpPositionType: 'long',
            },
            {
              direction: 'sell',
              intent: 'exit',
              action: 'closed',
              tokenAmount: 5,
              usdCost: 58_000,
              timestamp: openedAt + 8 * HOUR_IN_SECONDS + 30 * SECOND,
              transactionHash: '0xb',
              classification: 'perp',
              perpPositionType: 'long',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsClosed');
      if (result.variant !== 'perpsClosed') return;
      expect(result.holdTimeLabel).toBe('8h');
    });

    it('derives an unmarked hold time for an open spot position', () => {
      const openedAt = 1_700_000_000;
      const now = (openedAt + 8 * HOUR_IN_SECONDS) * 1000;
      const row = buildRow(
        mockSpotFeedItem({
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 1000,
              usdCost: 100_000,
              timestamp: openedAt,
              transactionHash: '0xa',
              classification: 'spot',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row, now);

      expect(result.variant).toBe('spotOpen');
      if (result.variant !== 'spotOpen') return;
      expect(result.holdTimeLabel).toBe('8h');
    });

    // A single closing sell fill puts the row on the closed card, and the side
    // still reads from the action rather than defaulting to buy.
    it('reads the spot side from a sell action', () => {
      const row = buildRow(
        mockSpotFeedItem({
          trades: [
            {
              direction: 'sell',
              intent: 'exit',
              action: 'closed',
              tokenAmount: 1000,
              usdCost: 120_000,
              timestamp: 1_700_000_000,
              transactionHash: '0xhash',
              classification: 'spot',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('spotClosed');
      if (result.variant !== 'spotClosed') return;
      expect(result.side).toBe('sell');
    });
  });

  describe('symbol', () => {
    // `mapFeedItem` strips the HIP-3 dex prefix; the card title must use that
    // display symbol, not the raw market id.
    it('titles a HIP-3 perp with its stripped display symbol', () => {
      const row = buildRow(mockPerpFeedItem({ tokenSymbol: 'xyz:NVDA' }));

      const result = toSocialV1FeedItem(row);

      expect(result.asset.symbol).toBe('NVDA');
    });

    // Icon resolution is the opposite: the MetaMask CDN publishes equities only
    // under the prefixed `hip3:xyz_NVDA` form, so the avatar keeps the raw id.
    it('keeps the raw market id on the avatar for icon resolution', () => {
      const row = buildRow(mockPerpFeedItem({ tokenSymbol: 'xyz:NVDA' }));

      const result = toSocialV1FeedItem(row);

      expect(result.asset.avatar.tokenSymbol).toBe('xyz:NVDA');
    });

    it('titles a spot row with its token symbol', () => {
      const row = buildRow(mockSpotFeedItem());

      const result = toSocialV1FeedItem(row);

      expect(result.asset.symbol).toBe('PEPE');
    });
  });

  describe('mocked fields', () => {
    it('reads the actor win rate as a whole percent and does not mark it', () => {
      const actor = mockPerpFeedItem().actor;
      const row = buildRow(
        mockPerpFeedItem({
          actor: { ...actor, winRate30d: 0.61 },
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.author.winRatePercent).toBe(61);
      expect(result.author.pnl30d).toBeNull();
    });

    it('omits the win rate when the actor has none', () => {
      const result = toSocialV1FeedItem(buildRow(mockPerpFeedItem()));

      expect(result.author.winRatePercent).toBeNull();
    });

    it('marks the invented mark price on an open spot position', () => {
      const row = buildRow(mockSpotFeedItem());

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('spotOpen');
      if (result.variant !== 'spotOpen') return;
      expect(result.markPriceLabel).toContain(MOCK_MARKER);
      expect(result.mockedFields).toContain('markPrice');
    });

    // Spot carries no leverage, so it must never get an auto-close bracket.
    it('omits the auto-close bracket on a spot position', () => {
      const row = buildRow(mockSpotFeedItem());

      const result = toSocialV1FeedItem(row);

      expect(result.mockedFields).not.toContain('autoClose');
    });

    it('marks the invented mark price and auto-close pair on an open perp', () => {
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: true,
          positionAmount: 5,
          currentValueUSD: 60000,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 5,
              usdCost: 50_000,
              timestamp: 1_700_000_000,
              transactionHash: '0xa',
              classification: 'perp',
              perpPositionType: 'long',
              perpLeverage: 8,
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsOpen');
      if (result.variant !== 'perpsOpen') return;
      expect(result.markPriceLabel).toContain(MOCK_MARKER);
      expect(result.autoCloseLabel).toContain(MOCK_MARKER);
      expect(result.mockedFields).toEqual(
        expect.arrayContaining(['markPrice', 'autoClose']),
      );
    });

    // Without a real entry to offset from, inventing a price outright would be
    // a number with no relationship to anything.
    it('omits the mark and auto-close when there is no derivable entry', () => {
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: true,
          positionAmount: 0,
          costBasis: 0,
          currentValueUSD: 60000,
          trades: [],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsOpen');
      if (result.variant !== 'perpsOpen') return;
      expect(result.markPriceLabel).toBeUndefined();
      expect(result.autoCloseLabel).toBeUndefined();
      expect(result.mockedFields).not.toContain('markPrice');
      expect(result.mockedFields).not.toContain('autoClose');
    });

    it('uses the author comment without marking it', () => {
      const row = buildRow(
        mockPerpFeedItem({
          authorComment: {
            uid: 'comment-1',
            text: 'Thesis unchanged.',
            timestamp: 1_700_000_000,
            engagement: {
              reactions: [],
              userReaction: null,
              replyCount: 2,
            },
          },
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.comment).toBe('Thesis unchanged.');
      expect(result.mockedFields).toStrictEqual([]);
    });

    it('omits the caption when the position has no author comment', () => {
      const result = toSocialV1FeedItem(buildRow(mockPerpFeedItem()));

      expect(result.comment).toBeUndefined();
    });
  });

  describe('stored position stats', () => {
    it('prefers the stored entry price over an average of the fills', () => {
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: true,
          positionAmount: 5,
          entryPriceUsd: 9_000,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 5,
              usdCost: 50_000,
              timestamp: 1_700_000_000,
              transactionHash: '0xa',
              classification: 'perp',
              perpPositionType: 'long',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsOpen');
      if (result.variant !== 'perpsOpen') return;
      expect(result.entryPriceLabel).toBe('$9,000');
    });

    // An open hold grows every second, so the API sends only the anchor and
    // the clock is ours. `firstTradeAt` comes off the position row, so it
    // predates any fill the 50-trade cap dropped.
    it('counts an open hold from firstTradeAt, not the loaded fills', () => {
      const openedAt = 1_700_000_000;
      const now = (openedAt + 10 * HOUR_IN_SECONDS) * 1000;
      const row = buildRow(
        mockSpotFeedItem({
          firstTradeAt: openedAt,
          holdTimeMs: null,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 1000,
              usdCost: 100_000,
              // A later top-up: the only fill on the page, and not the open.
              timestamp: openedAt + 8 * HOUR_IN_SECONDS,
              transactionHash: '0xa',
              classification: 'spot',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row, now);

      expect(result.variant).toBe('spotOpen');
      if (result.variant !== 'spotOpen') return;
      expect(result.holdTimeLabel).toBe('10h');
    });

    it('keeps an open hold ticking as time passes', () => {
      const openedAt = 1_700_000_000;
      const row = buildRow(
        mockSpotFeedItem({ firstTradeAt: openedAt, holdTimeMs: null }),
      );

      const afterOneHour = toSocialV1FeedItem(
        row,
        (openedAt + HOUR_IN_SECONDS) * 1000,
      );
      const afterFiveHours = toSocialV1FeedItem(
        row,
        (openedAt + 5 * HOUR_IN_SECONDS) * 1000,
      );

      expect(afterOneHour.variant).toBe('spotOpen');
      if (afterOneHour.variant !== 'spotOpen') return;
      expect(afterFiveHours.variant).toBe('spotOpen');
      if (afterFiveHours.variant !== 'spotOpen') return;
      expect(afterOneHour.holdTimeLabel).toBe('1h');
      expect(afterFiveHours.holdTimeLabel).toBe('5h');
    });

    it('uses the reported hold time once the position is closed', () => {
      const openedAt = 1_700_000_000;
      const row = buildRow(
        mockPerpFeedItem({
          isOpen: false,
          holdTimeMs: 10 * HOUR_IN_SECONDS * 1000,
          trades: [
            {
              direction: 'buy',
              intent: 'enter',
              action: 'opened',
              tokenAmount: 5,
              usdCost: 50_000,
              timestamp: openedAt,
              transactionHash: '0xa',
              classification: 'perp',
              perpPositionType: 'long',
            },
            {
              direction: 'sell',
              intent: 'exit',
              action: 'closed',
              tokenAmount: 5,
              usdCost: 58_000,
              timestamp: openedAt + 2 * HOUR_IN_SECONDS,
              transactionHash: '0xb',
              classification: 'perp',
              perpPositionType: 'long',
            },
          ],
        }),
      );

      const result = toSocialV1FeedItem(row);

      expect(result.variant).toBe('perpsClosed');
      if (result.variant !== 'perpsClosed') return;
      expect(result.holdTimeLabel).toBe('10h');
    });
  });

  describe('determinism', () => {
    it('keeps the win rate the API sent for that trader', () => {
      const actor = mockPerpFeedItem().actor;
      const first = toSocialV1FeedItem(
        buildRow(
          mockPerpFeedItem({
            positionId: 'pos-a',
            actor: { ...actor, winRate30d: 0.61 },
          }),
        ),
      );
      const second = toSocialV1FeedItem(
        buildRow(
          mockPerpFeedItem({
            positionId: 'pos-b',
            actor: { ...actor, winRate30d: 0.61 },
          }),
        ),
      );

      expect(second.author.winRatePercent).toBe(first.author.winRatePercent);
      expect(first.author.winRatePercent).toBe(61);
    });

    it('keeps each trader on their own win rate', () => {
      const actor = mockPerpFeedItem().actor;
      const alice = toSocialV1FeedItem(
        buildRow(
          mockPerpFeedItem({
            actor: { ...actor, profileId: 'profile-alice', winRate30d: 0.61 },
          }),
        ),
      );
      const bob = toSocialV1FeedItem(
        buildRow(
          mockPerpFeedItem({
            actor: { ...actor, profileId: 'profile-bob', winRate30d: 0.42 },
          }),
        ),
      );

      expect(alice.author.winRatePercent).toBe(61);
      expect(bob.author.winRatePercent).toBe(42);
    });

    it('gives the same trader and symbol the same auto-close pair', () => {
      const openPosition = {
        isOpen: true,
        positionAmount: 5,
        currentValueUSD: 60000,
        trades: [
          {
            direction: 'buy' as const,
            intent: 'enter' as const,
            action: 'opened' as const,
            tokenAmount: 5,
            usdCost: 50_000,
            timestamp: 1_700_000_000,
            transactionHash: '0xa',
            classification: 'perp' as const,
            perpPositionType: 'long' as const,
            perpLeverage: 8,
          },
        ],
      };
      const first = toSocialV1FeedItem(
        buildRow(mockPerpFeedItem({ ...openPosition, positionId: 'pos-a' })),
      );
      const second = toSocialV1FeedItem(
        buildRow(mockPerpFeedItem({ ...openPosition, positionId: 'pos-b' })),
      );

      expect(first.variant).toBe('perpsOpen');
      expect(second.variant).toBe('perpsOpen');
      if (first.variant !== 'perpsOpen' || second.variant !== 'perpsOpen') {
        return;
      }
      expect(second.autoCloseLabel).toBe(first.autoCloseLabel);
      expect(second.markPriceLabel).toBe(first.markPriceLabel);
    });
  });
});
