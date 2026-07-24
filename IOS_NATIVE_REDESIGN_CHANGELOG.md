# iOS Native Redesign — Change Log

**Branch:** `design/ios-native-redesign` (8 commits on top of `main` @ `f09ae8e87c`)
**Scope:** A visual/UX pass over onboarding, wallet-import, password-creation, and
several shared components, aimed at bringing the app closer to native iOS
conventions (pill buttons, circular icon buttons, keyboard accessory bars,
iOS-style text fields, larger sheet corner radii).

This document is a complete, file-level record of every change so a developer
picking this up cold has full context.

---

## How to build & run this branch locally

Environment notes specific to this machine/session (may not all apply to a
CI box, but useful if reproducing locally):

- **Node 24.16.0** required (`nvm use 24.16.0`).
- **Ruby**: system Ruby is too old for CocoaPods/bundler; used Homebrew
  `ruby@3.4` on `PATH` instead of rbenv.
- **Locale**: `pod install` needs `LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8` or it
  fails parsing podspecs (non-ASCII in a package description).
- Standard flow after that: `yarn setup` → `yarn watch:clean` → `yarn start:ios`.
- The `@metamask/design-system-react-native` patch (see below) is applied
  automatically by `yarn patch-package --error-on-fail`, which already runs as
  part of `yarn setup` — no manual step needed.

### Known local-only config (NOT in this branch)

- `SEEDLESS_ONBOARDING_ENABLED` was flipped to `'true'` locally (in the
  gitignored `.js.env`) to preview the social-login (`OnboardingSheet`) flow
  during development. **This flag is not part of any commit** — decide
  separately whether it should ship enabled.

---

## Commit 1 — `design-system: pill buttons, iOS text fields, larger sheet radius, circular header icons`

Foundational styling changes, mostly in shared/reusable components, so they
apply across the whole app (not just the redesigned screens).

**Buttons → full pill shape**

- `app/component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase.styles.ts`
  — `borderRadius` changed from a fixed `12` to `Number(size) / 2` (radius =
  half the height), so every button is a full pill regardless of size.
- `app/component-library/components/Buttons/ButtonIcon/ButtonIcon.styles.ts`
  — same change: `borderRadius: 8` → `Number(size) / 2`.
- Patched the equivalent logic inside the `@metamask/design-system-react-native`
  npm package (see patch file below), since most screens use the DS `Button`/
  `ButtonIcon`, not the local component-library ones:
  - `ButtonBase.constants.{mjs,cjs}`: `TWCLASSMAP_BUTTONBASE_BORDER_RADIUS` for
    Sm/Md/Lg all changed from `rounded-lg`/`rounded-xl` to `rounded-full`.
  - `ButtonIcon.{mjs,cjs}`: `borderRadiusClass` always resolves to
    `rounded-full` (was `rounded-lg` for the Default variant).

**Text fields → iOS style**

- `app/component-library/components/Form/TextField/TextField.styles.ts`
  — corner radius `12` → `10`; border/fill colors switched from design tokens
  to iOS system-palette equivalents (UIKit `systemGray4`/`systemGray6`/tint),
  wrapped in `eslint-disable @metamask/design-tokens/color-no-hex` since
  they're intentionally off-token (fixed Apple colors, not brand colors):
  - Light: outline `#C7C7CC`, fill `#F2F2F7`, focus tint `#007AFF`.
  - Dark: outline `#3A3A3C`, fill `#1C1C1E`, focus tint `#0A84FF`.
  - Height stayed at `48` (was briefly reduced to 44, then reverted per
    feedback — don't shrink this again).
  - Same radius/height change patched into the DS package's
    `TextField.{mjs,cjs}` (`rounded-lg`/`h-12` → `rounded-[10px]`/`h-12`,
    inner input height `h-[46px]` → unchanged after revert).

**Bottom sheets → larger corner radius**

- `app/component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog.styles.ts`
  — `borderTopLeftRadius`/`borderTopRightRadius` `24` → `36`. This affects
  every bottom sheet in the app (confirmed via the `OnboardingSheet` and
  `DeleteWalletModal` sheets both picking it up for free).

**Shared header → circular back/close buttons**

- `app/component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard.tsx`
  — the resolved back-button props (`onBack`/`backButtonProps` path) and
  close-button props (`onClose`/`closeButtonProps` path) now inject
  `size: ButtonIconSize.Sm` and `twClassName: 'bg-section rounded-full w-10 h-10'`
  (merged with any caller-supplied `twClassName`). Only applies to the
  resolved back/close buttons, not arbitrary custom start/end buttons.
- Same injection patched into the DS package's `HeaderStandard.{mjs,cjs}`
  (`resolvedStartButtonIconProps` / `resolvedEndButtonIconProps`), since ~182
  screens use the DS `HeaderStandard` directly rather than the in-repo
  wrapper. Covers back **and** close buttons.
- **Not covered** (by design, scoped decision): the ~9 screens using
  `HeaderBase` directly, ~8 native React-Navigation headers, and ~23 inline
  one-off `ArrowLeft`/`Close` buttons scattered across screens. Those still
  render plain (uncircled) icons.

**New file**

- `patches/@metamask+design-system-react-native+0.36.0.patch` — the
  `patch-package` patch covering all of the above DS-package changes
  (`ButtonBase.constants`, `ButtonIcon`, `TextField`, `HeaderStandard`, in
  both `.mjs` and `.cjs` builds). Applied automatically via `yarn setup`
  (`yarn patch-package --error-on-fail`).

---

## Commit 2 — `onboarding: static assets in place of Rive, smaller titles, tighter social sheet`

**Removed Rive animations, replaced with static images**

- `app/components/UI/OnboardingAnimation/OnboardingAnimation.tsx` — removed
  the Rive wordmark build-up animation (`metamask_wordmark_animation_build-up.riv`,
  `WordmarkBuildUp` state machine). Replaced with a static
  `<Image source={METAMASK_NAME}>` (same asset the Login screen uses),
  tinted `colors.icon.default`, testID `metamask-wordmark-logo`.
  - The logo and the CTA buttons keep the **exact same resting positions**
    the old build-up animation ended on: logo centered with
    `marginTop: -(LOGO_HEIGHT/2) - 180` (180px above screen center — where
    the animation used to land it), buttons at `marginTop: 0` (previously
    `180`, minus the 180px "move up" the animation applied).
  - Logo sized to the wordmark PNG's true ~2:1 aspect ratio (200×100, or
    160×80 on medium devices) — the first pass had it in an incorrect 240×240
    square, since fixed.
  - Still fires `setStartFoxAnimation(true)` via `useEffect` whenever
    `startOnboardingAnimation` is true, so the bottom fox animation is
    unaffected.
- `app/components/UI/FoxLoader/FoxLoader.tsx` — removed the Rive splash
  animation (`splash_screen.riv`, `Splash_animation` state machine, the
  static-fox-to-Rive crossfade). Now renders **only** the static fox image
  (`fox.png`) and reveals the app as soon as `appServicesReady` becomes true,
  with the existing 3-second timeout fallback preserved so the splash can
  never hang indefinitely. `onAnimationComplete` contract and the E2E
  (`hasTestOverrides`) path are unchanged.
  - Note: this does **not** meaningfully speed up app/bundle load — the
    native Rive runtime stays linked because ~10 other screens
    (Rewards, Carousel, FoxLoader's sibling `FoxAnimation`, etc.) still use
    Rive. It does make onboarding _feel_ faster to reach, since the old flow
    gated the CTA buttons' opacity behind the animation sequence
    (~1.2s delay) and the new one shows them immediately.
  - `app/components/UI/FoxAnimation/FoxAnimation.tsx` (the onboarding-flow
    fox, separate from FoxLoader) was **not** changed — still Rive-based, on
    purpose (a "remove this too" edit was reverted after clarifying which
    Rive animation was meant).

**Smaller titles (32px → 24px) across 9 onboarding-adjacent screens**
`TextVariant.DisplayMd` → `TextVariant.HeadingLg` in:

- `app/components/Views/ChoosePassword/index.tsx`
- `app/components/Views/SocialLoginIosUser/index.tsx`
- `app/components/Views/AccountBackupStep1/index.js`
- `app/components/Views/ManualBackupStep1/index.tsx`
- `app/components/Views/ManualBackupStep2/index.js`
- `app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.tsx`
- `app/components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.tsx`
- `app/components/Views/OnboardingSuccess/index.tsx`
- `app/components/Views/ImportFromSecretRecoveryPhrase/index.js` (step-1 title only)

  (Deliberately **not** changed: the 🔒 emoji in `AccountBackupStep1B/index.js`,
  which also used `DisplayMd` but is decorative, not a heading.)

**Getting-started screen (`Onboarding/index.tsx`)**

- CTA button container margins: `left`/`right` `36` (`26` on medium devices)
  → flat `16` (matches Apple's 16pt layout margin and the sheet below it).
- Dark-mode background changed from the purple `gettingStartedTextColor`
  (`#3D065F`) to the theme's default dark background
  (`themeContext.colors.background.default`) — applied to both the main
  `SafeAreaView` and the loading overlay. Light mode (`#FFF2EB`) unchanged.

**`OnboardingSheet` (Google/Apple/Telegram/SRP picker)**

- Social button icons (Google/Apple/Telegram): wrapped each `startAccessory`
  icon in `<Box twClassName="mr-2">` to widen the icon-to-label gap (DS
  `Button` defaults to a 4px gap; this brings it to ~12px, matching the same
  fix applied to the Add-Device screen's Scan-QR CTA).
- Legal text ("By continuing, you agree to...") restyled from
  `TextColor.TextDefault` / `FontWeight.Medium` to
  `TextColor.TextAlternative` / `FontWeight.Regular` (reads as a proper muted
  footnote instead of competing with the buttons), and now ends with a
  trailing period after the "Privacy notice" link.
- A centered sheet title/subtitle ("Create a new wallet" / "Sign in") was
  added and then **removed** per follow-up feedback — net change is none on
  this specific point, but worth knowing it was tried.

**Login (unlock) screen**

- `app/components/Views/Login/index.tsx` — background/logo color went
  through two states this session: first changed to match the onboarding
  "getting started" cream/purple treatment + tinted logo, then **reverted**
  to the original default theme colors (`colors.background.default` /
  `colors.icon.default`) per final direction ("white background, black
  logo"). Net diff vs. `main` is minimal/cosmetic — verify current state
  before assuming either treatment is intentional.

---

## Commit 3 — `forgot-password sheet: icon rows, top-aligned icons, darker divider`

`app/components/UI/DeleteWalletModal/index.tsx` and `styles.ts` (this modal
contains both the "Forgot your password?" options sheet and the "Are you
sure?" reset-wallet confirmation, toggled via `isResetWallet` state — **not**
an animated push/pop between them, just a conditional render swap).

- Header + subtitle grouped into their own `Box` with a tight 8px gap,
  centered.
- Each "point" row (FaceID / Secret Recovery Phrase) restructured: a 40×40
  circular icon badge (`background.alternative` → later corrected to
  `background.section` for dark-mode contrast, see below) is now
  **top-aligned** (`alignItems: flex-start`) to its (multi-line) text, not
  center-aligned.
- Divider between the two point rows changed from `border.muted` to
  `border.default` for more contrast, inset `marginLeft: 56` to align under
  the text column.
- Back button on the "Are you sure?" screen: wrapped in a 40×40
  `background.section` circle (was `background.alternative`, and was
  24×24 before that) — **note:** this circle is still built as a `ButtonIcon`
  nested inside a separate `View`, so its press-state highlight will be
  smaller than the 40px background circle (the same bug was found and fixed
  on the Import screen's back button, but **not yet fixed here** — see Known
  Follow-ups).
- Icon-circle background token: originally `background.alternative`, which
  in dark mode (`#0c0d0f`) is _darker_ than the page background
  (`#131416`), making the circles nearly invisible. Switched to
  `background.section` (`#1c1d1f` in dark mode — lighter than the page),
  which is identical to `background.alternative` in light mode (`#f3f3f4`)
  so light mode is unaffected.
- Copy for the "Are you sure?" step rewritten to match a supplied reference:
  muted body text (`text.alternative`) with "permanently erased" and
  "Secret Recovery Phrase" in bold `text.default`. New locale keys
  `reset_wallet_desc_srp_1`, `reset_wallet_desc_srp_bold`,
  `reset_wallet_desc_srp_2` (see Commit 8).

---

## Commit 4 — `import wallet: single SRP textarea, keyboard accessory bar, reset-password sheet`

`app/components/Views/ImportFromSecretRecoveryPhrase/index.js` — the largest
single rewrite this session. Two logical steps in one screen
(`currentStep === 0` = SRP entry, `currentStep === 1` = password creation).

**Step 0 — SRP entry**

- Replaced the per-word `SrpInputGrid` (and its companion
  `SrpWordSuggestions` keyboard bar) with a single DS `TextArea`
  (testID `SEED_PHRASE_INPUT_ID`, placeholder "Secret Recovery Phrase",
  10px radius, `min-h-[140px]`). The seed phrase is still stored as a word
  array internally (`seedPhrase.join(' ')` / `.split(' ')`) so downstream
  validation (`isValidMnemonic`, `SRP_LENGTHS`, etc.) is unchanged.
  - **Functional change:** dropping `SrpInputGrid` also drops its per-word
    autocomplete/suggestion strip. Users now type/paste a plain
    space-separated phrase.
- Header replaced: no more DS `HeaderStandard`; now a plain `ButtonIcon`
  (`ArrowLeft`, `ButtonIconSize.Sm`, `twClassName="bg-section rounded-full w-10 h-10"`),
  testID `BACK_BUTTON_ID` — styled as ONE element so the press-highlight
  correctly fills the whole 40px circle (unlike the DeleteWalletModal back
  button, which still has the nested-Box issue).
- Paste + Scan-QR moved out of the field corner into a **keyboard-attached
  accessory bar** (`KeyboardStickyView`, shown only when
  `isKeyboardVisible`), matching Apple's QuickType-bar / "Scan Credit Card"
  placement convention rather than in-field icons. Paste reads the
  clipboard (`@react-native-clipboard/clipboard`) and fills the phrase;
  Scan QR still opens the existing camera scanner
  (`Routes.QR_TAB_SWITCHER`), whose `onScanSuccess` now does
  `setSeedPhrase(seed.trim().split(/\s+/))` instead of pushing into a grid ref.
- Below the field: either a red error line (when `error` is set) or a
  muted footnote with an Info icon: "Separate each word with a space. Make
  sure no one is watching your screen." (new key `srp_footnote`).
- "Import from the MetaMask extension" (only shown when
  `isAddDeviceSyncEnabled`) changed from an inline text link to a tappable
  row: Monitor icon in a 40×40 circle + label + trailing chevron, navigating
  to `Routes.ONBOARDING.ADD_DEVICE_TO_WALLET`.
- Title changed from `TextVariant.DisplayMd` to `HeadingLg` (see Commit 2).

**Step 1 — password creation**

- Title string `import_from_seed.metamask_password` changed from
  "MetaMask password" to **"Create a password"**.
- Removed the `Label` components above each password field; added
  `placeholder` props instead: "New password" / "Re-enter new password"
  (new keys `new_password_placeholder`, `confirm_password_placeholder`).
- Removed the "If I lose this password, MetaMask can't reset it. Learn
  more" checkbox entirely (and its `learnMore`/`RESET_PASSWORD_GUIDE_URL`
  navigation, and the `Checkbox`/`OldButton`/`ButtonVariants` imports it
  needed). `isContinueButtonDisabled` no longer depends on it — now purely
  password validity (`password !== confirmPassword`, min length).
- The submit CTA (testID `SUBMIT_BUTTON_ID`) no longer calls `onPressImport`
  directly. It now:
  1. Calls `Keyboard.dismiss()`, then
  2. Sets `showPasswordWarning(true)`, which renders a `BottomSheet`
     (from `app/component-library/components/BottomSheets/BottomSheet`)
     containing: a red Danger icon, title "MetaMask can't reset your
     password" (`password_warning_title`), body text ("If you forget this
     password, the only way back in is with your **Secret Recovery
     Phrase** or a device with biometrics enabled." —
     `password_warning_desc_1`/`_bold`/`_2`), a primary **"I understand"**
     button (`i_understand`) that closes the sheet and _then_ calls
     `onPressImport`, and a secondary **"Cancel"** button (`login.cancel`)
     that just dismisses.
  - The `Keyboard.dismiss()` call was added after observing the sheet
    rendering _behind_ the still-open keyboard — dismissing first fixes
    the z-order.
- Password-mismatch error (`isError`) now requires
  `confirmPassword.length >= MIN_PASSWORD_LENGTH` in addition to the
  existing "both non-empty and different" check, so it doesn't fire on
  every keystroke before the user has typed enough to plausibly be done.
- Outer step-1 layout spacing (`gap-y-4` → `gap-y-6`, i.e. 16px → 24px
  between title/field/field groups) to match the Choose-Password screen's
  rhythm (see Commit 5).
- Removed now-dead imports/state: `Checkbox`, `OldButton`/`ButtonVariants`,
  `RESET_PASSWORD_GUIDE_URL`, `Label`, `SrpInputGrid`, `SrpWordSuggestions`,
  `learnMore`/`learnMoreLink`, `uniqueId`/`uuidv4`, `useKeyboardState`'s
  prior unused import path, `currentInputWord`/`setCurrentInputWord`,
  `srpInputGridRef`.

**Test file**: `index.test.tsx` rewritten from 67 tests (55 failing against
the new source) to 50 tests, all passing. Grid-interaction tests (per-word
input, backspace-between-fields, "Clear All", word-suggestions) were
removed since that UI no longer exists; a `confirmImportFromWarning` test
helper was added that taps the CTA then "I understand" in the new sheet,
used across all the import-success/failure/QR-sync test cases.

---

## Commit 5 — `choose password: placeholders, reset-password sheet, wider group spacing`

`app/components/Views/ChoosePassword/index.tsx` — the "Create a new wallet"
(non-import) password screen. Applies the **same** pattern as Commit 4, with
one important scoping difference: **this screen also serves social/OAuth
users**, whose flow must NOT be touched.

- Title: new key `choose_password.create_password_title` = "Create a
  password" (did **not** overwrite `choose_password.title`, since that key
  is also used for step-progress labels in `app/constants/onboarding.ts`).
- Both password fields: removed `Label`s, added placeholders
  (`new_password_placeholder`, `confirm_password_placeholder` — reused the
  same keys/strings as the Import screen).
- **Checkbox scoping:** the "If I lose this password, MetaMask can't reset
  it" checkbox now only renders when `getOauth2LoginSuccess()` is true
  (i.e., the social/marketing-opt-in case). For non-social users the
  checkbox, its `Learn more` link, and the `learnMore` callback are gone
  entirely (dead code removed, including the `RESET_PASSWORD_GUIDE_URL`
  import).
- **Submit gating:** `canSubmit`/`isContinueButtonDisabled` no longer
  requires the checkbox (`isSelected`) for non-social users — just password
  validity. The social/OAuth path (`isGeolocationResolved` etc.) is
  unchanged.
- **CTA behavior split:**
  `onPress={getOauth2LoginSuccess() ? onPressCreate : () => { Keyboard.dismiss(); setShowPasswordWarning(true); }}`
  — social users go straight to `onPressCreate` as before (no new sheet);
  non-social users get the identical reset-password confirmation
  `BottomSheet` as the Import screen (same copy, reusing the
  `import_from_seed.password_warning_*` / `i_understand` locale keys —
  intentionally shared rather than duplicated).
- Same password-mismatch-error delay fix as Commit 4
  (`checkError` now requires `confirmPassword.length >= MIN_PASSWORD_LENGTH`).
- Outer group spacing (title/field/field/CTA) widened from `gap={4}` (16px)
  to `gap={6}` (24px) for better visual rhythm — this was the change that
  prompted mirroring it onto the Import screen too (Commit 4).
- Removed the now-unnecessary `isSelected`/`getOauth2LoginSuccess` entries
  from `validatePasswordSubmission`'s `useCallback` dependency array
  (ESLint `exhaustive-deps` flagged it after the gating logic simplified).

**Test files**: `index.test.tsx` (48/48 passing) and
`ChoosePassword.view.test.tsx` (14/14 passing, unaffected — it only covers
the social/OAuth flow, whose behavior didn't change). The non-social
checkbox lookup switched from `getByTestId` to `queryByTestId` (now
legitimately absent); a `confirmPasswordWarningIfShown` test helper mirrors
the Import screen's pattern and is a no-op for the OAuth flow.

---

## Commit 6 — `add-device screen: remove illustration and dev QR debug box, icon+text steps`

`app/components/Views/AddDeviceToWallet/index.tsx` (the "Add this device to
wallet" / extension-pairing screen).

- Removed the top illustration (`add_wallet_to_device.png` + its import).
- Removed the entire `__DEV__`-only "Enter QR data manually / Paste QR
  payload / Submit QR data" debug block, along with its state
  (`manualQrPayload`), handlers (`handleManualQrSubmit`,
  `triggerManualQrSubmit`), and the `TextField`/`BoxBackgroundColor` imports
  it needed. The shared `submitQrPayload` (used by the real camera
  scanner's `onScanSuccess`) was **kept** — this is a debug-only removal,
  not a functional regression for the real scan flow.
- Replaced the numbered `Points` component (gray circle with "1"/"2"/etc.)
  with a new local `Step` component: an icon on the left
  (`IconColor.IconAlternative`, `IconSize.Lg`), a bold title, and a muted
  subtitle below it. Four steps, using icons `Monitor` (was briefly
  `Mobile`, corrected to `Monitor` since the icon represents the _other_
  desktop/extension device), `Setting`, `ScanBarcode`, `Key`.
- New locale keys (nested under `app_settings.add_device.points`):
  `one_title`/`one_desc`, `two_title` (subtitle still composes
  `two`/`two_bold_one`/`two_icon`/`two_bold_two`), `three_title`/`three_desc`,
  `four_title`/`four_desc`.
- "Scan QR code" button: added `startIconName={IconName.ScanBarcode}` and
  `startIconProps={{ twClassName: 'mr-1' }}` (icon-to-label gap fix, same
  reasoning as the `OnboardingSheet` social buttons).
- Removed now-unused imports: `Image` (react-native), the illustration
  asset, `TextField`, `BoxBackgroundColor`, and the `useState` import
  itself (no more local state needed after the debug block's removal).

**Test file**: 22/22 passing. Numbered-point assertions rewritten to check
the new title/subtitle strings; the removed debug-box tests replaced with
one exercising the retained `submitQrPayload` path via the scanner's
`onScanSuccess`.

_(Known pre-existing, unrelated issue surfaced by the test-fix pass: an
unused `mockCancelSession` variable in this test file — not introduced by
this session, left as-is.)_

---

## Commit 7 — `qr scanner: circular close button, drawn corner-bracket viewfinder`

- `app/components/Views/QRTabSwitcher/QRTabSwitcher.tsx` — the close (X)
  `ButtonIcon` in the scanner overlay now has
  `size={ButtonIconSize.Sm}` and `twClassName="bg-section rounded-full w-10 h-10"`,
  matching the app-wide circular treatment (previously a bare icon with no
  background).
- `app/components/Views/QRScanner/index.tsx` +
  `app/components/Views/QRScanner/styles.ts` — replaced the flat
  `frame.png` image overlay with a **drawn** corner-bracket viewfinder (four
  white L-shaped corners, 4px stroke, 18px corner radius, in a 250×250 box)
  via a new `renderScannerFrame()` helper and styles
  (`scannerFrame`, `frameCenter`, `frameCorner*`).
  - Critically, this is now rendered in **both** the camera-active branch
    _and_ the no-camera branch (`!cameraDevice`) — previously the frame only
    existed inside the camera branch, so on the iOS **simulator** (which has
    no camera device) the scanner appeared as pure black with no frame at
    all. It's now visible there too.
  - Removed the now-unused `frameImage` require and the `Image` import from
    `react-native` (nothing else in the file used `Image`).
  - The old `frame.png` asset itself is still in the repo
    (`app/images/frame.png`) but is now unreferenced — safe to delete
    separately if desired.

---

## Commit 8 — `locales: add copy for onboarding, import-wallet, and choose-password redesign`

All new/changed strings added to `locales/languages/en.json` (English only —
other locale files were **not** updated and will need translation):

```
reset_wallet_desc_srp_1        "To restore your wallet, make sure you have your"
reset_wallet_desc_srp_bold     "Secret Recovery Phrase"
reset_wallet_desc_srp_2        ". MetaMask doesn't have this information."
create_password_title          "Create a password"          (choose_password.*)
new_password_placeholder       "New password"                (both choose_password.* and import_from_seed.*)
confirm_password_placeholder   "Re-enter new password"       (both choose_password.* and import_from_seed.*)
metamask_password               "Create a password"           (import_from_seed.* — value changed, key kept)
password_warning_title          "MetaMask can't reset your password"
password_warning_desc_1         "If you forget this password, the only way back in is with your"
password_warning_desc_bold      "Secret Recovery Phrase"
password_warning_desc_2         "or a device with biometrics enabled."
i_understand                    "I understand"
srp_placeholder_short           "Secret Recovery Phrase"
scan_qr                         "Scan QR code"
srp_footnote                    "Separate each word with a space. Make sure no one is watching your screen."
import_from_extension_row       "Import from the MetaMask extension"
app_settings.add_device.points.one_title    "Open MetaMask"
app_settings.add_device.points.one_desc     "On your other device."
app_settings.add_device.points.two_title    "Add device"
app_settings.add_device.points.three_title  "Scan the QR code"
app_settings.add_device.points.three_desc   "Point this device's camera at the code."
app_settings.add_device.points.four_title   "Enter the security code"
app_settings.add_device.points.four_desc    "Type it on your other device to confirm."
```

Note: a couple of sheet-title strings (`sheet_create_title`,
`sheet_signin_title` on `OnboardingSheet`) were added and then removed again
within this session (title was tried, then reverted) — they are **not** in
the final `en.json`.

---

## Test suite summary

All suites touched by this branch were run and are green as of the last
commit:

| Suite                                                         | Result                            |
| ------------------------------------------------------------- | --------------------------------- |
| `FoxLoader.test.tsx`                                          | 11/11 passing (rewritten)         |
| `OnboardingAnimation.test.tsx`                                | 20/20 passing (rewritten)         |
| `AddDeviceToWallet/index.test.tsx`                            | 22/22 passing (rewritten)         |
| `ImportFromSecretRecoveryPhrase/index.test.tsx`               | 50/50 passing (rewritten from 67) |
| `ChoosePassword/index.test.tsx`                               | 48/48 passing (rewritten)         |
| `ChoosePassword/ChoosePassword.view.test.tsx`                 | 14/14 passing (unchanged)         |
| `OnboardingSheet/index.test.tsx` + `OnboardingSheet.test.tsx` | 14/14 passing (unchanged)         |
| `HeaderCompactStandard.test.tsx`                              | 29/29 passing (unchanged)         |
| `BottomSheetDialog.test.tsx`                                  | 9/9 passing (unchanged)           |

No `.snap` files anywhere in the affected screens/components reference the
changed elements (headers, radii, titles), so there is no snapshot churn to
regenerate.

---

## Known follow-ups / not done

1. **`DeleteWalletModal` back button press-state mismatch**: the "Are you
   sure?" back button circle is still a `ButtonIcon` nested inside a
   separate `View` (rather than styled directly on the `ButtonIcon` itself),
   so its press-highlight is smaller than its 40px background circle. The
   identical bug was found and fixed on the Import screen's back button —
   the same fix (move the `twClassName` circle styling onto the `ButtonIcon`
   directly, delete the wrapping `View`) should be applied here too.
2. **Push to `MetaMask/replit` (private repo) failed** — broken pipe on a
   ~600MB transfer, since that repo shares no git history with
   metamask-mobile. Proposed fix (not yet executed): create an orphan/
   squashed snapshot branch with no shared history so the push is just the
   actual diff size, not the full repo history.
3. **`RIVE_WRAPPER`** is now an unused entry in
   `app/components/UI/FoxLoader/FoxLoader.testIds.ts` (dead code from the
   Rive removal).
4. **`app/images/frame.png`** is now an unused asset (superseded by the
   drawn corner-bracket frame) — safe to delete.
5. **Non-English locale files** were not updated with the new strings —
   only `en.json` has them; other locales will show the raw key or English
   fallback until translated.
6. **`SEEDLESS_ONBOARDING_ENABLED`** flag state is local-only (gitignored
   `.js.env`) — decide and communicate its intended default separately.
7. Two scope decisions worth flagging explicitly for review:
   - The shared circular back/close button change covers `HeaderStandard`
     (DS package, ~182 screens) and `HeaderCompactStandard` (~19 screens)
     only — not `HeaderBase`-direct usages, native-nav headers, or inline
     one-offs (~40 screens combined). This was a deliberate scope choice
     ("shared components only"), not an oversight.
   - The password reset-confirmation sheet intentionally does **not**
     appear for OAuth/social users on Choose Password — only for the
     "Create a new wallet" (SRP) and "Import wallet" (SRP) flows, since
     social users have an account-based recovery path instead.
