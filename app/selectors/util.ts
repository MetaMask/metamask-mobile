import { deepEqual } from 'fast-equals';
import { createSelectorCreator, lruMemoize } from 'reselect';

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
