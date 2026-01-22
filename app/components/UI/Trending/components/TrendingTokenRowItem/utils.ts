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
 * Formats market cap and volume as a combined string
 * Shows dash for zero values
 * @param marketCap - Market capitalization value
 * @param volume - Trading volume value
 * @returns Formatted string (e.g., "$13B cap • $34.2M vol" or "— cap • — vol" for zeros)
 */
export function formatMarketStats(marketCap: number, volume: number): string {
  const capStr = marketCap === 0 ? '-' : formatCompactUSD(marketCap);
  const volStr = volume === 0 ? '-' : formatCompactUSD(volume);
  return `${capStr} cap • ${volStr} vol`;
}
