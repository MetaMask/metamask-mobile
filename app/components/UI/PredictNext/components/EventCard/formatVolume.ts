const trimTrailingZeros = (value: number): string =>
  value.toFixed(2).replace(/\.?0+$/, '');

export const formatVolume = (volume?: string): string | undefined => {
  if (volume === undefined) {
    return undefined;
  }

  const amount = Number(volume);

  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  if (amount >= 1_000_000) {
    return trimTrailingZeros(amount / 1_000_000) + 'M';
  }

  if (amount >= 1_000) {
    return trimTrailingZeros(amount / 1_000) + 'k';
  }

  return String(Math.floor(amount));
};
