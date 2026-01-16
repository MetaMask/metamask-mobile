# Remaining TypeScript Errors - React Navigation v7 Migration

**Last Updated:** January 15, 2026
**Total Errors:** 12 (down from 143)

## Error Summary by Category

| Category                          | Count  | Status       |
| --------------------------------- | ------ | ------------ |
| WrappedNavigation type mismatches | ~~10~~ | ✅ FIXED     |
| Spread argument issues            | 5      | 🔴 Remaining |
| createNavigationDetails params    | 3      | 🔴 Remaining |
| Unrelated to navigation           | 2      | 🔴 Remaining |
| Test file mocks                   | 2      | 🔴 Remaining |

---

## ✅ COMPLETED: WrappedNavigation Type Fixes

All WrappedNavigation type mismatches have been resolved by:

1. Exporting `WrappedNavigation` from `NavigationService.ts`
2. Updating `SDKConnectState.navigation` to use `typeof NavigationService.navigation`
3. Updating `Connection`, `WalletConnect2Session`, `wc-utils`, and `handleCustomRpcCalls` to use the new type
4. Updating all test mocks to use `typeof NavigationService.navigation`

---

## Category 1: Spread Argument Issues (5 errors)

### Problem

`navigation.navigate(...helperFunction())` fails because helper functions return union types that TypeScript can't spread.

### Remaining Files

1. **Carousel/index.tsx** (lines 423, 427) - `navigationRoute` spread
2. **useMusdConversion.ts** (lines 83, 111) - `createEarnNavigationDetails` spread
3. **useOptout.ts** (line 119) - navigation helper spread
4. **useConfirmNavigation.ts** (line 70) - `createConfirmFlowNavDetails` spread

### Fix Strategy

Replace spread pattern with direct navigate:

```typescript
// Before (broken)
navigation.navigate(...createSomeNavDetails(params));

// After (works)
const [route, navParams] = createSomeNavDetails(params);
navigation.navigate(route as keyof RootParamList, navParams);

// Or even better - replace helper entirely
navigation.navigate(Routes.SOME_ROUTE, { screen: 'Child', params });
```

---

## Category 2: createNavigationDetails Params Issues (3 errors)

### Problem

Helper functions created with `createNavigationDetails` expect `undefined` but are called with params.

### Remaining Files

1. **useDepositRouting.ts:207** - `createVerifyIdentityNavDetails` with `{ quote }`
2. **BuildQuote.tsx:208** - `createRegionSelectorModalNavigationDetails` with `{ regions }`
3. **handleDeepLinkModalDisplay.ts:21** - navigation with `DeepLinkModalParams`

### Fix Strategy

Update the helper function definitions to accept params:

```typescript
// Before
export const createVerifyIdentityNavDetails = createNavigationDetails(
  Routes.DEPOSIT.MODALS.ID,
  Routes.DEPOSIT.VERIFY_IDENTITY,
);

// After - add generic type for params
export const createVerifyIdentityNavDetails = createNavigationDetails<{
  quote: BuyQuote;
}>(Routes.DEPOSIT.MODALS.ID, Routes.DEPOSIT.VERIFY_IDENTITY);
```

---

## Category 3: Unrelated to Navigation (2 errors)

### 1. NavigationProvider.tsx:39 - Theme Comparison

```
error TS2367: This comparison appears to be unintentional because the types 'Theme' and 'AppThemeKey' have no overlap.
```

**Fix:** This is a theme type issue, not navigation. Likely needs enum/type comparison fix.

### 2. Bridge/routes.tsx:65 - Screen Component Type

```
error TS2322: Type '(props: BlockExplorersModalProps) => React.JSX.Element' is not assignable to type 'ScreenComponentType'
```

**Fix:** Create proper ParamList for Bridge or use type assertion for the component.

---

## Category 4: Test File Mocks (2 errors)

### Affected Files

- **ActivityView/index.test.tsx:319** - readonly tuple not assignable

### Fix Strategy

Update the assertion or cast the tuple:

```typescript
// Before
expect(navigate).toHaveBeenCalledWith(...expectedArgs);

// After - remove readonly assertion or cast
expect(navigate).toHaveBeenCalledWith('NetworkManager', {
  screen: 'NetworkSelector',
});
```

---

## Fix Priority Order

1. **Spread argument fixes** (Category 1) - 5 errors, may need individual fixes
2. **createNavigationDetails params** (Category 2) - 3 errors, add type params
3. **Test file fixes** (Category 4) - 2 errors
4. **Unrelated fixes** (Category 3) - 2 errors, separate from navigation migration

## Estimated Remaining Effort

| Category                | Effort      | Notes                     |
| ----------------------- | ----------- | ------------------------- |
| Spread arguments        | 30 min      | Individual file changes   |
| createNavigationDetails | 15 min      | Add type params           |
| Test fixes              | 10 min      | Simple assertion fixes    |
| Unrelated               | 15 min      | Theme + Bridge type fixes |
| **Total**               | **~1 hour** |                           |

---

## Progress History

| Date    | Errors | Action                                            |
| ------- | ------ | ------------------------------------------------- |
| Initial | 143    | Started migration                                 |
| Step 1  | 124    | Added missing routes to RootParamList             |
| Step 2  | 100    | Fixed `createNavigationDetails` return type       |
| Step 3  | 81     | Fixed Ramp navigation helpers (Option F)          |
| Step 4  | 78     | Fixed duplicate mocks, unused directives          |
| Step 5  | 56     | Fixed NavigationProp<RootParamList> in Category 1 |
| Step 6  | 40     | Fixed Stake Screen component types (Category 6)   |
| Step 7  | 25     | Fixed misc issues                                 |
| Current | 12     | Fixed WrappedNavigation type mismatches           |
