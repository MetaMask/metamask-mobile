import { Dimensions } from 'react-native';
import { PredictSeries, Recurrence } from '../types';
import { formatWithThreshold } from '../../../../util/assets';

/**
 * Formats a percentage value with no decimals
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @returns Format: "X%" with no decimals
 * - For values >= 99: ">99%"
 * - For values < 1 (but > 0): "<1%"
 * - For negative values: rounded normally (e.g., "-3%", "-99%")
 * @example formatPercentage(5.25) => "5%"
 * @example formatPercentage(99.5) => ">99%"
 * @example formatPercentage(0.5) => "<1%"
 * @example formatPercentage(-2.75) => "-3%"
 * @example formatPercentage(-99.5) => "-100%"
 * @example formatPercentage(0) => "0%"
 */
export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0%';
  }

  // Handle special cases for positive numbers only
  if (num >= 99) {
    return '>99%';
  }

  if (num > 0 && num < 1) {
    return '<1%';
  }

  // Round to nearest integer
  return `${Math.round(num)}%`;
};

/**
 * Formats a price value as USD currency with exactly 2 decimal places (truncated, no rounding)
 * @param price - Raw numeric price value
 * @param options - Optional formatting options (kept for backwards compatibility, but not used)
 * @returns USD formatted string with exactly 2 decimals (truncated, not rounded)
 * @example formatPrice(1234.5678) => "$1,234.56"
 * @example formatPrice(0.1234) => "$0.12"
 * @example formatPrice(50000) => "$50,000.00"
 * @example formatPrice(1234.999) => "$1,234.99" (truncated, not rounded to $1,235.00)
 */
export const formatPrice = (
  price: string | number,
  _options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) {
    return '$0.00';
  }

  // Truncate to 2 decimal places (no rounding)
  const truncated = Math.floor(num * 100) / 100;

  // Format with exactly 2 decimal places
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(truncated);
};

/**
 * Formats a price value as USD currency with variable decimal places based on magnitude
 * @param price - Raw numeric price value
 * @param options - Optional formatting options
 * @param options.minimumDecimals - Minimum decimal places (default: 2, use 0 for whole numbers)
 * @param options.maximumDecimals - Maximum decimal places (default: 2 for prices >= $1000, 4 for prices < $1000)
 * @returns USD formatted string with variable decimals:
 * - Prices >= $1000: "$X,XXX.XX" (2 decimals by default)
 * - Prices < $1000: "$X.XXXX" (up to 4 decimals)
 * @example formatPrice(1234.5678) => "$1,234.57"
 * @example formatPrice(0.1234) => "$0.1234"
 * @example formatPrice(50000, { minimumDecimals: 0 }) => "$50,000"
 */
export const formatPriceWithDecimals = (
  price: string | number,
  options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  const minDecimals = options?.minimumDecimals ?? 2;
  const maxDecimals = options?.maximumDecimals ?? 4;
  if (isNaN(num)) {
    return minDecimals === 0 ? '$0' : '$0.00';
  }

  // For prices >= 1000, use specified minimum decimal places
  if (num >= 1000) {
    return formatWithThreshold(num, 1000, 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: minDecimals,
      maximumFractionDigits:
        options?.maximumDecimals ?? Math.max(minDecimals, 2),
    });
  }

  // For prices < 1000, use up to 4 decimal places
  return formatWithThreshold(num, 0.0001, 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Calculates the net amount after deducting bridge and network fees from the total fiat amount
 * @param params - Object containing fee and total amount information
 * @param params.totalFiat - Total fiat amount as string
 * @param params.bridgeFeeFiat - Bridge fee amount as string
 * @param params.networkFeeFiat - Network fee amount as string
 * @returns Net amount as string after deducting fees, or "0" if calculation fails
 * @example
 * calculateNetAmount({
 *   totalFiat: "1.04361142938843253220839271649743403",
 *   bridgeFeeFiat: "0.036399",
 *   networkFeeFiat: "0.008024478270232503211154803918368"
 * }) => "0.999187951118199"
 */
export const calculateNetAmount = (params: {
  totalFiat?: string;
  bridgeFeeFiat?: string;
  networkFeeFiat?: string;
}): string => {
  const { totalFiat, bridgeFeeFiat, networkFeeFiat } = params;

  // totalFiat is required - return "0" if missing or invalid
  if (!totalFiat) {
    return '0';
  }

  const total = parseFloat(totalFiat);
  if (isNaN(total)) {
    return '0';
  }

  // Treat missing fees as 0, but validate they are numbers if provided
  const bridgeFee = bridgeFeeFiat ? parseFloat(bridgeFeeFiat) : 0;
  const networkFee = networkFeeFiat ? parseFloat(networkFeeFiat) : 0;

  // Return "0" if any provided fee is invalid
  if (isNaN(bridgeFee) || isNaN(networkFee)) {
    return '0';
  }

  // Calculate net amount: totalFiat - bridgeFee - networkFee
  const netAmount = total - bridgeFee - networkFee;

  // Ensure we don't return negative amounts
  return netAmount > 0 ? netAmount.toString() : '0';
};

/**
 * Formats a volume value with appropriate suffix based on magnitude
 * @param volume - Raw numeric volume value
 * @returns Formatted string with suffix:
 * - Volume >= 1,000,000: "X.XXM" (millions)
 * - Volume >= 1,000: "X.XXk" (thousands)
 * - Volume < 1,000: "X" (whole number)
 * @example formatVolume(1500000) => "1.5M"
 * @example formatVolume(2500) => "2.5k"
 * @example formatVolume(500) => "500"
 */
export const formatVolume = (volume: string | number): string => {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume;

  if (isNaN(num)) {
    return '0';
  }

  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
  }

  return Math.floor(num).toString();
};

/**
 * Trims an Ethereum address to show first 3 and last 2 characters
 * @param address - Full Ethereum address (e.g., "0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d")
 * @returns Trimmed address (e.g., "0x2F...A9d")
 * @example formatAddress("0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d") => "0x2F5...A9d"
 */
export const formatAddress = (address?: string): string => {
  if (!address || address.length < 6) {
    return 'N/A';
  }

  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

export const getRecurrence = (series?: PredictSeries[]): Recurrence => {
  if (!series || series.length === 0) {
    return Recurrence.NONE;
  }

  const recurrence = series[0]?.recurrence;
  if (!recurrence) {
    return Recurrence.NONE;
  }

  // Map string recurrence to Recurrence enum
  switch (recurrence.toLowerCase()) {
    case 'daily':
      return Recurrence.DAILY;
    case 'weekly':
      return Recurrence.WEEKLY;
    case 'monthly':
      return Recurrence.MONTHLY;
    case 'yearly':
    case 'annually':
      return Recurrence.YEARLY;
    case 'quarterly':
      return Recurrence.QUARTERLY;
    default:
      return Recurrence.NONE;
  }
};

export const formatCents = (dollars: string | number): string => {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;

  if (isNaN(num)) {
    return '0¢';
  }

  // Convert dollars to cents (multiply by 100)
  const cents = num * 100;

  // Round to 1 decimal precision to check if decimals are needed
  const roundedCents = Number(cents.toFixed(1));

  // If it's a whole number, don't show decimals
  if (roundedCents === Math.floor(roundedCents)) {
    return `${Math.floor(roundedCents)}¢`;
  }

  // Otherwise, show decimals up to 1 decimal place
  return `${cents.toFixed(1)}¢`;
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
export const formatPositionSize = (
  size: string | number,
  options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(num)) {
    return '0';
  }

  const abs = Math.abs(num);
  const minimumDecimals = options?.minimumDecimals ?? 2;
  const maximumDecimals = options?.maximumDecimals ?? 4;

  // Determine appropriate decimal places based on size
  const decimals = abs < 1 ? maximumDecimals : minimumDecimals;

  // Round to the target precision to check if decimals are needed
  const rounded = Number(num.toFixed(decimals));

  // If it's a whole number, don't show decimals
  if (rounded === Math.floor(rounded)) {
    return Math.floor(rounded).toString();
  }

  // Otherwise, show decimals up to the determined precision
  return num.toFixed(decimals);
};

export const formatCurrencyValue = (
  value?: number,
  options: { showSign?: boolean } = {},
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const formatted = formatPrice(Math.abs(value), {
    minimumDecimals: 2,
    maximumDecimals: 2,
  });

  if (!options.showSign) {
    return formatted;
  }

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
};

/**
 * Estimates the number of lines a title will occupy in the header
 * Based on available width and average character width for HeadingMD variant
 * HeadingMD: fontSize 18px, lineHeight 24px
 */
export const estimateLineCount = (text: string | undefined): number => {
  if (!text) return 1;

  const screenWidth = Dimensions.get('window').width;
  // Calculate available width: screen - horizontal padding - back button - icon - gaps
  // 32px (horizontal padding) + 8px (px-1 on container) + 40px (back button) + 12px (gap) + 40px (icon) + 12px (gap) = ~144px
  const usedWidth = 144;
  const availableWidth = screenWidth - usedWidth;

  // HeadingMD font size is 18px with average character width of ~8.5px (accounting for proportional font)
  const avgCharWidth = 8.5;
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);

  // Split text into words and simulate word wrapping
  const words = text.split(' ');
  let lines = 1;
  let currentLineLength = 0;

  for (const word of words) {
    const wordLength = word.length;
    // Add 1 for space between words
    const neededLength =
      currentLineLength === 0 ? wordLength : currentLineLength + 1 + wordLength;

    if (neededLength > charsPerLine) {
      lines++;
      currentLineLength = wordLength;
    } else {
      currentLineLength = neededLength;
    }
  }

  return lines;
};
