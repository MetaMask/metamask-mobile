/**
 * Formats a number as compact USD currency string
 * @param value - The number to format
 * @returns Formatted string (e.g., "$13B", "$34.2M", "$850.5K", "$532.50")
 */
export function formatCompactUSD(value: number): string {
  const num = Number(value);
  if (isNaN(num)) return 'Invalid number';

  const absNum = Math.abs(num);
  let formatted: string;

  if (absNum >= 1_000_000_000) {
    formatted = `$${(num / 1_000_000_000).toFixed(0)}B`; // e.g. 13B
  } else if (absNum >= 1_000_000) {
    formatted = `$${(num / 1_000_000).toFixed(1)}M`; // e.g. 34.2M
  } else if (absNum >= 1_000) {
    formatted = `$${(num / 1_000).toFixed(1)}K`; // e.g. 850.5K
  } else {
    formatted = `$${num.toFixed(2)}`; // e.g. 532.50
  }

  return formatted;
}

/**
 * Checks if a market value is valid (not null, undefined, NaN, or zero)
 * @param value - The value to check
 * @returns true if the value is valid and greater than 0
 */
export function isValidMarketValue(
  value: number | null | undefined,
): value is number {
  return value !== null && value !== undefined && !isNaN(value) && value > 0;
}

/**
 * Formats market cap and volume as a combined string
 * Returns null if both values are missing or zero (to indicate stats should be hidden)
 * @param marketCap - Market capitalization value (can be null/undefined)
 * @param volume - Trading volume value (can be null/undefined)
 * @returns Formatted string (e.g., "$13B cap • $34.2M vol") or null if both values are invalid
 */
export function formatMarketStats(
  marketCap: number | null | undefined,
  volume: number | null | undefined,
): string | null {
  const hasMarketCap = isValidMarketValue(marketCap);
  const hasVolume = isValidMarketValue(volume);

  // Hide market stats entirely if both values are missing or zero
  if (!hasMarketCap && !hasVolume) {
    return null;
  }

  // Show both stats if both are valid
  if (hasMarketCap && hasVolume) {
    return `${formatCompactUSD(marketCap)} cap • ${formatCompactUSD(volume)} vol`;
  }

  // Show only market cap if volume is missing
  if (hasMarketCap) {
    return `${formatCompactUSD(marketCap)} cap`;
  }

  // Show only volume if market cap is missing
  // At this point, hasVolume must be true since we've already checked !hasMarketCap && !hasVolume
  return `${formatCompactUSD(volume as number)} vol`;
}
