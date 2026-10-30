import type {
  FeedItem as CoreFeedItem,
  Position,
  Trade,
} from '@metamask/social-controllers';
import type {
  TraderFeedRow,
  SocialV1FeedItem,
  SocialV1SpotSide,
} from '../types';
import {
  formatAbbreviatedUsd,
  formatHoldDuration,
  formatSignedAbbreviatedUsd,
  formatTradeUnitPrice,
  formatUsd,
} from './formatters';
import { isEntryAction } from './tradeAction';
import { tradeTimestampToMs } from './tradeTimestamp';
import { buildLivePriceSource } from '../live/buildLivePriceSource';
import { splitKlipyGifFromCommentText } from './klipyGifComment';
import { readAuthorComment } from '../reactions';
import { asFeedCardItem, toWholePercent } from './feedCardStats';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

export const toUnitPrice = (trade: Trade): number | null => {
  const tokenAmount = Math.abs(trade.tokenAmount);
  if (tokenAmount <= 0) {
    return null;
  }
  const price = Math.abs(trade.usdCost) / tokenAmount;
  return price > 0 ? price : null;
};

/**
 * Average entry price of the position.
 *
 * While it is open that is `costBasis / positionAmount`: the basis its P&L is
 * measured against, which also prices tokens the trader received rather than
 * bought. The API's `entryPriceUsd` drops that received half, so it is not
 * read. Once closed `positionAmount` is 0, so the entry is averaged over the
 * fills that grew the position instead.
 */
export const deriveAverageEntryPrice = (core: Position): number | null => {
  if (
    core.isOpen !== false &&
    isPresentNumber(core.costBasis) &&
    core.costBasis > 0 &&
    core.positionAmount > 0
  ) {
    return core.costBasis / core.positionAmount;
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

  return null;
};

/** Price of the fill that closed the position -- its last exit fill. */
export const deriveExitPrice = (core: Position): number | null => {
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
 * Current unit price of an open position: what the remaining holdings are
 * worth over how many there are. `null` once the position is closed, or when
 * the row omitted its current value.
 */
export const deriveCurrentPrice = (core: Position): number | null =>
  isPresentNumber(core.currentValueUSD) && core.positionAmount > 0
    ? core.currentValueUSD / core.positionAmount
    : null;

/**
 * Market cap per unit of price, read off the latest fill that recorded both.
 * Constant while supply is, so any price on this position scales into a
 * market cap -- the same ratio the position details sheet charts against.
 */
export const deriveMarketCapPerPrice = (core: Position): number | null => {
  const fills = [...(core.trades ?? [])].sort(
    (a, b) => tradeTimestampToMs(b.timestamp) - tradeTimestampToMs(a.timestamp),
  );
  for (const trade of fills) {
    const unitPrice = toUnitPrice(trade);
    if (isPresentNumber(trade.marketCap) && trade.marketCap > 0 && unitPrice) {
      return trade.marketCap / unitPrice;
    }
  }
  return null;
};

export const toMarketCapLabel = (
  marketCapPerPrice: number | null,
  price: number | null,
): string | undefined =>
  marketCapPerPrice == null || price == null
    ? undefined
    : formatAbbreviatedUsd(marketCapPerPrice * price);

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
 * Every figure comes from the row. Open positions also carry a `live` source
 * so the card can follow a streamed price from these snapshot values.
 */
export function toSocialV1FeedItem(
  row: TraderFeedRow,
  now: number = Date.now(),
): SocialV1FeedItem {
  const { item, core } = row;
  const card = asFeedCardItem(core);

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
  const { text: commentText, gifUrl: commentGifUrl } =
    splitKlipyGifFromCommentText(authorComment?.text ?? '');
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
    ...(commentGifUrl ? { commentGifUrl } : {}),
    valueLabel: item.valueLabel,
    pnlLabel: item.pnlLabel,
    // Abbreviated: the open card puts this under the percent in a column capped
    // at 45% of the row, where a full `+$280,638.23` would not fit.
    pnlValueLabel: isPresentNumber(core.pnlValueUsd)
      ? formatSignedAbbreviatedUsd(core.pnlValueUsd)
      : undefined,
    // `boughtUsd` is what the P&L percent is already measured against, so a
    // card's Cost and its percent agree by construction.
    costLabel: isPresentNumber(core.boughtUsd)
      ? formatUsd(Math.abs(core.boughtUsd))
      : undefined,
    isPnlPositive: item.isPnlPositive,
  };

  const entryPrice = deriveAverageEntryPrice(core);
  const entryPriceLabel =
    entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice);
  const isSpot = item.type === 'spot';
  const marketCapPerPrice = isSpot ? deriveMarketCapPerPrice(core) : null;
  const holdDurationMs = deriveHoldDurationMs(
    core,
    Boolean(item.isClosed),
    now,
  );
  const holdTimeLabel =
    holdDurationMs == null ? undefined : formatHoldDuration(holdDurationMs);

  if (item.isClosed) {
    const exitPrice = deriveExitPrice(core);
    const closed = {
      ...base,
      entryPriceLabel,
      exitPriceLabel:
        exitPrice == null ? undefined : formatTradeUnitPrice(exitPrice),
      holdTimeLabel,
      closedAtMs: isPresentNumber(core.lastTradeAt)
        ? tradeTimestampToMs(core.lastTradeAt)
        : undefined,
    };

    return isSpot
      ? {
          ...closed,
          variant: 'spotClosed',
          side: toSpotSide(core, item.action),
          entryMarketCapLabel: toMarketCapLabel(marketCapPerPrice, entryPrice),
          exitMarketCapLabel: toMarketCapLabel(marketCapPerPrice, exitPrice),
        }
      : {
          ...closed,
          variant: 'perpsClosed',
          direction: item.direction,
          leverageLabel: toLeverageLabel(item),
        };
  }

  const currentPrice = deriveCurrentPrice(core);
  const live = buildLivePriceSource(core, false, {
    snapshotPrice: currentPrice,
    entryPrice,
    marketCapPerPrice,
  });

  if (isSpot) {
    return {
      ...base,
      variant: 'spotOpen',
      side: toSpotSide(core, item.action),
      markPriceLabel:
        currentPrice == null ? undefined : formatTradeUnitPrice(currentPrice),
      marketCapLabel: toMarketCapLabel(marketCapPerPrice, currentPrice),
      entryPriceLabel,
      entryMarketCapLabel: toMarketCapLabel(marketCapPerPrice, entryPrice),
      holdTimeLabel,
      ...(live ? { live } : {}),
    };
  }

  return {
    ...base,
    variant: 'perpsOpen',
    direction: item.direction,
    tradeSymbol: item.tradeSymbol,
    leverage: item.leverage ?? undefined,
    leverageLabel: toLeverageLabel(item),
    markPriceLabel:
      currentPrice == null ? undefined : formatTradeUnitPrice(currentPrice),
    entryPriceLabel,
    holdTimeLabel,
    ...(live ? { live } : {}),
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
