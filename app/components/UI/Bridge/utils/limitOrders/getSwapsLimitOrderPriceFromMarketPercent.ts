import { BigNumber } from 'bignumber.js';
import {
  formatFiatInputAmount,
  formatTokenInputAmountFromFiat,
} from '../sourceAmountInputMode';

/**
 * Snapshot of the quoted-token market price after applying a signed percent
 * offset. `0` is market; negative is below market (buy presets); positive is
 * above market (sell presets).
 */
export const getSwapsLimitOrderPriceFromMarketPercent = ({
  counterFiatRate,
  counterTokenDecimals,
  isLimitFiatMode,
  marketFiat,
  signedPercent,
}: {
  counterFiatRate?: number;
  counterTokenDecimals?: number;
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

  const adjustedFiatAmount = formatFiatInputAmount(
    '1',
    adjustedMarketFiat.toNumber(),
  );

  if (isLimitFiatMode) {
    return adjustedFiatAmount;
  }

  return formatTokenInputAmountFromFiat({
    fiatAmount: adjustedFiatAmount,
    tokenFiatRate: counterFiatRate,
    tokenDecimals: counterTokenDecimals,
  });
};
