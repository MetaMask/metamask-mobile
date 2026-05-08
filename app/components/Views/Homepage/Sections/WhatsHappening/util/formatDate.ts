/**
 * Formats an ISO date string as a compact relative time (e.g. "4d", "3h", "5m").
 *
 * @param dateString - ISO 8601 date string (e.g. "2026-03-15T10:00:00.000Z")
 * @returns Compact relative string (e.g. "4d") or null if invalid
 */
export const formatShortRelative = (dateString: string): string | null => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};
