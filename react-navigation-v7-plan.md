# React Navigation v7 Migration Plan

## Migration Status: IN PROGRESS (TypeScript Fixes ~80% Complete)

**Last Updated:** January 15, 2026

### Completed ✅

**Package & API Updates:**

- [x] Updated packages to v7 (`@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`, `@react-navigation/elements`)
- [x] Removed `@react-navigation/compat` package
- [x] Migrated `withNavigation` HOC usages to `useNavigation` hook
- [x] Fixed `mode="modal"` → `presentation: 'card'` (default) or `presentation: 'transparentModal'` (bottom sheets)
- [x] Fixed `headerMode` → `screenOptions.headerShown`
- [x] Fixed `animationEnabled` → `animation: 'none'/'default'`
- [x] Updated `NavigationContainerRef` with `ParamListBase` type
- [x] Fixed `independent` prop → `NavigationIndependentTree` wrapper
- [x] Created global navigation types file (`app/types/navigation.d.ts`)
- [x] Added global `ReactNavigation.RootParamList` type augmentation
- [x] Fixed `TabBar.test.tsx` to include `insets` prop
- [x] Fixed `dangerouslyGetParent` → `getParent`
- [x] Fixed `dangerouslyGetState` → `getState` (BackupAlert, ProtectWalletMandatoryModal)

**Navigation Theme & Container:**

- [x] Added complete navigation theme with font definitions to `NavigationContainer`
- [x] Added `GestureHandlerRootView` wrapper in Root component
- [x] Fixed `onNavigationReady` dispatch timing (moved to useEffect on mount)

**Screen Presentation Fixes (`presentation: 'card'`):**

- [x] MainNavigator.js - All full-screen screens now use `presentation: 'card'`:
  - CollectiblesDetails, DeprecatedNetworkDetails
  - TokensFullView, AddAsset, ConfirmAddAsset, SettingsFlow, Asset
  - TrendingTokensFullView, Webview, SendView, Send, SendFlowView
  - AddBookmarkView, OfflineModeView, NotificationsModeView
  - QRTabSwitcher, NftDetails, NftDetailsFullImage, NftFullView
  - PaymentRequestView, RampRoutes, DepositRoutes
  - BridgeScreenStack, StakeScreenStack, EarnScreenStack
  - PerpsScreenStack, PerpsTutorial, PerpsTransactionViews
  - PredictScreenStack, SetPasswordFlow, GeneralSettings
  - FeatureFlagOverride, NotificationsOptInStack, TurnOnBackupAndSync
  - DeFiProtocolPositionDetails, SampleFeatureFlow, CardRoutes
- [x] App.tsx - All full-screen screens now use `presentation: 'card'`:
  - HOME_NAV (Main), FOX_LOADER, LOGIN, Rehydrate
  - OnboardingRootNav, SUCCESS_FLOW, VaultRecoveryFlow
  - ImportPrivateKeyView, ImportSRPView
  - ConnectQRHardwareFlow, LedgerConnectFlow, ConnectHardwareWalletFlow
  - MultichainAccountDetails, MultichainAccountGroupDetails
  - MultichainAccountActions (ACCOUNT_CELL_ACTIONS)
  - MULTICHAIN_ACCOUNT_DETAIL_ACTIONS (for ShareAddress/ShareAddressQR)
  - ADDRESS_LIST, PRIVATE_KEY_LIST
  - EDIT_ACCOUNT_NAME, ADD_NETWORK, EDIT_NETWORK, LOCK_SCREEN

**Modal Navigation Fixes (using `StackActions.popToTop()` + `CommonActions.navigate()`):**

- [x] Predict GTM Modal - "Not Now" button
- [x] Perps GTM Modal - "Not Now" button
- [x] Ramp UnsupportedStateModal - close button
- [x] Ramp UnsupportedRegionModal - close button
- [x] Deposit UnsupportedStateModal - close button
- [x] Deposit UnsupportedRegionModal - close button
- [x] Deposit OrderProcessing - navigation after completion
- [x] Rewards OnboardingStep - close button
- [x] DeepLinkModal - navigation to HomeNav
- [x] Bridge RecipientSelectorModal - close button

**Card Flow Navigation Fixes:**

- [x] CardWelcome - "Not Now" button uses `StackActions.popToTop()`
- [x] OnboardingNavigator (PostEmailNavigationOptions) - exit confirmation uses `popToTop()`
- [x] OnboardingNavigator (KYCStatusNavigationOptions) - close button uses `popToTop()`
- [x] ValidatingKYC - close button uses `popToTop()`
- [x] KYCFailed - close button uses `popToTop()`

**Deeplink Handler Fixes:**

- [x] handlePerpsUrl - navigation to HomeNav with nested params
- [x] handleHomeUrl - navigation to HomeNav
- [x] handleFastOnboarding - navigation to HomeNav

**Header Title Fixes:**

- [x] Fixed `headerTitle` to use function pattern `() => (...)` instead of direct JSX
  - `getAccountNameEditNavigationOptions` - was JSX, now function
- [x] Removed unnecessary `color={TextColor.Default}` from MorphText in headers
  - The function pattern properly inherits theme colors
  - Fixed in: `getEditableOptions`, `getSettingsNavigationOptions`, `getEarnNavbar`, `getEmptyNavHeaderForConfirmations`

**Transparent Modal Fixes (`presentation: 'transparentModal'`):**

Bottom sheet modals need transparent backgrounds so the overlay can show through. Fixed in:

- [x] **App.tsx:**
  - `RootModalFlow` (Buy/Sell, WalletActions, TradeWalletActions, AccountSelector, NetworkSelector, etc.)
  - `ModalConfirmationRequest`
  - `ModalSwitchAccountType`
  - `ModalSmartAccountOptIn`
  - `PayWithModal`
  - `MultichainAccountDetailsActions` (Share Address QR, Account Actions, Edit Account Name)

- [x] **MainNavigator.js:**
  - `BridgeModalStack`
  - `EarnModalStack`
  - `StakeModalStack`
  - `PerpsModalStack`
  - `PredictModalStack`
  - `RewardsBottomSheetModal`, `RewardsClaimBottomSheetModal`, `RewardOptInAccountGroupModal`, `ReferralBottomSheetModal`

- [x] **Feature Routes:**
  - `Ramp/routes.tsx` - `TokenListModalsRoutes`
  - `Ramp/Aggregator/routes/index.tsx` - `RampModalsRoutes`
  - `Ramp/Deposit/routes/index.tsx` - `DepositModalsRoutes`
  - `Card/routes/index.tsx` - `CardModalsRoutes`
  - `Perps/routes/index.tsx` - `PerpsModalStack` and `PerpsClosePositionBottomSheetStack` (internal registrations)

**Navigation Hook Fixes:**

- [x] `useRampNavigation` - Changed from `useNavigation()` hook to `NavigationService`
  - Fixes navigation from FundActionMenu bottom sheet callbacks
  - Hook context becomes invalid after modal dismissal; NavigationService works globally

**Navigator Default Presentation Fixes (`presentation: 'card'`):**

Changed all navigators from `presentation: 'modal'` (iOS sheet modal with shrinking background) to `presentation: 'card'` (standard slide transition):

- [x] **MainNavigator.js:**
  - MainNavigator (main stack) - default changed to `presentation: 'card'`
  - WalletModalFlow, WalletTabModalFlow - internal flows
  - BrowserFlow, ExploreHome - tab internal navigators
  - Webview - simple webview stack

- [x] **App.tsx:**
  - AppFlow (main app navigator) - default changed to `presentation: 'card'`
  - SimpleWebviewScreen, OnboardingRootNav, DetectedTokensFlow
  - ImportSRPView, MultichainAddressList, MultichainPrivateKeyList

- [x] **Nav/Main/index.js:**
  - MainFlow - wrapper around Main component

**Internal Modal Stacks → `presentation: 'transparentModal'`:**

Bottom sheet modal stacks within features now use transparent modals:

- [x] App.tsx: `RootModalFlow`, `ModalConfirmationRequest`, `ModalSwitchAccountType`, `ModalSmartAccountOptIn`
- [x] Ramp: `DepositModalsRoutes`, `RampModalsRoutes`, `TokenListModalsRoutes`
- [x] Card: `CardModalsRoutes`
- [x] Perps: `PerpsModalStack`, `PerpsClosePositionBottomSheetStack`
- [x] Predict: `PredictModalStack`
- [x] Stake: `StakeModalStack`
- [x] Earn: `EarnModalStack`
- [x] Bridge: `BridgeModalStack`

**Other Fixes:**

- [x] Added `headerShown: false` to HomeTabs Tab.Navigator
- [x] Added `NavigationService.popToTop()` helper method
- [x] Fixed Notifications view close button to navigate to HomeNav

**Navigate `pop: true` Default Implementation:**

- [x] Enhanced `app/util/navigation/navUtils.ts` - `useNavigation` hook now wraps `navigate()` with `pop: true` by default
- [x] Enhanced `app/core/NavigationService/NavigationService.ts` - `NavigationService.navigation.navigate()` now uses `pop: true` by default
- [x] Fixed `useSendNavbar.tsx` - Uses `pop: true` option for back navigation

**`createNavigationDetails` Fix & Deprecation:**

- [x] Fixed `createNavigationDetails` return type to work with v7's strict `navigate()` overloads
  - Returns `[any, any]` tuple for compatibility with React Navigation v7
  - Params type `T` is still checked at call site for type safety
- [x] Deprecated `createNavigationDetails` in favor of direct navigation
  - Added `@deprecated` JSDoc tag with migration guidance
  - Direct `navigation.navigate(Routes.XXX, params)` provides full type safety with `RootParamList`

**TypeScript Fixes (Completed):**

- [x] Created `StakeStackParamList` with proper route-to-params mapping
- [x] Updated Stake component types (`StakeConfirmationView`, `UnstakeConfirmationView`, `GasImpactModal`)
- [x] Created `DepositParamList` with proper route definitions
- [x] Fixed Send flow screen navigation typing (`useSendScreenNavigation.ts`)
- [x] Fixed Perps navigation parameter types (`usePerpsNavigation.ts`, `PerpsTabView.tsx`)
- [x] Fixed `NavigationProp<RootParamList>` casts for utility functions:
  - `EarnInputView.tsx`, `EarnWithdrawInputView.tsx` (handleTronStakingNavigationResult)
  - `ActivityEventRow.tsx`, `ActivityDetailsSheet.test.tsx` (openActivityDetailsSheet)
  - `OptIn/index.tsx` (useHandleOptInCancel, useHandleOptInClick)
  - `ExploreSearchResults.tsx`, `QuickActions.tsx`, `SectionHeader.tsx`, `SectionCard.tsx`, `SectionCarrousel.tsx`
- [x] Fixed `NavigationService.navigation` mock patterns in test files:
  - `handleCardHome.test.ts`, `handleCardOnboarding.test.ts`, `handleFastOnboarding.test.ts`
  - `handleHomeUrl.test.ts`, `handlePerpsUrl.test.ts`, `handlePredictUrl.test.ts`, `handleRewardsUrl.test.ts`
- [x] Fixed `FeatureFlagOverride.test.tsx` mockNavigation typing
- [x] Fixed `WhatsNewModal.tsx` callButton navigation prop typing
- [x] Fixed `BaseControlBar.tsx` navigation helper calls
- [x] Removed deprecated `independent` prop from `NavigationContainer` in tests
- [x] Updated `WalletConnectV2.ts` to use `typeof NavigationService.navigation` type
- [x] Updated `SDKConnect/InitializationManagement/init.ts` and `asyncInit.ts` to use `typeof NavigationService.navigation`

### In Progress 🔄

- [ ] Fix remaining TypeScript errors (~25 errors)
  - Spread argument issues in Carousel, useMusdConversion, useOptout, useConfirmNavigation
  - `ScreenComponentType` mismatches in Bridge routes
  - handleDeepLinkModalDisplay params type
  - handleCustomRpcCalls params type
  - NavigationProvider Theme comparison issue

### Pending Testing 🧪

- [x] Initial manual testing - basic navigation works
- [ ] Comprehensive manual testing of all navigation flows
- [ ] E2E testing for regressions
- [ ] Deep linking verification
- [ ] Modal dismissal behavior edge cases

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Implementation Progress](#implementation-progress)
3. [Decisions & Open Questions](#decisions--open-questions)
4. [Current State Analysis](#current-state-analysis)
5. [Migration Strategy](#migration-strategy)
6. [Breaking Changes](#breaking-changes)
7. [Step-by-Step Migration](#step-by-step-migration)
8. [Testing Strategy](#testing-strategy)
9. [Risk Assessment](#risk-assessment)
10. [Rollback Plan](#rollback-plan)

---

## Executive Summary

MetaMask Mobile ~~currently uses **React Navigation v5** (`^5.9.4`)~~ **has been upgraded to React Navigation v7**. This plan outlines the migration approach and remaining work.

### Migration Approach: "Upgrade and Test"

Instead of creating navigation wrappers or using deprecated APIs, we will:

1. **Upgrade directly to v7**
2. **Fix all compile-time breaking changes** (mode, animationEnabled, etc.)
3. **Test thoroughly** to identify navigation behavior issues
4. **Fix issues as found** by replacing `navigate` with `popTo` where needed

This approach is faster and results in cleaner code that follows v7 best practices.

---

## Implementation Progress

### ✅ Completed Tasks

1. **Package Updates**
   - `@react-navigation/native`: `^5.9.4` → `^7.1.26`
   - `@react-navigation/stack`: `^5.14.5` → `^7.6.13`
   - `@react-navigation/bottom-tabs`: `^5.11.11` → `^7.9.0`
   - `@react-navigation/elements`: Added `^2.9.3`
   - `@react-navigation/compat`: **Removed**

2. **`@react-navigation/compat` Removal** (5 files migrated)
   - `app/components/Views/TransactionsView/index.js` - Converted to `useNavigation` hook
   - `app/components/UI/NavbarTitle/index.js` - Created custom `withNavigation` HOC
   - `app/components/UI/TransactionElement/TransactionDetails/index.js` - Created custom `withNavigation` HOC
   - `app/components/Views/confirmations/legacy/components/TransactionReview/index.js` - Created custom `withNavigation` HOC
   - `app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js` - Created custom `withNavigation` HOC

3. **`mode="modal"` → `presentation: 'modal'`** (All 13 files migrated)
   - Moved from navigator prop to `screenOptions`
   - Files: Earn, Card, Main/index.js, MainNavigator.js, App.tsx, Ramp, Deposit, Aggregator, Perps, Predict, Bridge, Stake

4. **`headerMode` → `screenOptions.headerShown`** (All files migrated)
   - `headerMode="screen"` → `screenOptions={{ headerShown: true }}`
   - `headerMode="none"` → `screenOptions={{ headerShown: false }}`

5. **`NavigationContainerRef` Type Updates**
   - Added `ParamListBase` generic parameter
   - Updated in `NavigationService.ts` and `NavigationProvider.tsx`

6. **Debug Logging Added**
   - `NavigationProvider.tsx` now logs navigation state changes in `__DEV__` mode
   - Detects duplicate screens (indicator of broken `navigate` behavior)

7. **TabBar Type Fixes**
   - Removed deprecated `BottomTabBarOptions` import
   - Updated `TabBarProps` type for v7 compatibility
   - Fixed deprecated `dangerouslyGetParent`/`dangerouslyGetState` in tests

8. **Screen Presentation Fixes**
   - Added `presentation: 'card'` to 40+ screens in MainNavigator.js and App.tsx
   - This prevents screens from appearing as iOS sheet modals (v7 default behavior)
   - Screens that should be modals retain `presentation: 'modal'`

9. **Modal Navigation Pattern**
   - Established pattern for navigating from modals: `StackActions.popToTop()` followed by `CommonActions.navigate()`
   - This properly dismisses modal stacks before navigating to new destinations
   - Applied to GTM modals (Predict, Perps), Ramp/Deposit modals, Rewards, Card, Bridge, etc.

10. **Navigation Route Updates**
    - Updated navigation calls from `Routes.WALLET.HOME` to `Routes.ONBOARDING.HOME_NAV`
    - `HOME_NAV` is the correct top-level route containing the Main navigator
    - Applied to deeplink handlers, Card flow, Rewards, Notifications, etc.

11. **NavigationService Enhancements**
    - Added `popToTop()` helper method for convenience
    - Service now properly typed with `ParamListBase`
    - `NavigationService.navigation` getter now returns `WrappedNavigation` type (internal class)
    - Functions accepting navigation refs should use `typeof NavigationService.navigation` instead of `NavigationContainerRef<RootParamList>`

12. **Navigation Theme**
    - Added complete theme object with font definitions to `NavigationContainer`
    - React Navigation v7 requires fonts in theme (uses `DefaultTheme`/`DarkTheme` as base)

### 🔄 Remaining Work

1. **TypeScript Errors** (~25 remaining):
   - **Spread argument issues** - Carousel, useMusdConversion, useOptout, useConfirmNavigation, ActivityView.test
   - **Screen component type** - Bridge routes `BlockExplorersModal`
   - **Navigation params** - handleDeepLinkModalDisplay, handleCustomRpcCalls, useDepositRouting, BuildQuote
   - **NavigationProvider** - Theme comparison type mismatch (unrelated to navigation)

2. **Testing** - Comprehensive testing needed:
   - Full E2E test suite run
   - Edge cases for modal dismiss behaviors
   - All deep link types verification
   - Feature team sign-off on their flows

3. **Snapshot Updates** - `MainNavigator.test.tsx.snap` needs regeneration

4. **Test File Updates** - Some test files may need updates:
   - Tests expecting `Routes.WALLET.HOME` should use `Routes.ONBOARDING.HOME_NAV`
   - Tests using mock navigation may need `popToTop` dispatch expectations

---

## Decisions & Open Questions

All decisions have been made. This section documents the rationale.

### 1. Stack Navigator: Keep `@react-navigation/stack` ✅

**Decision:** Keep using `@react-navigation/stack` (JS-based), do NOT switch to `@react-navigation/native-stack`.

**Rationale:**

- The codebase uses `cardStyleInterpolator` for custom animations in 5 files
- `native-stack` doesn't support custom JS-based interpolators
- Switching would require rewriting all custom transition animations
- Performance difference is minimal for most use cases

**Files using cardStyleInterpolator (would break with native-stack):**

- `app/components/Nav/Main/MainNavigator.js`
- `app/components/Nav/App/App.tsx`
- `app/components/UI/Perps/routes/index.tsx`
- `app/components/UI/Predict/routes/index.tsx`

**Future consideration:** For new, simple navigators, consider `native-stack` for better performance.

---

### 2. `@react-navigation/compat`: Remove and Migrate ✅

**Decision:** Remove the package and replace `withNavigation` HOC with `useNavigation` hook.

**Rationale:**

- `@react-navigation/compat` is v5-specific and won't work with v7
- Only 5 files use `withNavigation` from compat
- All are class components that can be updated to use hooks or wrapped

**Files to update (5 files using `withNavigation`):**

```
app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js
app/components/Views/TransactionsView/index.js
app/components/Views/confirmations/legacy/components/TransactionReview/index.js
app/components/UI/TransactionElement/TransactionDetails/index.js
app/components/UI/NavbarTitle/index.js
```

**Migration pattern for class components:**

```jsx
// Before (with compat)
import { withNavigation } from '@react-navigation/compat';

class MyComponent extends React.Component {
  handlePress = () => {
    this.props.navigation.navigate('Screen');
  };
}

export default withNavigation(MyComponent);
```

```jsx
// After (v7) - Option A: Convert to function component
import { useNavigation } from '@react-navigation/native';

const MyComponent = () => {
  const navigation = useNavigation();
  // ...
};

export default MyComponent;
```

```jsx
// After (v7) - Option B: Create wrapper for class component
import { useNavigation } from '@react-navigation/native';

class MyComponentClass extends React.Component {
  // ... class implementation using this.props.navigation
}

// Wrapper to inject navigation
export default function MyComponent(props) {
  const navigation = useNavigation();
  return <MyComponentClass {...props} navigation={navigation} />;
}
```

---

### 3. TypeScript Navigation Types: Incremental Approach ✅

**Decision:** Add types incrementally as needed, don't create comprehensive types upfront.

**Rationale:**

- Creating full types for all 50+ navigators would delay migration by 1+ week
- Most existing code doesn't use strict navigation types anyway
- TypeScript errors can be fixed with `as any` temporarily
- Types can be improved in follow-up PRs

**Approach:**

1. Fix type errors as they appear during migration
2. Use `ParamListBase` as a generic type where needed
3. Create specific types only for new code or when refactoring

---

### 4. Static Configuration API: Not Now ✅

**Decision:** Keep all existing navigators using dynamic API. Do not adopt static API.

**Rationale:**

- Static API is optional and primarily for new projects
- Converting existing navigators provides no immediate benefit
- Would significantly increase migration scope
- Can be adopted for new features later

**Future consideration:** Consider static API when creating entirely new navigation flows.

---

### 5. Peer Dependencies: Current Versions Compatible ✅

**Decision:** No peer dependency updates required for `@react-navigation/stack`.

**Verified compatibility:**

| Package                          | Current  | Required         | Status        |
| -------------------------------- | -------- | ---------------- | ------------- |
| `react-native-screens`           | `3.37.0` | `^3.x` for stack | ✅ Compatible |
| `react-native-safe-area-context` | `5.4.0`  | `^4.x`           | ✅ Compatible |
| `react-native-gesture-handler`   | `2.25.0` | `^2.x`           | ✅ Compatible |

**Note:** If switching to `@react-navigation/native-stack` in the future, `react-native-screens` must be updated to `^4.0.0`.

---

### 6. Deep Linking: Not Affected ✅

**Decision:** No changes needed to deep linking configuration.

**Rationale:**

- MetaMask handles deep links through `DeeplinkManager`, Branch SDK, and React Native `Linking` API
- Deep links are processed imperatively via `NavigationService.navigation.navigate()`
- React Navigation's `linking` prop on `NavigationContainer` is NOT used
- The `navigate` behavior change in v7 could affect deep link handling - will verify during testing

**Deep link handling flow:**

```
Linking.getInitialURL() → DeeplinkManager.parse() → NavigationService.navigation.navigate()
Branch.subscribe() → handleDeeplink() → NavigationService.navigation.navigate()
```

**Testing focus:** All deep link handlers that call `navigate()` should be tested to ensure they don't create duplicate screens.

---

### 7. Testing Scope: E2E + Manual QA ✅

**Decision:** Migration is complete when:

1. All E2E tests pass
2. Manual QA approves critical flows
3. No duplicate screen warnings in debug logging

**Testing bar:**

- [ ] E2E test suite passes on iOS and Android
- [ ] Manual testing of critical flows (see Testing Strategy section)
- [ ] No `⚠️ DUPLICATE SCREENS` warnings in debug console
- [ ] Feature team leads verify their flows work correctly

**Feature teams to involve:**

- Wallet/Core team (main navigation, tabs)
- Confirmations team (send flows, approvals)
- Ramp team (buy/sell flows)
- Earn/Stake team
- Bridge team
- Card team (if applicable)

---

### 8. Rollout Strategy: Direct Merge ✅

**Decision:** Merge directly to `main` after QA approval. No feature flag or staged rollout.

**Rationale:**

- Navigation changes can't be easily feature-flagged
- Either the app uses v5 or v7, not both
- The migration affects the entire app uniformly
- Strong E2E coverage provides confidence

**Rollback plan:** If critical issues found post-deploy, revert the PR and rebuild.

---

### Key Statistics

| Metric                                        | Count                   |
| --------------------------------------------- | ----------------------- |
| Files using `@react-navigation`               | ~1,072                  |
| `navigation.navigate()` calls                 | ~135+ in 50 files       |
| `navigation.goBack()`/`pop()`/`reset()` calls | ~98 in 50 files         |
| `useNavigation` hook usages                   | ~247+ across 100+ files |
| Files using `mode="modal"`                    | 13 files                |
| Files using `headerMode`                      | 8 files                 |
| Files using `animationEnabled`                | 17 files                |
| Files using `beforeRemove` event              | 4 files                 |

### Timeline Estimate

| Phase           | Duration      | Description                          |
| --------------- | ------------- | ------------------------------------ |
| Preparation     | 2-3 days      | Remove compat, check peer deps       |
| Code Changes    | 1 week        | Fix all breaking changes             |
| Testing & Fixes | 1-2 weeks     | E2E + manual QA, fix navigation bugs |
| **Total**       | **2-3 weeks** |                                      |

---

## Current State Analysis

### Package Versions (Current → Target)

| Package                         | Current    | Target       |
| ------------------------------- | ---------- | ------------ |
| `@react-navigation/native`      | `^5.9.4`   | `^7.x`       |
| `@react-navigation/stack`       | `^5.14.5`  | `^7.x`       |
| `@react-navigation/bottom-tabs` | `^5.11.11` | `^7.x`       |
| `@react-navigation/compat`      | `^5.3.20`  | **Remove**   |
| `@react-navigation/elements`    | -          | `^2.x` (new) |

### Peer Dependencies (Current)

```json
{
  "react-native-screens": "3.37.0", // ✓ Compatible
  "react-native-safe-area-context": "5.4.0", // ✓ Compatible
  "react-native-gesture-handler": "2.25.0" // ✓ Compatible
}
```

### Architecture Overview

```
Root
└── NavigationProvider
    └── NavigationContainer
        └── App (Stack.Navigator)
            ├── AppFlow (Stack.Navigator - modal mode)
            │   ├── FoxLoader
            │   ├── Login
            │   ├── OnboardingRootNav
            │   └── Main
            │       └── MainNavigator (Stack.Navigator - modal mode)
            │           ├── HomeTabs (Bottom Tab Navigator)
            │           └── Feature screens...
            └── RootModalFlow (Modal stack)
```

---

## Migration Strategy

### Why Direct v5 → v7?

| Approach             | Pros                             | Cons                    |
| -------------------- | -------------------------------- | ----------------------- |
| **v5 → v6 → v7**     | Smaller steps, easier debugging  | 2x the work, 2x the PRs |
| **v5 → v7 (chosen)** | Single migration, cleaner result | More changes at once    |

### Why "Upgrade and Test" vs Wrappers?

| Approach                        | Pros                           | Cons                                 |
| ------------------------------- | ------------------------------ | ------------------------------------ |
| **`navigateDeprecated`**        | Quick, preserves behavior      | Deprecated, removed in v8            |
| **Helper with `pop: true`**     | Centralized control            | Extra abstraction, delays proper fix |
| **"Upgrade and Test" (chosen)** | Clean code, proper v7 patterns | Requires thorough testing            |

### The `navigate` Behavior Change

**This is the critical change in v7:**

```javascript
// v5/v6: navigate could go BACK to an existing screen
navigation.navigate('Wallet'); // If Wallet exists in stack, pops back to it

// v7: navigate ONLY goes forward
navigation.navigate('Wallet'); // Always pushes new Wallet screen

// v7: Use popTo to go back
navigation.popTo('Wallet'); // Pops back to existing Wallet
```

**Our approach:** Most `navigate` calls are forward navigation and will work fine. We'll find the ones that break through testing and fix them with `popTo`.

---

## Breaking Changes

### Must Fix Before App Compiles

| Change                     | Files | Fix                                          |
| -------------------------- | ----- | -------------------------------------------- |
| `mode="modal"` removed     | 13    | Use `presentation: 'modal'` per-screen       |
| `headerMode` changed       | 8     | Use `screenOptions={{ headerShown: false }}` |
| `animationEnabled` removed | 17    | Use `animation: 'none'`                      |

### Must Fix During Testing

| Change                         | Files   | Fix                               |
| ------------------------------ | ------- | --------------------------------- |
| `navigate` no longer goes back | Unknown | Replace with `popTo` where needed |
| `beforeRemove` deprecated      | 4       | Use `usePreventRemove` hook       |

### Type Changes

| Change                                 | Files     | Fix                          |
| -------------------------------------- | --------- | ---------------------------- |
| `NavigationContainerRef` needs generic | 2         | Add `<ParamListBase>`        |
| `gestureResponseDistance` is number    | Snapshots | Update from object to number |

---

## Step-by-Step Migration

### Phase 1: Preparation (Day 1)

#### 1.1 Create Feature Branch

```bash
git checkout -b feature/react-navigation-v7
```

#### 1.2 Remove `@react-navigation/compat` and Migrate `withNavigation`

```bash
yarn remove @react-navigation/compat
```

**5 files need to be updated** to remove `withNavigation` usage:

| File                                                                                     | Component Type | Migration      |
| ---------------------------------------------------------------------------------------- | -------------- | -------------- |
| `app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js` | Class          | Wrap with hook |
| `app/components/Views/TransactionsView/index.js`                                         | Class          | Wrap with hook |
| `app/components/Views/confirmations/legacy/components/TransactionReview/index.js`        | Class          | Wrap with hook |
| `app/components/UI/TransactionElement/TransactionDetails/index.js`                       | Class          | Wrap with hook |
| `app/components/UI/NavbarTitle/index.js`                                                 | Class          | Wrap with hook |

**Migration pattern:**

```jsx
// Before
import { withNavigation } from '@react-navigation/compat';
class MyComponent extends React.Component { ... }
export default withNavigation(MyComponent);

// After
import { useNavigation } from '@react-navigation/native';
class MyComponentClass extends React.Component { ... }
export default function MyComponent(props) {
  const navigation = useNavigation();
  return <MyComponentClass {...props} navigation={navigation} />;
}
```

#### 1.3 Update Dependencies

```bash
yarn add @react-navigation/native@^7.0.0 \
         @react-navigation/stack@^7.0.0 \
         @react-navigation/bottom-tabs@^7.0.0 \
         @react-navigation/elements@^2.0.0
```

---

### Phase 2: Fix Compile-Time Breaking Changes (Days 2-4)

#### 2.1 Replace `mode="modal"`

**Files to update (13):**

- `app/components/Nav/Main/MainNavigator.js`
- `app/components/Nav/Main/index.js`
- `app/components/Nav/App/App.tsx`
- `app/components/UI/Ramp/Aggregator/routes/index.tsx`
- `app/components/UI/Ramp/Deposit/routes/index.tsx`
- `app/components/UI/Ramp/routes.tsx`
- `app/components/UI/Earn/routes/index.tsx`
- `app/components/UI/Card/routes/index.tsx`
- `app/components/UI/Stake/routes/index.tsx`
- `app/components/UI/Perps/routes/index.tsx`
- `app/components/UI/Predict/routes/index.tsx`
- `app/components/UI/Bridge/routes.tsx`

**Before:**

```jsx
<Stack.Navigator mode="modal">
  <Stack.Screen name="Screen1" component={Screen1} />
  <Stack.Screen name="Screen2" component={Screen2} />
</Stack.Navigator>
```

**After:**

```jsx
<Stack.Navigator>
  <Stack.Screen name="Screen1" component={Screen1} />
  <Stack.Screen
    name="Screen2"
    component={Screen2}
    options={{ presentation: 'modal' }}
  />
</Stack.Navigator>
```

**Or apply to all screens:**

```jsx
<Stack.Navigator
  screenOptions={{ presentation: 'modal' }}
>
```

#### 2.2 Replace `headerMode`

**Files to update (8):**

- `app/components/Nav/Main/MainNavigator.js`
- `app/components/UI/Earn/routes/index.tsx`
- `app/components/UI/Card/routes/index.tsx`
- `app/components/UI/Ramp/routes.tsx`
- `app/components/UI/Ramp/Deposit/routes/index.tsx`
- `app/components/UI/Ramp/Aggregator/routes/index.tsx`
- `app/components/Views/confirmations/components/send/send.tsx`
- `app/components/UI/Stake/routes/index.tsx`

**Before:**

```jsx
<Stack.Navigator headerMode="none">
```

**After:**

```jsx
<Stack.Navigator screenOptions={{ headerShown: false }}>
```

#### 2.3 Replace `animationEnabled`

**Files to update (17):**

**Before:**

```jsx
options={{ animationEnabled: false }}
```

**After:**

```jsx
options={{ animation: 'none' }}
```

**Animation options available:**

- `'default'`
- `'fade'`
- `'fade_from_bottom'`
- `'flip'`
- `'none'`
- `'simple_push'`
- `'slide_from_bottom'`
- `'slide_from_left'`
- `'slide_from_right'`

#### 2.4 Update `NavigationContainerRef` Types

**File:** `app/core/NavigationService/NavigationService.ts`

**Before:**

```typescript
import { NavigationContainerRef } from '@react-navigation/native';

class NavigationService {
  static #navigation: NavigationContainerRef;
}
```

**After:**

```typescript
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';

class NavigationService {
  static #navigation: NavigationContainerRef<ParamListBase>;
}
```

**File:** `app/components/Nav/NavigationProvider/NavigationProvider.tsx`

Update the ref type similarly.

#### 2.5 Replace `beforeRemove` with `usePreventRemove`

**Files to update (4):**

- `app/components/UI/Card/Views/SpendingLimit/SpendingLimit.tsx`
- `app/components/Views/confirmations/context/qr-hardware-context/qr-hardware-context.tsx`
- `app/components/UI/QRHardware/QRSigningDetails.tsx`

**Before:**

```jsx
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      Alert.alert('Discard?', 'You have unsaved changes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    }
  });
  return unsubscribe;
}, [navigation, hasUnsavedChanges]);
```

**After:**

```jsx
import { usePreventRemove } from '@react-navigation/native';

usePreventRemove(hasUnsavedChanges, ({ data }) => {
  Alert.alert('Discard?', 'You have unsaved changes.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Discard', onPress: () => navigation.dispatch(data.action) },
  ]);
});
```

#### 2.6 Update `gestureResponseDistance`

If used anywhere (check snapshots):

**Before:**

```jsx
options={{ gestureResponseDistance: { horizontal: 50 } }}
```

**After:**

```jsx
options={{ gestureResponseDistance: 50 }}
```

---

### Phase 3: Testing & Fixing Navigation Issues (Days 5-10)

#### 3.1 Add Debug Logging (Temporary)

Add to `NavigationProvider.tsx` during testing:

```typescript
<NavigationContainer
  onStateChange={(state) => {
    if (__DEV__) {
      const routes = state?.routes || [];
      const routeNames = routes.map(r => r.name);
      console.log('📍 Nav Stack:', routeNames.join(' → '));

      // Detect duplicate screens (likely broken navigation)
      const duplicates = routeNames.filter((name, i) => routeNames.indexOf(name) !== i);
      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICATE SCREENS:', duplicates);
      }
    }
  }}
>
```

#### 3.2 Run E2E Tests

```bash
# iOS
yarn test:e2e:ios:debug:run

# Android
yarn test:e2e:android:debug:run
```

#### 3.3 Manual Testing Checklist

**Critical Flows (Must Test):**

- [ ] **Onboarding → Wallet**: Create new wallet, should land on wallet once
- [ ] **Import → Wallet**: Import wallet, should land on wallet once
- [ ] **Send → Complete → Wallet**: After sending, back to wallet (not new wallet)
- [ ] **Swap → Complete → Wallet**: After swapping, back to wallet
- [ ] **Settings → Back**: Navigate back through settings correctly
- [ ] **Deep Links**: Open deep link, navigate to correct screen (no duplicates)
- [ ] **Modal Dismiss**: Dismiss modals, return to correct screen

**Tab Navigation:**

- [ ] Switch between all tabs
- [ ] Tab state preserved when switching
- [ ] Back button behavior on each tab

**Modal Flows:**

- [ ] Account selector opens/closes correctly
- [ ] Network selector opens/closes correctly
- [ ] All bottom sheets work

**Feature Flows:**

- [ ] Ramp (Buy/Sell) complete flow
- [ ] Stake/Earn complete flow
- [ ] Bridge complete flow
- [ ] Card flows (if applicable)
- [ ] Perps/Predict flows (if applicable)

#### 3.4 Fixing Navigation Issues

When you find a broken navigation (duplicate screen, wrong back behavior):

**Identify the issue:**

```
Console: ⚠️ DUPLICATE SCREENS: ['Wallet']
Stack: Home → Send → Confirm → Wallet (should be just: Home)
```

**Find the code:**

```javascript
// Somewhere in Confirm screen:
navigation.navigate('Wallet'); // This is pushing new Wallet!
```

**Fix with `popTo`:**

```javascript
navigation.popTo('Wallet');
// or
navigation.popTo('Home'); // If wallet is nested in Home
```

**Alternative - use `goBack` for simple cases:**

```javascript
navigation.goBack(); // Go back one screen
// or
navigation.pop(3); // Go back 3 screens
```

---

### Phase 4: Finalization (Days 11-14)

#### 4.1 Update Snapshots

```bash
yarn test:unit --updateSnapshot
```

#### 4.2 Remove Debug Logging

Remove the `onStateChange` debug logging from NavigationProvider.

#### 4.3 Run Full Test Suite

```bash
yarn test:unit
yarn test:e2e:ios:debug:run
yarn test:e2e:android:debug:run
```

#### 4.4 Code Review Checklist

- [ ] No `mode="modal"` remaining
- [ ] No `headerMode` prop on navigators
- [ ] No `animationEnabled` (use `animation`)
- [ ] No `beforeRemove` listeners (use `usePreventRemove`)
- [ ] All `NavigationContainerRef` have generic type
- [ ] No duplicate screen issues in testing

---

## Testing Strategy

### Automated Tests

| Type        | Command                           | Purpose                    |
| ----------- | --------------------------------- | -------------------------- |
| Unit        | `yarn test:unit`                  | Component tests, snapshots |
| E2E iOS     | `yarn test:e2e:ios:debug:run`     | Full flow testing          |
| E2E Android | `yarn test:e2e:android:debug:run` | Full flow testing          |

### High-Risk Flows to Test

| Flow                   | Risk Level | What Could Break           |
| ---------------------- | ---------- | -------------------------- |
| Onboarding completion  | 🔴 High    | Duplicate wallet screens   |
| Transaction completion | 🔴 High    | Not returning to wallet    |
| Modal dismiss          | 🟡 Medium  | Wrong screen after dismiss |
| Deep link handling     | 🔴 High    | Duplicate screens          |
| Settings navigation    | 🟡 Medium  | Back button issues         |
| Tab switching          | 🟢 Low     | Usually works fine         |

### How to Identify `navigate` → `popTo` Issues

**Symptoms:**

1. Back button appears where it shouldn't
2. Pressing back goes to unexpected screen
3. Same screen appears multiple times in stack
4. Console warning about duplicate screens

**Debug command:**

```javascript
console.log(navigation.getState().routes.map((r) => r.name));
```

---

## Risk Assessment

### High Risk

| Risk                       | Likelihood | Impact | Mitigation                       |
| -------------------------- | ---------- | ------ | -------------------------------- |
| Broken back navigation     | Medium     | High   | Thorough testing + debug logging |
| Deep link issues           | Medium     | High   | Test all deep link types         |
| Modal presentation changes | Low        | Medium | Visual regression testing        |

### Medium Risk

| Risk                  | Likelihood | Impact | Mitigation             |
| --------------------- | ---------- | ------ | ---------------------- |
| Type errors           | Medium     | Low    | Fix during development |
| Snapshot failures     | High       | Low    | Bulk update snapshots  |
| Animation differences | Low        | Low    | Visual review          |

### Low Risk

| Risk             | Likelihood | Impact | Mitigation                |
| ---------------- | ---------- | ------ | ------------------------- |
| Tab navigation   | Low        | Low    | Already works differently |
| Gesture handling | Low        | Low    | Test on both platforms    |

---

## Rollback Plan

### If Critical Issues Found

1. **Git revert** the migration PR
2. **Restore package.json** with v5 dependencies
3. **Run `yarn install`**
4. **Rebuild native apps**

### Partial Rollback Not Recommended

React Navigation versions are tightly coupled. A partial rollback (e.g., keeping some v7 changes) would likely cause more issues.

### Post-Deploy Monitoring

- [ ] Monitor crash rates in navigation-related code
- [ ] Check deep link success/failure rates
- [ ] Review user feedback for "stuck" or "loop" issues
- [ ] Watch for "blank screen" reports

---

## Files Reference

### Navigator Files to Modify

```
app/components/Nav/App/App.tsx
app/components/Nav/Main/MainNavigator.js
app/components/Nav/Main/index.js
app/components/Nav/NavigationProvider/NavigationProvider.tsx
app/components/UI/Bridge/routes.tsx
app/components/UI/Card/routes/index.tsx
app/components/UI/Card/routes/OnboardingNavigator.tsx
app/components/UI/Earn/routes/index.tsx
app/components/UI/Perps/routes/index.tsx
app/components/UI/Predict/routes/index.tsx
app/components/UI/Ramp/Aggregator/routes/index.tsx
app/components/UI/Ramp/Deposit/routes/index.tsx
app/components/UI/Ramp/routes.tsx
app/components/UI/Rewards/OnboardingNavigator.tsx
app/components/UI/Rewards/RewardsNavigator.tsx
app/components/UI/Stake/routes/index.tsx
app/components/Views/confirmations/components/send/send.tsx
```

### Files Using `beforeRemove` (Must Update)

```
app/components/UI/Card/Views/SpendingLimit/SpendingLimit.tsx
app/components/Views/confirmations/context/qr-hardware-context/qr-hardware-context.tsx
app/components/UI/QRHardware/QRSigningDetails.tsx
```

### Navigation Hooks Updated (Use NavigationService)

```
app/components/UI/Ramp/hooks/useRampNavigation.ts
```

### Files with Heavy `navigate` Usage (Watch During Testing)

```
app/components/Views/Onboarding/index.tsx (11 calls)
app/components/UI/Navbar/index.js (8 calls)
app/components/UI/Rewards/components/Tabs/OverviewTab/WaysToEarn/WaysToEarn.tsx (7 calls)
app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx (8 calls)
app/components/Views/ResetPassword/index.js (5 calls)
app/components/Views/AssetOptions/AssetOptions.tsx (5 calls)
app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx (6 calls)
```

---

## Quick Reference

### Common Fixes

| v5 Code                                     | v7 Code                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `mode="modal"`                              | `screenOptions={{ presentation: 'card' }}` (default) or `'transparentModal'` (bottom sheets) |
| `headerMode="none"`                         | `screenOptions={{ headerShown: false }}`                                                     |
| `animationEnabled: false`                   | `animation: 'none'`                                                                          |
| `navigation.navigate('Back')`               | Use `useNavigation` from `navUtils.ts` (auto `pop: true`) or explicit `{ pop: true }`        |
| `beforeRemove` listener                     | `usePreventRemove` hook                                                                      |
| `dangerouslyGetState()`                     | `getState()`                                                                                 |
| `dangerouslyGetParent()`                    | `getParent()`                                                                                |
| `headerTitle: <Component />`                | `headerTitle: () => <Component />`                                                           |
| `presentation: 'modal'` (for bottom sheets) | `presentation: 'transparentModal', cardStyle: { backgroundColor: 'transparent' }`            |
| `useNavigation()` in modal callbacks        | `NavigationService.navigation.navigate()` (global ref, auto `pop: true`)                     |
| `createNavigationDetails<T>(route)`         | **DEPRECATED** - Use `navigation.navigate(route, params)` for full type safety               |

### Screen Presentation (iOS Sheet Modal Fix)

In v7, screens in a modal navigator appear as iOS sheet modals by default (background shrinks, new screen slides up). This caused weird animations when navigating between normal screens.

**Solution:** All navigators now default to `presentation: 'card'` for standard slide transitions. Bottom sheet modals use `presentation: 'transparentModal'`.

```jsx
// Main navigators - use 'card' as default
<Stack.Navigator screenOptions={{ presentation: 'card' }}>
  <Stack.Screen name="FullScreen" component={FullScreen} />
</Stack.Navigator>

// Bottom sheet modals - use 'transparentModal'
<Stack.Navigator screenOptions={{ presentation: 'transparentModal' }}>
  <Stack.Screen name="BottomSheet" component={BottomSheet} />
</Stack.Navigator>

// When registering a modal stack as a screen
<Stack.Screen
  name="RootModalFlow"
  component={RootModalFlow}
  options={{
    presentation: 'transparentModal',
    cardStyle: { backgroundColor: 'transparent' },
  }}
/>
```

### Modal Navigation Pattern

When navigating from a modal to another screen, use this pattern:

```jsx
import { CommonActions, StackActions } from '@react-navigation/native';
import NavigationService from '../core/NavigationService';

const handleClose = () => {
  // First, dismiss the modal stack
  NavigationService.navigation.dispatch(StackActions.popToTop());
  // Then navigate to the destination
  NavigationService.navigation.dispatch(
    CommonActions.navigate({ name: Routes.ONBOARDING.HOME_NAV }),
  );
};
```

For simpler cases within the same stack:

```jsx
const handleClose = () => {
  navigation.dispatch(StackActions.popToTop());
};
```

### Header Title Pattern

In React Navigation v7, `headerTitle` must be a **function** to properly inherit theme context:

```jsx
// ❌ WRONG - Direct JSX (may have styling issues)
headerTitle: <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>;

// ✅ CORRECT - Function returning JSX
headerTitle: () => (
  <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>
);
```

When using the function pattern, you don't need to explicitly set `color` on text components - they will inherit the correct theme color automatically.

### Transparent Modal Pattern

Bottom sheet modals need transparent backgrounds so the overlay can show through:

```jsx
// For Stack.Screen registering a modal navigator
<Stack.Screen
  name="RootModalFlow"
  component={RootModalFlow}
  options={{
    presentation: 'transparentModal',
    cardStyle: { backgroundColor: 'transparent' },
  }}
/>

// For internal modal navigators
<Stack.Navigator
  screenOptions={{
    presentation: 'transparentModal',
    cardStyle: { backgroundColor: 'transparent' },
  }}
>
```

### Navigation from Modal Callbacks

When navigating after a modal is dismissed (e.g., from bottom sheet callbacks), use `NavigationService` instead of `useNavigation()` hook:

```jsx
// ❌ WRONG - Hook context invalid after modal dismissal
const navigation = useNavigation();
closeBottomSheet(() => {
  navigation.navigate('SomeScreen'); // May fail!
});

// ✅ CORRECT - NavigationService works globally
import NavigationService from '../core/NavigationService';
closeBottomSheet(() => {
  NavigationService.navigation.navigate('SomeScreen'); // Uses pop: true by default
});
```

### Navigate `pop: true` Default

In v7, `navigate()` always pushes a new screen. We've enhanced our navigation utilities to add `pop: true` by default, restoring v6 behavior:

**Using `useNavigation` hook (from `navUtils.ts`):**

```jsx
import { useNavigation } from '../../util/navigation/navUtils';

const MyComponent = () => {
  const navigation = useNavigation();

  // Automatically uses pop: true - goes back to existing screen
  navigation.navigate('WalletView');
  navigation.navigate('Asset', { address: '0x...' });

  // Explicitly push a new screen (v7 default behavior)
  navigation.navigate({
    name: 'Asset',
    params: { address: '0x...' },
    pop: false,
  });
};
```

**Using `NavigationService`:**

```jsx
import NavigationService from '../core/NavigationService';

// Automatically uses pop: true
NavigationService.navigation.navigate('WalletView');

// Also available
NavigationService.navigation.goBack();
NavigationService.navigation.popToTop();
NavigationService.navigation.dispatch(action);
```

### `createNavigationDetails` Deprecation

The `createNavigationDetails` helper is now deprecated. Use direct navigation for full type safety:

```jsx
// ❌ DEPRECATED - createNavigationDetails pattern
const goToScreen = createNavigationDetails < MyParams > Routes.SCREEN;
navigation.navigate(...goToScreen({ id: '123' }));

// ✅ RECOMMENDED - Direct navigation with full RootParamList type safety
navigation.navigate(Routes.SCREEN, { id: '123' });

// ✅ For nested navigation
navigation.navigate(Routes.MODAL.ROOT, {
  screen: Routes.MODAL.SCREEN,
  params: { id: '123' },
});
```

**Why deprecated:**

| Aspect                 | `createNavigationDetails`       | Direct `navigate()`           |
| ---------------------- | ------------------------------- | ----------------------------- |
| Route name validated   | ❌ No (uses `string`)           | ✅ Yes (literal type)         |
| Params validated       | ⚠️ Partial (caller-defined `T`) | ✅ Yes (from `RootParamList`) |
| Type assertions        | ⚠️ Uses `[any, any]`            | ✅ None needed                |
| React Nav v7 idiomatic | ❌ No                           | ✅ Yes                        |

**Technical note:** `createNavigationDetails` now returns `[any, any]` to satisfy v7's strict `navigate()` overloads, but this bypasses type checking. Direct navigation leverages the global `RootParamList` type augmentation for full type safety.

### New Methods in v7

```javascript
// Go back to a specific screen in the stack
navigation.popTo('ScreenName', { params });

// New hook for preventing navigation
usePreventRemove(condition, callback);
```

### Animation Values

```javascript
options={{
  animation: 'none' | 'default' | 'fade' | 'slide_from_right' | 'slide_from_left' | 'slide_from_bottom' | 'fade_from_bottom' | 'flip' | 'simple_push'
}}
```

---

## Decision Summary Table

| Question                   | Decision            | Rationale                                             |
| -------------------------- | ------------------- | ----------------------------------------------------- |
| Stack vs Native Stack      | **Keep `stack`**    | `cardStyleInterpolator` used in 5 files               |
| `@react-navigation/compat` | **Remove, migrate** | Only 5 files use `withNavigation`                     |
| TypeScript types           | **Incremental**     | Fix as needed, don't delay migration                  |
| Static API                 | **Not now**         | Optional, can adopt later for new features            |
| Peer dependencies          | **No changes**      | Current versions compatible                           |
| Deep linking               | **No changes**      | Uses imperative `NavigationService`, not linking prop |
| Testing scope              | **E2E + Manual QA** | All E2E pass + feature team sign-off                  |
| Rollout                    | **Direct merge**    | Can't feature flag, strong test coverage              |
