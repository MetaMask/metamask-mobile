# React Navigation v5 to v6 Migration Plan

## Overview

This document outlines the comprehensive migration plan for upgrading React Navigation from v5 to v6 in MetaMask Mobile. The migration maintains API compatibility while introducing several breaking changes that improve consistency and flexibility.

## Current State

| Package | Current Version | Target Version |
|---------|-----------------|----------------|
| `@react-navigation/native` | ^5.9.4 | ^6.1.x |
| `@react-navigation/stack` | ^5.14.5 | ^6.4.x |
| `@react-navigation/bottom-tabs` | ^5.11.11 | ^6.6.x |
| `@react-navigation/compat` | ^5.3.20 | **Remove** |

### Peer Dependencies (Already Compatible ✅)

- `react-native-screens`: 3.37.0 ✅
- `react-native-safe-area-context`: ^5.4.0 ✅
- `react-native-gesture-handler`: ^2.25.0 ✅

---

## Phase 1: Package Updates ✅ (Completed)

### 1.1 Install v6 Packages

```bash
yarn add @react-navigation/native@^6 @react-navigation/stack@^6 @react-navigation/bottom-tabs@^6
```

### 1.2 Remove Deprecated Package

```bash
yarn remove @react-navigation/compat
```

### 1.3 Create withNavigation HOC Replacement ✅

Since `@react-navigation/compat` is removed, we created a replacement HOC for class components:

**Location:** `app/components/hooks/useNavigation/withNavigation.tsx`

```tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';

export function withNavigation<P extends { navigation?: ReturnType<typeof useNavigation> }>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, 'navigation'>> {
  function WithNavigationWrapper(props: Omit<P, 'navigation'>) {
    const navigation = useNavigation();
    return <Component {...(props as P)} navigation={navigation} />;
  }
  return WithNavigationWrapper;
}
```

---

## Phase 2: Breaking Changes - Stack Navigator

### 2.1 `mode="modal"` → `presentation: 'modal'`

The `mode` prop on Stack.Navigator is deprecated. Move to `screenOptions.presentation`.

**Files to Update (15 instances):**

| File | Line |
|------|------|
| `app/components/Nav/App/App.tsx` | 302, 621 |
| `app/components/Nav/Main/MainNavigator.js` | 258, 312 |
| `app/components/UI/Ramp/routes.tsx` | 33 |
| `app/components/UI/Ramp/Deposit/routes/index.tsx` | 143 |
| `app/components/UI/Ramp/Aggregator/routes/index.tsx` | 66 |
| `app/components/UI/Predict/routes/index.tsx` | 22 |
| `app/components/UI/Perps/routes/index.tsx` | 69, 159 |
| `app/components/UI/Earn/routes/index.tsx` | 51 |
| `app/components/UI/Card/routes/index.tsx` | 169 |

**Before (v5):**
```tsx
<Stack.Navigator mode="modal" screenOptions={clearStackNavigatorOptions}>
```

**After (v6):**
```tsx
<Stack.Navigator screenOptions={{ ...clearStackNavigatorOptions, presentation: 'modal' }}>
```

### 2.2 `headerMode` Prop → `screenOptions.headerMode`

The `headerMode` prop has been moved from navigator props to screen options.

**Files to Update (11 instances):**

| File | Current Usage |
|------|---------------|
| `app/components/Views/confirmations/components/send/send.tsx` | `headerMode="screen"` |
| `app/components/UI/Stake/routes/index.tsx` | `headerMode="screen"` |
| `app/components/UI/Ramp/routes.tsx` | `headerMode="screen"`, `headerMode="none"` |
| `app/components/UI/Ramp/Deposit/routes/index.tsx` | `headerMode="screen"`, `headerMode="none"` |
| `app/components/UI/Ramp/Aggregator/routes/index.tsx` | `headerMode="screen"`, `headerMode="none"` |
| `app/components/UI/Earn/routes/index.tsx` | `headerMode="screen"` |
| `app/components/UI/Card/routes/index.tsx` | `headerMode="screen"`, `headerMode="none"` |

**Before (v5):**
```tsx
<Stack.Navigator headerMode="screen">
```

**After (v6):**
```tsx
<Stack.Navigator screenOptions={{ headerMode: 'screen' }}>
```

**Note:** `headerMode="none"` is replaced with `headerShown: false`:

```tsx
// Before
<Stack.Navigator headerMode="none">

// After
<Stack.Navigator screenOptions={{ headerShown: false }}>
```

### 2.3 Combined Migration Pattern

When both `mode` and `headerMode` are present:

**Before (v5):**
```tsx
<Stack.Navigator 
  mode="modal" 
  headerMode="screen"
  screenOptions={clearStackNavigatorOptions}
>
```

**After (v6):**
```tsx
<Stack.Navigator 
  screenOptions={{ 
    ...clearStackNavigatorOptions, 
    presentation: 'modal',
    headerMode: 'screen' 
  }}
>
```

---

## Phase 3: Breaking Changes - Bottom Tabs

### 3.1 `tabBarOptions` → `screenOptions`

Tab bar customization options have moved from `tabBarOptions` prop to `screenOptions` with prefixed names.

**Note:** The codebase currently has **0 instances** of `tabBarOptions` - no changes needed. ✅

For reference, if needed in future:

**Before (v5):**
```tsx
<Tab.Navigator
  tabBarOptions={{
    activeTintColor: '#fff',
    inactiveTintColor: 'gray',
    style: { backgroundColor: 'blue' },
  }}
>
```

**After (v6):**
```tsx
<Tab.Navigator
  screenOptions={{
    tabBarActiveTintColor: '#fff',
    tabBarInactiveTintColor: 'gray',
    tabBarStyle: { backgroundColor: 'blue' },
  }}
>
```

---

## Phase 3.5: Navigation Method Renames

### 3.5.1 `dangerouslyGetState()` → `getState()`

The `dangerously` prefix was removed because these methods are safe to use.

**Files to Update (2 source files + 6 test files):**

| File | Type |
|------|------|
| `app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx` | Source |
| `app/components/UI/BackupAlert/BackupAlert.tsx` | Source |
| `app/components/UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper.test.tsx` | Test |
| `app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.test.tsx` | Test |
| `app/components/UI/Predict/views/PredictBuyPreview/PredictBuyPreview.test.tsx` | Test |
| `app/components/UI/Earn/hooks/useMusdConversion.test.ts` | Test |
| `app/component-library/components/Navigation/TabBar/TabBar.test.tsx` | Test |
| `app/components/UI/BackupAlert/BackupAlert.test.tsx` | Test |
| `app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.test.tsx` | Test |

**Before (v5):**
```tsx
const { navigate, dangerouslyGetState } = useNavigation();
const state = navigation.dangerouslyGetState();
```

**After (v6):**
```tsx
const { navigate, getState } = useNavigation();
const state = navigation.getState();
```

### 3.5.2 `dangerouslyGetParent()` → `getParent()`

Similarly, `dangerouslyGetParent()` is renamed to `getParent()`.

**Files to Update (8 source files + 20+ test files):**

| File | Type | Usage |
|------|------|-------|
| `app/components/UI/Navbar/index.js` | Source | 6 instances |
| `app/components/UI/Ramp/components/TokenSelection/TokenSelection.tsx` | Source | 1 instance |
| `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedStateModal/UnsupportedStateModal.tsx` | Source | 1 instance |
| `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedRegionModal/UnsupportedRegionModal.tsx` | Source | 1 instance |
| `app/components/UI/Ramp/Deposit/Views/Modals/ConfigurationModal/ConfigurationModal.tsx` | Source | 1 instance (chained) |
| `app/components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts` | Source | 1 instance |
| `app/components/UI/Ramp/Aggregator/components/ErrorViewWithReporting.tsx` | Source | 1 instance |
| `app/components/UI/Ramp/Aggregator/Views/Modals/Settings/SettingsModal.tsx` | Source | 1 instance (chained) |
| `app/components/UI/Ramp/Aggregator/Views/Checkout/Checkout.tsx` | Source | 1 instance |

**Before (v5):**
```tsx
navigation.dangerouslyGetParent()?.pop();
navigation.dangerouslyGetParent()?.dangerouslyGetParent()?.goBack();
```

**After (v6):**
```tsx
navigation.getParent()?.pop();
navigation.getParent()?.getParent()?.goBack();
```

**Note:** You can also remove `@ts-expect-error` comments that were added for type mismatches, as v6 has better typing.

---

## Phase 4: TypeScript Breaking Changes (CRITICAL - 632 errors)

After running `yarn lint:tsc`, we identified **632 TypeScript errors** that need to be addressed. Here's the breakdown:

### 4.1 Error Summary

| Error Type | Count | Description |
|------------|-------|-------------|
| `navigate()` type errors | ~200+ | `Argument of type '[string, {...}]' is not assignable to parameter of type 'never'` |
| `No overload matches this call` | ~118 | Navigate/navigation method type mismatches |
| `NavigationContainerRef` generic | ~39 | Now requires 1 type argument |
| `mode` prop errors | ~12 | `mode="modal"` doesn't exist on Navigator |
| `headerMode` prop errors | ~7 | `headerMode` moved to screenOptions |
| Screen component type errors | ~50+ | Stricter component typing |
| `BottomTabBarOptions` | 1 | Renamed to `BottomTabBarProps` |

### 4.2 Fix `BottomTabBarOptions` Type (1 file)

**File:** `app/component-library/components/Navigation/TabBar/TabBar.types.ts`

```typescript
// Before (v5)
import { BottomTabBarOptions } from '@react-navigation/bottom-tabs';

// After (v6)
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
```

### 4.3 Fix `NavigationContainerRef` Generic (~39 files)

**Before (v5):**
```typescript
const navigationRef = React.createRef<NavigationContainerRef>();
```

**After (v6):**
```typescript
import { RootStackParamList } from './types';
const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();
```

**Files to update:**
```bash
grep -r "NavigationContainerRef" app/ --include="*.tsx" --include="*.ts" | grep -v ".test."
```

### 4.4 Global Navigation Types (REQUIRED to fix ~200+ errors)

The biggest source of errors is untyped navigation. In v6, `useNavigation()` returns `never` type for `navigate()` unless you define global types.

**Create:** `app/types/navigation.d.ts`

```typescript
import type { RootStackParamList } from '../constants/navigation/types';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export {};
```

This will fix most of the "Argument of type '[string, {...}]' is not assignable to parameter of type 'never'" errors.

### 4.5 Screen Props Types

For typed screens, use the new pattern:

**Before (v5):**
```typescript
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Profile'>;
  route: RouteProp<RootStackParamList, 'Profile'>;
};
```

**After (v6):**
```typescript
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<RootStackParamList, 'Profile'>;
// Props.navigation and Props.route are automatically typed
```

### 4.6 Screen Component Types

v6 has stricter types for screen components. Components must accept optional props:

**Before:**
```typescript
const MyScreen = ({ route }: { route: RouteType }) => { ... }
```

**After:**
```typescript
// Either make route optional or use proper screen props type
const MyScreen: React.FC<StackScreenProps<ParamList, 'MyScreen'>> = ({ route }) => { ... }
```

---

## Phase 5: Other Breaking Changes

### 5.1 Params Handling

In v6, params are no longer merged by default when navigating.

**Before (v5):**
```typescript
// If screen had params { a: 1, b: 2 }
navigation.navigate('Screen', { b: 3 });
// Result: { a: 1, b: 3 } (merged)
```

**After (v6):**
```typescript
// If screen had params { a: 1, b: 2 }
navigation.navigate('Screen', { b: 3 });
// Result: { b: 3 } (replaced)

// To merge explicitly:
navigation.navigate({
  name: 'Screen',
  params: { b: 3 },
  merge: true,
});
```

**Action:** Review all `navigate()` calls that rely on param merging.

### 5.2 `useLinking` Hook Removed

The `useLinking` hook is removed in favor of the `linking` prop on `NavigationContainer`.

**Check:** Search for `useLinking` usage and migrate to `linking` prop if found.

### 5.3 `initialRouteName` Type Check

The `initialRouteName` is now type-checked and must match a defined screen name.

---

## Phase 6: File-by-File Migration Checklist

### Navigator Files

- [ ] `app/components/Nav/App/App.tsx`
  - [ ] Line 302: `mode="modal"` → `screenOptions={{ presentation: 'modal' }}`
  - [ ] Line 621: `mode="modal"` → `screenOptions={{ presentation: 'modal' }}`

- [ ] `app/components/Nav/Main/MainNavigator.js`
  - [ ] Line 258: `mode="modal"` → `screenOptions={{ ...clearStackNavigatorOptions, presentation: 'modal' }}`
  - [ ] Line 312: `mode="modal"` → `screenOptions={{ presentation: 'modal' }}`

### Feature Route Files

- [ ] `app/components/UI/Ramp/routes.tsx`
  - [ ] Line 22: `headerMode="screen"` → `screenOptions={{ headerMode: 'screen' }}`
  - [ ] Line 33: `mode="modal"` → merge into screenOptions
  - [ ] Line 46: `headerMode="none"` → `screenOptions={{ headerShown: false }}`

- [ ] `app/components/UI/Ramp/Deposit/routes/index.tsx`
  - [ ] Line 80: `headerMode="screen"` → merge into screenOptions
  - [ ] Line 143: `mode="modal"` → merge into screenOptions
  - [ ] Line 201: `headerMode="none"` → `screenOptions={{ headerShown: false }}`

- [ ] `app/components/UI/Ramp/Aggregator/routes/index.tsx`
  - [ ] Line 31: `headerMode="screen"` → merge into screenOptions
  - [ ] Line 66: `mode="modal"` → merge into screenOptions
  - [ ] Line 103: `headerMode="none"` → `screenOptions={{ headerShown: false }}`

- [ ] `app/components/UI/Predict/routes/index.tsx`
  - [ ] Line 22: `mode="modal"` → merge into screenOptions

- [ ] `app/components/UI/Perps/routes/index.tsx`
  - [ ] Line 69: `mode="modal"` → merge into screenOptions
  - [ ] Line 159: `mode="modal"` → merge into screenOptions

- [ ] `app/components/UI/Earn/routes/index.tsx`
  - [ ] Line 27: `headerMode="screen"` → merge into screenOptions
  - [ ] Line 51: `mode="modal"` → merge into screenOptions

- [ ] `app/components/UI/Card/routes/index.tsx`
  - [ ] Line 137: `headerMode="screen"` → merge into screenOptions
  - [ ] Line 169: `mode="modal"` → merge into screenOptions
  - [ ] Line 192: `headerMode="none"` → `screenOptions={{ headerShown: false }}`

- [ ] `app/components/UI/Stake/routes/index.tsx`
  - [ ] Line 37: `headerMode="screen"` → merge into screenOptions

- [ ] `app/components/Views/confirmations/components/send/send.tsx`
  - [ ] Line 24: `headerMode="screen"` → merge into screenOptions

### Navigation Method Renames

- [ ] `app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx`
  - [ ] `dangerouslyGetState` → `getState`

- [ ] `app/components/UI/BackupAlert/BackupAlert.tsx`
  - [ ] `dangerouslyGetState` → `getState`

- [ ] `app/components/UI/Navbar/index.js`
  - [ ] `dangerouslyGetParent` → `getParent` (6 instances)

- [ ] `app/components/UI/Ramp/components/TokenSelection/TokenSelection.tsx`
  - [ ] `dangerouslyGetParent` → `getParent`

- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedStateModal/UnsupportedStateModal.tsx`
  - [ ] `dangerouslyGetParent` → `getParent`

- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedRegionModal/UnsupportedRegionModal.tsx`
  - [ ] `dangerouslyGetParent` → `getParent`

- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/ConfigurationModal/ConfigurationModal.tsx`
  - [ ] `dangerouslyGetParent` → `getParent` (chained call)

- [ ] `app/components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts`
  - [ ] `dangerouslyGetParent` → `getParent`

- [ ] `app/components/UI/Ramp/Aggregator/components/ErrorViewWithReporting.tsx`
  - [ ] `dangerouslyGetParent` → `getParent`

- [ ] `app/components/UI/Ramp/Aggregator/Views/Modals/Settings/SettingsModal.tsx`
  - [ ] `dangerouslyGetParent` → `getParent` (chained call)

- [ ] `app/components/UI/Ramp/Aggregator/Views/Checkout/Checkout.tsx`
  - [ ] `dangerouslyGetParent` → `getParent`

### Test Files (Update Mocks)

- [ ] Update all test files with `dangerouslyGetState` mock → `getState`
- [ ] Update all test files with `dangerouslyGetParent` mock → `getParent`

### Test Snapshots

- [ ] Update `app/components/Nav/Main/__snapshots__/MainNavigator.test.tsx.snap`
  - Regenerate snapshots after migration

---

## Phase 7: Testing Plan

### 7.1 Unit Tests

```bash
# Run all navigation-related tests
yarn jest --testPathPattern="Nav|routes|navigation" --updateSnapshot
```

### 7.2 Manual Testing Checklist

- [ ] App launches successfully
- [ ] Bottom tab navigation works
- [ ] Stack navigation (push/pop) works
- [ ] Modal presentation works correctly
- [ ] Deep linking works
- [ ] Back button behavior on Android
- [ ] Swipe-to-go-back on iOS
- [ ] Header appearance is correct
- [ ] Screen transitions are smooth

### 7.3 E2E Tests

```bash
yarn test:e2e:ios:debug:run
yarn test:e2e:android:debug:run
```

---

## Phase 8: Rollback Plan

If critical issues are found:

1. Revert package.json changes
2. Run `yarn install`
3. Revert code changes via git
4. Clear Metro cache: `yarn watch:clean`

---

## Migration Commands Summary

```bash
# Step 1: Install v6 packages
yarn add @react-navigation/native@^6 @react-navigation/stack@^6 @react-navigation/bottom-tabs@^6

# Step 2: Remove compat (already done)
yarn remove @react-navigation/compat

# Step 3: Clear cache after changes
yarn watch:clean

# Step 4: Run tests
yarn test:unit
yarn jest --updateSnapshot

# Step 5: Build and test
yarn start:ios
yarn start:android
```

---

## References

- [Official v5 to v6 Upgrade Guide](https://reactnavigation.org/docs/6.x/upgrading-from-5.x)
- [React Navigation 6.0 Blog Post](https://reactnavigation.org/blog/2021/08/14/react-navigation-6.0)
- [TypeScript Guide](https://reactnavigation.org/docs/6.x/typescript)

---

## Appendix: Estimated Effort

| Phase | Effort | Files/Errors |
|-------|--------|--------------|
| Phase 1: Package Updates | ✅ Done | 5 source, 9 test |
| Phase 2: Stack Navigator (`mode`, `headerMode`) | ~3 hours | ~19 errors in 15+ files |
| Phase 3: Bottom Tabs | ✅ None needed | 0 files |
| Phase 3.5: Method Renames (`dangerouslyGet*`) | ~2 hours | 10 source, 20+ test |
| Phase 4: TypeScript Types | ~8 hours | **632 errors** across 100+ files |
| Phase 5: Other Changes | ~1 hour | TBD |
| Phase 6: File Migration | ~4 hours | 50+ files |
| Phase 7: Testing | ~3 hours | - |

**Total Estimated Effort:** ~21-24 hours (3-4 days)

### TypeScript Errors Breakdown

| Error Category | Count | Priority |
|----------------|-------|----------|
| `navigate()` untyped (needs global types) | ~200+ | HIGH - fix first |
| `NavigationContainerRef` generic | ~39 | HIGH |
| `mode` / `headerMode` props | ~19 | MEDIUM |
| Screen component type mismatches | ~50+ | MEDIUM |
| No overload matches | ~118 | LOW - will resolve with above |
| `dangerouslyGet*` methods | ~11 | LOW |
| `BottomTabBarOptions` type | 1 | LOW |

---

## Status

- [x] Phase 1: Package Updates (v6 installed, compat removed)
- [ ] Phase 2: Stack Navigator Breaking Changes (`mode`, `headerMode`) - **19 errors**
- [x] Phase 3: Bottom Tabs (No changes needed)
- [ ] Phase 3.5: Navigation Method Renames (`dangerouslyGetState`, `dangerouslyGetParent`) - **~11 files**
- [ ] Phase 4: TypeScript Breaking Changes - **632 errors** ⚠️
- [ ] Phase 5: Other Breaking Changes
- [ ] Phase 6: File-by-File Migration
- [ ] Phase 7: Testing

### Recommended Approach

1. **First**: Create global navigation types (Phase 4.4) - this will fix ~200+ errors
2. **Second**: Fix `mode` → `presentation: 'modal'` and `headerMode` → `screenOptions` (Phase 2)
3. **Third**: Fix `NavigationContainerRef` generic issues (Phase 4.3)
4. **Fourth**: Fix remaining type errors and method renames
