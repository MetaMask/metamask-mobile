import type {
  FeedItem as CoreFeedItem,
  Trade,
} from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';
import {
  getPerpPositionDirection,
  getPerpTradeDirection,
  isPerpPosition,
} from '../../utils/perp';
import {
  formatTokenAmount,
  formatTradeUnitPrice,
  formatUnsignedFullUsdNoDecimals,
} from '../../utils/formatters';
import { isEntryAction, type TradeAction } from '../../utils/tradeAction';
import { tradeTimestampToMs } from '../../utils/tradeTimestamp';
import {
  asFeedCardItem,
  toWholePercent,
} from '../../SocialV1View/feed/utils/feedCardStats';
import type {
  SocialV1PerpDirection,
  SocialV1SpotSide,
} from '../../SocialV1View/feed/types';
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
  if (isPresentNumber(core.currentValueUSD) && core.positionAmount > 0) {
    return core.currentValueUSD / core.positionAmount;
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
 * Unit price is `currentValueUSD / positionAmount` when both are present
 * (matching the screenshot: 506,243,213.9 × $0.0₄1842 = $9,325), falling back
 * to the triggering fill. Token amount is `positionAmount`.
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
  const amount = Math.abs(core.positionAmount);
  const leverage = core.perpLeverage ?? trade?.perpLeverage ?? null;

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
    markPriceLabel: formatTradeUnitPrice(markPrice),
    amountLabel: `${formatTokenAmount(amount)} ${displaySymbol}`,
    valueLabel: formatUnsignedFullUsdNoDecimals(core.currentValueUSD),
    positionId: core.positionId,
    marketCapUsd,
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
