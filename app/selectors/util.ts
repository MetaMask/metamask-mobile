import { createSelector } from '@reduxjs/toolkit';

/**
 * Historically created a selector with deep equality checking for input
 * comparisons (via `fast-equals` `deepEqual`). Aliased to the standard
 * reference-equality `createSelector` to remove the deep-compare overhead that
 * dominated the confirmation critical path — the upstream input selectors are
 * already reference-stable (Immer + `createSelector`), so the deep compare was
 * pure cost with no memoization benefit.
 *
 * Retained as a named export so the ~35 existing call sites do not need to
 * change.
 */
export const createDeepEqualSelector = createSelector;
