import { Dimensions } from 'react-native';
import { PredictSeries, Recurrence } from '../types';

/**
 * Formats a percentage value
 * @param value - Raw percentage value (e.g., 5.25 for 5.25%, not 0.0525)
 * @param options - Optional formatting options
 * @param options.truncate - Whether to truncate values with >99% and <1% (default: false)
 * @returns Format depends on truncate option:
 * - truncate=false (default): Shows actual percentage with up to 2 decimals, hides decimals for integers
 * - truncate=true: ">99%" for values >= 99, "<1%" for values < 1, rounded integer otherwise
 * @example formatPercentage(5.25) => "5.25%"
 * @example formatPercentage(5.25, { truncate: true }) => "5%"
 * @example formatPercentage(99.5) => "99.5%"
 * @example formatPercentage(99.5, { truncate: true }) => ">99%"
 * @example formatPercentage(0.5) => "0.5%"
 * @example formatPercentage(0.5, { truncate: true }) => "<1%"
 * @example formatPercentage(5) => "5%"
 * @example formatPercentage(-2.75) => "-2.75%"
 * @example formatPercentage(-2.75, { truncate: true }) => "-3%"
 */
export const formatPercentage = (
  value: string | number,
  options?: { truncate?: boolean },
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const truncate = options?.truncate ?? false;

  if (isNaN(num)) {
    return '0%';
  }

  // Handle truncation mode (when explicitly enabled)
  if (truncate) {
    // Handle special cases for positive numbers only
    if (num >= 99) {
      return '>99%';
    }

    if (num > 0 && num < 1) {
      return '<1%';
    }

    // Round to nearest integer
    return `${Math.round(num)}%`;
  }

  // Non-truncated mode: show up to 2 decimals
  // Check if the number is an integer
  if (num === Math.floor(num)) {
    return `${num}%`;
  }

  // Format with up to 2 decimals, removing trailing zeros
  const formatted = num.toFixed(2).replace(/\.?0+$/, '');

  // Handle edge case: toFixed can return "-0" for very small negative numbers
  if (formatted === '-0') {
    return '0%';
  }

  return `${formatted}%`;
};

/**
 * Formats a price value as USD currency with rounding up to nearest cent
 * @param price - Raw numeric price value
 * @param options - Optional formatting options (kept for backwards compatibility, but not used)
 * @returns USD formatted string, hiding .00 for integer values, rounding up to nearest cent for 3+ decimals
 * @example formatPrice(1234.5678) => "$1,234.57" (rounds up from .5678)
 * @example formatPrice(0.1234) => "$0.13" (rounds up from .1234)
 * @example formatPrice(50000) => "$50,000" (no .00 for integers)
 * @example formatPrice(1234.999) => "$1,235" (rounds up to next dollar)
 * @example formatPrice(0.991) => "$1" (rounds up from .991)
 */
export const formatPrice = (
  price: string | number,
  _options?: { minimumDecimals?: number; maximumDecimals?: number },
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  const maximumDecimals = _options?.maximumDecimals ?? 2;
  const minimumDecimals = _options?.minimumDecimals;

  if (isNaN(num)) {
    return '$0.00';
  }

  // Round to the specified maximum decimal places
  const multiplier = Math.pow(10, maximumDecimals);
  const rounded = Math.round(num * multiplier) / multiplier;

  // Check if it's an integer (no decimal part)
  const isInteger = rounded === Math.floor(rounded);

  // Format with appropriate decimal places
  // If user explicitly set minimumDecimals, use it; otherwise, show no decimals for integers
  const minFractionDigits =
    minimumDecimals !== undefined ? minimumDecimals : isInteger ? 0 : 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maximumDecimals,
  }).format(rounded);
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

/**
 * Formats a game start time into separate date and time strings for display.
 * Uses locale-aware formatting via Intl.DateTimeFormat.
 * @param startTime - ISO 8601 datetime string (e.g., "2026-02-08T20:30:00Z")
 * @returns Object with formatted date ("Sun, Feb 8") and time ("3:30 PM")
 * @example formatGameStartTime("2026-02-08T20:30:00Z") => { date: "Sun, Feb 8", time: "3:30 PM" }
 */
export const formatGameStartTime = (
  startTime: string | undefined,
): { date: string; time: string } => {
  if (!startTime) {
    return { date: 'TBD', time: '' };
  }

  const dateObj = new Date(startTime);

  if (isNaN(dateObj.getTime())) {
    return { date: 'TBD', time: '' };
  }

  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);

  return { date, time };
};
