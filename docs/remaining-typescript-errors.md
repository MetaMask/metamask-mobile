# Remaining TypeScript Errors - React Navigation v7 Migration

**Last Updated:** January 15, 2026  
**Total Errors:** 81

---

## Summary by Error Type

| Error Code | Description              | Count |
| ---------- | ------------------------ | ----- |
| TS2345     | Argument type mismatch   | ~50   |
| TS2322     | Type not assignable      | ~20   |
| TS2769     | No overload matches call | ~5    |
| TS2367     | Unintentional comparison | 1     |
| TS2352     | Type conversion mistake  | 1     |

---

## Summary by Category

| Category | Description                                    | Count | Status     |
| -------- | ---------------------------------------------- | ----- | ---------- |
| 1        | NavigationProp<RootParamList> vs ParamListBase | ~15   | 🔴 Pending |
| 2        | Spread argument issues                         | ~10   | 🔴 Pending |
| 3        | Route param mismatches (undefined vs params)   | ~10   | 🔴 Pending |
| 4        | String vs keyof RootParamList                  | ~5    | 🔴 Pending |
| 5        | Null/undefined type narrowing                  | ~5    | 🔴 Pending |
| 6        | Screen component type issues                   | ~5    | 🔴 Pending |
| 7        | Test file mock issues                          | ~10   | 🔴 Pending |
| 8        | Theme comparison                               | 1     | 🔴 Pending |

---

## Category 1: NavigationProp Type Mismatch (TS2345)

Functions typed with `NavigationProp<ParamListBase>` receiving `NavigationProp<RootParamList>`.

### Files:

1. **app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx:117**
2. **app/components/UI/Card/Views/CardHome/CardHome.tsx:179**
3. **app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx:630**
4. **app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx:584**
5. **app/components/UI/Rewards/components/Tabs/ActivityTab/ActivityEventRow.tsx:103**
6. **app/components/UI/Rewards/components/Tabs/ActivityTab/EventDetails/ActivityDetailsSheet.test.tsx:322, 366, 403, 442**

### Fix Strategy

**Option A: Use NavigationProp<ParamListBase>** (Pragmatic - User's preference)

Accept less strict typing for utility functions:

```typescript
// Function accepts looser type
function myHelper(navigation: NavigationProp<ParamListBase>) { ... }
```

**Option B: Use generics**

```typescript
function myHelper<T extends ParamListBase>(navigation: NavigationProp<T>) { ... }
```

---

## Category 2: Spread Argument Issues (TS2345, TS2769)

`createNavigationDetails` returns `[string, object | undefined]` which doesn't match `navigate()` overloads.

### Files:

1. **app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx:598**
2. **app/components/UI/Carousel/index.tsx:423, 427**
3. **app/components/UI/Earn/hooks/useMusdConversion.ts:83, 111**
4. **app/components/UI/Rewards/hooks/useOptout.ts:119**

### Fix Strategy

**Migrate to direct `navigation.navigate()` calls:**

```typescript
// BEFORE
navigation.navigate(...createSomeNavDetails(params));

// AFTER
navigation.navigate(Routes.SCREEN, params);
```

---

## Category 3: Route Param Mismatches (TS2345)

Routes defined with `undefined` params but called with objects like `{}`.

### Files:

1. **app/components/UI/Ramp/Deposit/hooks/useDepositRouting.ts:207** - `{ quote: BuyQuote }` not assignable to `undefined`
2. **app/components/UI/Ramp/Deposit/Views/BuildQuote/BuildQuote.tsx:172, 210** - Passing `{}` or params to routes expecting `undefined`
3. **app/components/UI/shared/BaseControlBar/BaseControlBar.tsx:154, 158** - Passing `{}` to routes expecting `undefined`

### Fix Strategy

**Option A: Update RootParamList** (Recommended)

Define correct param types:

```typescript
// In app/types/navigation.d.ts
'DepositRegionSelectorModal': { regions?: DepositRegion[] };
'DepositConfigurationModal': object; // or specific type
```

**Option B: Pass undefined when no params needed**

```typescript
// BEFORE
navigation.navigate(Routes.SCREEN, {});

// AFTER
navigation.navigate(Routes.SCREEN);
// or
navigation.navigate(Routes.SCREEN, undefined);
```

---

## Category 4: String vs keyof RootParamList (TS2345)

Passing string route names where literal types expected.

### Files:

1. **app/components/UI/Perps/Views/PerpsTabView/PerpsTabView.tsx:110** - string not assignable to expected type
2. **app/components/UI/Ramp/Deposit/Views/Root/Root.tsx:67** - string not assignable to keyof RootParamList

### Fix Strategy

Ensure routes are passed with proper typing:

```typescript
// BEFORE
navigation.navigate(Routes.PERPS.TUTORIAL); // Works only if Routes is `as const`

// AFTER - if route needs params
navigation.navigate(Routes.PERPS.TUTORIAL, undefined);
// or - with params
navigation.navigate(Routes.PERPS.TUTORIAL, { source: 'wallet' });
```

---

## Category 5: Null/Undefined Type Narrowing (TS2322)

Values can be null/undefined but are passed to non-nullable types.

### Files:

1. **app/components/UI/Predict/components/PredictPositionDetail/PredictPositionDetail.tsx:121** - `PredictOutcome | undefined` not assignable to `PredictOutcome`
2. **app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx:562** - `PredictMarket | null` not assignable to `PredictMarket`

### Fix Strategy

Add null checks before usage:

```typescript
// BEFORE
<Component market={market} />  // market can be null

// AFTER
{market && <Component market={market} />}
// or
<Component market={market!} />  // if you're certain it's not null
```

---

## Category 6: Screen Component Type Issues (TS2322)

Stack.Screen component prop type mismatches.

### Files:

1. **app/components/UI/Bridge/routes.tsx:64** - BlockExplorersModal component type
2. **app/components/UI/Ramp/Deposit/routes/index.tsx:208** - DepositRoot route name and component

### Fix Strategy

Define proper ParamList types for nested navigators:

```typescript
// Define navigator-specific param list
type DepositStackParamList = {
  [Routes.DEPOSIT.ROOT]: DepositNavigationParams;
  // ... other screens
};

// Use with createStackNavigator
const Stack = createStackNavigator<DepositStackParamList>();
```

---

## Category 7: Test File Issues (TS2352, TS2345)

Mock type issues in test files.

### Files:

1. **app/components/UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper.test.tsx:39** - Mock type conversion
2. **app/components/UI/Rewards/components/Tabs/ActivityTab/EventDetails/ActivityDetailsSheet.test.tsx:322+** - NavigationProp mock

### Fix Strategy

Use proper type casting for mocks:

```typescript
// BEFORE
const mockNavigation = { navigate: jest.fn(), ... };

// AFTER
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  // ... all required methods
} as unknown as NavigationProp<ParamListBase>;
```

---

## Category 8: Theme Comparison (TS2367)

### Files:

1. **app/components/Nav/NavigationProvider/NavigationProvider.tsx:39** - Theme vs AppThemeKey comparison

### Fix Strategy

Ensure types are compatible:

```typescript
// The comparison should use matching types
if (theme === AppThemeKey.dark) { ... }
```

---

## Recommended Fix Order

1. **Category 3: Route param mismatches** - Update RootParamList (quick fix)
2. **Category 4: String vs keyof** - Add undefined params where needed
3. **Category 5: Null narrowing** - Add null checks
4. **Category 1: NavigationProp type** - Accept ParamListBase in utilities
5. **Category 2: Spread arguments** - Migrate to direct navigate
6. **Category 6-8** - Component and test fixes

---

## Progress Tracking

### Completed ✅

- Category 2 (Ramp/Deposit split functions) - Resolved TS2556 errors
- Missing routes in RootParamList - Added Predict, Rewards routes
- Test file fixes - PredictBuyPreview, PredictSellPreview mocks
- Import path fixes - All NavigationContainerRef<RootParamList>
- Perps navigation.ts - Added `source` property to PerpsTutorial

### In Progress 🔄

- Remaining 81 TypeScript errors across all categories

### Not Started 🔴

- Full migration from createNavigationDetails to direct navigate

---

## Quick Reference

### Common Fixes

```typescript
// 1. NavigationProp type - use ParamListBase for loose typing
function helper(navigation: NavigationProp<ParamListBase>) { }

// 2. Empty params - pass undefined instead of {}
navigation.navigate(Routes.SCREEN, undefined);

// 3. Null narrowing - add guard
if (value) { <Component prop={value} /> }

// 4. Mock navigation in tests
const mock = { ...methods } as unknown as NavigationProp<ParamListBase>;
```
