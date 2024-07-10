/**
 * Returns the appropriate suffix for a given day of the month.
 *
 * @param {number} day - The day of the month.
 * @returns {string} The suffix for the day.
 */
export function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Converts a Unix timestamp in seconds to a formatted date string.
 *
 * @param {number} timestamp - The Unix timestamp in seconds.
 * @returns {string} The formatted date string.
 */
export function formatTimestampToDate(timestamp: number): string {
  if (typeof timestamp !== 'number') {
    throw new TypeError('Timestamp must be a number');
  }

  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const formattedDate = date.toLocaleDateString('en-US', options);

  // Extract day number to add the appropriate suffix
  const day = date.getDate();
  const suffix = getDaySuffix(day);
  const dayWithSuffix = day + suffix;

  // Format the date string
  const parts = formattedDate.split(' ');
  parts[1] = dayWithSuffix + ',';

  return parts.join(' ');
}
