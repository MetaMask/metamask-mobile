import { IconName } from '@metamask/design-system-react-native';
import I18n from '../../../../../locales/i18n';
import { getTimeDifferenceFromNow } from '../../../../util/date';
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
