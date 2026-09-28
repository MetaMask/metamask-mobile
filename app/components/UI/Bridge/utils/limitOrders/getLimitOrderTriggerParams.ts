import { BigNumber } from 'bignumber.js';
import type { CreateLimitOrderParams } from '../../api/limitOrders/create';
import {
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';
import { formatLimitOrderFiatPrice } from './formatLimitOrderFiatPrice';
import { trimTrailingZeros } from '../trimTrailingZeros';

type LimitOrderTrigger = CreateLimitOrderParams['trigger'];

interface GetLimitOrderTriggerParamsOptions {
  /**
   * Which side of the pair the limit price is quoted on. Selling quotes the
   * source token, buying quotes the destination token.
   */
  executionType: LimitOrderExecutionType;
  /**
   * Whether `limitPrice` is a fiat unit price of the quoted token rather than
   * an amount of the counter token.
   */
  isLimitFiatMode: boolean;
  /**
   * The limit price exactly as shown in the price input, i.e. in the user's
   * display currency in fiat mode, or in counter token units otherwise.
   */
  limitPrice: string | undefined;
  /**
   * Which side of the limit price fills the order.
   */
  priceComparisonDirection: LimitOrderPriceComparisonDirection;
  /**
   * How many USD one unit of the display currency is worth, so `1` when the
   * display currency is already USD. Only used in fiat mode, where the Bridge
   * API accepts USD prices and nothing else.
   */
  fiatToUsdRate: number | undefined;
}

/**
 * Builds the `trigger` of a `POST /v2/limit-orders` request from the limit
 * order screen's price state.
 *
 * @param options - The quoted side, the limit price and its denomination.
 * @returns The trigger, or `undefined` when the price is unusable or its USD
 * equivalent cannot be resolved.
 */
export function getLimitOrderTriggerParams({
  executionType,
  isLimitFiatMode,
  limitPrice,
  priceComparisonDirection,
  fiatToUsdRate,
}: GetLimitOrderTriggerParamsOptions): LimitOrderTrigger | undefined {
  const price = new BigNumber(limitPrice ?? '');
  if (!price.isFinite() || price.lte(0)) {
    return undefined;
  }

  const threshold =
    priceComparisonDirection === LimitOrderPriceComparisonDirection.AT_OR_ABOVE
      ? 'above'
      : 'below';

  // A price typed in counter token units is a price between the two tokens
  // (e.g. 1 ETH is worth 0.04 BTC), which the API takes as the token value.
  if (!isLimitFiatMode) {
    return {
      kind: 'ratio',
      threshold,
      price: trimTrailingZeros(price.toFixed()),
    };
  }

  const usdPrice = fiatToUsdRate
    ? formatLimitOrderFiatPrice(price.multipliedBy(fiatToUsdRate))
    : undefined;

  // Sending a price in the display currency as if it were USD would place the
  // order at the wrong level, so an unresolved rate drops the trigger instead.
  if (!usdPrice) {
    return undefined;
  }

  return {
    kind:
      executionType === LimitOrderExecutionType.SELL
        ? 'src_price'
        : 'dest_price',
    threshold,
    price: usdPrice,
  };
}
