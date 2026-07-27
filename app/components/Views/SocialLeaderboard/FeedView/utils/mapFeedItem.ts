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
import type { PositionTokenAvatarData } from '../../components/PositionTokenAvatar';
import type {
  FeedAction,
  FeedItem,
  FeedPerpItem,
  FeedSpotItem,
} from '../types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/** Trade timestamps from the social API may be in seconds or milliseconds. */
const toMs = (timestamp: number): number =>
  timestamp < 1e12 ? timestamp * 1000 : timestamp;

interface FeedItemPresentation {
  valueLabel: string;
  pnlLabel: string;
  hasValueData: boolean;
  hasPnlData: boolean;
  isPnlPositive: boolean;
}

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

  return trades.reduce(
    (latest, trade) =>
      toMs(trade.timestamp) > toMs(latest.timestamp) ? trade : latest,
    trades[0],
  );
}

/**
 * Feed rows are keyed off a triggering trade when one exists, and the trade's
 * intent is authoritative in both directions: an `exit` fill reads as closed
 * (even when {@link isClosedPosition} misclassifies a perp that still carries
 * stale non-zero margin in the Clicker payload), and an `enter` fill reads as
 * open (even when the position snapshot looks closed). We only fall back to the
 * {@link isClosedPosition} snapshot heuristic when there is no triggering trade.
 */
function isFeedItemClosed(
  coreItem: CoreFeedItem,
  trade: Trade | undefined,
): boolean {
  if (trade) {
    return trade.intent === 'exit';
  }
  return isClosedPosition(coreItem);
}

/**
 * Resolves the action verb for a feed row. Perp fills read as "opened"/"closed",
 * spot as "bought"/"sold" (mirrors `TradeRow`).
 */
function resolveAction(isPerp: boolean, isClosed: boolean): FeedAction {
  if (isPerp) {
    return isClosed ? 'closed' : 'opened';
  }
  return isClosed ? 'sold' : 'bought';
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

function realizedPnlPercent(
  realizedPnl: number,
  boughtUsd: number | null | undefined,
): number | null {
  if (!boughtUsd) {
    return null;
  }
  return (realizedPnl / boughtUsd) * 100;
}

function resolvePnlValue(
  coreItem: CoreFeedItem,
  isClosed: boolean,
): number | null | undefined {
  if (isClosed) {
    return coreItem.pnlValueUsd ?? coreItem.realizedPnl;
  }
  return coreItem.pnlValueUsd;
}

function resolvePnlPercent(
  coreItem: CoreFeedItem,
  isClosed: boolean,
): number | null {
  if (isClosed) {
    return (
      coreItem.pnlPercent ??
      realizedPnlPercent(coreItem.realizedPnl, coreItem.boughtUsd)
    );
  }
  return coreItem.pnlPercent ?? null;
}

function resolveValueLabel(
  hasValueData: boolean,
  isClosed: boolean,
  pnlValue: number | null | undefined,
  currentValueUSD: number | null | undefined,
): string {
  if (!hasValueData) {
    return '';
  }
  if (isClosed && isPresentNumber(pnlValue)) {
    return formatSignedUsd(pnlValue);
  }
  if (isPresentNumber(currentValueUSD)) {
    return formatUsd(currentValueUSD);
  }
  return '';
}

function buildFeedItemPresentation(
  coreItem: CoreFeedItem,
  isClosed: boolean,
): FeedItemPresentation {
  const pnlValue = resolvePnlValue(coreItem, isClosed);
  const pnlPercent = resolvePnlPercent(coreItem, isClosed);
  const hasValueData = isClosed
    ? isPresentNumber(pnlValue)
    : isPresentNumber(coreItem.currentValueUSD);
  const hasPnlData = isPresentNumber(pnlPercent);
  const valueLabel = resolveValueLabel(
    hasValueData,
    isClosed,
    pnlValue,
    coreItem.currentValueUSD,
  );
  const pnlLabel = hasPnlData ? formatPercent(pnlPercent) : '';
  const pnlSignSource = isClosed
    ? pnlValue
    : (coreItem.pnlValueUsd ?? pnlPercent);
  const isPnlPositive =
    hasPnlData && isPresentNumber(pnlSignSource) && pnlSignSource >= 0;

  return {
    valueLabel,
    pnlLabel,
    hasValueData,
    hasPnlData,
    isPnlPositive,
  };
}

/**
 * Builds the token avatar payload for the shared `PositionTokenAvatar`, which
 * resolves the icon via the Clicker URL → MetaMask CDN → monogram fallback
 * (and the Hyperliquid perp logo when `chain` is `hyperliquid`). Keeps the raw
 * social-api `chain` name and `tokenSymbol` so that resolution matches the
 * trader-profile position list exactly.
 */
function buildTokenAvatar(coreItem: CoreFeedItem): PositionTokenAvatarData {
  return {
    positionId: coreItem.positionId,
    chain: coreItem.chain,
    tokenAddress: coreItem.tokenAddress,
    tokenImageUrl: coreItem.tokenImageUrl ?? null,
    tokenSymbol: coreItem.tokenSymbol,
  };
}

function mapPerpFeedItem(
  coreItem: CoreFeedItem,
  trade: Trade | undefined,
  presentation: FeedItemPresentation,
  action: FeedAction,
  timestampMs: number,
  subHeader: string,
): FeedPerpItem {
  const { targetSymbol } = getSupportedXyzPerpMarketSymbol(
    coreItem.tokenSymbol,
  );
  const displaySymbol = getPerpsDisplaySymbol(coreItem.tokenSymbol);

  return {
    id: `${coreItem.positionId}-${coreItem.timestamp}`,
    traderId: coreItem.actor.profileId,
    username: coreItem.actor.name,
    traderAddress: coreItem.actor.address,
    avatarUri: coreItem.actor.imageUrl ?? undefined,
    action,
    timestamp: timestampMs,
    subHeader,
    ...presentation,
    tokenAvatar: buildTokenAvatar(coreItem),
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

function mapSpotFeedItem(
  coreItem: CoreFeedItem,
  presentation: FeedItemPresentation,
  action: FeedAction,
  timestampMs: number,
  subHeader: string,
): FeedSpotItem | null {
  const chain = chainNameToId(coreItem.chain);
  if (!chain) {
    return null;
  }

  return {
    id: `${coreItem.positionId}-${coreItem.timestamp}`,
    traderId: coreItem.actor.profileId,
    username: coreItem.actor.name,
    traderAddress: coreItem.actor.address,
    avatarUri: coreItem.actor.imageUrl ?? undefined,
    action,
    timestamp: timestampMs,
    subHeader,
    ...presentation,
    tokenAvatar: buildTokenAvatar(coreItem),
    type: 'spot',
    tokenSymbol: coreItem.tokenSymbol,
    tokenName: coreItem.tokenName,
    tokenAddress: coreItem.tokenAddress,
    chain,
    chainIdHex: caipChainIdToHex(chain),
  };
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
  const { timestamp, trades } = coreItem;

  const timestampMs = toMs(timestamp);
  const isPerp = isPerpPosition(coreItem);
  const trade = findTriggeringTrade(trades ?? [], timestampMs);
  const isClosed = isFeedItemClosed(coreItem, trade);
  const action = resolveAction(isPerp, isClosed);
  const subHeader = buildSubHeader(trade);
  const presentation = buildFeedItemPresentation(coreItem, isClosed);

  if (isPerp) {
    return mapPerpFeedItem(
      coreItem,
      trade,
      presentation,
      action,
      timestampMs,
      subHeader,
    );
  }

  return mapSpotFeedItem(
    coreItem,
    presentation,
    action,
    timestampMs,
    subHeader,
  );
}
