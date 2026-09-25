import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import type { BridgeToken } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { formatLimitOrderFiatPrice } from '../../utils/limitOrders/formatLimitOrderFiatPrice';
import { formatLimitOrderQuickPrice } from '../../utils/limitOrders/formatLimitOrderQuickPrice';
import type { TriggerPriceDisplay } from './types';

/**
 * Formats a USD trigger price in the user's display currency. The order is
 * placed at a USD price, so the USD value comes along for the notice whenever
 * the row shows something else. Without a rate to convert with, the row shows
 * the USD price as is rather than a guessed one.
 */
function getFiatTriggerPrice(
  usdPrice: string,
  currentCurrency: string,
  fiatToUsdRate: number | undefined,
): Pick<TriggerPriceDisplay, 'triggerPrice' | 'usdTriggerPrice'> {
  const formattedUsdPrice = `${getCurrencySymbol('usd')}${
    formatLimitOrderQuickPrice(usdPrice) ?? usdPrice
  }`;
  const displayPrice =
    currentCurrency?.toLowerCase() !== 'usd' && fiatToUsdRate
      ? formatLimitOrderFiatPrice(
          new BigNumber(usdPrice).dividedBy(fiatToUsdRate),
        )
      : undefined;

  if (!displayPrice) {
    return { triggerPrice: formattedUsdPrice };
  }

  return {
    triggerPrice: `${getCurrencySymbol(currentCurrency)}${
      formatLimitOrderQuickPrice(displayPrice) ?? displayPrice
    }`,
    usdTriggerPrice: formattedUsdPrice,
  };
}

/**
 * Resolves how the trigger row reads: a fiat price shown against the token it
 * prices, or a `ratio` shown as an amount of the destination token.
 */
export function getTriggerPrice(
  { trigger }: LimitOrder,
  sourceToken: BridgeToken,
  destinationToken: BridgeToken,
  currentCurrency: string,
  fiatToUsdRate: number | undefined,
): TriggerPriceDisplay {
  switch (trigger.kind) {
    case 'src_price':
      return {
        ...getFiatTriggerPrice(trigger.price, currentCurrency, fiatToUsdRate),
        triggerToken: sourceToken,
      };
    case 'dest_price':
      return {
        ...getFiatTriggerPrice(trigger.price, currentCurrency, fiatToUsdRate),
        triggerToken: destinationToken,
      };
    default:
      // A `ratio` price is quoted as destination token per unit of source
      // token, so it reads as an amount of the destination token.
      return {
        triggerPrice: strings('bridge.limit.quote_unit', {
          amount: formatLimitOrderQuickPrice(trigger.price) ?? trigger.price,
          symbol: destinationToken.symbol,
        }),
        triggerToken: destinationToken,
      };
  }
}
