import { BigNumber } from 'bignumber.js';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { trimTrailingZeros } from '../trimTrailingZeros';

/**
 * Destination amount the order would produce if it filled at its limit price.
 *
 * The limit price is quoted per unit of the quoted token, which is the source
 * token on a sell and the destination token on a buy, and is denominated
 * either in the counter token or in fiat. Expressing it as counter tokens per
 * quoted token first collapses those four combinations into one multiplication
 * or division of the source amount:
 *
 * - sell priced in destination tokens: sourceAmount * limitPrice
 * - buy priced in source tokens: sourceAmount / limitPrice
 * - sell priced in fiat: sourceAmount * limitPrice / destination fiat rate
 * - buy priced in fiat: sourceAmount * source fiat rate / limitPrice
 *
 * The fiat cases are estimates: they value the counter token at its live
 * market rate, which keeps moving until the order fills.
 */
export const getSwapsLimitOrderDestTokenAmount = ({
  counterFiatRate,
  destTokenDecimals,
  executionType,
  isLimitFiatMode,
  limitPrice,
  sourceAmount,
}: {
  counterFiatRate: number | undefined;
  destTokenDecimals: number | undefined;
  executionType: LimitOrderExecutionType;
  isLimitFiatMode: boolean;
  limitPrice: string | undefined;
  sourceAmount: string | undefined;
}): string | undefined => {
  if (destTokenDecimals === undefined) {
    return undefined;
  }

  const price = new BigNumber(limitPrice ?? '');
  if (!price.isFinite() || price.lte(0)) {
    return undefined;
  }

  let counterPerQuoted = price;
  if (isLimitFiatMode) {
    if (!counterFiatRate || counterFiatRate <= 0) {
      return undefined;
    }
    counterPerQuoted = price.dividedBy(counterFiatRate);
  }

  if (!counterPerQuoted.isFinite() || counterPerQuoted.lte(0)) {
    return undefined;
  }

  const amount = new BigNumber(sourceAmount ?? '');
  if (!amount.isFinite() || amount.lte(0)) {
    return '0';
  }

  const destTokenAmount =
    executionType === LimitOrderExecutionType.SELL
      ? amount.multipliedBy(counterPerQuoted)
      : amount.dividedBy(counterPerQuoted);

  if (!destTokenAmount.isFinite()) {
    return undefined;
  }

  return trimTrailingZeros(
    destTokenAmount
      .decimalPlaces(destTokenDecimals, BigNumber.ROUND_DOWN)
      .toFixed(),
  );
};
