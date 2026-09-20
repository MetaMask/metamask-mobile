import { deepEqual } from 'fast-equals';
import { createSelectorCreator, lruMemoize, weakMapMemoize } from 'reselect';

/**
 * Creates a selector with deep equality checking for input comparisons.
 *
 * Uses deep equality instead of reference equality to prevent unnecessary
 * recalculations when input selectors return identical objects with different references.
 *
 * @example
 * ```typescript
 * const selectUserPreferences = createDeepEqualSelector(
 *   selectUserPreferencesState,
 *   (preferences) => preferences
 * );
 *
 * const selectFilteredItems = createDeepEqualSelector(
 *   [selectItems, selectComplexFilterConfig],
 *   (items, filterConfig) => items.filter(item => matchesFilter(item, filterConfig))
 * );
 * ```
 *
 * **When to use:**
 * - Input selectors return complex objects that should be compared by value
 * - Result function returns identity/passthrough (acceptable here)
 *
 * **Avoid when:**
 * - Working with primitives or when deep equality checks would be expensive
 */
export const createDeepEqualSelector = createSelectorCreator(
  lruMemoize,
  deepEqual,
);

/**
 * Creates a selector that keeps the previous result reference when the new
 * result is deep-equal, so consumers can skip re-rendering.
 *
 * Unlike {@link createDeepEqualSelector}, which compares the *inputs* of the
 * result function, this compares the *result* itself. Use it when an input
 * legitimately changes but the slice this selector derives from it often does
 * not — e.g. reading one token out of a list that is rebuilt on every balance
 * poll.
 *
 * The comparison only ever runs against the selector instance's own most
 * recent result, so a selector read with many different arguments needs one
 * instance per argument to benefit.
 */
export const createDeepEqualResultSelector = createSelectorCreator({
  memoize: weakMapMemoize,
  memoizeOptions: { resultEqualityCheck: deepEqual },
});
