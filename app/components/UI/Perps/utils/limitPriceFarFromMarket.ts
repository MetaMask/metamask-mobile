import type { OrderType } from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { LIMIT_PRICE_CONFIG } from '../constants/perpsConfig';
import { canonicalizeOrderPrice } from './triggerOrderValidation';

export interface LimitPriceFarFromMarketInput {
  orderType: OrderType;
  direction: 'long' | 'short';
  reduceOnly: boolean;
  limitPrice?: string;
  startPrice?: string;
  endPrice?: string;
  bestBid?: number;
  bestAsk?: number;
  szDecimals?: number;
}

const parseCanonicalPrice = (
  price: string | undefined,
  szDecimals?: number,
): number | undefined => {
  const canonical = canonicalizeOrderPrice(price, szDecimals);
  const parsed = Number.parseFloat(canonical ?? '');
  return parsed > 0 ? parsed : undefined;
};

/**
 * Price to compare against the near-touch. Limit uses the single limit.
 * Scale uses the endpoint farthest from market (lowest long, highest short).
 */
export const getFarthestRestingLimitPrice = ({
  orderType,
  direction,
  limitPrice,
  startPrice,
  endPrice,
  szDecimals,
}: Pick<
  LimitPriceFarFromMarketInput,
  | 'orderType'
  | 'direction'
  | 'limitPrice'
  | 'startPrice'
  | 'endPrice'
  | 'szDecimals'
>): number | undefined => {
  if (orderType === 'limit') {
    return parseCanonicalPrice(limitPrice, szDecimals);
  }

  if (orderType !== 'scale') {
    return undefined;
  }

  const start = parseCanonicalPrice(startPrice, szDecimals);
  const end = parseCanonicalPrice(endPrice, szDecimals);
  if (start === undefined || end === undefined) {
    return undefined;
  }

  return direction === 'long' ? Math.min(start, end) : Math.max(start, end);
};

/**
 * Non-blocking copy when a limit/scale price is abnormally far from the
 * near-touch. Reduce-only closes skip this check.
 */
export const getLimitPriceFarFromMarketWarning = ({
  orderType,
  direction,
  reduceOnly,
  limitPrice,
  startPrice,
  endPrice,
  bestBid,
  bestAsk,
  szDecimals,
}: LimitPriceFarFromMarketInput): string | undefined => {
  if (reduceOnly) {
    return undefined;
  }

  const price = getFarthestRestingLimitPrice({
    orderType,
    direction,
    limitPrice,
    startPrice,
    endPrice,
    szDecimals,
  });
  if (price === undefined) {
    return undefined;
  }

  const referencePrice = direction === 'long' ? bestBid : bestAsk;
  if (!(referencePrice && referencePrice > 0)) {
    return undefined;
  }

  const signedDistance =
    direction === 'long'
      ? (referencePrice - price) / referencePrice
      : (price - referencePrice) / referencePrice;

  if (signedDistance <= LIMIT_PRICE_CONFIG.FatFingerDistanceFromMarket) {
    return undefined;
  }

  const percent = Math.round(signedDistance * 100);

  // Two complete sentences rather than interpolating a translated word, so
  // languages needing declension or different word order stay translatable.
  return strings(
    direction === 'long'
      ? 'perps.order.validation.limit_price_far_from_market_bid'
      : 'perps.order.validation.limit_price_far_from_market_ask',
    { percent },
  );
};
