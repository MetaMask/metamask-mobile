# Profile Drawer — Design Doc

Status: Approved (wireframe reviewed with user 2026-09-28). UI-only placeholder pass.

## Goal

Add a new "Profile Drawer" hub screen, entered from the wallet home's top-left
button (replacing today's direct-to-AccountSelector action). The screen is a
vertical, full-screen modal listing quick-access rows. This pass is
**UI-only / placeholder wiring** for rows 2c–2g and the profile flow; only
Close and Scan are real navigation.

## Decisions (from brainstorming session)

- "Social account" = a brand-new, separate social profile concept — **not**
  the existing Social Login (seedless auth) identity, and **not** wired to
  the existing `SocialLeaderboard` `ProfileOnboardingView`. Build a new stub
  screen for account creation.
- This Profile Drawer screen is a **new, standalone entry point** — it does
  **not** replace or absorb the existing Social tab
  (`Routes.SOCIAL.TAB` / `SocialLeaderboardTab`).
- Subscriptions row = placeholder only (no real feature wiring), even though
  a real `ProSubscription`/`ProHub` feature exists elsewhere in the app — do
  not link to it in this pass.
- Rows 2c (Account selector), 2d (Notifications), 2e (Subscriptions), 2f
  (Settings), 2g (Help and support) are **all UI-only placeholders** — no
  real navigation, tapping is a no-op or shows a lightweight toast. Real
  screens for these already exist elsewhere in the app but are explicitly
  **not** wired in this pass.
- Close and Scan in the header **are real**: Close pops back to Wallet Home;
  Scan opens the existing QR scanner route.
- The profile "+" placeholder opens a **new, empty stub screen**
  (`ProfileDrawerProfileCreate`) — not the existing SocialLeaderboard onboarding
  flow.

## Wireframes

### Wallet Home (changed)

```
┌─────────────────────────────────┐
│ [👤]         MetaMask      [🔍][🕐][📋][⋮] │
│  ↑ top-left PickerAccount onPress           │
│    now navigates to Profile Drawer             │
│    (was: navigate to AccountSelector)       │
└─────────────────────────────────┘
```

### Profile Drawer (new screen)

```
┌─────────────────────────────────┐
│  [✕]                      [⛶]   │  close (left) / scan (right)
│                                  │
│           ┌────────┐            │
│           │   +    │            │  profile avatar placeholder
│           └────────┘            │  (no social account yet)
│         "Create profile"        │  tap → ProfileDrawerProfileCreate (stub)
│                                  │
│  ──────────────────────────     │
│  [👛]  Account selector      >  │  placeholder, no-op
│  ──────────────────────────     │
│  [🔔]  Notifications         >  │  placeholder, no-op
│  ──────────────────────────     │
│  [⭐]  Subscriptions         >  │  placeholder, no-op
│  ──────────────────────────     │
│  [⚙️]  Settings              >  │  placeholder, no-op
│  ──────────────────────────     │
│  [❓]  Help and support      >  │  placeholder, no-op
│                                  │
└─────────────────────────────────┘
```

## Reference patterns (from codebase recon)

- Header close+action pattern: MMDS `HeaderBase` with `startAccessory`
  (ButtonIcon `IconName.Close`) + `endAccessory` (ButtonIcon `IconName.Scan`)
  — see `app/components/Views/SocialLeaderboard/SocialPostComposerView/SocialPostComposerView.tsx:209-229`.
- Screen registration + nav-detail helper pattern: `AccountSelector` —
  `app/components/Views/AccountSelector/AccountSelector.tsx`,
  `app/components/Views/AccountSelector/index.ts` (`createAccountSelectorNavDetails`),
  registered in `app/components/Nav/App/App.tsx:1249`.
- Modal-style registration precedent: `ProHub`/`ProSubscription` registered
  in `app/components/Nav/App/App.tsx:1412-1423` ("reachable from anywhere").
- Scan entry point: existing QR scanner route `Routes.QR_TAB_SWITCHER`
  (`'QRTabSwitcher'`), hook `app/components/hooks/useQRScanner/useQRScanner.ts`
  (`openQRScanner()`).
- Avatar "+" placeholder pattern: `AddAccountItem` —
  `app/components/Views/MultichainAccounts/WalletDetails/BaseWalletDetails/components/AddAccountItem.tsx:67-77`
  (MMDS `Icon` `IconName.Add` inside a tile/avatar shape).
- Icon library: MMDS `Icon`/`IconName` from `@metamask/design-system-react-native`.
  Icon names for this feature: `wallet` (Account selector), `notification`
  (Notifications), `star` (Subscriptions), `setting` (Settings), `question`
  (Help and support), `add` (profile placeholder), `close` (header close),
  `scan` (header scan).
- Top-left wallet home button to change: `PickerAccount` in
  `app/components/Views/Wallet/components/WalletHeader/WalletHeader.tsx:140-146`,
  current `onPress` at lines 67-69 navigates via
  `createAccountSelectorNavDetails({})`.

## New files/routes for this pass

- `app/constants/navigation/Routes.ts` — add:
  ```ts
  PROFILE_DRAWER: {
    ROOT: 'ProfileDrawer',
    PROFILE_CREATE: 'ProfileDrawerProfileCreate',
  },
  ```
- `app/components/Views/ProfileDrawer/ProfileDrawer.tsx` — main screen component.
- `app/components/Views/ProfileDrawer/ProfileDrawer.styles.ts` — styles (follow
  sibling convention, e.g. `AccountSelector`'s styling approach).
- `app/components/Views/ProfileDrawer/index.ts` — exports
  `createProfileDrawerNavDetails` and `createProfileDrawerProfileCreateNavDetails`
  nav-detail helpers, mirroring `AccountSelector/index.ts`.
- `app/components/Views/ProfileDrawer/ProfileCreate/ProfileCreate.tsx` — stub
  placeholder screen (header with close only + "Coming soon" style empty
  state; no real functionality).
- `app/components/Views/ProfileDrawer/ProfileDrawer.test.tsx` and
  `ProfileCreate/ProfileCreate.test.tsx` — basic render tests following
  sibling screen test conventions (e.g. `AccountSelector`'s test file).
- `app/components/Nav/App/App.tsx` — register both new screens as
  modal-style routes (same group/pattern as `AccountSelector`/`ProHub`
  registration).
- `app/components/Views/Wallet/components/WalletHeader/WalletHeader.tsx` —
  change top-left `PickerAccount` `onPress` to navigate via
  `createProfileDrawerNavDetails({})` instead of
  `createAccountSelectorNavDetails({})`.

## Explicitly out of scope for this pass

- Real navigation for Account selector, Notifications, Subscriptions,
  Settings, Help and support rows.
- Real profile creation logic/persistence in `ProfileCreate`.
- Any change to the existing `SocialLeaderboard` feature or Social tab.
- Any change to `ProSubscription`/`ProHub`.
