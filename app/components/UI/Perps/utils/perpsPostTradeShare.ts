import {
  getPerpsDisplaySymbol,
  type OrderType,
} from '@metamask/perps-controller';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  formatTradeUnitPrice,
  formatUsd,
} from '../../SocialFeed/utils/formatters';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  getPostTradeShareSession,
  patchPostTradeShareSession,
} from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeShareSession';
import type { SocialPostPerpsPreview } from '../../../Views/SocialLeaderboard/SocialPostComposerView/SocialPostComposerView.types';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

/**
 * Order types that return one exchange order id. Scale, TWAP, and chase do
 * not, matching {@link getCopyTradeOid}.
 */
export const orderTypeHasExchangeOrderId = (orderType: OrderType): boolean =>
  orderType !== 'scale' && orderType !== 'twap' && orderType !== 'chase';

const resolveProviderId = (activeProvider: string | undefined): string =>
  activeProvider && activeProvider !== PROVIDER_CONFIG.AggregatedProvider
    ? activeProvider
    : PROVIDER_CONFIG.DefaultProvider;

export const canBeginPerpsPostTradeShare = ({
  copyTradeOrigin,
  orderType,
  activeProvider,
}: {
  copyTradeOrigin: CopyTradeOrigin | undefined;
  orderType: OrderType;
  activeProvider: string | undefined;
}): boolean =>
  Boolean(copyTradeOrigin) &&
  orderTypeHasExchangeOrderId(orderType) &&
  resolveProviderId(activeProvider) === 'hyperliquid';

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

const buildPreview = ({
  asset,
  direction,
  leverage,
  amountUsd,
  entryPrice,
}: {
  asset: string;
  direction: 'long' | 'short';
  leverage?: number;
  amountUsd?: string;
  entryPrice?: string;
}): SocialPostPerpsPreview => ({
  product: 'perps',
  tokenSymbol: getPerpsDisplaySymbol(asset),
  tradeSymbol: asset,
  tokenAddress: asset,
  direction,
  leverageLabel: leverage != null && leverage > 0 ? `${leverage}x` : undefined,
  costLabel: usdLabel(amountUsd),
  entryPriceLabel: priceLabel(entryPrice),
});

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
}: {
  copyTradeOrigin: CopyTradeOrigin | undefined;
  orderType: OrderType;
  activeProvider: string | undefined;
  asset: string;
  direction: 'long' | 'short';
  leverage?: number;
  amountUsd?: string;
}): string | undefined => {
  if (
    !canBeginPerpsPostTradeShare({
      copyTradeOrigin,
      orderType,
      activeProvider,
    })
  ) {
    return undefined;
  }
  const preview = buildPreview({ asset, direction, leverage, amountUsd });
  const directionLabel = direction === 'long' ? 'Long' : 'Short';
  return beginPostTradeShareSession({
    product: 'perps',
    status: 'pending',
    pairLabel: preview.leverageLabel
      ? `${preview.leverageLabel} ${directionLabel} ${preview.tokenSymbol}`
      : `${directionLabel} ${preview.tokenSymbol}`,
    tradeInFlightChain: 'hyperliquid',
    preview,
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
 */
export const completePerpsPostTradeShare = (
  sessionId: string | undefined,
  {
    orderId,
    entryPrice,
  }: {
    orderId: string | undefined;
    entryPrice?: string;
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
  return patchPostTradeShareSession(sessionId, {
    status: 'complete',
    orderId,
    preview: entryPriceLabel
      ? { ...session.preview, entryPriceLabel }
      : session.preview,
  });
};
