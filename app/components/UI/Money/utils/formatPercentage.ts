import { parseApy, toApyPercent } from './apy';

/**
 * Formats a decimal fraction as a one-decimal percentage.
 *
 * @param fraction - Decimal fraction such as `0.1235`.
 * @returns A percentage string rounded with Money's APY rounding behavior.
 */
export const formatPercentage = (fraction: string): string => {
  const parsedFraction = parseApy(fraction);
  if (parsedFraction === undefined || parsedFraction < 0) {
    throw new Error(
      `Cannot format percentage from invalid value '${fraction}'`,
    );
  }

  if (parsedFraction > 0 && parsedFraction < 0.001) {
    return '<0.1%';
  }

  const percentage = toApyPercent(parsedFraction);
  if (percentage === undefined) {
    throw new Error(
      `Cannot format percentage from invalid value '${fraction}'`,
    );
  }

  return `${percentage}%`;
};
