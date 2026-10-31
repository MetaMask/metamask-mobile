import type { Position } from '@metamask/social-controllers';
import {
  formatPercent,
  formatSignedAbbreviatedUsd,
  formatSignedUsd,
  formatTradeUnitPrice,
  formatUsd,
} from '../../../UI/SocialFeed/utils/formatters';
import {
  getPerpPositionDirection,
  getSupportedXyzPerpMarketSymbol,
  isClosedPosition,
  isPerpPosition,
} from '../../../UI/SocialFeed/utils/perp';
import { tradeTimestampToMs } from '../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  deriveAverageEntryPrice,
  deriveCurrentPrice,
  deriveExitPrice,
  deriveMarketCapPerPrice,
  toMarketCapLabel,
} from '../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import { buildLivePriceSource } from '../../../UI/SocialFeed/live/buildLivePriceSource';
import { isKlipyStaticGifUrl } from '../../../UI/SocialFeed/utils/klipyGifComment';
import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../../../UI/SocialFeed/types';
import { holdDurationFromTimestamps } from './formatHoldDuration';

const leverageLabel = (position: Position): string | undefined => {
  if (position.perpLeverage == null) {
    return undefined;
  }
  return `${position.perpLeverage}x`;
};

const entryPriceLabel = (position: Position): string | undefined => {
  const entryPrice = deriveAverageEntryPrice(position);
  return entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice);
};

/** What the trader put in -- the figure a card's P&L is measured against. */
const costLabel = (position: Position): string | undefined => {
  const cost = position.boughtUsd ?? position.costBasis;
  if (cost == null || cost <= 0) {
    return undefined;
  }
  return formatUsd(cost);
};

/** P&L in USD, abbreviated to fit the open card's capped right-hand column. */
const pnlValueLabel = (position: Position): string | undefined =>
  position.pnlValueUsd == null
    ? undefined
    : formatSignedAbbreviatedUsd(position.pnlValueUsd);

const markPriceLabel = (position: Position): string | undefined => {
  const markPrice = deriveCurrentPrice(position);
  return markPrice == null ? undefined : formatTradeUnitPrice(markPrice);
};

const earliestTradeTimestamp = (position: Position): number => {
  if (position.trades.length === 0) {
    return position.lastTradeAt;
  }
  return position.trades.reduce(
    (earliest, trade) =>
      trade.timestamp < earliest ? trade.timestamp : earliest,
    position.trades[0].timestamp,
  );
};

const holdTimeLabel = (position: Position, isClosed: boolean): string => {
  const start = earliestTradeTimestamp(position);
  const end = isClosed
    ? position.lastTradeAt
    : Math.max(tradeTimestampToMs(position.lastTradeAt), Date.now());
  return holdDurationFromTimestamps(start, end);
};

const pnlSignSource = (
  position: Position,
  isClosed: boolean,
): number | null => {
  if (isPerpPosition(position)) {
    return position.pnlValueUsd ?? position.realizedPnl ?? null;
  }
  if (isClosed) {
    return position.realizedPnl;
  }
  return position.pnlValueUsd ?? position.pnlPercent ?? null;
};

/** Stand-in until the composer has a real authenticated social profile. */
export const COMPOSER_FEED_AUTHOR: SocialV1FeedAuthor = {
  id: 'current-user',
  username: 'giga-whale',
  winRatePercent: 78,
};

/**
 * The live price source an open feed row gets, built from the same snapshot
 * figures so the composer card ticks like the feed. Spot shares quote a price
 * rather than a market cap, so no market-cap basis is passed.
 */
const openLiveSource = (position: Position) =>
  buildLivePriceSource(position, false, {
    snapshotPrice: deriveCurrentPrice(position),
    entryPrice: deriveAverageEntryPrice(position),
    marketCapPerPrice: null,
  });

/** `commentGifUrl` only for a GIF the feed can render. */
export const commentGifField = (
  commentGifUrl?: string,
): { commentGifUrl?: string } =>
  commentGifUrl && isKlipyStaticGifUrl(commentGifUrl)
    ? { commentGifUrl: commentGifUrl.trim() }
    : {};

export interface MapPositionToFeedItemOptions {
  isClosed?: boolean;
  author?: SocialV1FeedAuthor;
  timestamp?: number;
  /** KLIPY GIF attached to the caption, carried so a GIF-only post still reads as commented. */
  commentGifUrl?: string;
  /** Off for a static preview: an open card then carries no live source to tick. Defaults to on. */
  liveTicks?: boolean;
}

/**
 * Maps a social-API position into the V1 feed card model so the composer
 * preview and the mocked Trending insert share one card implementation.
 */
export const mapPositionToFeedItem = (
  position: Position,
  comment: string,
  options?: MapPositionToFeedItemOptions,
): SocialV1FeedItem => {
  const closed = options?.isClosed ?? isClosedPosition(position);
  const isPerp = isPerpPosition(position);
  const pnlSource = pnlSignSource(position, closed);
  const isPnlPositive = pnlSource == null ? true : pnlSource >= 0;
  const pnlLabel = formatPercent(position.pnlPercent);
  const displaySymbol = position.tokenSymbol;
  const avatar = {
    positionId: position.positionId,
    chain: position.chain,
    tokenAddress: position.tokenAddress,
    tokenImageUrl: position.tokenImageUrl ?? null,
    tokenSymbol: position.tokenSymbol,
  };
  const id = `composer-${position.positionId}`;
  const author = options?.author ?? COMPOSER_FEED_AUTHOR;
  const timestamp = options?.timestamp ?? Date.now();
  const gif = commentGifField(options?.commentGifUrl);
  const liveTicks = options?.liveTicks ?? true;

  if (isPerp) {
    const direction = getPerpPositionDirection(position) ?? 'long';
    if (closed) {
      // Entry and exit come from the fills, as the feed derives them for a
      // closed row: a closed position has no amount left to divide by.
      const entryPrice = deriveAverageEntryPrice(position);
      const exitPrice = deriveExitPrice(position);
      return {
        id,
        author,
        timestamp,
        variant: 'perpsClosed',
        comment,
        ...gif,
        asset: { symbol: displaySymbol, avatar },
        direction,
        leverageLabel: leverageLabel(position),
        valueLabel: formatSignedUsd(
          position.pnlValueUsd ?? position.realizedPnl,
        ),
        pnlLabel,
        isPnlPositive,
        entryPriceLabel:
          entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice),
        exitPriceLabel:
          exitPrice == null ? undefined : formatTradeUnitPrice(exitPrice),
        holdTimeLabel: holdTimeLabel(position, true),
        costLabel: costLabel(position),
        closedAtMs: tradeTimestampToMs(position.lastTradeAt),
      };
    }

    const live = liveTicks ? openLiveSource(position) : undefined;
    return {
      id,
      author,
      timestamp,
      variant: 'perpsOpen',
      tradeSymbol: getSupportedXyzPerpMarketSymbol(position.tokenSymbol)
        .targetSymbol,
      comment,
      ...gif,
      asset: { symbol: displaySymbol, avatar },
      direction,
      markPriceLabel: markPriceLabel(position),
      leverageLabel: leverageLabel(position),
      entryPriceLabel: entryPriceLabel(position),
      valueLabel: formatUsd(position.currentValueUSD ?? null),
      pnlLabel,
      pnlValueLabel: pnlValueLabel(position),
      costLabel: costLabel(position),
      isPnlPositive,
      ...(live ? { live } : {}),
    };
  }

  const side = position.positionAmount < 0 ? 'sell' : 'buy';

  if (closed) {
    // A closed position has no amount left, so entry and exit come from its
    // fills, the same way the feed derives them for a closed spot row.
    const entryPrice = deriveAverageEntryPrice(position);
    const exitPrice = deriveExitPrice(position);
    const marketCapPerPrice = deriveMarketCapPerPrice(position);
    return {
      id,
      author,
      timestamp,
      variant: 'spotClosed',
      comment,
      ...gif,
      asset: { symbol: displaySymbol, avatar },
      side,
      valueLabel: formatSignedUsd(position.realizedPnl),
      pnlLabel,
      pnlValueLabel: pnlValueLabel(position),
      costLabel: costLabel(position),
      isPnlPositive,
      entryPriceLabel:
        entryPrice == null ? undefined : formatTradeUnitPrice(entryPrice),
      entryMarketCapLabel: toMarketCapLabel(marketCapPerPrice, entryPrice),
      exitPriceLabel:
        exitPrice == null ? undefined : formatTradeUnitPrice(exitPrice),
      exitMarketCapLabel: toMarketCapLabel(marketCapPerPrice, exitPrice),
      holdTimeLabel: holdTimeLabel(position, true),
      closedAtMs: tradeTimestampToMs(position.lastTradeAt),
    };
  }

  // A short spot carries a negative amount, which the price helpers read as no holding.
  const heldSpot = {
    ...position,
    positionAmount: Math.abs(position.positionAmount),
  };
  const live = liveTicks ? openLiveSource(heldSpot) : undefined;
  return {
    id,
    author,
    timestamp,
    variant: 'spotShare',
    comment,
    ...gif,
    asset: { symbol: displaySymbol, avatar },
    side,
    markPriceLabel: markPriceLabel(heldSpot),
    valueLabel: formatUsd(position.currentValueUSD ?? null),
    pnlLabel,
    pnlValueLabel: pnlValueLabel(position),
    costLabel: costLabel(position),
    isPnlPositive,
    entryPriceLabel: entryPriceLabel(heldSpot),
    holdTimeLabel: holdTimeLabel(position, false),
    showCopyTrade: true,
    ...(live ? { live } : {}),
  };
};
