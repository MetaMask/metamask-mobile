import type {
  FeedItem as CoreFeedItem,
  Trade,
} from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import {
  formatHoldDuration,
  formatTradeUnitPrice,
} from '../../../utils/formatters';
import { isEntryAction } from '../../../utils/tradeAction';
import { tradeTimestampToMs } from '../../../utils/tradeTimestamp';
import { markMocked, type SocialV1MockedField } from '../mockMarker';
import { mockAutoClose, mockMarkPrice } from '../mocks/socialV1Enrichment';
import { splitKlipyGifFromCommentText } from '../../../utils/klipyGifComment';
import { readAuthorComment } from '../reactions';
import type { SocialV1FeedItem, SocialV1SpotSide } from '../types';
import { asFeedCardItem, toWholePercent } from './feedCardStats';

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
  const storedEntry = asFeedCardItem(core).entryPriceUsd;
  if (isPresentNumber(storedEntry) && storedEntry > 0) {
    return storedEntry;
  }

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

/**
 * How long the position has been held, in milliseconds.
 *
 * A closed position has a final span, and the API sends it as `holdTimeMs`.
 * An open one keeps running, so the API sends only `firstTradeAt` and the
 * clock is ours -- a server-computed number would be stale by the time it
 * rendered, and staler still the longer the page stays on screen.
 *
 * Both API fields come from the position row, so they are right even when the
 * fill history was truncated. Deriving from the fills is the fallback for
 * responses that predate them.
 */
const deriveHoldDurationMs = (
  core: CoreFeedItem,
  isClosed: boolean,
  now: number,
): number | null => {
  const { firstTradeAt, holdTimeMs } = asFeedCardItem(core);

  if (isClosed && isPresentNumber(holdTimeMs) && holdTimeMs > 0) {
    return holdTimeMs;
  }

  if (!isClosed && isPresentNumber(firstTradeAt)) {
    const span = now - tradeTimestampToMs(firstTradeAt);
    return span > 0 ? span : null;
  }

  const timestamps = (core.trades ?? []).map((trade) =>
    tradeTimestampToMs(trade.timestamp),
  );

  if (timestamps.length === 0) {
    return null;
  }

  const first = Math.min(...timestamps);
  const span = (isClosed ? Math.max(...timestamps) : now) - first;
  return span > 0 ? span : null;
};

const toLeverageLabel = (item: {
  leverage: number | null;
}): string | undefined =>
  item.leverage == null ? undefined : `${item.leverage}x`;

/**
 * Name worth showing on a hot-token chip. Drops blanks, raw market ids
 * (`xyz:NVDA`), and ticker case-variants (`ETH`, `eth`) so the chip falls
 * back to the display symbol. A mixed-case name that shares the ticker's
 * letters (`Pepe`) is kept.
 */
const toAssetName = (
  name: string | null | undefined,
  symbol: string,
): string | undefined => {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.includes(':')) {
    return undefined;
  }
  const sameLetters = trimmed.toUpperCase() === symbol.toUpperCase();
  const isTickerCase =
    trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase();
  if (sameLetters && isTickerCase) {
    return undefined;
  }
  return trimmed;
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
 * Identity, time, symbol, direction, leverage, value, P&L, the author's win
 * rate and caption, entry (when position metrics stored one) and hold time
 * come from the row. Mark price and the perp auto-close bracket are still
 * invented, and each invented value is recorded in `mockedFields`.
 */
export function toSocialV1FeedItem(
  row: TraderFeedRow,
  now: number = Date.now(),
): SocialV1FeedItem {
  const { item, core } = row;
  const card = asFeedCardItem(core);
  const mockedFields: SocialV1MockedField[] = [];

  const author = {
    id: item.traderId,
    username: item.username,
    address: item.traderAddress,
    avatarUri: item.avatarUri ?? null,
    winRatePercent: toWholePercent(card.actor.winRate30d),
    pnl30d: card.actor.pnl30d ?? null,
    tradeCount30d: card.actor.tradeCount30d ?? null,
    followerCount: card.actor.followerCount ?? null,
  };

  const authorComment = readAuthorComment(core);
  const { text: commentText } = splitKlipyGifFromCommentText(
    authorComment?.text ?? '',
  );
  const comment = commentText || undefined;

  // Display symbol for the title, raw market id for the avatar. `mapFeedItem`
  // already strips the HIP-3 dex prefix into `marketSymbol` (`xyz:NVDA` ->
  // `NVDA`), while icon resolution needs the prefixed form -- the MetaMask
  // icon CDN publishes equities only under `hip3:xyz_NVDA`.
  const displaySymbol =
    item.type === 'perps' ? item.marketSymbol : item.tokenSymbol;
  const assetName = toAssetName(
    item.type === 'spot' ? item.tokenName : core.tokenName,
    displaySymbol,
  );

  const base = {
    id: item.id,
    author,
    timestamp: item.timestamp,
    asset: {
      symbol: displaySymbol,
      ...(assetName ? { name: assetName } : {}),
      avatar: item.tokenAvatar,
    },
    comment,
    valueLabel: item.valueLabel,
    pnlLabel: item.pnlLabel,
    isPnlPositive: item.isPnlPositive,
    mockedFields,
  };

  const entryPrice = deriveAverageEntryPrice(core);
  const entryPriceLabel =
    entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice);
  const isSpot = item.type === 'spot';

  if (item.isClosed) {
    const exitPrice = deriveExitPrice(core);
    const holdDurationMs = deriveHoldDurationMs(core, true, now);
    const closed = {
      ...base,
      entryPriceLabel,
      exitPriceLabel:
        exitPrice == null ? undefined : formatTradeUnitPrice(exitPrice),
      holdTimeLabel:
        holdDurationMs == null ? undefined : formatHoldDuration(holdDurationMs),
      statusLabel: strings('social_leaderboard.feed.position_card.closed'),
    };

    return isSpot
      ? {
          ...closed,
          variant: 'spotClosed',
          side: toSpotSide(core, item.action),
        }
      : {
          ...closed,
          variant: 'perpsClosed',
          direction: item.direction,
          leverageLabel: toLeverageLabel(item),
        };
  }

  const markPrice = mockMarkPrice(item.traderId, base.asset.symbol, entryPrice);
  if (markPrice != null) {
    mockedFields.push('markPrice');
  }
  const markPriceLabel =
    markPrice == null ? undefined : markMocked(formatTradeUnitPrice(markPrice));

  if (isSpot) {
    const holdDurationMs = deriveHoldDurationMs(core, false, now);

    return {
      ...base,
      variant: 'spotOpen',
      side: toSpotSide(core, item.action),
      markPriceLabel,
      entryPriceLabel,
      holdTimeLabel:
        holdDurationMs == null ? undefined : formatHoldDuration(holdDurationMs),
    };
  }

  const autoClose = mockAutoClose(
    item.traderId,
    base.asset.symbol,
    entryPrice,
    item.direction,
  );
  if (autoClose) {
    mockedFields.push('autoClose');
  }

  return {
    ...base,
    variant: 'perpsOpen',
    direction: item.direction,
    leverageLabel: toLeverageLabel(item),
    markPriceLabel,
    entryPriceLabel,
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
/**
 * Maps a page of loaded rows, preserving order. One `now` for the whole page so
 * every open position's hold time is measured against the same instant.
 */
export const toSocialV1FeedItems = (
  rows: TraderFeedRow[],
  now: number = Date.now(),
): SocialV1FeedItem[] => rows.map((row) => toSocialV1FeedItem(row, now));
