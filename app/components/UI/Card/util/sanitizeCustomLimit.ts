/**
 * Sanitizes a custom spending limit input string.
 * Strips non-numeric/dot characters and collapses multiple decimal points.
 */
export const sanitizeCustomLimit = (value: string): string => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  return parts.length > 2
    ? parts[0] + '.' + parts.slice(1).join('')
    : sanitized;
};
