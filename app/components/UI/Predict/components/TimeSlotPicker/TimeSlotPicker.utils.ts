export { findLiveMarket, findNearestMarket } from '../../utils/series';

/**
 * Formats an ISO date string to a locale-aware "H:MM AM/PM" time string.
 * Returns an empty string for invalid dates.
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};
