/**
 * Cache for Intl.NumberFormat instances to avoid expensive recreations
 * Key is a stringified combination of locale and options
 * Value is the cached Intl.NumberFormat instance
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();

/**
 * Cache for Intl.DateTimeFormat instances to avoid expensive recreations
 * Key is a stringified combination of locale and options
 * Value is the cached Intl.DateTimeFormat instance
 */
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Gets a cached Intl.NumberFormat instance or creates and caches a new one
 * This allows you to replace `new Intl.NumberFormat(locale, options)` with
 * `getIntlNumberFormatter(locale, options)` while keeping the same API
 *
 * @param locale - The locale string (e.g., 'en-US', 'fr-FR')
 * @param options - Optional NumberFormat options
 * @returns A cached or new Intl.NumberFormat instance
 *
 * @example
 * // Before: new Intl.NumberFormat(locale, options).format(amount)
 * // After:  getIntlNumberFormatter(locale, options).format(amount)
 */
export function getIntlNumberFormatter(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const cacheKey = `${locale}${options ? JSON.stringify(options) : ''}`;

  let formatter = numberFormatCache.get(cacheKey);

  if (!formatter) {
    formatter = Intl.NumberFormat(locale, options);
    numberFormatCache.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Gets a cached Intl.DateTimeFormat instance or creates and caches a new one
 * This allows you to replace `new Intl.DateTimeFormat(locale, options)` with
 * `getIntlDateFormatter(locale, options)` while keeping the same API
 *
 * @param locale - The locale string (e.g., 'en-US', 'fr-FR')
 * @param options - Optional DateTimeFormat options
 * @returns A cached or new Intl.DateTimeFormat instance
 *
 * @example
 * // Before: new Intl.DateTimeFormat(locale, options).format(date)
 * // After:  getIntlDateFormatter(locale, options).format(date)
 */
export function getIntlDateTimeFormatter(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cacheKey = `${locale}${options ? JSON.stringify(options) : ''}`;

  let formatter = dateTimeFormatCache.get(cacheKey);

  if (!formatter) {
    formatter = Intl.DateTimeFormat(locale, options);
    dateTimeFormatCache.set(cacheKey, formatter);
  }

  return formatter;
}
