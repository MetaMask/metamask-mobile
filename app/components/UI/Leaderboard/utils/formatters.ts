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

/**
 * Formats a timestamp to a relative time string
 * @param timestamp - Unix timestamp (seconds or milliseconds) or ISO string
 * @returns Relative time (e.g., "2m ago", "1h ago", "3d ago")
 */
export const formatTimeAgo = (timestamp: number | string): string => {
  const now = Date.now();
  let time: number;

  if (typeof timestamp === 'number') {
    // If timestamp is in seconds (less than year 2100 in ms), convert to ms
    time = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  } else {
    time = new Date(timestamp).getTime();
  }

  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'just now';
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  // For older trades, show the date
  const date = new Date(time);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Formats a USD value for display
 * @param value - The USD value
 * @returns Formatted string (e.g., "$1.2K", "$500")
 */
export const formatUsdValue = (value: number): string => {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    return `$${(absValue / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `$${(absValue / 1_000).toFixed(1)}K`;
  }

  if (absValue >= 1) {
    return `$${absValue.toFixed(0)}`;
  }

  return `$${absValue.toFixed(2)}`;
};
