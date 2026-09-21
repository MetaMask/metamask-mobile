import type { Position } from '@metamask/social-controllers';
import {
  formatPercent,
  formatSignedUsd,
  formatTradeUnitPrice,
  formatUsd,
} from '../utils/formatters';
import {
  getPerpPositionDirection,
  isClosedPosition,
  isPerpPosition,
} from '../utils/perp';
import { tradeTimestampToMs } from '../utils/tradeTimestamp';
import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../SocialV1View/feed/types';
import { holdDurationFromTimestamps } from './formatHoldDuration';

const leverageLabel = (position: Position): string | undefined => {
  if (position.perpLeverage == null) {
    return undefined;
  }
  return `${position.perpLeverage}x`;
};

const entryPriceLabel = (position: Position): string | undefined => {
  const amount = Math.abs(
    position.positionAmountWithLeverage ?? position.positionAmount,
  );
  if (amount <= 0 || position.costBasis <= 0) {
    return undefined;
  }
  return formatTradeUnitPrice(position.costBasis / amount);
};

const markPriceLabel = (position: Position): string | undefined => {
  const amount = Math.abs(
    position.positionAmountWithLeverage ?? position.positionAmount,
  );
  if (amount <= 0 || position.currentValueUSD == null) {
    return undefined;
  }
  return formatTradeUnitPrice(position.currentValueUSD / amount);
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

export interface MapPositionToFeedItemOptions {
  isClosed?: boolean;
  author?: SocialV1FeedAuthor;
  timestamp?: number;
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

  if (isPerp) {
    const direction = getPerpPositionDirection(position) ?? 'long';
    if (closed) {
      return {
        id,
        author,
        timestamp,
        variant: 'perpsClosed',
        comment,
        asset: { symbol: displaySymbol, avatar },
        direction,
        leverageLabel: leverageLabel(position),
        valueLabel: formatSignedUsd(
          position.pnlValueUsd ?? position.realizedPnl,
        ),
        pnlLabel,
        isPnlPositive,
        entryPriceLabel: entryPriceLabel(position),
        holdTimeLabel: holdTimeLabel(position, true),
      };
    }

    return {
      id,
      author,
      timestamp,
      variant: 'perpsOpen',
      comment,
      asset: { symbol: displaySymbol, avatar },
      direction,
      markPriceLabel: markPriceLabel(position),
      leverageLabel: leverageLabel(position),
      entryPriceLabel: entryPriceLabel(position),
      valueLabel: formatUsd(position.currentValueUSD ?? null),
      pnlLabel,
      isPnlPositive,
    };
  }

  const side = position.positionAmount < 0 ? 'sell' : 'buy';
  return {
    id,
    author,
    timestamp,
    variant: 'spotShare',
    comment,
    asset: { symbol: displaySymbol, avatar },
    side,
    markPriceLabel: markPriceLabel(position),
    valueLabel: closed
      ? formatSignedUsd(position.realizedPnl)
      : formatUsd(position.currentValueUSD ?? null),
    pnlLabel,
    isPnlPositive,
    entryPriceLabel: entryPriceLabel(position),
    holdTimeLabel: holdTimeLabel(position, closed),
    showCopyTrade: !closed,
  };
};
