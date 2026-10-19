import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';
import { formatTokenInputAmountFromFiat } from '../sourceAmountInputMode';
import { formatCurrency } from '../currencyUtils';
import { formatLimitOrderFiatInputPriceFromTokenAmount } from './formatLimitOrderFiatPrice';
import { formatLimitOrderFiatValue } from './formatLimitOrderFiatValue';
import {
  getLimitOrderFiatPriceDecimals,
  getLimitOrderSecondaryTokenPriceDecimals,
} from './getLimitOrderPriceDecimals';

/**
 * Secondary-row label for the limit price: Build the ≈ 0.0561 ETH row
 *
 * Shown with enough precision for a cheap quoted token (e.g. PEPE) that the
 * row follows the limit price instead of reading as zero.
 */
export const getSwapsLimitOrderSecondaryValue = ({
  counterFiatRate,
  counterTokenSymbol,
  currentCurrency,
  isLimitFiatMode,
  limitPrice,
  marketFiat,
}: {
  counterFiatRate: number | undefined;
  counterTokenSymbol: string | undefined;
  currentCurrency: string | undefined;
  isLimitFiatMode: boolean;
  limitPrice: string | undefined;
  /**
   * Live fiat price of 1 unit of the quoted token, which sets the precision.
   */
  marketFiat: number | undefined;
}): string | undefined => {
  if (!counterTokenSymbol) {
    return undefined;
  }

  const currency = currentCurrency || 'usd';

  if (isLimitFiatMode) {
    const counterFromFiat = formatTokenInputAmountFromFiat({
      fiatAmount: limitPrice,
      tokenFiatRate: counterFiatRate,
      tokenDecimals: getLimitOrderSecondaryTokenPriceDecimals({
        counterFiatRate,
        marketFiat,
      }),
    });

    if (counterFromFiat && Number(counterFromFiat) > 0) {
      return `${formatAmountWithLocaleSeparators(
        counterFromFiat,
      )} ${counterTokenSymbol}`;
    }

    return `0 ${counterTokenSymbol}`;
  }

  const fiatDecimals = getLimitOrderFiatPriceDecimals(marketFiat);
  const fiatFromCounter = formatLimitOrderFiatInputPriceFromTokenAmount(
    limitPrice,
    counterFiatRate,
    fiatDecimals,
  );
  if (fiatFromCounter) {
    return formatLimitOrderFiatValue(fiatFromCounter, currency, fiatDecimals);
  }

  return formatCurrency(0, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
