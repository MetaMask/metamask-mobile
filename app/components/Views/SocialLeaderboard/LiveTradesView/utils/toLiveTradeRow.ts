import type {
  FeedItem as CoreFeedItem,
  Trade,
} from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { PositionTokenAvatarData } from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import {
  getPerpPositionDirection,
  getPerpTradeDirection,
  isPerpPosition,
} from '../../../../UI/SocialFeed/utils/perp';
import {
  formatSignedAbbreviatedUsd,
  formatTradeUnitPrice,
} from '../../../../UI/SocialFeed/utils/formatters';
import {
  buildFeedItemPresentation,
  isFeedItemClosed,
} from '../../../../UI/SocialFeed/utils/mapFeedItem';
import {
  deriveAverageEntryPrice,
  deriveCurrentPrice,
} from '../../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import { buildLivePriceSource } from '../../../../UI/SocialFeed/live/buildLivePriceSource';
import {
  isEntryAction,
  type TradeAction,
} from '../../../../UI/SocialFeed/utils/tradeAction';
import { tradeTimestampToMs } from '../../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  asFeedCardItem,
  toWholePercent,
} from '../../../../UI/SocialFeed/utils/feedCardStats';
import type {
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../../../../UI/SocialFeed/types';
import type { LiveTradeRowModel } from '../types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

const findTriggeringTrade = (
  trades: Trade[],
  feedTimestampMs: number,
): Trade | undefined => {
  if (trades.length === 0) {
    return undefined;
  }

  const exact = trades.find(
    (trade) => tradeTimestampToMs(trade.timestamp) === feedTimestampMs,
  );
  if (exact) {
    return exact;
  }

  return trades.reduce(
    (latest, trade) =>
      tradeTimestampToMs(trade.timestamp) > tradeTimestampToMs(latest.timestamp)
        ? trade
        : latest,
    trades[0],
  );
};

const toSpotSide = (trade: Trade | undefined): SocialV1SpotSide | undefined => {
  const action = trade?.action as TradeAction | undefined;
  if (action) {
    return isEntryAction(action) ? 'buy' : 'sell';
  }
  if (trade?.direction === 'sell' || trade?.direction === 'buy') {
    return trade.direction;
  }
  return undefined;
};

const toPerpDirection = (
  core: CoreFeedItem,
  trade: Trade | undefined,
): SocialV1PerpDirection | undefined =>
  getPerpPositionDirection(core) ??
  (trade ? getPerpTradeDirection(trade) : null) ??
  undefined;

const buildTokenAvatar = (coreItem: CoreFeedItem): PositionTokenAvatarData => ({
  positionId: coreItem.positionId,
  chain: coreItem.chain,
  tokenAddress: coreItem.tokenAddress,
  tokenImageUrl: coreItem.tokenImageUrl ?? null,
  tokenSymbol: coreItem.tokenSymbol,
});

const deriveMarkPrice = (
  core: CoreFeedItem,
  trade: Trade | undefined,
): number | null => {
  const currentPrice = deriveCurrentPrice(core);
  if (currentPrice != null) {
    return currentPrice;
  }
  if (trade) {
    const tokenAmount = Math.abs(trade.tokenAmount);
    if (tokenAmount > 0) {
      return Math.abs(trade.usdCost) / tokenAmount;
    }
  }
  return null;
};

const toLeverageLabel = (
  leverage: number | null | undefined,
): string | undefined => (leverage == null ? undefined : `${leverage}x`);

/**
 * Maps a core social-api feed item into the compact Live trades row model.
 *
 * Unit price is `currentValueUSD / positionAmount` when both are present,
 * falling back to the triggering fill. Unlike the feed card, spot is quoted
 * as a price here, never a market cap. P&L and the open/closed verdict come
 * from the same helpers the feed card uses, so a trade reads the same on both
 * surfaces.
 */
export function toLiveTradeRow(core: CoreFeedItem): LiveTradeRowModel {
  const card = asFeedCardItem(core);
  const timestampMs = tradeTimestampToMs(core.timestamp);
  const trade = findTriggeringTrade(core.trades ?? [], timestampMs);
  const isPerp = isPerpPosition(core);
  const displaySymbol = isPerp
    ? getPerpsDisplaySymbol(core.tokenSymbol)
    : core.tokenSymbol;
  const markPrice = deriveMarkPrice(core, trade);
  const leverage = core.perpLeverage ?? trade?.perpLeverage ?? null;
  const isClosed = isFeedItemClosed(core);
  const presentation = buildFeedItemPresentation(core, isClosed);
  // The row quotes spot as a price, never a market cap.
  const live = buildLivePriceSource(core, isClosed, {
    snapshotPrice: deriveCurrentPrice(core),
    entryPrice: deriveAverageEntryPrice(core),
    marketCapPerPrice: null,
  });

  const author = {
    id: core.actor.profileId,
    username: core.actor.name,
    address: core.actor.address,
    avatarUri: core.actor.imageUrl ?? null,
    winRatePercent: toWholePercent(card.actor.winRate30d),
    pnl30d: card.actor.pnl30d ?? null,
    tradeCount30d: card.actor.tradeCount30d ?? null,
    followerCount: card.actor.followerCount ?? null,
  };

  const marketCapUsd =
    trade && isPresentNumber(trade.marketCap) ? trade.marketCap : null;

  const base = {
    id: `${core.positionId}-${core.timestamp}`,
    traderId: core.actor.profileId,
    traderAddress: core.actor.address,
    timestampMs,
    author,
    authorHandle: core.actor.name,
    authorImageUrl: core.actor.imageUrl ?? null,
    symbol: displaySymbol,
    avatar: buildTokenAvatar(core),
    subtitleLabel: formatTradeUnitPrice(markPrice),
    isClosed,
    valueLabel: presentation.valueLabel,
    pnlLabel: presentation.pnlLabel,
    pnlValueLabel: isPresentNumber(core.pnlValueUsd)
      ? formatSignedAbbreviatedUsd(core.pnlValueUsd)
      : undefined,
    isPnlPositive: presentation.isPnlPositive,
    closedAtMs:
      isClosed && isPresentNumber(core.lastTradeAt)
        ? tradeTimestampToMs(core.lastTradeAt)
        : undefined,
    positionId: core.positionId,
    marketCapUsd,
    position: core,
    ...(live ? { live } : {}),
  };

  if (isPerp) {
    return {
      ...base,
      type: 'perps',
      direction: toPerpDirection(core, trade),
      leverageLabel: toLeverageLabel(leverage),
    };
  }

  return {
    ...base,
    type: 'spot',
    side: toSpotSide(trade),
  };
}

export const toLiveTradeRows = (items: CoreFeedItem[]): LiveTradeRowModel[] =>
  items.map(toLiveTradeRow);
