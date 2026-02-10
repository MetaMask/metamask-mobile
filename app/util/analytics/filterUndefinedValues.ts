import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import type { AnalyticsUnfilteredProperties } from './analytics.types';

/**
 * Returns an empty object if input is null/undefined, or a copy of the given object with `undefined` property values removed.
 * Used internally by `AnalyticsEventBuilder.addProperties()` and `addSensitiveProperties()` so callers can pass unfiltered
 * objects directly; call this only when you need a filtered plain object for other uses.
 *
 * **Top-level null/undefined:** If `unfilteredProperties` is `null` or `undefined`, returns `{}`.
 *
 * **Property values:** Only `undefined` is removed. `null` is kept (valid in JSON).
 * Falsy but defined values (`0`, `false`, `''`) are kept.
 *
 * @param unfilteredProperties - Object that can have `undefined` values, or be `null`/`undefined`.
 * @returns A new object with no `undefined` values, suitable for AnalyticsEventProperties.
 *
 * @example
 * // Object with mixed defined and undefined
 * filterUndefinedValues({ a: 'x', b: undefined, c: 0 });
 * // => { a: 'x', c: 0 }
 */
export function filterUndefinedValues(
  unfilteredProperties: AnalyticsUnfilteredProperties,
): AnalyticsEventProperties {
  if (unfilteredProperties == null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(unfilteredProperties).filter(
      ([, value]) => value !== undefined,
    ),
  ) as AnalyticsEventProperties;
}
