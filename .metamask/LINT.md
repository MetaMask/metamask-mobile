# RN 0.81.5 Upgrade — `yarn lint:tsc` cleanup plan

> Branch: `rn-upgrade/0.81.5-no-unit-tests`
> Baseline: **280 TypeScript errors** across **238 files** (after the
> `delegation-controller`/`transaction-pay-controller` deep-import fix in
> commit `546efe3`, which cleared ~495 cascade errors).

The remaining 280 errors are real upgrade fallout from React 19 / RN 0.81.5
and a handful of bumped third-party packages. They are highly mechanical and
fall into a small number of root causes. We tackle them one group at a time
and re-run `yarn lint:tsc` after each group to verify the count drops.

## Error counts by code

| Count | Code | Group |
|------:|------|-------|
| 82 | TS2322 | 2 (mostly Ref types), 3 (props) |
| 75 | TS2345 | 2 (Ref types), 7 (Rewards animation), 6 (forwardRef ElementType) |
| 35 | TS2554 | 1 (`useRef<T>()` no-arg) |
| 21 | TS2578 | 5 (unused `@ts-expect-error`) |
| 15 | TS2739 | 3 (missing required props) |
| 12 | TS2320 | 4 (`ListItem*` interface conflict) |
|  9 | TS2741 | 3 |
|  8 | TS2740 | 3 |
|  7 | TS2769 | 6 (overload mismatches) |
|  3 | TS2693 | 6 (MMKV type-only) |
|  2 | TS2352 | 6 (RpcForm test casts) |
|  2 | TS2339 | 6 (`defaultProps`, `MMKV.remove`) |
|  2 | TS2314 | 6 (`NavigationContainerRef` generic) |
|  2 | TS18046 | 6 (`unknown` in tests) |
|  1 each | TS2305, TS2571, TS2590, TS2693, TS2724, TS7006 | 6 |

---

## Group 1 — `useRef<T>()` missing initial argument (35 errors, TS2554)

**Root cause.** React 19 made the no-arg `useRef<T>()` overload an error;
you must now pass an explicit initial value (usually `null` or `undefined`).
The signature also changed so the returned ref's `current` is `T | null` by
default — which is why this group is also the upstream cause of Group 2.

**Fix template.**

```diff
- const ref = useRef<TextInput>();
+ const ref = useRef<TextInput | null>(null);

- const ref = useRef<NodeJS.Timeout>();
+ const ref = useRef<NodeJS.Timeout | undefined>(undefined);
```

Use `null` for DOM/native component refs, `undefined` for plain values
(timers, previous-value cache, etc.).

**Files (35):**
- `app/component-library/components/BottomSheets/BottomSheet/BottomSheet.tsx:57`
- `app/components/hooks/useInterval.ts:11`
- `app/components/hooks/usePrevious.ts:4`
- `app/components/UI/Assets/components/Balance/AccountGroupBalance.tsx:83`
- `app/components/UI/Card/hooks/useEmailVerificationSend.test.ts:393`
- `app/components/UI/Card/hooks/useEmailVerificationVerify.test.ts:517`
- `app/components/UI/Card/hooks/usePhoneVerificationSend.test.ts:426`
- `app/components/UI/Card/hooks/usePhoneVerificationVerify.test.ts:443`
- `app/components/UI/Card/hooks/useRegisterPersonalDetails.test.ts:524`
- `app/components/UI/Card/hooks/useRegisterPhysicalAddress.test.ts:508`
- `app/components/UI/Card/hooks/useRegisterUserConsent.test.ts:833,862,885,906`
- `app/components/UI/Perps/hooks/useStableArray.ts:7`
- `app/components/UI/Perps/providers/PerpsConnectionProvider.tsx:55`
- `app/components/UI/Ramp/Aggregator/hooks/useGasPriceEstimation.ts:34`
- `app/components/UI/Ramp/Aggregator/hooks/useSDKMethod.ts:102`
- `app/components/UI/Ramp/Deposit/hooks/useDepositSdkMethod.ts:116`
- `app/components/UI/ReusableModal/index.tsx:69`
- `app/components/Views/AccountConnect/AccountConnect.tsx:121`
- `app/components/Views/AccountPermissions/AccountPermissions.tsx:176`
- `app/components/Views/BrowserTab/BrowserTab.tsx:190,193`
- `app/components/Views/confirmations/components/modals/switch-account-type-modal/account-network-row/account-network-row.tsx:45`
- `app/components/Views/confirmations/hooks/pay/useAutomaticTransactionPayToken.ts:47`
- `app/components/Views/confirmations/hooks/pay/useMoneyAccountPayToken.ts:41`
- `app/components/Views/confirmations/hooks/pay/useTransactionPayMetrics.ts:38`
- `app/components/Views/confirmations/hooks/pay/useTransactionPayPostQuote.ts:26`
- `app/components/Views/confirmations/hooks/send/useRecipientPageReset.ts:7`
- `app/components/Views/confirmations/hooks/send/useToAddressValidation.ts:33`
- `app/components/Views/confirmations/hooks/useDeepMemo.ts:12`
- `app/components/Views/InfoNetworkModal/InfoNetworkModal.tsx:19`
- `app/components/Views/MultichainAccounts/MultichainAccountConnect/MultichainAccountConnect.tsx:133`
- `app/components/Views/TradeWalletActions/TradeWalletActions.tsx:79`

---

## Group 2 — `RefObject<T | null>` vs `RefObject<T>` mismatches (~85 errors, TS2322 + TS2345)

**Root cause.** `@types/react@19` redefined `RefObject<T>` so that
`useRef<T>(null)` returns `RefObject<T | null>`, not `RefObject<T>`. Any
prop, function parameter, or local declaration typed as `RefObject<T>` no
longer accepts the value coming out of `useRef`.

**Fix template.**

```diff
- inputRef: RefObject<TextInput>;
+ inputRef: RefObject<TextInput | null>;

- function focusInput(ref: RefObject<TextInput>) { ... }
+ function focusInput(ref: RefObject<TextInput | null>) { ... }
```

This is purely a type-level relaxation — no runtime change. Group 1 must be
done first (or interleaved) so we know the canonical ref shape before we
relax the consumer types.

**Affected ref-type breakdown (TS2345 + TS2322):**
- `RefObject<TextInput | null>` → `RefObject<TextInput>` — 38 errors
- `RefObject<View | null>` → `RefObject<View>` (incl. `... | null` outer) — 16 errors
- `RefObject<BottomSheetRef | null>` → `RefObject<BottomSheetRef>` — 19 errors
- `RefObject<ToastRef | null>` → `RefObject<ToastRef>` — 3 errors
- `RefObject<BrowserUrlBarRef | null>` — 2 errors
- `RefObject<NavigationContainerRef<...> | null>` — 2 errors
- `RefObject<PredictKeypadHandles | null>` — 2 errors
- `RefObject<TabRefreshHandle | null>` — 2 errors
- `RefObject<FlashListRef<UnifiedItem> | null>` — 1 error

These are widely distributed; `Engine.ref` style props in shared components
(`BottomSheet`, `Toast`, `BrowserUrlBar`, navigation containers, Rewards
animation hook return value) account for most of the volume. We update the
shared type once and dependent files clear in bulk.

**Hot files / shared type owners to update first:**
- `BottomSheetRef` consumers across `app/component-library/...` and many
  feature folders.
- `RpcFormFieldsProps` (drives ~7 errors in
  `RpcSelectionModal.test.tsx` etc.).
- `UseRewardsAnimationResult` (Rewards animation hook return — 22 errors all
  caused by `riveRef` typed as `RefObject<RiveRef>` in the result type).

---

## Group 3 — Component prop tightening (32 errors, TS2739/TS2740/TS2741)

**Root cause.** A few shared component types had previously-optional props
become required (or a union of types collapsed under stricter inference).

**Patterns:**
- `SettingsButton`/`SettingsNotification` now require `warning` and `testID`.
- `ActionView` now requires `modalStyle`, `viewWrapperStyle`,
  `viewContainerStyle`, `actionContainerStyle`, etc.
- A few one-off components (`CollectibleMedia`, `TurnOffRememberMeModal`)
  added required props.

**Fix.** Either add the props at all call sites, or — preferred — make them
optional in the component's type definition with sensible defaults.

**Files (15 + 8 + 9 = 32 errors across these files):**
- `app/components/UI/AddToAddressBookWrapper/AddToAddressBookWrapper.tsx`
- `app/components/UI/CollectibleMedia/CollectibleMedia.tsx`
- `app/components/UI/QRHardware/QRSigningDetails.tsx`
- `app/components/UI/SettingsButtonSection/index.tsx`
- `app/components/UI/SettingsNotification/index.test.tsx`
- `app/components/UI/SliderButton/index.test.tsx`
- `app/components/UI/SlippageSlider/index.test.tsx`
- `app/components/UI/SwitchCustomNetwork/index.test.tsx`
- `app/components/UI/TimeEstimateInfoModal/index.test.tsx`
- `app/components/UI/TokenImage/index.test.tsx`
- `app/components/UI/TurnOffRememberMeModal/TurnOffRememberMeModal.tsx`
- `app/components/Views/AddAsset/components/AddCustomCollectible/AddCustomCollectible.tsx`
- `app/components/Views/Onboarding/index.tsx`
- `app/components/Views/OnboardingSuccess/DefaultSettings/index.tsx`
- `app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx`
- `app/components/Views/Settings/AdvancedSettings/ResetAccountModal/ResetAccountModal.tsx`
- `app/components/Views/Settings/SecuritySettings/Sections/ClearCookiesSection.tsx`
- `app/components/Views/Settings/SecuritySettings/Sections/ClearPrivacy/ClearPrivacy.tsx`
- `app/components/Views/Settings/SecuritySettings/SecuritySettings.tsx`
- `app/components/Views/Settings/index.tsx`
- `app/components/Views/confirmations/legacy/components/WatchAssetRequest/index.test.tsx`

---

## Group 4 — `ListItem*` / `Select*` interface conflict (12 errors, TS2320)

**Root cause.** React 19's stricter checks caught long-standing
`interface X extends TouchableOpacityProps, Omit<ListItemProps, 'style' | 'hitSlop'>` definitions, where the two parents have incompatible `style`
(`StyleProp<ViewStyle>` vs `StyleProp<TextStyle>`) or `hitSlop` types after
`@types/react-native` updated.

**Fix.** Either:
- Replace the `extends` with an `&` intersection alias, or
- `Omit<TouchableOpacityProps, 'style' | 'hitSlop'>` on both sides so the
  conflicting members are removed before merging.

**Files (6):**
- `app/component-library/components-temp/ListItemMultiSelectButton/ListItemMultiSelectButton.types.ts`
- `app/component-library/components-temp/ListItemMultiSelectWithMenuButton/ListItemMultiSelectWithMenuButton.types.ts`
- `app/component-library/components/List/ListItemMultiSelect/ListItemMultiSelect.types.ts`
- `app/component-library/components/List/ListItemSelect/ListItemSelect.types.ts`
- `app/component-library/components/Select/SelectButton/foundation/SelectButtonBase.types.ts`
- `app/component-library/components/Select/SelectOption/SelectOption.types.ts`

---

## Group 5 — Unused `@ts-expect-error` directives (21 errors, TS2578)

**Root cause.** Upgraded React/RN type definitions removed the underlying
errors, so the suppressions are now no-ops and become errors themselves
(`noUnusedLocals`-style).

**Fix.** Delete the now-unused `// @ts-expect-error` lines (or replace with
`// @ts-ignore` only if a different but unrelated error appears after
removal — verify with tsc).

**Files:**
- `app/component-library/components/Icons/Icon/Icon.tsx:77`
- `app/components/UI/QRHardware/QRSigningDetails.tsx:264`
- `app/components/UI/WalletAction/WalletAction.tsx:100`
- `app/components/Views/confirmations/components/hero-token/hero-token.tsx:32,39`
- `app/components/Views/confirmations/components/modals/alert-modal/alert-modal.tsx:55,78,87,97,140`
- `app/components/Views/confirmations/components/UI/hero/hero.tsx:20,27,39`
- `app/components/Views/NetworkSelector/RpcSelectionModal/RpcSelectionModal.tsx:161,176,181,190,215,217`
- `app/components/Views/NftDetails/NftDetailsBox.tsx:48,65`

---

## Group 6 — Misc one-offs (~30 errors)

These are individually small but each needs its own targeted fix.

### 6a — Sentry duplicate `@sentry/core` types (1 error)
- `app/util/sentry/utils.ts:630`
- **Cause.** `@sentry/react-native` was upgraded and now nests its own
  `@sentry/core` under `node_modules/@sentry/react-native/node_modules/...`,
  creating two separate `Integration[]` types.
- **Fix.** Add a Yarn `resolutions` entry pinning a single `@sentry/core`
  version, or import `Integration` directly from `@sentry/react-native`
  rather than `@sentry/core`.

### 6b — `react-native-mmkv` v3 broke value-import (4 errors)
- `app/store/migrations/106.test.ts:14,35,52` (TS2693)
- `app/store/storage-wrapper.ts:138` (TS2339 `MMKV.remove`)
- **Cause.** v3 made `MMKV` a type-only export and removed `.remove()`.
- **Fix.** Import the class via `import { MMKV } from 'react-native-mmkv'`
  using its new value export (or instantiate via the new factory), and
  switch `.remove(key)` calls to `.delete(key)`.

### 6c — React 19 removed legacy APIs (3 errors)
- `app/components/Base/AnimatedFox/index.tsx:1577` (TS2339 `defaultProps`)
- `app/components/Views/confirmations/components/UI/bottom-modal/bottom-modal.tsx:1` (TS2305 `ReactChild`)
- `app/components/Views/SrpInput/Input/index.tsx:77` (TS2769 BlurEvent overload)
- **Fix.** Replace `defaultProps` with default parameter destructuring;
  swap `ReactChild` for `ReactNode`; widen the `onBlur`/`onFocus` handler
  signatures to use `NativeSyntheticEvent<TextInputFocusEventData>`.

### 6d — `@react-navigation/native` v7 generic (2 errors, TS2314)
- `app/core/SDKConnect/Connection/Connection.ts:47,64`
- **Cause.** `NavigationContainerRef` now requires a generic param.
- **Fix.** Add `NavigationContainerRef<RootStackParamList>` (or
  `NavigationContainerRef<Record<string, unknown>>` if param list isn't
  available).

### 6e — `@metamask/snaps-controllers` rename (1 error)
- `app/core/Engine/controllers/snaps/execution-service-init.ts:4` (TS2724)
- **Fix.** Replace `AbstractExecutionService` with `ExecutionService`.

### 6f — Rewards messenger union too complex (1 error, TS2590)
- `app/core/Engine/messengers/rewards-controller-messenger/index.ts:147`
- **Fix.** Narrow the messenger's `Action`/`Event` generics or split the
  Rewards subscriber types into smaller named unions before passing them in.

### 6g — Test-only/misc (≈10 errors)
- `app/components/Views/SocialLeaderboard/.../useQuickBuyBottomSheet.ts:463` — RefObject mismatch (already covered by Group 2).
- `app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx:601` — `FlashList` v2 ref type (Group 2).
- `app/components/Views/SrpInput/index.tsx:127,128` — `BlurEvent`/`FocusEvent` typing (6c).
- `app/component-library/components/Form/TextField/foundation/Input/Input.tsx:78` — onBlur overload (6c).
- `app/components/Snaps/SnapUISelector/SnapUISelector.tsx:139` — overload mismatch.
- `app/components/UI/Predict/components/PredictShareButton/PredictShareButton.test.tsx:284` — overload mismatch.
- `app/components/UI/Tokens/index.tsx:301` — overload mismatch.
- `app/components/Views/ImportFromSecretRecoveryPhrase/index.test.tsx:718,1047` — overload mismatch.
- `app/components/Views/NetworksManagement/.../BlockExplorerSection.test.tsx:80` and `RpcEndpointSection.test.tsx:90` — `as` cast on stricter `UseNetworkFormReturn` shape.
- `app/components/Views/confirmations/hooks/alerts/useBlockaidAlerts.test.tsx:133` — `'unknown'` (TS18046).
- `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.test.tsx:711` — `'unknown'` (TS18046).
- `app/component-library/components-temp/TabBar/TabBar.test.tsx:34` — `'unknown'` (TS2571).
- `app/components/UI/SlippageSlider/index.test.tsx:12` — implicit any param (TS7006).

---

## Execution order

1. **Group 1** — `useRef<T>()` arg fixes (35 errors)
2. **Group 2** — Relax `RefObject<T>` props/params to `RefObject<T | null>` (~85 errors)
3. **Group 5** — Strip dead `@ts-expect-error` (21 errors, trivial)
4. **Group 4** — Fix `ListItem*`/`Select*` interface unions (12 errors)
5. **Group 3** — Component prop tightening (~32 errors)
6. **Group 6** — Misc one-offs (~30 errors)

After each group, run:

```bash
yarn lint:tsc 2>&1 | tail -5
yarn lint:tsc 2>&1 | grep -cE "error TS[0-9]+"
```

…and commit with a focused message (`fix(types): <group>`).
