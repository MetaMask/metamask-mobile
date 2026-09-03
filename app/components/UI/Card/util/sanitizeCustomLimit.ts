/**
 * Sanitizes a custom spending limit input string.
 * Normalizes comma decimal separators (shown by the decimal-pad keyboard in
 * locales such as French or German) to dots, strips remaining non-numeric/dot
 * characters, and collapses multiple decimal points.
 */
export const sanitizeCustomLimit = (value: string): string => {
  const sanitized = value.replaceAll(',', '.').replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  return parts.length > 2
    ? parts[0] + '.' + parts.slice(1).join('')
    : sanitized;
};
