import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import type { BridgeToken } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { formatLimitOrderFiatPrice } from '../../utils/limitOrders/formatLimitOrderFiatPrice';
import { formatLimitOrderQuickPrice } from '../../utils/limitOrders/formatLimitOrderQuickPrice';
import type { TriggerPriceDisplay } from './types';

/**
 * Formats a USD trigger price in the given currency. Without a rate to
 * convert with, the price shows in USD as is rather than a guessed one.
 */
function getFiatTriggerPrice(
  usdPrice: string,
  currentCurrency: string,
  fiatToUsdRate: number | undefined,
): string {
  const displayPrice =
    currentCurrency?.toLowerCase() !== 'usd' && fiatToUsdRate
      ? formatLimitOrderFiatPrice(
          new BigNumber(usdPrice).dividedBy(fiatToUsdRate),
        )
      : undefined;

  if (!displayPrice) {
    return `${getCurrencySymbol('usd')}${
      formatLimitOrderQuickPrice(usdPrice) ?? usdPrice
    }`;
  }

  return `${getCurrencySymbol(currentCurrency)}${
    formatLimitOrderQuickPrice(displayPrice) ?? displayPrice
  }`;
}

/**
 * Whether a `ratio` price is quoted per unit of the source token, i.e. as an
 * amount of the destination token, as a sell is. A buy quotes it the other way
 * round, per unit of the destination token.
 *
 * The order doesn't record which side it was placed on, but its amounts were
 * derived from the price, so the price reads the way the order's own rate
 * does: both above 1, or both below it. At parity the two sides read alike,
 * and the order is taken as the buy a pair starts on.
 */
function isRatioQuotedPerSourceToken({ src, dest, trigger }: LimitOrder) {
  const price = new BigNumber(trigger.price);
  const destPerSource = new BigNumber(dest.amount)
    .shiftedBy(-dest.asset.decimals)
    .dividedBy(new BigNumber(src.amount).shiftedBy(-src.asset.decimals));

  if (!price.gt(0) || !destPerSource.isFinite() || !destPerSource.gt(0)) {
    return false;
  }

  return (
    (price.gt(1) && destPerSource.gt(1)) || (price.lt(1) && destPerSource.lt(1))
  );
}

/**
 * Resolves how the trigger row reads: a price shown against the token it
 * prices, in fiat, or for a `ratio` as an amount of the counter token. A fiat
 * price shows in USD, the currency the order is placed in, unless a display
 * currency and its rate are given to convert it with.
 */
export function getTriggerPrice(
  order: LimitOrder,
  sourceToken: BridgeToken,
  destinationToken: BridgeToken,
  currentCurrency = 'usd',
  fiatToUsdRate?: number,
): TriggerPriceDisplay {
  const { trigger } = order;

  switch (trigger.kind) {
    case 'src_price':
      return {
        triggerPrice: getFiatTriggerPrice(
          trigger.price,
          currentCurrency,
          fiatToUsdRate,
        ),
        triggerToken: sourceToken,
      };
    case 'dest_price':
      return {
        triggerPrice: getFiatTriggerPrice(
          trigger.price,
          currentCurrency,
          fiatToUsdRate,
        ),
        triggerToken: destinationToken,
      };
    default: {
      // A `ratio` price is an amount of the counter token per unit of the
      // quoted token, e.g. 2200 USDC per ETH on both ETH to USDC and USDC to
      // ETH orders.
      const [quotedToken, counterToken] = isRatioQuotedPerSourceToken(order)
        ? [sourceToken, destinationToken]
        : [destinationToken, sourceToken];

      return {
        triggerPrice: strings('bridge.limit.quote_unit', {
          amount: formatLimitOrderQuickPrice(trigger.price) ?? trigger.price,
          symbol: counterToken.symbol,
        }),
        triggerToken: quotedToken,
      };
    }
  }
}

/**
 * Resolves how the trigger row reads with a fiat price shown exactly as the
 * order was placed, in USD, whatever the user's display currency.
 */
export function getUsdTriggerPrice(
  order: LimitOrder,
  sourceToken: BridgeToken,
  destinationToken: BridgeToken,
): TriggerPriceDisplay {
  return getTriggerPrice(
    order,
    sourceToken,
    destinationToken,
    'usd',
    undefined,
  );
}
