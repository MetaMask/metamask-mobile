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
 * Price compared to the near-touch. Limit uses the limit price.
 * Scale uses the farthest endpoint (lowest long, highest short).
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
 * Warning when a limit/scale price is more than 5% from the near-touch.
 * Reduce-only orders skip this.
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

  if (signedDistance <= LIMIT_PRICE_CONFIG.FarFromMarketThreshold) {
    return undefined;
  }

  // Ceil so 5.4% displays as 6%, not 5% (the warning only fires above 5%).
  const percent = Math.ceil(signedDistance * 100);

  // Complete sentence keys so translations can inflect.
  return strings(
    direction === 'long'
      ? 'perps.order.validation.limit_price_far_from_market_bid'
      : 'perps.order.validation.limit_price_far_from_market_ask',
    { percent },
  );
};

export interface LimitPriceDirectionWarningInput {
  limitPrice: string;
  currentPrice?: number;
  /** Side of the order being placed, not of the position being closed. */
  direction: 'long' | 'short';
  isClosingPosition: boolean;
}

/**
 * Warning when a limit price sits on the unfavourable side of the market.
 * Distinct from {@link getLimitPriceFarFromMarketWarning}, which measures
 * distance from the near-touch rather than which side of it the price is on.
 *
 * Opening: long above market, short below market.
 * Closing: `direction` is the opposite of the position, so `short` means
 * closing a long — warn below market — and `long` means closing a short.
 */
export const getLimitPriceDirectionWarning = ({
  limitPrice,
  currentPrice,
  direction,
  isClosingPosition,
}: LimitPriceDirectionWarningInput): string => {
  const parsedLimit = Number.parseFloat(limitPrice.replace(/[$,]/g, ''));
  const price = Number(currentPrice);

  // A non-positive limit is an untouched input rather than a price the user
  // chose, so it must not read as "below market".
  if (
    !limitPrice ||
    Number.isNaN(parsedLimit) ||
    parsedLimit <= 0 ||
    !price ||
    price <= 0
  ) {
    return '';
  }

  if (!isClosingPosition) {
    if (direction === 'long' && parsedLimit > price) {
      return strings('perps.order.limit_price_modal.limit_price_above');
    }
    if (direction === 'short' && parsedLimit < price) {
      return strings('perps.order.limit_price_modal.limit_price_below');
    }
    return '';
  }

  if (direction === 'short' && parsedLimit < price) {
    return strings('perps.order.limit_price_modal.limit_price_below');
  }
  if (direction === 'long' && parsedLimit > price) {
    return strings('perps.order.limit_price_modal.limit_price_above');
  }

  return '';
};
