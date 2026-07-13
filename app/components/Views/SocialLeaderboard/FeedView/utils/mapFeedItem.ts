import type {
  FeedItem as CoreFeedItem,
  Trade,
} from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { caipChainIdToHex } from '../../../../UI/Rewards/utils/formatUtils';
import {
  getPerpPositionDirection,
  getSupportedXyzPerpMarketSymbol,
  isClosedPosition,
  isPerpPosition,
} from '../../utils/perp';
import { chainNameToId } from '../../utils/chainMapping';
import {
  formatAbbreviatedUsd,
  formatPercent,
  formatSignedUsd,
  formatUsd,
} from '../../utils/formatters';
import type { FeedAction, FeedItem } from '../types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/** Trade timestamps from the social API may be in seconds or milliseconds. */
const toMs = (timestamp: number): number =>
  timestamp < 1e12 ? timestamp * 1000 : timestamp;

/**
 * Picks the trade that drives a feed row's action verb: the one whose timestamp
 * matches the feed item, falling back to the most recent trade when none lines
 * up exactly (or the position carries no per-trade history).
 */
function findTriggeringTrade(
  trades: Trade[],
  feedTimestampMs: number,
): Trade | undefined {
  if (trades.length === 0) {
    return undefined;
  }

  const exact = trades.find(
    (trade) => toMs(trade.timestamp) === feedTimestampMs,
  );
  if (exact) {
    return exact;
  }

  return trades.reduce((latest, trade) =>
    toMs(trade.timestamp) > toMs(latest.timestamp) ? trade : latest,
  );
}

/**
 * Resolves the action verb for a feed row. Perp fills read as "opened"/"closed",
 * spot as "bought"/"sold" (mirrors `TradeRow`). When the position has no trade
 * to key off, falls back to the position's open/closed state.
 */
function resolveAction(
  trade: Trade | undefined,
  isPerp: boolean,
  isClosed: boolean,
): FeedAction {
  const isExit = trade ? trade.intent === 'exit' : isClosed;
  if (isPerp) {
    return isExit ? 'closed' : 'opened';
  }
  return isExit ? 'sold' : 'bought';
}

/**
 * Builds the row sub-header from real API fields only: the triggering trade's
 * USD size, plus a derived per-unit price when it is meaningful (the API does
 * not expose a historical market cap, so that part of the Figma is omitted).
 */
function buildSubHeader(trade: Trade | undefined): string {
  if (!trade) {
    return '';
  }

  const size = formatAbbreviatedUsd(Math.abs(trade.usdCost));
  const price =
    trade.tokenAmount > 0 ? Math.abs(trade.usdCost / trade.tokenAmount) : null;

  // Guard against sub-cent prices rendering as a misleading "$0.00".
  if (price != null && price >= 0.01) {
    return `${size} at ${formatUsd(price)}`;
  }
  return size;
}

/**
 * Maps a core `SocialService` feed item (`Position` + `actor` + `timestamp`)
 * into the presentation `FeedItem` consumed by `FeedItemRow`.
 *
 * Returns `null` for spot trades whose chain we can't map to a CAIP id — the
 * Trade button and network badge both need it, so the row is skipped rather
 * than rendered half-wired.
 */
export function mapFeedItem(coreItem: CoreFeedItem): FeedItem | null {
  const { actor, timestamp, trades } = coreItem;

  const timestampMs = toMs(timestamp);
  const isPerp = isPerpPosition(coreItem);
  const isClosed = isClosedPosition(coreItem);
  const trade = findTriggeringTrade(trades ?? [], timestampMs);
  const action = resolveAction(trade, isPerp, isClosed);
  const subHeader = buildSubHeader(trade);

  const pnlValue = isPerp
    ? (coreItem.pnlValueUsd ?? coreItem.realizedPnl)
    : isClosed
      ? coreItem.realizedPnl
      : coreItem.pnlValueUsd;
  const pnlPercent = isPerp
    ? (coreItem.pnlPercent ??
      (coreItem.boughtUsd
        ? (coreItem.realizedPnl / coreItem.boughtUsd) * 100
        : null))
    : isClosed
      ? coreItem.boughtUsd
        ? (coreItem.realizedPnl / coreItem.boughtUsd) * 100
        : null
      : (coreItem.pnlPercent ?? null);

  const hasValueData = isClosed
    ? isPresentNumber(pnlValue)
    : isPresentNumber(coreItem.currentValueUSD);
  const hasPnlData = isPresentNumber(pnlPercent);

  const valueLabel = hasValueData
    ? isClosed
      ? formatSignedUsd(pnlValue)
      : formatUsd(coreItem.currentValueUSD)
    : '';
  const pnlLabel = hasPnlData ? formatPercent(pnlPercent) : '';
  const pnlSignSource = isClosed
    ? pnlValue
    : (coreItem.pnlValueUsd ?? pnlPercent);
  const isPnlPositive =
    hasPnlData && isPresentNumber(pnlSignSource) && pnlSignSource >= 0;

  const base = {
    id: `${coreItem.positionId}-${timestamp}`,
    username: actor.name,
    traderAddress: actor.address,
    avatarUri: actor.imageUrl ?? undefined,
    action,
    timestamp: timestampMs,
    subHeader,
    valueLabel,
    pnlLabel,
    hasValueData,
    hasPnlData,
    isPnlPositive,
  };

  if (isPerp) {
    const { targetSymbol } = getSupportedXyzPerpMarketSymbol(
      coreItem.tokenSymbol,
    );
    // Display uses the prefix-free symbol; navigation keeps the tradable
    const displaySymbol = getPerpsDisplaySymbol(coreItem.tokenSymbol);
    return {
      ...base,
      type: 'perps',
      marketSymbol: displaySymbol,
      marketName: displaySymbol,
      tradeSymbol: targetSymbol,
      direction: getPerpPositionDirection(coreItem) ?? 'long',
      // Prefer the position leverage, fall back to the triggering trade's, and
      // leave `null` when neither is present so the badge is hidden rather than
      // showing a misleading "1x" (parity with PositionRow / TradeRow).
      leverage: coreItem.perpLeverage ?? trade?.perpLeverage ?? null,
    };
  }

  const chain = chainNameToId(coreItem.chain);
  if (!chain) {
    return null;
  }

  return {
    ...base,
    type: 'spot',
    tokenSymbol: coreItem.tokenSymbol,
    tokenName: coreItem.tokenName,
    tokenAddress: coreItem.tokenAddress,
    chain,
    chainIdHex: caipChainIdToHex(chain),
  };
}
