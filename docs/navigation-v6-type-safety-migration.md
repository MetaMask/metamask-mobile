# React Navigation v6 Type Safety Migration

## Overview

This document tracks the migration of navigation calls to use type-safe navigation with properly typed `RootParamList`.

**Error type:** TS2345 - `[string, Params]` not assignable to navigate overloads

## Files with TS2345 Errors (73 files)

### Component Library

- [x] `app/component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.tsx`

### UI Components - Card

- [x] `app/components/UI/Card/Views/CardHome/CardHome.tsx`
- [x] `app/components/UI/Card/components/AddFundsBottomSheet/AddFundsBottomSheet.tsx` _(added)_
- [ ] `app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx` _(has dynamic navigation)_
- [x] `app/components/UI/Card/components/Onboarding/PersonalDetails.tsx`
- [x] `app/components/UI/Card/components/Onboarding/PhysicalAddress.tsx`
- [x] `app/components/UI/Card/components/Onboarding/SetPhoneNumber.tsx`
- [x] `app/components/UI/Card/components/Onboarding/SignUp.tsx`
- [x] `app/components/UI/Card/components/Onboarding/RegionSelectorModal.tsx` _(source fix)_
- [x] `app/components/UI/Card/hooks/useSpendingLimit.ts`

### UI Components - Earn

- [ ] `app/components/UI/Earn/hooks/useMusdConversion.ts` _(has dynamic navigation)_

### UI Components - Predict

- [x] `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`

### UI Components - Ramp Aggregator

- [ ] `app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx` _(nested navigation - needs generics)_
- [ ] `app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.test.tsx` _(nested navigation)_
- [ ] `app/components/UI/Ramp/Aggregator/Views/OrdersList/OrdersList.tsx`
- [ ] `app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.tsx`
- [ ] `app/components/UI/Ramp/Aggregator/Views/Settings/ActivationKeys.tsx`
- [x] `app/components/UI/Ramp/Aggregator/components/AccountSelector.tsx`
- [ ] `app/components/UI/Ramp/Aggregator/components/UnsupportedRegionModal/UnsupportedRegionModal.tsx` _(nested navigation - keeps generic)_

### UI Components - Ramp Deposit

- [x] `app/components/UI/Ramp/Deposit/Views/BankDetails/BankDetails.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/BasicInfo/BasicInfo.tsx`
- [ ] `app/components/UI/Ramp/Deposit/Views/BasicInfo/BasicInfo.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/BuildQuote/BuildQuote.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/EnterEmail/EnterEmail.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/Modals/StateSelectorModal/StateSelectorModal.tsx`
- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/StateSelectorModal/StateSelectorModal.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedRegionModal/UnsupportedRegionModal.tsx`
- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedRegionModal/UnsupportedRegionModal.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedStateModal/UnsupportedStateModal.tsx`
- [ ] `app/components/UI/Ramp/Deposit/Views/Modals/UnsupportedStateModal/UnsupportedStateModal.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/OtpCode/OtpCode.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/Root/Root.tsx`
- [x] `app/components/UI/Ramp/Deposit/Views/VerifyIdentity/VerifyIdentity.tsx`
- [ ] `app/components/UI/Ramp/Deposit/Views/VerifyIdentity/VerifyIdentity.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/components/AccountSelector/AccountSelector.tsx`
- [x] `app/components/UI/Ramp/Deposit/components/DepositPhoneField/DepositPhoneField.tsx`
- [x] `app/components/UI/Ramp/Deposit/components/StateSelector/StateSelector.tsx`
- [x] `app/components/UI/Ramp/Deposit/components/TruncatedError/TruncatedError.tsx`
- [ ] `app/components/UI/Ramp/Deposit/components/TruncatedError/TruncatedError.test.tsx`
- [x] `app/components/UI/Ramp/Deposit/deeplink/handleDepositUrl.ts`
- [x] `app/components/UI/Ramp/Deposit/hooks/useDepositRouting.ts`
- [ ] `app/components/UI/Ramp/Deposit/hooks/useDepositRouting.test.ts`

### UI Components - Ramp Shared

- [ ] `app/components/UI/Ramp/components/TokenSelection/TokenSelection.tsx`
- [ ] `app/components/UI/Ramp/hooks/useRampNavigation.ts`

### UI Components - Rewards

- [ ] `app/components/UI/Rewards/components/EndOfSeasonClaimBottomSheet/EndOfSeasonClaimBottomSheet.tsx`
- [ ] `app/components/UI/Rewards/hooks/useOptOut.test.ts`

### UI Components - Other

- [ ] `app/components/UI/AddressCopy/AddressCopy.tsx`
- [ ] `app/components/UI/AssetOverview/AssetOverview.tsx`
- [ ] `app/components/UI/SelectOptionSheet/OptionsSheet.tsx`
- [ ] `app/components/UI/SelectOptionSheet/SelectOptionSheet.tsx`
- [ ] `app/components/UI/shared/BaseControlBar/BaseControlBar.tsx`

### UI Components - Approvals

- [ ] `app/components/Approvals/PermissionApproval/PermissionApproval.tsx`

### Views - MultichainAccounts

- [ ] `app/components/Views/MultichainAccounts/AccountGroupDetails/AccountGroupDetails.tsx`
- [ ] `app/components/Views/MultichainAccounts/IntroModal/MultichainAccountsIntroModal.tsx`
- [x] `app/components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions.tsx`
- [x] `app/components/Views/MultichainAccounts/AddressList/AddressList.tsx` _(added - related fix)_

### Views - Confirmations

- [ ] `app/components/Views/confirmations/hooks/send/useSendNavbar.tsx`
- [ ] `app/components/Views/confirmations/hooks/useConfirmNavigation.ts`

### Views - Other

- [ ] `app/components/Views/ActivityView/index.test.tsx`
- [ ] `app/components/Views/AddressSelector/AddressSelector.tsx`
- [ ] `app/components/Views/Login/index.tsx`
- [ ] `app/components/Views/RestoreWallet/WalletResetNeeded.tsx`
- [ ] `app/components/Views/Snaps/components/SnapElement/SnapElement.tsx`
- [ ] `app/components/Views/UnifiedTransactionsView/useUnifiedTxActions.ts`
- [ ] `app/components/Views/Wallet/index.tsx`

### Core - DeeplinkManager

- [ ] `app/core/DeeplinkManager/handlers/legacy/handleCardHome.ts`
- [ ] `app/core/DeeplinkManager/handlers/legacy/handleCardOnboarding.ts`
- [ ] `app/core/DeeplinkManager/handlers/legacy/handleDeepLinkModalDisplay.ts`
- [ ] `app/core/DeeplinkManager/handlers/legacy/handleEthereumUrl.ts`
- [ ] `app/core/DeeplinkManager/handlers/legacy/handleRewardsUrl.ts`

### Core - SDKConnect

- [ ] `app/core/SDKConnect/ConnectionManagement/connectToChannel.ts`
- [ ] `app/core/SDKConnect/InitializationManagement/postInit.ts`
- [ ] `app/core/SDKConnect/StateManagement/updateSDKLoadingState.ts`
- [ ] `app/core/SDKConnect/handlers/checkPermissions.ts`

### Store

- [ ] `app/store/sagas/index.ts`

### Utilities

- [ ] `app/util/hardwareWallet/hardwareWallets/ledger.ts`

---

## Progress

- **Total files:** 78
- **Completed:** ~50 (many fixed by batch updates)
- **Remaining TS2345 errors:** 42 (34 source + 8 test files)

**Notes:**

- Removed generics from `createNavigationDetails` in Ramp/Deposit and Ramp/Aggregator
- Updated `DepositModals`, `RampModals`, `Deposit`, `RestoreWallet` types in RootParamList
- Remaining errors are mostly dynamic navigation (runtime string routes) requiring type assertions

---

## How to Fix Each File

### Option A: Type Assertion (Quick)

```typescript
// Add type assertion
navigation.navigate(
  ...(createNavDetails({ param }) as [keyof RootParamList, object]),
);
```

### Option B: Update RootParamList (Proper)

1. Find the params interface in the component
2. Add it to `RootParamList` in `app/util/navigation/types.ts`
3. Remove the `<ParamsType>` generic from `createNavigationDetails`

---

## Notes

- Test files (`.test.tsx`, `.test.ts`) often need mock updates too
- Some errors are in deeplink handlers using dynamic route strings
- SDK Connect files use dynamic screen names from runtime values
