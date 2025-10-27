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

/**
 * Creates a selector with BOTH input AND output deep equality checking.
 *
 * This ensures:
 * 1. Selector only recomputes when inputs change (deep comparison)
 * 2. Selector returns cached reference when output is deeply equal (prevents re-renders)
 *
 * This is the ideal solution for selectors that return arrays/objects that may have
 * the same content but different references.
 *
 * @example
 * ```typescript
 * // This selector returns a new array on every computation
 * // but createDeepEqualOutputSelector ensures stable references
 * const selectTokenKeys = createDeepEqualOutputSelector(
 *   selectTokens,
 *   (tokens) => tokens.map(t => ({ address: t.address, chainId: t.chainId }))
 * );
 *
 * // In component: will NOT re-render if token list content is the same
 * const tokenKeys = useSelector(selectTokenKeys);
 * ```
 *
 * **Performance Note:**
 * Deep equality checks have a cost. Use this for:
 * - Small to medium arrays/objects
 * - Data that changes infrequently
 * - When preventing re-renders is more important than the equality check cost
 */
export const createDeepEqualOutputSelector = createSelectorCreator({
  memoize: lruMemoize,
  memoizeOptions: {
    // Compare both previous and current results using deep equality
    resultEqualityCheck: deepEqual,
  },
  argsMemoize: lruMemoize,
  argsMemoizeOptions: {
    // Also compare selector inputs using deep equality
    equalityCheck: deepEqual,
  },
});
