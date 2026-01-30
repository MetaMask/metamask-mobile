import type { AnalyticsEventProperties } from '@metamask/analytics-controller';

/**
 * Returns an empty object if input is null/undefined, or a copy of the given object with `undefined` property values removed.
 * Use this before passing properties to `addProperties()` or `addSensitiveProperties()` so
 * the payload matches `AnalyticsEventProperties` (which does not allow undefined values).
 *
 * **When to use:** Whenever the object can have optional keys or values that are
 * `undefined` (e.g. attribution, event params, or spread from optional types).
 *
 * **Top-level null/undefined:** If `unfilteredProperties` is `null` or `undefined`,
 * returns `{}`.
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
 *
 * @example
 * // Safe to pass to analytics builder
 * eventBuilder.addProperties(filterUndefinedValues(attribution));
 */
export function filterUndefinedValues(
  unfilteredProperties:
    | AnalyticsEventProperties
    | Record<string, unknown | undefined>
    | null
    | undefined,
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
