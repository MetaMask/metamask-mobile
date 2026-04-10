import { IconName } from '@metamask/design-system-react-native';
import {
  type CaipAssetType,
  type CaipChainId,
  type Hex,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import I18n from '../../../../../locales/i18n';
import { getTimeDifferenceFromNow } from '../../../../util/date';
import formatFiat from '../../../../util/formatFiat';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formats a number to a string with locale-specific formatting.
 * @param value - The number to format.
 * @returns The formatted number as a string.
 */
export const formatNumber = (
  value: number | null,
  decimals?: number,
): string => {
  if (value === null || value === undefined) {
    return '0';
  }
  try {
    return getIntlNumberFormatter(I18n.locale, {
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return String(value);
  }
};

/**
 * Formats a date for rewards date
 * @param date - Date object
 * @returns Formatted date string with time
 * @example 'Jan 24 2:30 PM'
 */
export const formatRewardsDate = (
  date: Date,
  locale: string = I18n.locale,
): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

/**
 * Formats a date as a date-only label for section headers.
 * @param date - Date object
 * @returns Formatted date string without time
 * @example 'Apr 23, 2025'
 */
export const formatRewardsDateLabel = (
  date: Date,
  locale: string = I18n.locale,
): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

/**
 * Formats a date as a time-only string.
 * @param date - Date object
 * @returns Formatted time string
 * @example '10:30 AM'
 */
export const formatRewardsTimeOnly = (
  date: Date,
  locale: string = I18n.locale,
): string =>
  new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

/**
 * Formats a "YYYY-MM-DD" date string into a localized format without timezone shifts.
 * @param isoDate - The date string in "YYYY-MM-DD" format.
 * @param locale - The locale to format for (e.g., 'en-US', 'fr-FR').
 * @param options - Optional Intl.DateTimeFormat options.
 * @returns The localized date string.
 */
export const formatUTCDate = (
  isoDate: string,
  locale: string = I18n.locale,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  // Create a date at midnight UTC
  const date = new Date(`${isoDate}T00:00:00Z`);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC', // Ensure UTC interpretation
  };

  const finalOptions = { ...defaultOptions, ...options };

  return new Intl.DateTimeFormat(locale, finalOptions).format(date);
};

/**
 * Formats a date for mUSD deposit payload
 * @param isoDate - The date string in "YYYY-MM-DD" format
 * @param locale - Optional locale string, defaults to I18n.locale
 * @returns Formatted date string specifically for mUSD deposit payload, or null if invalid
 */
export const formatRewardsMusdDepositPayloadDate = (
  isoDate: string | undefined,
  locale: string = I18n.locale,
): string | null => {
  if (
    !isoDate ||
    typeof isoDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)
  ) {
    return null;
  }

  return formatUTCDate(isoDate, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTimeRemaining = (endDate: Date): string | null => {
  const { days, hours, minutes } = getTimeDifferenceFromNow(endDate.getTime());

  // No time remaining
  if (hours <= 0 && minutes <= 0 && days <= 0) {
    return null;
  }

  const dayString = days > 0 ? `${days}d ` : '';
  const hourString = hours > 0 ? `${hours}h ` : '';
  const minuteString = minutes > 0 ? `${minutes}m` : '';

  return `${dayString}${hourString}${minuteString}`?.trim();
};

// Get icon name with fallback to Star if invalid
export const getIconName = (iconName: string): IconName =>
  Object.values(IconName).includes(iconName as IconName)
    ? (iconName as IconName)
    : IconName.Star;

// Format Url for display
export const formatUrl = (url: string): string => {
  if (!url) {
    return '';
  }

  // Clean up the input: trim whitespace and remove backticks
  const cleanedUrl = url.trim().replace(/((^`)|(`$))/g, '');

  try {
    const urlObj = new URL(cleanedUrl);
    // For http/https URLs, return just the hostname
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      // Check if the original URL contains Unicode characters to preserve them
      const originalHostMatch = cleanedUrl.match(/^https?:\/\/([^/?#]+)/);
      if (originalHostMatch) {
        const originalHost = originalHostMatch[1];
        // If the original contains Unicode characters (non-ASCII), use it instead of punycode
        if (
          /[^\u0020-\u007E]/.test(originalHost) &&
          !originalHost.includes('%')
        ) {
          return originalHost;
        }
      }
      // For encoded URLs or ASCII domains, use the URL object's hostname which handles decoding
      return urlObj.hostname;
    }
    // For other protocols (file:, mailto:, etc.), return the original URL
    return cleanedUrl;
  } catch {
    // Fallback: manually strip protocol and query strings for http/https
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
      let cleanUrl = cleanedUrl.replace(/^https?:\/\//, '');
      const queryIndex = cleanUrl.indexOf('?');
      if (queryIndex !== -1) {
        cleanUrl = cleanUrl.substring(0, queryIndex);
      }
      return cleanUrl;
    }
    // For URLs without protocol, strip query parameters
    const queryIndex = cleanedUrl.indexOf('?');
    if (queryIndex !== -1) {
      return cleanedUrl.substring(0, queryIndex);
    }
    // For non-http protocols or malformed URLs, return as-is
    return cleanedUrl;
  }
};

/**
 * Resolves templated string in the format of ${placeholder}
 * @param template - The templated string
 * @param values - The values to replace the placeholders with
 * @returns The resolved string
 */

export const resolveTemplate = (
  template: string,
  values: Record<string, string>,
): string =>
  template.replace(
    /\${(\w+)}/g,
    (match, placeholder) => values[placeholder] || match,
  );

const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export const validateEmail = (email: string): boolean => {
  if (!email || email.split('@').length !== 2) return false;
  return emailRegex.test(email);
};

// ── USD formatting ──────────────────────────────────────────────────────

/**
 * Formats a numeric string as a USD amount using locale-aware fiat formatting.
 *
 * @example formatUsd('11500.000000') // '$11,500.00'
 * @example formatUsd(12500.5)        // '$12,500.50'
 */
export const formatUsd = (value: string | number): string =>
  formatFiat(new BigNumber(value), 'USD');

/**
 * Formats a USD amount in compact notation (e.g. $1.5M, $350K).
 * Implemented manually because Hermes does not support `notation: 'compact'`.
 *
 * @example formatCompactUsd(1500000) // '$1.5M'
 * @example formatCompactUsd(6000000) // '$6M'
 * @example formatCompactUsd(25000)   // '$25K'
 * @example formatCompactUsd(500)     // '$500'
 */
export const formatCompactUsd = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const compact = abs / 1_000_000;
    const formatted = compact % 1 === 0 ? `${compact}` : compact.toFixed(1);
    return `${sign}$${formatted}M`;
  }
  if (abs >= 1_000) {
    const compact = abs / 1_000;
    const formatted = compact % 1 === 0 ? `${compact}` : compact.toFixed(1);
    return `${sign}$${formatted}K`;
  }
  return `${sign}$${abs}`;
};

/**
 * Formats a USD amount with a +/- sign prefix. Returns '—' for null.
 *
 * @example formatSignedUsd('5000.000000')  // '+$5,000.00'
 * @example formatSignedUsd('-1250.50')     // '-$1,250.50'
 * @example formatSignedUsd(null)           // '—'
 */
export const formatSignedUsd = (value: string | null): string => {
  if (value === null) return '—';
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  const sign = num > 0 ? '+' : '';
  return `${sign}${formatUsd(value)}`;
};

// ── Percent / rate formatting ───────────────────────────────────────────

/**
 * Formats a decimal ratio (number or string) as a signed percentage.
 * Handles both `number` inputs (e.g. leaderboard rate-of-return)
 * and `string` inputs (e.g. portfolio PnL percent).
 *
 * @example formatPercentChange(0.15)    // '+15.00%'
 * @example formatPercentChange('-0.05') // '-5.00%'
 * @example formatPercentChange('—')     // ''
 */
export const formatPercentChange = (value: string | number): string => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) return '';
  const percentage = num * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};

/**
 * Returns true when the given decimal ratio represents a non-negative value.
 */
export const isPercentChangeNonNegative = (value: string | number): boolean => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !Number.isNaN(num) && num >= 0;
};

// ── Timestamp formatting ────────────────────────────────────────────────

/**
 * Formats an ISO 8601 timestamp to `HH:MM:SS`.
 * Returns '' for null or unparseable values.
 */
export const formatComputedAt = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// ── CAIP-19 / address helpers ───────────────────────────────────────────

/**
 * Parses a CAIP-19 asset identifier into its components.
 * Returns `null` for invalid or unparseable identifiers.
 */
export const parseCaip19 = (
  caip19: string,
): {
  namespace: string;
  chainId: string;
  assetReference: string;
} | null => {
  if (!isCaipAssetType(caip19 as CaipAssetType)) return null;
  try {
    const parsed = parseCaipAssetType(caip19 as CaipAssetType);
    const chain = parseCaipChainId(parsed.chainId as CaipChainId);
    return {
      namespace: chain.namespace,
      chainId: chain.reference,
      assetReference: parsed.assetReference,
    };
  } catch {
    return null;
  }
};

/**
 * Extracts a hex chain ID from a CAIP-19 asset identifier.
 * Returns `undefined` for non-EIP-155 or unparseable identifiers.
 */
export const getChainHex = (caip19: string): Hex | undefined => {
  const parsed = parseCaip19(caip19);
  if (!parsed || parsed.namespace !== 'eip155') return undefined;
  return `0x${parseInt(parsed.chainId, 10).toString(16)}` as Hex;
};

/**
 * Extracts the asset reference (contract address) from a CAIP-19 identifier.
 * Falls back to the raw string when parsing fails.
 */
export const getAssetReference = (caip19: string): string => {
  const parsed = parseCaip19(caip19);
  return parsed?.assetReference ?? caip19;
};

/**
 * Converts a CAIP chain ID (e.g. "eip155:1") to a hex chain ID (e.g. "0x1").
 * For non-EVM chains the CAIP chain ID is returned as-is cast to Hex.
 */
export const caipChainIdToHex = (caipChainId: CaipChainId): Hex => {
  const { namespace, reference } = parseCaipChainId(caipChainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (caipChainId as Hex);
};

/**
 * Abbreviates an address / asset reference to `0xAbCd...1234` form.
 */
export const shortenAddress = (address: string): string => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
