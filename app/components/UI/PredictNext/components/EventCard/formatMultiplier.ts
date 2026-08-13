import type { PredictDecimal } from '../../types';

const trimTrailingZeros = (value: string): string =>
  value.replace(/\.?0+$/, '');

export const formatMultiplier = (
  askPrice?: PredictDecimal,
): string | undefined => {
  if (askPrice === undefined) {
    return undefined;
  }

  const price = Number(askPrice);

  if (!Number.isFinite(price) || price <= 0) {
    return undefined;
  }

  const multiplier = 1 / price;
  const formatted =
    multiplier >= 10
      ? trimTrailingZeros(multiplier.toFixed(1))
      : trimTrailingZeros(multiplier.toFixed(2));

  return `${formatted}x`;
};
