# Fix: usePerpsWithdrawStatus selector causes excessive re-renders

## Problem

The `useSelector` call in `app/components/UI/Perps/hooks/usePerpsWithdrawStatus.ts:15-17` triggers unnecessary re-renders:

```ts
const lastWithdrawResult = useSelector(
  (state: RootState) =>
    state.engine.backgroundState.PerpsController?.lastWithdrawResult ?? null,
);
```

## Root cause

Two issues combine to defeat React-Redux's referential equality check:

1. **Inline selector function** — a new function reference is created on every render, so React-Redux cannot skip the selector call via reference comparison.
2. **`?? null` fallback** — when `lastWithdrawResult` is `undefined`, the expression evaluates to a new `null` literal each time. While `null === null` is true for primitives, the real risk is if the selected value is ever an object: React-Redux uses `===` by default, and a new object reference would cause a re-render even if the contents are identical.

## Fix

1. **Extract a stable selector** as a top-level `const` outside the component:

```ts
import { createSelector } from 'reselect';

const selectLastWithdrawResult = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController,
  (controller) => controller?.lastWithdrawResult ?? null,
);
```

Or if `reselect` is overkill for this case, a simple top-level function:

```ts
const selectLastWithdrawResult = (state: RootState) =>
  state.engine.backgroundState.PerpsController?.lastWithdrawResult ?? null;
```

2. **Use the extracted selector**:

```ts
const lastWithdrawResult = useSelector(selectLastWithdrawResult);
```

3. **Optionally add `shallowEqual`** if `lastWithdrawResult` is an object that may be reconstructed:

```ts
import { shallowEqual } from 'react-redux';
const lastWithdrawResult = useSelector(selectLastWithdrawResult, shallowEqual);
```

## Pattern reference

Check how other perps hooks handle selectors for consistency:

```bash
grep -rn "useSelector" app/components/UI/Perps/hooks/
```

## Files to modify

- `app/components/UI/Perps/hooks/usePerpsWithdrawStatus.ts`

## Verification

- Add `console.count('usePerpsWithdrawStatus render')` temporarily and confirm re-render count drops after the fix.
- Or use React DevTools Profiler to compare render counts before/after.
