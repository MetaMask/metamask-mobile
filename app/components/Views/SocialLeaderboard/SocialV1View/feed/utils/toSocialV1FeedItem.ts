import type {
  FeedItem as CoreFeedItem,
  Trade,
} from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import {
  formatAbbreviatedUsd,
  formatHoldDuration,
  formatTradeUnitPrice,
} from '../../../utils/formatters';
import { isEntryAction } from '../../../utils/tradeAction';
import { tradeTimestampToMs } from '../../../utils/tradeTimestamp';
import { markMocked, type SocialV1MockedField } from '../mockMarker';
import {
  mockAutoClose,
  mockComment,
  mockMarkPrice,
  mockSpotVolumeUsd,
  mockWinRatePercent,
} from '../mocks/socialV1Enrichment';
import type {
  SocialV1FeedItem,
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

const toUnitPrice = (trade: Trade): number | null => {
  const tokenAmount = Math.abs(trade.tokenAmount);
  if (tokenAmount <= 0) {
    return null;
  }
  const price = Math.abs(trade.usdCost) / tokenAmount;
  return price > 0 ? price : null;
};

/**
 * Average entry price across every fill that grew the position -- the honest
 * figure, since a position built over several fills has no single entry.
 *
 * Prefers the fills because they survive a full close: once a position is
 * closed `positionAmount` is 0, so `costBasis / positionAmount` is unusable.
 * That ratio is the fallback for rows whose fill history did not come through.
 */
const deriveAverageEntryPrice = (core: CoreFeedItem): number | null => {
  const entryFills = (core.trades ?? []).filter(
    (trade) => trade.intent === 'enter',
  );

  const totals = entryFills.reduce(
    (accumulator, trade) => ({
      usd: accumulator.usd + Math.abs(trade.usdCost),
      tokens: accumulator.tokens + Math.abs(trade.tokenAmount),
    }),
    { usd: 0, tokens: 0 },
  );

  if (totals.tokens > 0 && totals.usd > 0) {
    return totals.usd / totals.tokens;
  }

  if (isPresentNumber(core.costBasis) && core.positionAmount > 0) {
    return Math.abs(core.costBasis) / core.positionAmount;
  }

  return null;
};

/** Price of the fill that closed the position -- its last exit fill. */
const deriveExitPrice = (core: CoreFeedItem): number | null => {
  const exitFills = (core.trades ?? []).filter(
    (trade) => trade.intent === 'exit',
  );

  if (exitFills.length === 0) {
    return null;
  }

  const lastExit = exitFills.reduce((latest, trade) =>
    tradeTimestampToMs(trade.timestamp) > tradeTimestampToMs(latest.timestamp)
      ? trade
      : latest,
  );

  return toUnitPrice(lastExit);
};

/** Span from the first fill to the last, in milliseconds. */
const deriveHoldDurationMs = (core: CoreFeedItem): number | null => {
  const timestamps = (core.trades ?? []).map((trade) =>
    tradeTimestampToMs(trade.timestamp),
  );

  if (timestamps.length < 2) {
    return null;
  }

  const span = Math.max(...timestamps) - Math.min(...timestamps);
  return span > 0 ? span : null;
};

/**
 * Market cap at fill time, from the triggering spot fill. Real API data, so it
 * is never marked -- it is historical rather than live, which is exactly what
 * V0's sub-header already shows.
 */
const deriveSpotMarketCap = (core: CoreFeedItem): number | null => {
  const withMarketCap = (core.trades ?? []).find(
    (trade) => trade.marketCap != null,
  );
  return withMarketCap?.marketCap ?? null;
};

const toSpotSide = (core: CoreFeedItem, action?: string): SocialV1SpotSide => {
  if (action) {
    return isEntryAction(action as Parameters<typeof isEntryAction>[0])
      ? 'buy'
      : 'sell';
  }
  // No lifecycle action on older payloads: fall back to the latest fill's own
  // direction rather than defaulting to 'buy' and mislabelling a sale.
  const trades = core.trades ?? [];
  const lastTrade = trades[trades.length - 1];
  return lastTrade?.direction === 'sell' ? 'sell' : 'buy';
};

/**
 * Maps one loaded feed row into the V1 card model.
 *
 * Everything the API reports -- identity, time, symbol, direction, leverage,
 * value, P&L, open vs closed -- comes straight from the row, as does anything
 * derivable from its fills. Only genuinely absent values are invented, and each
 * one is recorded in `mockedFields` and rendered with a `*` suffix.
 */
export function toSocialV1FeedItem(row: TraderFeedRow): SocialV1FeedItem {
  const { item, core } = row;
  const mockedFields: SocialV1MockedField[] = [];

  const author = {
    id: item.traderId,
    username: item.username,
    address: item.traderAddress,
    avatarUri: item.avatarUri ?? null,
    winRatePercent: mockWinRatePercent(item.traderId),
  };
  mockedFields.push('winRate');

  const comment = mockComment(item.traderId, core.positionId);
  if (comment) {
    mockedFields.push('comment');
  }

  const base = {
    id: item.id,
    author,
    timestamp: item.timestamp,
    asset: { symbol: item.tokenAvatar.tokenSymbol, avatar: item.tokenAvatar },
    comment: comment ? markMocked(comment) : undefined,
    valueLabel: item.valueLabel,
    pnlLabel: item.pnlLabel,
    isPnlPositive: item.isPnlPositive,
    mockedFields,
  };

  if (item.type === 'spot') {
    const marketCap = deriveSpotMarketCap(core);
    mockedFields.push('volume');

    return {
      ...base,
      variant: 'spotCompact',
      side: toSpotSide(core, item.action),
      marketCapLabel:
        marketCap == null ? undefined : formatAbbreviatedUsd(marketCap),
      volumeLabel: markMocked(
        formatAbbreviatedUsd(mockSpotVolumeUsd(base.asset.symbol)),
      ),
    };
  }

  const direction: SocialV1PerpDirection = item.direction;
  const leverageLabel = item.leverage == null ? undefined : `${item.leverage}x`;
  const entryPrice = deriveAverageEntryPrice(core);
  const entryPriceLabel =
    entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice);

  if (item.isClosed) {
    const exitPrice = deriveExitPrice(core);
    const holdDurationMs = deriveHoldDurationMs(core);

    return {
      ...base,
      variant: 'perpsClosed',
      direction,
      leverageLabel,
      entryPriceLabel,
      exitPriceLabel:
        exitPrice == null ? undefined : formatTradeUnitPrice(exitPrice),
      holdTimeLabel:
        holdDurationMs == null ? undefined : formatHoldDuration(holdDurationMs),
      statusLabel: strings('social_leaderboard.feed.position_card.closed'),
    };
  }

  const markPrice = mockMarkPrice(item.traderId, base.asset.symbol, entryPrice);
  if (markPrice != null) {
    mockedFields.push('markPrice');
  }

  const autoClose = mockAutoClose(
    item.traderId,
    base.asset.symbol,
    entryPrice,
    direction,
  );
  if (autoClose) {
    mockedFields.push('autoClose');
  }

  return {
    ...base,
    variant: 'perpsOpen',
    direction,
    leverageLabel,
    entryPriceLabel,
    markPriceLabel:
      markPrice == null
        ? undefined
        : markMocked(formatTradeUnitPrice(markPrice)),
    autoCloseLabel: autoClose
      ? markMocked(
          strings('social_leaderboard.feed.position_card.auto_close_pair', {
            takeProfit: formatTradeUnitPrice(autoClose.takeProfit),
            stopLoss: formatTradeUnitPrice(autoClose.stopLoss),
          }),
        )
      : undefined,
  };
}

/** Maps a page of loaded rows, preserving order. */
export const toSocialV1FeedItems = (
  rows: TraderFeedRow[],
): SocialV1FeedItem[] => rows.map(toSocialV1FeedItem);
