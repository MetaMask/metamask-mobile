import { formatSubscriptNotation } from '../../../../../util/number/subscriptNotation';
import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';
import { formatTokenInputAmountFromFiat } from '../sourceAmountInputMode';
import { formatCurrency } from '../currencyUtils';
import {
  LIMIT_ORDER_PRICE_DECIMALS,
  formatLimitOrderFiatInputPriceFromTokenAmount,
} from './formatLimitOrderFiatPrice';
import { formatLimitOrderFiatUnitPrice } from './formatLimitOrderFiatValue';
import { formatLimitOrderQuickPrice } from './formatLimitOrderQuickPrice';

/**
 * Secondary-row label for the limit price: Build the ≈ 0.0561 ETH row
 *
 * Reads as the limit price would after toggling to the other denomination, so
 * a cheap quoted token (e.g. PEPE) follows the limit price instead of reading
 * as zero. Leading zeros of a very small value are condensed, e.g.
 * `0.0₈1568 ETH`.
 */
export const getSwapsLimitOrderSecondaryValue = ({
  counterFiatRate,
  counterTokenSymbol,
  currentCurrency,
  fiatDecimals,
  isLimitFiatMode,
  limitPrice,
}: {
  counterFiatRate: number | undefined;
  counterTokenSymbol: string | undefined;
  currentCurrency: string | undefined;
  /**
   * Decimal places a fiat limit price is shown with.
   */
  fiatDecimals: number;
  isLimitFiatMode: boolean;
  limitPrice: string | undefined;
}): string | undefined => {
  if (!counterTokenSymbol) {
    return undefined;
  }

  const currency = currentCurrency || 'usd';

  if (isLimitFiatMode) {
    const counterFromFiat = formatLimitOrderQuickPrice(
      formatTokenInputAmountFromFiat({
        fiatAmount: limitPrice,
        tokenFiatRate: counterFiatRate,
        tokenDecimals: LIMIT_ORDER_PRICE_DECIMALS,
      }),
    );

    if (counterFromFiat && Number(counterFromFiat) > 0) {
      const amount =
        formatSubscriptNotation(Number(counterFromFiat)) ??
        formatAmountWithLocaleSeparators(counterFromFiat);

      return `${amount} ${counterTokenSymbol}`;
    }

    return `0 ${counterTokenSymbol}`;
  }

  const fiatFromCounter = formatLimitOrderFiatInputPriceFromTokenAmount(
    limitPrice,
    counterFiatRate,
    fiatDecimals,
  );
  if (fiatFromCounter) {
    return formatLimitOrderFiatUnitPrice(
      fiatFromCounter,
      currency,
      fiatDecimals,
    );
  }

  return formatCurrency(0, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
