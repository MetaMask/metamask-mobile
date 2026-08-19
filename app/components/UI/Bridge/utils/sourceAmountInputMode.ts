import { BigNumber } from 'bignumber.js';
import { trimTrailingZeros } from './trimTrailingZeros';

export const FIAT_INPUT_DECIMALS = 2;
export const SECONDARY_TOKEN_AMOUNT_DECIMALS = 5;

export const formatFiatInputAmount = (
  tokenAmount: string | undefined,
  tokenFiatRate: number | undefined,
): string | undefined => {
  if (!tokenAmount || !tokenFiatRate) {
    return undefined;
  }

  const fiatAmount = new BigNumber(tokenAmount).multipliedBy(tokenFiatRate);
  if (!fiatAmount.isFinite()) {
    return undefined;
  }

  return trimTrailingZeros(
    fiatAmount.decimalPlaces(FIAT_INPUT_DECIMALS).toFixed(),
  );
};

export const formatTokenInputAmountFromFiat = ({
  fiatAmount,
  tokenFiatRate,
  tokenDecimals,
}: {
  fiatAmount: string | undefined;
  tokenFiatRate: number | undefined;
  tokenDecimals: number | undefined;
}): string | undefined => {
  if (!fiatAmount || !tokenFiatRate || tokenDecimals === undefined) {
    return undefined;
  }

  const tokenAmount = new BigNumber(fiatAmount).dividedBy(tokenFiatRate);
  if (!tokenAmount.isFinite()) {
    return undefined;
  }

  return trimTrailingZeros(
    tokenAmount.decimalPlaces(tokenDecimals, BigNumber.ROUND_DOWN).toFixed(),
  );
};

export const formatSecondaryTokenAmount = (
  tokenAmount: string | undefined,
): string | undefined => {
  if (!tokenAmount) {
    return undefined;
  }

  const parsedTokenAmount = new BigNumber(tokenAmount);
  if (!parsedTokenAmount.isFinite()) {
    return undefined;
  }

  return trimTrailingZeros(
    parsedTokenAmount
      .decimalPlaces(SECONDARY_TOKEN_AMOUNT_DECIMALS, BigNumber.ROUND_DOWN)
      .toFixed(),
  );
};
