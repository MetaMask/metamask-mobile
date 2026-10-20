import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import {
  LIMIT_ORDER_DIRECTION,
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';
import type { BridgeToken } from '../../types';
import { formatSubscriptNotation } from '../../../../../util/number/subscriptNotation';
import { getLimitOrderFiatPriceDecimals } from '../../utils/limitOrders/formatLimitOrderFiatPrice';
import { formatLimitOrderFiatUnitPrice } from '../../utils/limitOrders/formatLimitOrderFiatValue';
import { formatLimitOrderQuickPrice } from '../../utils/limitOrders/formatLimitOrderQuickPrice';
import { getSwapsLimitOrderDefaultPriceMode } from '../../utils/limitOrders/getSwapsLimitOrderDefaultPriceMode';
import type { TriggerPriceDisplay } from './types';

/**
 * Formats a USD trigger price in the given currency with the precision it was
 * placed with: cents, or more for a cheap token's sub-dollar price. Without a
 * rate to convert with, the price shows in USD as is rather than a guessed
 * one.
 */
function getFiatTriggerPrice(
  usdPrice: string,
  currentCurrency: string,
  fiatToUsdRate: number | undefined,
): string {
  if (currentCurrency?.toLowerCase() !== 'usd' && fiatToUsdRate) {
    const displayPrice = new BigNumber(usdPrice).dividedBy(fiatToUsdRate);

    if (displayPrice.isFinite() && displayPrice.gt(0)) {
      return formatLimitOrderFiatUnitPrice(
        displayPrice.toNumber(),
        currentCurrency,
        getLimitOrderFiatPriceDecimals(displayPrice),
      );
    }
  }

  return formatLimitOrderFiatUnitPrice(
    usdPrice,
    'usd',
    getLimitOrderFiatPriceDecimals(usdPrice),
  );
}

/**
 * Whether a `ratio` price reads per unit of the source token, i.e. as an
 * amount of the destination token, rather than the other way round.
 *
 * The API reports a `ratio` as source tokens per destination token whichever
 * side the order was placed on, so it isn't necessarily the price as entered.
 * The order's amounts were derived from the price, so the price reads the way
 * the order's own rate does: both above 1, or both below it. At parity the
 * two readings can't be told apart, so neither is.
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

function invertPrice(price: string): string {
  const value = new BigNumber(price);
  const reciprocal = new BigNumber(1).dividedBy(value);

  if (reciprocal.multipliedBy(value).eq(1)) {
    return reciprocal.toFixed();
  }

  return reciprocal.precision(Math.max(value.sd() - 1, 1)).toFixed();
}

/**
 * Resolves how the trigger row reads: a price shown against the token it
 * prices, in fiat, or for a `ratio` as an amount of the counter token, along
 * with which side of that price fills the order. A fiat price shows in USD,
 * the currency the order is placed in, unless a display currency and its rate
 * are given to convert it with.
 */
export function getTriggerPrice(
  order: LimitOrder,
  sourceToken: BridgeToken,
  destinationToken: BridgeToken,
  currentCurrency = 'usd',
  fiatToUsdRate?: number,
): TriggerPriceDisplay {
  const { trigger } = order;
  const reportedDirection = Object.values(
    LimitOrderPriceComparisonDirection,
  ).find(
    (direction) =>
      LIMIT_ORDER_DIRECTION[direction].threshold === trigger.threshold,
  );

  switch (trigger.kind) {
    case 'src_price':
      return {
        triggerPrice: getFiatTriggerPrice(
          trigger.price,
          currentCurrency,
          fiatToUsdRate,
        ),
        triggerToken: sourceToken,
        triggerDirection: reportedDirection,
      };
    case 'dest_price':
      return {
        triggerPrice: getFiatTriggerPrice(
          trigger.price,
          currentCurrency,
          fiatToUsdRate,
        ),
        triggerToken: destinationToken,
        triggerDirection: reportedDirection,
      };
    default: {
      // A `ratio` price shows as an amount of the counter token per unit of
      // the quoted token, e.g. 2200 USDC per ETH on both ETH to USDC and USDC
      // to ETH orders. The order doesn't record which side it was placed on,
      // so it's quoted on the side its pair starts on.
      const isSell =
        getSwapsLimitOrderDefaultPriceMode({
          sourceToken,
          destToken: destinationToken,
        }).executionType === LimitOrderExecutionType.SELL;
      const [quotedToken, counterToken] = isSell
        ? [sourceToken, destinationToken]
        : [destinationToken, sourceToken];
      const isShownAsReported =
        new BigNumber(trigger.price).eq(1) ||
        isRatioQuotedPerSourceToken(order) === isSell;
      const price = isShownAsReported
        ? trigger.price
        : invertPrice(trigger.price);
      const amount = formatLimitOrderQuickPrice(price) ?? price;

      return {
        triggerPrice: strings('bridge.limit.quote_unit', {
          amount: formatSubscriptNotation(Number(amount)) ?? amount,
          symbol: counterToken.symbol,
        }),
        triggerToken: quotedToken,
        triggerDirection: isShownAsReported
          ? reportedDirection
          : reportedDirection &&
            LIMIT_ORDER_DIRECTION[reportedDirection].opposite,
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
