import {
  getPerpsDisplaySymbol,
  type OrderType,
  type PerpsActiveProviderMode,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import { MIN_POST_TRADE_SHARE_USD } from '../../../../util/social/postTradeShareThreshold';
import {
  formatTradeUnitPrice,
  formatUsd,
} from '../../SocialFeed/utils/formatters';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  getPostTradeShareSession,
  patchPostTradeShareSession,
  type PostTradeShareVariant,
} from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeShareSession';
import type { SocialPostPerpsPreview } from '../../../Views/SocialLeaderboard/SocialPostComposerView/SocialPostComposerView.types';
import type { SocialEventSource } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

/**
 * Order types that return one exchange order id. Scale, TWAP, and chase do
 * not, matching {@link getCopyTradeOid}.
 */
export const orderTypeHasExchangeOrderId = (orderType: OrderType): boolean =>
  orderType !== 'scale' && orderType !== 'twap' && orderType !== 'chase';

/**
 * Provider a single-venue action runs on: the active provider, or the default
 * one under aggregation, where no single provider is active.
 *
 * @param activeProvider - `PerpsController` active provider.
 * @returns The provider id.
 */
export const resolveProviderId = (
  activeProvider: PerpsActiveProviderMode | undefined,
): PerpsProviderType =>
  activeProvider && activeProvider !== PROVIDER_CONFIG.AggregatedProvider
    ? activeProvider
    : PROVIDER_CONFIG.DefaultProvider;

/**
 * Returns whether the Perps order's position size reaches the sharing
 * threshold. `amountUsd` is position size (notional), not margin.
 */
export const isPerpsPostTradeShareEligible = ({
  amountUsd,
}: {
  amountUsd?: string;
}): boolean => {
  const notional = Number(amountUsd);
  return Number.isFinite(notional) && notional >= MIN_POST_TRADE_SHARE_USD;
};

export const canBeginPerpsPostTradeShare = ({
  copyTradeOrigin,
  orderType,
  activeProvider,
}: {
  copyTradeOrigin: CopyTradeOrigin | undefined;
  orderType: OrderType;
  activeProvider: PerpsActiveProviderMode | undefined;
}): boolean =>
  Boolean(copyTradeOrigin) &&
  orderTypeHasExchangeOrderId(orderType) &&
  resolveProviderId(activeProvider) === 'hyperliquid';

/**
 * Orders outside copy-trade that go through the post-trade prompt: a
 * Hyperliquid market order, which fills with one order id.
 */
export const canPromptPerpsPostTrade = ({
  orderType,
  activeProvider,
}: {
  orderType: OrderType;
  activeProvider: PerpsActiveProviderMode | undefined;
}): boolean =>
  orderType === 'market' && resolveProviderId(activeProvider) === 'hyperliquid';

const usdLabel = (amountUsd: string | undefined): string | undefined => {
  const amount = Number(amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }
  return formatUsd(amount);
};

const priceLabel = (price: string | undefined): string | undefined => {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return formatTradeUnitPrice(value);
};

/**
 * Cost of a filled order: filled size times average fill price. The same
 * product the card's Entry is built from, so Cost and Entry agree. Undefined
 * when the result has no fill, so the caller can fall back to the typed amount.
 */
const fillCostLabel = ({
  filledSize,
  entryPrice,
}: {
  filledSize?: string;
  entryPrice?: string;
}): string | undefined => {
  const size = Number(filledSize);
  const price = Number(entryPrice);
  if (
    !Number.isFinite(size) ||
    size <= 0 ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return undefined;
  }
  return formatUsd(size * price);
};

export const buildPerpsPostTradePreview = ({
  asset,
  direction,
  leverage,
  amountUsd,
  entryPrice,
  filledSize,
}: {
  asset: string;
  direction: 'long' | 'short';
  leverage?: number;
  amountUsd?: string;
  entryPrice?: string;
  filledSize?: string;
}): SocialPostPerpsPreview => ({
  product: 'perps',
  tokenSymbol: getPerpsDisplaySymbol(asset),
  tradeSymbol: asset,
  tokenAddress: asset,
  direction,
  leverageLabel: leverage != null && leverage > 0 ? `${leverage}x` : undefined,
  costLabel: fillCostLabel({ filledSize, entryPrice }) ?? usdLabel(amountUsd),
  entryPriceLabel: priceLabel(entryPrice),
});

/** Opens the pending perps share sheet without the copy-trade checks. */
export const openPerpsPostTradeShareSession = ({
  asset,
  direction,
  leverage,
  amountUsd,
  variant = 'share',
  analyticsSource,
}: {
  asset: string;
  direction: 'long' | 'short';
  leverage?: number;
  amountUsd?: string;
  variant?: PostTradeShareVariant;
  analyticsSource?: SocialEventSource;
}): string => {
  const preview = buildPerpsPostTradePreview({
    asset,
    direction,
    leverage,
    amountUsd,
  });
  const directionLabel = direction === 'long' ? 'Long' : 'Short';
  return beginPostTradeShareSession({
    product: 'perps',
    status: 'pending',
    variant,
    pairLabel: preview.leverageLabel
      ? `${preview.leverageLabel} ${directionLabel} ${preview.tokenSymbol}`
      : `${directionLabel} ${preview.tokenSymbol}`,
    tradeInFlightChain: 'hyperliquid',
    preview,
    ...(analyticsSource ? { analyticsSource } : {}),
  });
};

/**
 * Opens the share sheet as pending for a Social V1 perps copy-trade that can
 * return an order id. Returns the session id, or undefined when this order
 * should keep the normal perps toasts.
 */
export const beginPerpsPostTradeShare = ({
  copyTradeOrigin,
  orderType,
  activeProvider,
  asset,
  direction,
  leverage,
  amountUsd,
  analyticsSource,
}: {
  copyTradeOrigin: CopyTradeOrigin | undefined;
  orderType: OrderType;
  activeProvider: PerpsActiveProviderMode | undefined;
  asset: string;
  direction: 'long' | 'short';
  leverage?: number;
  amountUsd?: string;
  analyticsSource?: SocialEventSource;
}): string | undefined => {
  if (
    !canBeginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType,
      activeProvider,
    }) ||
    !isPerpsPostTradeShareEligible({ amountUsd })
  ) {
    return undefined;
  }
  return openPerpsPostTradeShareSession({
    asset,
    analyticsSource,
    direction,
    leverage,
    amountUsd,
  });
};

export const failPerpsPostTradeShare = (
  sessionId: string | undefined,
): boolean => {
  if (!sessionId) {
    return false;
  }
  return patchPostTradeShareSession(sessionId, { status: 'failed' });
};

/**
 * Moves a pending perps share to complete when the exchange returned an oid.
 * A missing oid clears the open session and returns false, so the sheet does
 * not show Order failed and the caller can fall back to the perps toast. A
 * session the user already closed also returns false.
 *
 * The pending card shows the typed amount. Once the order has filled, Cost and
 * Entry are replaced with the fill (filled size times average price).
 */
export const completePerpsPostTradeShare = (
  sessionId: string | undefined,
  {
    orderId,
    entryPrice,
    filledSize,
  }: {
    orderId: string | undefined;
    entryPrice?: string;
    filledSize?: string;
  },
): boolean => {
  if (!sessionId) {
    return false;
  }
  if (!orderId) {
    const session = getPostTradeShareSession();
    if (session?.sessionId === sessionId && session.product === 'perps') {
      clearPostTradeShareSession();
    }
    return false;
  }
  const session = getPostTradeShareSession();
  if (
    !session ||
    session.sessionId !== sessionId ||
    session.product !== 'perps'
  ) {
    return false;
  }
  const entryPriceLabel = priceLabel(entryPrice);
  const costLabel = fillCostLabel({ filledSize, entryPrice });
  const hasFillLabels =
    entryPriceLabel !== undefined || costLabel !== undefined;
  return patchPostTradeShareSession(sessionId, {
    status: 'complete',
    orderId,
    preview: hasFillLabels
      ? {
          ...session.preview,
          ...(costLabel !== undefined ? { costLabel } : {}),
          ...(entryPriceLabel !== undefined ? { entryPriceLabel } : {}),
        }
      : session.preview,
  });
};
