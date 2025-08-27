/**
 * Shared formatting utilities for Perps components
 */
import { formatWithThreshold } from '../../../../util/assets';

/**
 * Formats a balance value as USD currency with appropriate decimal places
 * @param balance - Raw numeric balance value (e.g., 1234.56, not token minimal denomination)
 * @returns USD formatted string: "$X,XXX.XX" (always 2 decimal places with commas for thousands)
 * @example formatPerpsFiat(1234.56) => "$1,234.56"
 * @example formatPerpsFiat(0.01) => "$0.01"
 * @example formatPerpsFiat(50000) => "$50,000.00"
 */
export const formatPerpsFiat = (balance: string | number): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;

  if (isNaN(num)) {
    return '$0.00';
  }

  return formatWithThreshold(num, 0.01, 'en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

/**
 * Formats a price value as USD currency with variable decimal places based on magnitude
 * @param price - Raw numeric price value
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Minimum decimal places (default: 2, use 0 for whole numbers)
 * @returns USD formatted string with variable decimals:
 * - Prices >= $1000: "$X,XXX.XX" (2-4 decimals)
 * - Prices < $1000: "$X.XXXX" (up to 4 decimals)
 * @example formatPrice(1234.5678) => "$1,234.57"
 * @example formatPrice(0.1234) => "$0.1234"
 * @example formatPrice(50000, { minimumDecimals: 0 }) => "$50,000"
 */
export const formatPrice = (
  price: string | number,
  options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  const minDecimals = options?.minimumDecimals ?? 2;
  const maxDecimals = options?.maximumDecimals ?? 4;

  if (isNaN(num)) {
    return minDecimals === 0 ? '$0' : '$0.00';
  }

  // For prices >= 1000, use specified decimal places
  if (num >= 1000) {
    return formatWithThreshold(num, 1000, 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
  }

  // For prices < 1000, use specified decimal places
  return formatWithThreshold(num, 0.0001, 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Formats a PnL (Profit and Loss) value with sign prefix
 * @param pnl - Raw numeric PnL value (positive for profit, negative for loss)
 * @returns Format: "+$X,XXX.XX" or "-$X,XXX.XX" (always shows sign, 2 decimals)
 * @example formatPnl(1234.56) => "+$1,234.56"
 * @example formatPnl(-500) => "-$500.00"
 * @example formatPnl(0) => "+$0.00"
 */
export const formatPnl = (pnl: string | number): string => {
  const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;

  if (isNaN(num)) {
    return '$0.00';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Formats a percentage value with sign prefix
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @returns Format: "+X.XX%" or "-X.XX%" (always shows sign, 2 decimals)
 * @example formatPercentage(5.25) => "+5.25%"
 * @example formatPercentage(-2.75) => "-2.75%"
 * @example formatPercentage(0) => "+0.00%"
 */
export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0.00%';
  }

  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

/**
 * Formats large numbers with magnitude suffixes
 * @param value - Raw numeric value
 * @param options - Optional formatting options
 * @param options.decimals - Number of decimal places for suffixed values (default: 0)
 * @param options.rawDecimals - Number of decimal places for non-suffixed values (default: 2)
 * @returns Format: "X.XXB" / "X.XXM" / "X.XXK" / "X.XX" (configurable decimals)
 * @example formatLargeNumber(1500000) => "2M"
 * @example formatLargeNumber(1500000, { decimals: 1 }) => "1.5M"
 * @example formatLargeNumber(1234, { decimals: 2 }) => "1.23K"
 * @example formatLargeNumber(999) => "999.00"
 */
export const formatLargeNumber = (
  value: string | number,
  options?: { decimals?: number; rawDecimals?: number },
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const decimals = options?.decimals ?? 0;
  const rawDecimals = options?.rawDecimals ?? 2;

  if (isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1000000000000) {
    const trillions = absNum / 1000000000000;
    return `${sign}${trillions.toFixed(decimals)}T`;
  }
  if (absNum >= 1000000000) {
    const billions = absNum / 1000000000;
    return `${sign}${billions.toFixed(decimals)}B`;
  }
  if (absNum >= 1000000) {
    const millions = absNum / 1000000;
    return `${sign}${millions.toFixed(decimals)}M`;
  }
  if (absNum >= 1000) {
    const thousands = absNum / 1000;
    return `${sign}${thousands.toFixed(decimals)}K`;
  }

  return num.toFixed(rawDecimals);
};

/**
 * Formats volume with appropriate magnitude suffixes
 * @param volume - Raw volume value
 * @param decimals - Number of decimal places to show (optional, auto-determined by default)
 * @returns Format: "$XB" / "$X.XXM" / "$XK" / "$X.XX"
 * @example formatVolume(1234567890) => "$1.23B"
 * @example formatVolume(12345678) => "$12.35M"
 * @example formatVolume(123456) => "$123K"
 */
export const formatVolume = (
  volume: string | number,
  decimals?: number,
): string => {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;

  // Handle invalid inputs - return fallback display for NaN/Infinity
  if (isNaN(num) || !isFinite(num)) {
    return '$---';
  }

  const absNum = Math.abs(num);

  // Auto-determine decimals based on magnitude if not specified
  let autoDecimals = decimals;
  if (decimals === undefined) {
    if (absNum >= 1000000000) {
      // Billions: 2 decimals
      autoDecimals = 2;
    } else if (absNum >= 1000000) {
      // Millions: 2 decimals
      autoDecimals = 2;
    } else if (absNum >= 1000) {
      // Thousands: 0 decimals
      autoDecimals = 0;
    } else {
      // Under 1000: 2 decimals
      autoDecimals = 2;
    }
  } else {
    autoDecimals = decimals;
  }

  const formatted = formatLargeNumber(volume, {
    decimals: autoDecimals,
    rawDecimals: autoDecimals,
  });

  // Handle negative values - ensure dollar sign comes after negative sign
  if (formatted.startsWith('-')) {
    return `-$${formatted.slice(1)}`;
  }

  return `$${formatted}`;
};

/**
 * Formats position size with variable decimal precision based on magnitude
 * @param size - Raw position size value
 * @returns Format varies by size:
 * - Size < 0.01: "X.XXXXXX" (6 decimals)
 * - Size < 1: "X.XXXX" (4 decimals)
 * - Size >= 1: "X.XX" (2 decimals)
 * @example formatPositionSize(0.001234) => "0.001234"
 * @example formatPositionSize(0.5678) => "0.5678"
 * @example formatPositionSize(123.456) => "123.46"
 */
export const formatPositionSize = (size: string | number): string => {
  const num = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(num)) {
    return '0';
  }

  const abs = Math.abs(num);

  // For very small numbers, use more decimal places
  if (abs < 0.01) {
    return num.toFixed(6);
  }

  // For small numbers, use 4 decimal places
  if (abs < 1) {
    return num.toFixed(4);
  }

  // For normal numbers, use 2 decimal places
  return num.toFixed(2);
};

/**
 * Formats leverage value with 'x' suffix
 * @param leverage - Raw leverage multiplier value
 * @returns Format: "X.Xx" (1 decimal place with 'x' suffix)
 * @example formatLeverage(5) => "5.0x"
 * @example formatLeverage(10.5) => "10.5x"
 * @example formatLeverage(1) => "1.0x"
 */
export const formatLeverage = (leverage: string | number): string => {
  const num = typeof leverage === 'string' ? parseFloat(leverage) : leverage;

  if (isNaN(num)) {
    return '1x';
  }

  return `${num.toFixed(1)}x`;
};

/**
 * Parses formatted currency strings back to numeric values
 * @param formattedValue - Formatted currency string (handles $, commas, negative values)
 * @returns Raw numeric value
 * @example parseCurrencyString("$1,234.56") => 1234.56
 * @example parseCurrencyString("-$500.00") => -500
 * @example parseCurrencyString("$-123.45") => -123.45
 */
export const parseCurrencyString = (formattedValue: string): number => {
  if (!formattedValue) return 0;

  // Check for negative values (can be -$123.45 or $-123.45)
  const isNegative = formattedValue.includes('-');

  // Remove all non-numeric characters except dots
  // This regex removes currency symbols ($, €, etc.), commas, minus signs, and other formatting
  const cleanedValue = formattedValue
    .replace(/[^0-9.]/g, '') // Remove everything except digits and dots
    .trim();

  // Handle multiple dots by keeping only the last one as decimal separator
  // NOTE: This assumes US format (comma for thousands, dot for decimal)
  // Numbers with dots as thousand separators (e.g., European format) will be parsed incorrectly
  const parts = cleanedValue.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? parts[parts.length - 1] : '';

  const finalValue = decimalPart
    ? `${integerPart}.${decimalPart}`
    : integerPart;
  const parsed = parseFloat(finalValue);

  if (isNaN(parsed)) return 0;

  return isNegative ? -parsed : parsed;
};

/**
 * Parses formatted percentage strings back to numeric values
 * @param formattedValue - Formatted percentage string (handles %, +/- signs)
 * @returns Raw numeric percentage value
 * @example parsePercentageString("+2.50%") => 2.5
 * @example parsePercentageString("-10.75%") => -10.75
 * @example parsePercentageString("5%") => 5
 */
export const parsePercentageString = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const cleanedValue = formattedValue
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a timestamp for transaction detail views with time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "July 24, 2025 at 2:30 PM")
 * @example formatTransactionDate(1642492800000) => "January 18, 2022 at 12:00 AM"
 */
export const formatTransactionDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
};

/**
 * Formats a timestamp for transaction section headers
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date section string ("Today", "Yesterday", or "Month Day")
 * @example formatDateSection(Date.now()) => "Today"
 */
export const formatDateSection = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if it's today
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  // Check if it's yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  const month = new Intl.DateTimeFormat('en-US', {
    month: 'short',
  }).format(new Date(timestamp));
  const day = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
  }).format(new Date(timestamp));

  return `${month}, ${day}`; // 'Jul, 26'
};
