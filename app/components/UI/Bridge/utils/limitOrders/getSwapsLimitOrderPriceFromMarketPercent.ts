import { BigNumber } from 'bignumber.js';
import { formatTokenInputAmountFromFiat } from '../sourceAmountInputMode';
import {
  formatLimitOrderFiatInputPrice,
  formatLimitOrderFiatPrice,
} from './formatLimitOrderFiatPrice';

/**
 * Snapshot of the quoted-token market price after applying a signed percent
 * offset. `0` is market; negative is below market (buy presets); positive is
 * above market (sell presets).
 *
 * Rounded to `decimals`, the precision the limit price is shown with, so a
 * cheap quoted token keeps Market at 0% and every percent preset apart from it.
 */
export const getSwapsLimitOrderPriceFromMarketPercent = ({
  counterFiatRate,
  decimals,
  isLimitFiatMode,
  marketFiat,
  signedPercent,
}: {
  counterFiatRate?: number;
  /**
   * Decimal places of the limit price in its current denomination.
   */
  decimals: number;
  isLimitFiatMode: boolean;
  marketFiat: number | undefined;
  signedPercent: number;
}): string | undefined => {
  if (!marketFiat) {
    return undefined;
  }

  const adjustedMarketFiat = new BigNumber(marketFiat).multipliedBy(
    new BigNumber(1).plus(new BigNumber(signedPercent).dividedBy(100)),
  );
  if (!adjustedMarketFiat.isFinite() || adjustedMarketFiat.lte(0)) {
    return undefined;
  }

  const adjustedFiatAmount = formatLimitOrderFiatPrice(adjustedMarketFiat);

  if (isLimitFiatMode) {
    return formatLimitOrderFiatInputPrice(adjustedMarketFiat, decimals);
  }

  return formatTokenInputAmountFromFiat({
    fiatAmount: adjustedFiatAmount,
    tokenFiatRate: counterFiatRate,
    tokenDecimals: decimals,
  });
};
