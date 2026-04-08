/**
 * Formats an ISO date string to a short locale date (e.g. "Mar 15, 2026").
 *
 * @param dateString - ISO 8601 date string (e.g. "2026-03-15T10:00:00.000Z")
 * @returns Formatted string (e.g. "Mar 15, 2026") or null if invalid
 */
export const formatShortDate = (dateString: string): string | null => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};
