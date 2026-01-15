# Remaining TypeScript Errors - React Navigation v7 Migration

**Generated:** January 13, 2026  
**Total Errors:** 124

## Summary by Error Type

| Error Code | Description                       | Count |
| ---------- | --------------------------------- | ----- |
| TS2345     | Argument type mismatch            | 38    |
| TS2322     | Type not assignable               | 34    |
| TS2556     | Spread argument must be tuple     | 7     |
| TS2353     | Object literal unknown properties | 5     |
| TS2769     | No overload matches call          | 6     |
| TS18046    | Variable is of type 'unknown'     | 3     |
| TS2304     | Cannot find name                  | 2     |
| TS2314     | Generic requires type arguments   | 1     |
| TS2367     | Unintentional comparison          | 1     |
| TS1117     | Duplicate properties              | 2     |
| TS2578     | Unused ts-expect-error            | 2     |
| TS2352     | Type conversion mistake           | 1     |

---

## Category 1: `createNavigationDetails` Return Type Issues (TS2345)

These errors occur because `createNavigationDetails` returns `[string, ...]` instead of literal route names.

### Files:

1. **app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx:598**
2. **app/components/UI/Carousel/index.tsx:423, 427**
3. **app/components/UI/Earn/hooks/useMusdConversion.ts:83, 111**
4. **app/components/UI/Predict/components/PredictNewButton/PredictNewButton.tsx:30**
5. **app/components/UI/Predict/components/PredictPositionEmpty/PredictPositionEmpty.tsx:31**
6. **app/components/UI/Rewards/components/Onboarding/OnboardingIntroStep.tsx:125, 147**
7. **app/components/UI/Rewards/components/RewardItem/RewardItem.tsx:227**
8. **app/components/UI/Rewards/components/Settings/RewardSettingsAccountGroup.tsx:105**
9. **app/components/UI/Rewards/components/Tabs/OverviewTab/WaysToEarn/WaysToEarn.tsx:312, 351, 368**
10. **app/components/UI/Rewards/hooks/useOptout.ts:119, 138**
11. **app/components/UI/Rewards/hooks/useRewardDashboardModals.tsx:116, 173, 222**
12. **app/components/UI/Tokens/TokenList/TokenList.tsx:78**
13. **app/components/Views/confirmations/hooks/useConfirmNavigation.ts:70**
14. **app/core/SDKConnect/handlers/handleCustomRpcCalls.ts:129**

### Root Cause

The deprecated `createNavigationDetails` function in `app/util/navigation/navUtils.ts` returns `[any, any]`:

```typescript
export function createNavigationDetails<T>(name: string, screen?: string) {
  return (params?: T): [any, any] => {
    const result = screen ? { screen, params } : params;
    return [name, result];
  };
}
```

When spread into `navigation.navigate(...details())`, TypeScript can't match the `[any, any]` to the expected literal route types like `[screen: "Asset", params: {...}]`.

### Fix Strategy

**Migrate each file to use direct `navigation.navigate()` calls instead of spreading helper functions.**

#### Pattern A: Simple navigation (no nested screen)

```typescript
// BEFORE
import { createNavigationDetails } from '../../util/navigation/navUtils';
const goToScreen = createNavigationDetails<MyParams>(Routes.SCREEN);
// ...
navigation.navigate(...goToScreen({ id: '123' }));

// AFTER
navigation.navigate(Routes.SCREEN, { id: '123' });
```

#### Pattern B: Nested navigation (with screen parameter)

```typescript
// BEFORE
const goToNested = createNavigationDetails<MyParams>(
  Routes.MODAL.ROOT,
  Routes.MODAL.CHILD,
);
navigation.navigate(...goToNested({ id: '123' }));

// AFTER
navigation.navigate(Routes.MODAL.ROOT, {
  screen: Routes.MODAL.CHILD,
  params: { id: '123' },
});
```

#### Pattern C: Function-based navigation (Carousel)

```typescript
// BEFORE (Carousel/index.tsx line 423)
if (navigation.type === 'function') {
  return navigate(...navigation.navigate());
}

// AFTER - Check if the slide has navigation and handle it directly
if (navigation.type === 'function') {
  const [route, params] = navigation.navigate();
  return navigate(route as keyof RootParamList, params);
}
```

### Migration Checklist for Category 1

| File                           | Lines         | Current Pattern                | Action          |
| ------------------------------ | ------------- | ------------------------------ | --------------- |
| AssetSelectionBottomSheet.tsx  | 598           | `...createNavigationDetails()` | Direct navigate |
| Carousel/index.tsx             | 423, 427      | `...navigation.navigate()`     | Type cast route |
| useMusdConversion.ts           | 83, 111       | Spread helper                  | Direct navigate |
| PredictNewButton.tsx           | 30            | Spread helper                  | Direct navigate |
| PredictPositionEmpty.tsx       | 31            | Spread helper                  | Direct navigate |
| OnboardingIntroStep.tsx        | 125, 147      | Spread helper                  | Direct navigate |
| RewardItem.tsx                 | 227           | Spread helper                  | Direct navigate |
| RewardSettingsAccountGroup.tsx | 105           | Spread helper                  | Direct navigate |
| WaysToEarn.tsx                 | 312, 351, 368 | Spread helper                  | Direct navigate |
| useOptout.ts                   | 119, 138      | Spread helper                  | Direct navigate |
| useRewardDashboardModals.tsx   | 116, 173, 222 | Spread helper                  | Direct navigate |
| TokenList.tsx                  | 78            | Spread helper                  | Direct navigate |
| useConfirmNavigation.ts        | 70            | Spread helper                  | Direct navigate |
| handleCustomRpcCalls.ts        | 129           | Spread helper                  | Direct navigate |

---

## Category 2: Spread Argument Issues (TS2556)

Spread operator requires tuple types, not general arrays.

### Files:

1. **app/components/UI/Ramp/Aggregator/deeplink/handleRampUrl.ts:33, 38**
2. **app/components/UI/Ramp/Deposit/deeplink/handleDepositUrl.ts:20**
3. **app/components/UI/Ramp/hooks/useRampNavigation.ts:83, 86, 94, 97, 120**

### Root Cause

These files use feature-specific navigation helpers like `createBuyNavigationDetails`, `createSellNavigationDetails`, `createDepositNavigationDetails` that return conditional union types:

```typescript
// app/components/UI/Ramp/Aggregator/routes/utils.ts
export function createRampNavigationDetails(rampType: RampType, intent?: RampIntent) {
  if (!intent) {
    return [route] as const;  // Type: readonly ["RampBuy"] | readonly ["RampSell"]
  }
  return [route, { screen: ..., params: ... }] as const;  // Different shape
}
```

When TypeScript sees this union:

- `readonly ["RampBuy"] | readonly ["RampSell"]` (no params)
- OR `readonly ["RampBuy" | "RampSell", { screen: ..., params: ... }]` (with params)

It can't prove the spread matches the expected overload signature of `navigate()`.

### Fix Strategy

**Option A: Migrate to direct navigation (RECOMMENDED)**

Replace spreads with direct calls:

```typescript
// BEFORE (handleRampUrl.ts)
NavigationService.navigation.navigate(
  ...createBuyNavigationDetails(rampIntent),
);

// AFTER
if (rampIntent) {
  NavigationService.navigation.navigate(Routes.RAMP.BUY, {
    screen: Routes.RAMP.ID,
    params: {
      screen: Routes.RAMP.BUILD_QUOTE,
      params: rampIntent,
    },
  });
} else {
  NavigationService.navigation.navigate(Routes.RAMP.BUY);
}
```

**Option B: Type assertion at call site (QUICK FIX)**

```typescript
// BEFORE
navigate(...createBuyNavigationDetails(rampIntent));

// AFTER (quick fix with assertion)
const navDetails = createBuyNavigationDetails(rampIntent);
(navigate as (...args: readonly [string, object?]) => void)(...navDetails);
```

**Option C: Overload the helper functions**

Create overloaded signatures that return specific types:

```typescript
// In utils.ts
export function createBuyNavigationDetails(): readonly [typeof Routes.RAMP.BUY];
export function createBuyNavigationDetails(
  intent: RampIntent,
): readonly [typeof Routes.RAMP.BUY, RampNestedParams];
export function createBuyNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.BUY, intent);
}
```

### Migration Plan for Category 2

| File                 | Lines               | Recommended Fix                  |
| -------------------- | ------------------- | -------------------------------- |
| handleRampUrl.ts     | 33, 38              | Direct navigate with conditional |
| handleDepositUrl.ts  | 20                  | Direct navigate with conditional |
| useRampNavigation.ts | 83, 86, 94, 97, 120 | Direct navigate in each case     |

### Example: `handleRampUrl.ts` Migration

```typescript
// BEFORE
switch (rampType) {
  case RampType.BUY:
    NavigationService.navigation.navigate(
      ...createBuyNavigationDetails(rampIntent),
    );
    break;
  case RampType.SELL:
    NavigationService.navigation.navigate(
      ...createSellNavigationDetails(rampIntent),
    );
    break;
}

// AFTER
switch (rampType) {
  case RampType.BUY:
    if (rampIntent) {
      NavigationService.navigation.navigate(Routes.RAMP.BUY, {
        screen: Routes.RAMP.ID,
        params: { screen: Routes.RAMP.BUILD_QUOTE, params: rampIntent },
      });
    } else {
      NavigationService.navigation.navigate(Routes.RAMP.BUY);
    }
    break;
  case RampType.SELL:
    if (rampIntent) {
      NavigationService.navigation.navigate(Routes.RAMP.SELL, {
        screen: Routes.RAMP.ID,
        params: { screen: Routes.RAMP.BUILD_QUOTE, params: rampIntent },
      });
    } else {
      NavigationService.navigation.navigate(Routes.RAMP.SELL);
    }
    break;
}
```

### Example: `useRampNavigation.ts` Migration

```typescript
// BEFORE
const goToBuy = useCallback((intent?: RampIntent, options?: Options) => {
  // ... logic ...
  if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
    navigate(...createDepositNavigationDetails(intent));
  } else if (rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR) {
    navigate(...createRampNavigationDetails(AggregatorRampType.BUY, intent));
  }
}, [...]);

// AFTER
const goToBuy = useCallback((intent?: RampIntent, options?: Options) => {
  // ... logic ...
  if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
    if (intent) {
      navigate(Routes.DEPOSIT.ID, {
        screen: Routes.DEPOSIT.ROOT,
        params: intent,
      });
    } else {
      navigate(Routes.DEPOSIT.ID);
    }
  } else if (rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR) {
    if (intent) {
      navigate(Routes.RAMP.BUY, {
        screen: Routes.RAMP.ID,
        params: { screen: Routes.RAMP.BUILD_QUOTE, params: intent },
      });
    } else {
      navigate(Routes.RAMP.BUY);
    }
  }
}, [...]);
```

### Alternative: Create Type-Safe Navigation Helpers

If the helper pattern needs to be preserved, create properly typed versions:

```typescript
// app/components/UI/Ramp/navigation.ts
import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import Routes from '../../../constants/navigation/Routes';
import { RampIntent } from './types';

export function navigateToBuy(
  navigation: NavigationProp<RootParamList>,
  intent?: RampIntent,
) {
  if (intent) {
    navigation.navigate(Routes.RAMP.BUY, {
      screen: Routes.RAMP.ID,
      params: { screen: Routes.RAMP.BUILD_QUOTE, params: intent },
    });
  } else {
    navigation.navigate(Routes.RAMP.BUY);
  }
}

export function navigateToSell(
  navigation: NavigationProp<RootParamList>,
  intent?: RampIntent,
) {
  // Similar pattern
}
```

Then use in files:

```typescript
import { navigateToBuy, navigateToSell } from '../navigation';

// In component
navigateToBuy(navigation, rampIntent);
```

---

## Summary: Categories 1 & 2 Fix Approach

| Category | Files                     | Strategy                                        | Effort |
| -------- | ------------------------- | ----------------------------------------------- | ------ |
| 1        | 14 files, ~20 occurrences | Replace spreads with direct navigate            | Medium |
| 2        | 3 files, 7 occurrences    | Inline navigation logic or create typed helpers | Medium |

**Recommended order:**

1. Fix Category 2 first (fewer files, contained to Ramp feature)
2. Fix Category 1 (more files but repetitive pattern)

---

## Category 3: NavigationProp Type Mismatch (TS2345, TS2322)

Components expecting `NavigationProp<ParamListBase>` but receiving `NavigationProp<RootParamList>`.

### Files:

1. **app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx:117**
2. **app/components/UI/Card/Views/CardHome/CardHome.tsx:179**
3. **app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx:630**
4. **app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx:584**
5. **app/components/UI/WhatsNewModal/WhatsNewModal.tsx:364**
6. **app/components/Views/MultichainTransactionsView/MultichainTransactionsView.tsx:155, 161**
7. **app/components/Views/Notifications/OptIn/index.tsx:34, 40**
8. **app/components/Views/TrendingView/components/ExploreSearchResults/ExploreSearchResults.tsx:138, 144**
9. **app/components/Views/TrendingView/components/QuickActions/QuickActions.tsx:40**
10. **app/components/Views/TrendingView/components/SectionHeader/SectionHeader.tsx:46**
11. **app/components/Views/TrendingView/components/Sections/SectionTypes/SectionCard.tsx:39**
12. **app/components/Views/TrendingView/components/Sections/SectionTypes/SectionCarrousel.tsx:52**

**Fix:** Update function signatures to accept `NavigationProp<RootParamList>` or use generic types.

---

## Category 4: WrappedNavigation vs NavigationContainerRef (TS2322, TS2345)

Type conflicts between `WrappedNavigation` class and `NavigationContainerRef`.

### Files:

1. **app/core/DeeplinkManager/handlers/legacy/**tests**/handleCardHome.test.ts:85**
2. **app/core/DeeplinkManager/handlers/legacy/**tests**/handleCardOnboarding.test.ts:81**
3. **app/core/DeeplinkManager/handlers/legacy/**tests**/handleFastOnboarding.test.ts:20, 170**
4. **app/core/DeeplinkManager/handlers/legacy/**tests**/handleHomeUrl.test.ts:14**
5. **app/core/DeeplinkManager/handlers/legacy/**tests**/handlePerpsUrl.test.ts:34**
6. **app/core/DeeplinkManager/handlers/legacy/**tests**/handlePredictUrl.test.ts:18**
7. **app/core/DeeplinkManager/handlers/legacy/**tests**/handleRewardsUrl.test.ts:38**
8. **app/core/SDKConnect/SDKConnect.ts:363**
9. **app/core/WalletConnect/WalletConnectV2.ts:289**

**Fix:** Export `WrappedNavigation` type or update signatures to use the correct navigation type.

---

## Category 5: Missing Route Params in RootParamList (TS2345)

Routes defined with `undefined` params but called with objects.

### Files:

1. **app/components/UI/Ramp/Deposit/hooks/useDepositRouting.ts:207** - `{ quote: BuyQuote }` not assignable to `undefined`
2. **app/components/UI/Ramp/Deposit/Views/BuildQuote/BuildQuote.tsx:172, 210** - Passing params to routes expecting `undefined`
3. **app/components/UI/shared/BaseControlBar/BaseControlBar.tsx:154, 158** - Passing `{}` to routes expecting `undefined`
4. **app/core/DeeplinkManager/handlers/legacy/handleDeepLinkModalDisplay.ts:21** - `DeepLinkModalParams` not assignable to `undefined`

**Fix:** Update `RootParamList` to define correct param types for these routes.

---

## Category 6: Screen Component Type Issues (TS2322)

Stack.Screen component prop type mismatches.

### Files:

1. **app/components/UI/Bridge/routes.tsx:64** - BlockExplorersModal component type
2. **app/components/UI/Ramp/Deposit/routes/index.tsx:208** - DepositRoot route name and component
3. **app/components/UI/Stake/routes/index.tsx:41, 42, 45, 46, 83, 84** - StakeConfirmation, UnstakeConfirmation, GasImpact

**Fix:** Define proper ParamList types for these navigators.

---

## Category 7: NavigationContainer `independent` Prop Removed (TS2322)

React Navigation v7 removed the `independent` prop.

### Files:

1. **app/components/Views/Browser/index.test.tsx** - Lines 145, 178, 210, 241, 269, 312, 513, 566, 628, 682, 724
2. **app/components/Views/DiscoveryTab/index.test.tsx** - Lines 74, 95, 133

**Fix:** Remove `independent` prop from NavigationContainer in tests. Use different testing pattern.

---

## Category 8: Send Flow Navigation Types (TS2345, TS2322)

Incorrect screen name types in send flow.

### Files:

1. **app/components/Views/confirmations/components/nft-list/nft-list.tsx:48** - `"Recipient"` not assignable to `"Amount"`
2. **app/components/Views/confirmations/components/send/amount/amount-keyboard/amount-keyboard.tsx:117** - Same issue
3. **app/components/Views/confirmations/hooks/send/useSendScreenNavigation.test.ts:56** - Same issue
4. **app/components/Views/confirmations/utils/send.ts:121, 123** - Screen name type mismatches

**Fix:** Update `SendFlowStackParamList` to include all screen names or fix the type definitions.

---

## Category 9: Unknown/Missing Navigation Variable (TS18046, TS2304)

Navigation variable is undefined or unknown.

### Files:

1. **app/components/UI/Bridge/components/RecipientSelectorModal/RecipientSelectorModal.tsx:89, 95** - Cannot find name 'navigation'
2. **app/components/UI/Bridge/utils/transaction-history.ts:248** - 'navigation' is of type 'unknown'
3. **app/components/UI/Rewards/components/Tabs/ActivityTab/EventDetails/ActivityDetailsSheet.tsx:102** - 'navigation' is of type 'unknown'
4. **app/components/Views/FeatureFlagOverride/FeatureFlagOverride.test.tsx:344** - 'mockNavigation' is of type 'unknown'

**Fix:** Add proper typing for navigation variables or fix the component logic.

---

## Category 10: Object Literal Unknown Properties (TS2353)

Properties that don't exist in the expected type.

### Files:

1. **app/components/hooks/useNetworkConnectionBanner/useNetworkConnectionBanner.ts:66** - `shouldNetworkSwitchPopToWallet` doesn't exist
2. **app/components/UI/Perps/components/PerpsMarketBalanceActions/PerpsMarketBalanceActions.tsx:227** - `source` doesn't exist
3. **app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx:232** - `source` doesn't exist

**Fix:** Update the type definitions to include these properties.

---

## Category 11: Test File Issues (TS2578, TS1117, TS2352)

Test-specific issues.

### Files:

1. **app/components/UI/Earn/hooks/useMusdConversion.test.ts:44** - Duplicate property names
2. **app/components/UI/Earn/Views/EarnMusdConversionEducationView/index.test.tsx:105** - Unused ts-expect-error
3. **app/components/UI/Predict/views/PredictBuyPreview/PredictBuyPreview.test.tsx:220** - dangerouslyGetState doesn't exist
4. **app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.test.tsx:217** - dangerouslyGetState doesn't exist
5. **app/components/UI/Ramp/hooks/useRampNavigation.test.ts:210, 230, 252** - readonly tuple to mutable type
6. **app/components/UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper.test.tsx:39, 52** - Mock type issues
7. **app/components/Views/ActivityView/index.test.tsx:319** - readonly tuple to mutable type
8. **app/components/Views/TransactionsView/index.test.tsx:336** - Unused ts-expect-error

**Fix:** Update test mocks and remove unused directives.

---

## Category 12: Other Navigation Issues

### Files:

1. **app/components/Nav/NavigationProvider/NavigationProvider.tsx:39** - Theme comparison type mismatch
2. **app/components/UI/Perps/hooks/usePerpsNavigation.ts:136** - undefined not assignable to object
3. **app/components/UI/Perps/Views/PerpsTabView/PerpsTabView.tsx:110** - string not assignable to navigation options
4. **app/components/UI/Ramp/Deposit/Views/Root/Root.tsx:67** - string not assignable to keyof RootParamList

---

## Recommended Fix Order

1. **High Priority:** Categories 1-3 (createNavigationDetails, spread args, NavigationProp)
2. **Medium Priority:** Categories 4-6 (WrappedNavigation, route params, screen components)
3. **Lower Priority:** Categories 7-12 (test files, misc issues)

---

## Quick Fixes

### For `independent` prop errors (Category 7):

```tsx
// Before (v6)
<NavigationContainer independent>

// After (v7) - Use createNavigationContainerRef
const navRef = createNavigationContainerRef();
<NavigationContainer ref={navRef}>
```

### For `dangerouslyGetState` errors (Category 11):

```tsx
// Before (v6)
navigation.dangerouslyGetState();

// After (v7)
navigation.getState();
```

### For NavigationProp type mismatches (Category 3):

```tsx
// Before
function myHelper(navigation: NavigationProp<ParamListBase>) { ... }

// After
function myHelper(navigation: NavigationProp<RootParamList>) { ... }
// Or use generic:
function myHelper<T extends ParamListBase>(navigation: NavigationProp<T>) { ... }
```
