/**
 * Formats a PnL value to a display string
 * @param value - The PnL value in USD
 * @returns Formatted string (e.g., "+$78.0K", "-$1.2K")
 */
export const formatPnL = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';

  if (absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(1);
    return `${sign}$${formatted}M`;
  }

  if (absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(1);
    // Remove trailing .0
    const cleanFormatted = formatted.endsWith('.0')
      ? formatted.slice(0, -2)
      : formatted;
    return `${sign}$${cleanFormatted}K`;
  }

  return `${sign}$${absValue.toFixed(0)}`;
};

/**
 * Formats a follower count to a display string
 * @param count - The number of followers
 * @returns Formatted string (e.g., "1,444", "1.2K")
 */
export const formatFollowers = (count: number): string => {
  if (count >= 1_000_000) {
    const formatted = (count / 1_000_000).toFixed(1);
    return `${formatted}M`;
  }

  if (count >= 10_000) {
    const formatted = (count / 1_000).toFixed(1);
    return `${formatted}K`;
  }

  // For numbers under 10K, use locale string for comma separation
  return count.toLocaleString();
};

/**
 * Truncates an Ethereum address for display
 * @param address - The full address
 * @param chars - Number of characters to show at start and end
 * @returns Truncated address (e.g., "0x881a...2757")
 */
export const truncateAddress = (address: string, chars = 4): string => {
  if (address.length <= chars * 2 + 3) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};
