# Page titles in MetaMask Mobile

Audit for Andrew Cohen. Written so it can go to Jason as-is.

Date: 3 November 2026. Source: the mobile repo at `main`, English copy in `locales/languages/en.json`. No app code was changed. This is a static read of the screens, not a device pass.

## For Jason

**Current state.** Of 514 resolved, product-facing titles (414 files), **87% are already sentence case or a single word**. The typical title is 2 words and 14 characters. Compact bars and sheets are centered. Large titles sit on the left. The design system already writes the casing rule down. The product mostly follows it, then breaks it in Perps, Card, Rewards, and a handful of confirmations.

**The rule to adopt.** Sentence case, no period. One to four words. A screen is named for the place ("Settings", "Security and privacy") or the task ("Send", "Create a password", "Add margin"), and a multi-step flow keeps that same name on every step. Questions are for confirm and destructive sheets only ("Hide token?"). The bar is centered and compact. A large left title is for a root tab or a form, and those words appear in the bar only after the large title scrolls away. A sheet uses the centered sheet header and a close button. Back and close together means "previous step" and "leave the flow".

**What is inconsistent, in order.**

1. About **20 screens** still use Title Case, and several of them contradict a sentence-case string in the same feature ("Reverse Position" next to "Reverse position", "Your Card PIN" next to "Set your card PIN", "Delete Ethereum Network" next to "Delete Ethereum network").
2. One screen shows the same words twice at once: Additional verification is in the bar and again as a large heading.
3. Two legitimate large-title patterns exist, and a third legacy header (`SheetHeader`, 20 files) is still in production. New work should stop using the legacy one.

Adopting the rule changes copy on about **20 screens**. Retiring `SheetHeader` is a separate cleanup of about **20 files**, and those titles are already sentence case.

## The rules that already exist

They live on the design-system components, not in this repo. There is no Mobile content-guidelines skill checked in. The component docs are the written standard:

| Component | What it is | Title styling | Written copy rule |
| --- | --- | --- | --- |
| `HeaderStandard` (and the glass and animated wrappers) | Full-screen bar | Centered, BodyMd, bold | Sentence case for every multi-word screen title. No period. |
| `HeaderStandardAnimated` | Same bar, title fades in after the large title scrolls off | Same | Same string as the large title |
| `BottomSheetHeader` | Sheet bar | Centered, HeadingSm | Sentence case, no period |
| `HeaderSubpage` | Entity row (token, market) | Left, BodyMd, medium | Sentence case. The doc says to use `HeaderStandard` when the title should be centered |
| `TitleSubpage` | Identity block under a subpage header | Left, HeadingSm, with an amount in DisplayLg | Sentence case, no period |
| Local `TitleStandard` | Large title in the body | Left, HeadingLg | Used by onboarding and recovery. Deprecated in favor of the design-system title block |
| Local `HeaderBase` | Older bar | Centered HeadingSm, or a left HeadingLg "Display" variant | The design-system version dropped Display. This audit found **zero** Display usages |
| `SheetHeader` | Older sheet bar | Centered, legacy HeadingMD, 32px tall | No copy rule. Still used |

`HeaderStandard` states it directly: sentence case on every multi-word screen title, and no period. The example in the doc is "Account settings", not "Account Settings". The same line is on `HeaderBase`, `BottomSheetHeader`, `HeaderSubpage`, `HeaderStandardAnimated`, and `TitleSubpage`.

The changelog shows the same rule being applied in patches for years (sentence-case passes over the locale file, receive QR titles, "Manage connections", remove-network confirmation, quotes, order type). The leftovers below are what those passes did not catch, because the strings are still Title Case in code.

React Navigation's own header is off. The root stack sets `headerShown: false`. A visible title is always one of the components above, rendered by the screen.

## What the product actually does

Resolved titles, debug and developer-options screens excluded:

| | Count |
| --- | --- |
| Resolved titles | 514 |
| Files | 414 |
| Sheet or modal | 222 |
| Navigation bar | 178 |
| Large title in the body | 114 |
| Sentence case or a single word | 446 (87%) |
| Title Case | 19 strings |
| Median length | 2 words, 14 characters |
| 90th percentile | 4 words, 24 characters |
| Centered | 396 |
| Left-aligned | 118 |

Voice is split on purpose, not by accident: 253 noun phrases, 216 imperatives, 13 questions. Nouns and verbs are almost even on bars and on sheets. Large titles lean noun ("Activity", "Create a password"). Questions are sheets ("Hide token?", "Unlink Money account?", "Are you sure?").

The components in use:

| Component | Titles | Role today |
| --- | --- | --- |
| `BottomSheetHeader` | 169 | Default sheet |
| `HeaderStandardGlass` | 100 | Settings, accounts, earn, recovery |
| `HeaderStandard` | 70 | Card, Perps, Ramp, a lot of newer screens |
| In-body `HeadingLg` | 72 | Large titles, including the scroll-linked ones |
| `TitleStandard` | 21 | Onboarding and recovery, left, under an empty bar |
| `SheetHeader` | 21 | Legacy sheets |
| Confirmation `useNavbar` | 13 | Full-screen confirms, centered BodyMd bold |
| `HeaderCompactStandard` | 8, plus the Send navbar helper | Deprecated twin of `HeaderStandard` |
| `HeaderStandardAnimated` | 6 | Activity, Rewards, Predict home, Top traders |
| `HeaderSubpage` | 4 | Entity headers (a market symbol, an order) |
| `HeaderBase` used directly | 3 | Cash ("Money"), reveal-SRP quiz, Pro hub |

## The patterns that hold

**Sentence case is the default.** Settings is the cleanest subtree: "Settings", "General", "Advanced", "Security and privacy", "Contacts", "Experimental". All of them are `HeaderStandardGlass`, centered, BodyMd bold, with a back button.

**A flow keeps one name.** Send uses "Send" on Amount, Asset, and Recipient. Swap and Bridge swap the single word "Swap" or "Bridge" with the mode. The step ("Amount", "To") is not the bar title.

**Root tabs do not say the tab name in a compact bar.** Wallet's bar is the account name, or search. Activity, Rewards, and Predict home put a large left `HeadingLg` in the scroll content and the same string in `HeaderStandardAnimated`, which stays hidden until that block scrolls away. That repetition is the correct pattern. Both are not on screen together.

**Onboarding and recovery use a large left title and an empty bar.** "Create a password", "Import a wallet", "Wallet not found" are `TitleStandard` (`HeadingLg`, left). The `HeaderStandardGlass` above them has no words, only back or close.

**Sheets are a short centered label plus close.** "Edit account name", "Remove account", "Network fee", "Leverage". A question is normal when the sheet asks for a decision.

**Back and close together is rare, and it means a flow.** Send has back (previous step) and close (cancel). Region selection has close, and back only after you drill into a state. A one-level explainer that was opened from another sheet (minimum received, network fee) uses back to return and close to dismiss. A settings screen does not get a close button.

## Where it breaks

### Title Case that contradicts a sibling string

These are the same features, already sentence case on one string and Title Case on the title.

| Screen | Title now | Already correct nearby | Proposed |
| --- | --- | --- | --- |
| Reverse a perp | Reverse Position | "Reverse position" on the positions row | Reverse position |
| Add or remove margin | Add Margin, Remove Margin | "Edit margin", "Add margin" | Add margin, Remove margin |
| View card PIN | Your Card PIN | "Set your card PIN", "Confirm your card PIN" | Your card PIN |
| Delete a network | Delete Ethereum Network | "Delete Ethereum network" on the other delete sheet | Delete {{name}} network |
| Speed up or cancel | Speed up Transaction, Cancel Transaction | The rest of confirmations ("Transaction request", "Transfer request") | Speed up transaction, Cancel transaction |

The full Title Case list:

| Title now | Proposed | File |
| --- | --- | --- |
| Select Quote | Select quote | `app/components/UI/Bridge/components/QuoteSelectorView/index.tsx` |
| Card Added Successfully | Card added | `app/components/UI/Card/Views/ApplePayConfirmation/ApplePayConfirmation.tsx` |
| Your Card PIN | Your card PIN | `app/components/UI/Card/components/ViewPinBottomSheet/ViewPinBottomSheet.tsx` |
| Select your Region | Select your region | `app/components/UI/Card/components/Onboarding/RegionSelectorModal.tsx` |
| Annual Percentage Yield (APY) | Annual percentage yield (APY) | `app/components/UI/Money/components/MoneyApyInfoSheet/MoneyApyInfoSheet.tsx` |
| Add Margin / Remove Margin | Add margin / Remove margin | `app/components/UI/Perps/Views/PerpsAdjustMarginView/PerpsAdjustMarginView.tsx` |
| Select Price Grouping | Select price grouping | `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx` |
| Reverse Position | Reverse position | `app/components/UI/Perps/components/PerpsFlipPositionConfirmSheet/PerpsFlipPositionConfirmSheet.tsx` |
| Select Provider | Select provider | `app/components/UI/Perps/components/PerpsProviderSelector/PerpsProviderSelectorSheet.tsx` |
| Claim Benefit | Claim benefit | `app/components/UI/Rewards/Views/BenefitFullView.tsx` |
| Perps Trading Competition | Perps trading competition | `app/components/UI/Rewards/Views/PerpsTradingCampaignDetailsView.tsx` |
| Predict The Pitch | Predict the pitch | `app/components/UI/Rewards/Views/PredictThePitchCampaignDetailsView.tsx` |
| VIP Pilot | VIP pilot | `app/components/UI/Rewards/Views/RewardsVipRefereeView.tsx` |
| Missing Enrolled Accounts | Missing enrolled accounts | `app/components/UI/Rewards/components/Settings/LinkedOffDeviceAccountsSheet.tsx` |
| Turn off Remember Me | Turn off remember me | `app/components/UI/TurnOffRememberMeModal/TurnOffRememberMeModal.tsx` |
| Network RPCs Updated | Network RPCs updated | `app/components/Views/MultiRpcModal/MultiRpcModal.tsx` |
| Account Group | Account group | Fallback string, not localized, in `EditMultichainAccountName.tsx` and `MultichainAccountActions.tsx` |
| Cancel Transaction / Speed up Transaction | Cancel transaction / Speed up transaction | `app/components/Views/confirmations/components/modals/cancel-speedup-modal/cancel-speedup-modal.tsx` |
| Delete {{name}} Network | Delete {{name}} network | `app/components/UI/NetworkManager/index.tsx` |

"Predict the pitch" and "VIP pilot" should stay Title Case only if marketing has locked those as brand names. Nothing else in this list is a brand. "MetaMask Orange" is a product name and should stay.

Proper nouns that are already fine inside sentence case: MetaMask, MetaMask Card, MetaMask Money, Perps, Predictions, Secret Recovery Phrase, Apple Pay, Face ID, network names, token symbols. "Add to MetaMask Money", "Send to Perps", and "Upgrade to Metal" are sentence case with a product name in them. Leave them.

One capitalization inconsistency that is a name, not a casing system: confirmations say "Add Prediction funds" and the deposit flow says "Send to Predictions". Pick one product name.

### One real duplicate

Additional verification (`app/components/UI/Ramp/Views/NativeFlow/AdditionalVerification.tsx`) puts "Additional verification" in `HeaderStandardGlass` and again in a `HeadingLg` under the illustration. Both are on screen together.

Activity ("Activity"), Rewards ("Rewards"), Predict home, and Top traders repeat the string too, inside `HeaderStandardAnimated`. The bar title is hidden until the large title scrolls away. That is the pattern to keep.

### Length

Almost every title already fits. The 90th percentile is 24 characters. A centered bar on a phone, with a back button and a close button, has room for about 28 characters before the words clip. These are the ones over that line:

| Title | Characters | Where it should go |
| --- | --- | --- |
| Why can't I withdraw my full balance? | 37 | Shorten the sheet title to "Full withdrawal" and keep the question as the first line of body |
| You've temporarily blocked this site | 36 | "Site blocked" |
| Transaction details are unavailable. | 36 | "Details unavailable". Also drop the period |
| Share your User ID with Support | 31 | "Share your user ID" |
| Select where to send your cash | 30 | "Send cash" |
| Withdrawals temporarily unavailable | 35 | "Withdrawals unavailable" |

Large in-body headlines can be one line longer than a bar. "You're not eligible for MetaMask Card right now" (47 characters, `HeadingLg` on the KYC-failed card step) is a status message. The bar on that screen should stay empty or say "Card", and the sentence can stay in the body.

### Legacy headers

`SheetHeader` is a 32px bar with the old `HeadingMD` token. It is still the title on about 20 sheets, including "Connect accounts", "Show private key", and "Network RPCs updated". New sheets should use `BottomSheetHeader`. The words on these sheets are already fine. Change the component when the screen is touched.

`HeaderCompactStandard` is the deprecated twin of `HeaderStandard` (same centered BodyMd bold). Send's navbar still builds it through `getHeaderCompactStandardNavbarOptions`. Same words, old component.

Three screens use `HeaderBase` directly. Cash renders "Money" as HeadingSm inside a bar with `h-auto`. Pro hub renders "MetaMask Orange" the same way. A screen title should go through `HeaderStandard` or a large `TitleStandard`, so the type size is a decision and not an accident of which wrapper you imported.

### Screens with no fixed title

These are intentional:

- Wallet home. The bar is the account, or search.
- Account hub. The large text is the account name.
- QR scanner, NFT full image, camera flows.
- Sheets whose header is only an icon (missing price, token warning). The words, if any, are in the body.

Onboarding's first screen is the fox and two buttons. It has no title. The next screens do ("Create a password", "Import a wallet").

About 24 screens pair an empty bar with a large title on purpose (Card onboarding, Notifications, Earn, KYC, choose-your-card). That is the form pattern. Keep it.

A long tail of titles are data, not copy: token symbols, account names, transaction titles, market names. They are resolved at runtime and are not in the 514. `HeaderSubpage` is the right bar when the title is an entity.

## Recommendation

### 1. Case

Sentence case. Capitalize the first word and proper nouns. No period. No exclamation. Campaign and product names stay capped only when they are real names (MetaMask, MetaMask Orange, Perps, Predictions, Secret Recovery Phrase). "Network", "Transaction", "Quote", "Margin", "Position", "Region", "Benefit", and "Account" are not names.

### 2. Voice and length

Name the place or the task.

- Place: a noun phrase. "Settings", "Security and privacy", "Activity", "Contacts".
- Task: an imperative, stable for the whole flow. "Send", "Swap", "Create a password", "Add margin". The step lives in the body.
- Decision: a question, and only on a sheet. "Hide token?", "Reset account?", "Disconnect X account?".
- Compact bar: 4 words and about 28 characters. If it does not fit, it is body copy.
- One line is enough for a large title too, unless it is a marketing or empty state.

### 3. Which header

| Situation | Component | Alignment | Type | Buttons |
| --- | --- | --- | --- | --- |
| Pushed screen | `HeaderStandard` or `HeaderStandardGlass` | Center | BodyMd bold | Back. Close only if the screen is a flow you can abandon |
| Root tab with a name | Large `HeadingLg` in the scroll content, same string in `HeaderStandardAnimated` | Left, then center after scroll | HeadingLg, then BodyMd bold | Whatever the tab needs. No back on a tab |
| Form or onboarding step | `TitleStandard` (HeadingLg) under a wordless bar | Left | HeadingLg | Back or close on the bar, no words |
| Token, market, account | `HeaderSubpage` | Left | BodyMd medium | Back, plus the avatar |
| Sheet | `BottomSheetHeader` | Center | HeadingSm | Close. Back only when it returns to a previous sheet |
| Confirm, full screen | The confirmation navbar (`HeaderCompactStandard` until it is migrated) | Center | BodyMd bold | Back |
| Confirm, sheet | In-body title, centered `HeadingMd` | Center | HeadingMd | The sheet's own close |

Do not import `HeaderBase` or `SheetHeader` for a new title.

### 4. One title on screen

If the bar shows the words, the body does not repeat them. Additional verification should drop the bar title and keep the large one, or the reverse. The scroll-linked tabs are the exception, and the two strings must match.

### 5. Sheets versus full screens

A sheet is a decision, an explanation, or a short pick (network, slippage, PIN, "Are you sure?"). A full screen is a form or a multi-step task (Send, create a password, KYC). Do not invent a third shape with a left-aligned Display header. That variant is already unused.

### Before and after

| Now | Proposed | Screen |
| --- | --- | --- |
| Select Quote | Select quote | Quote selector |
| Reverse Position | Reverse position | Perps flip confirm |
| Add Margin | Add margin | Adjust margin |
| Your Card PIN | Your card PIN | View PIN sheet |
| Card Added Successfully | Card added | Apple Pay confirmation |
| Cancel Transaction | Cancel transaction | Speed up / cancel |
| Speed up Transaction | Speed up transaction | Speed up / cancel |
| Delete {{name}} Network | Delete {{name}} network | Network manager |
| Account Group | Account group | Edit account name, when the group has no name |
| Additional verification, twice | Additional verification, once, as the large title | Deposit verification |
| Why can't I withdraw my full balance? | Full withdrawal | Lending max withdrawal |
| Transaction details are unavailable. | Details unavailable | Activity details |

Settings, Send, Swap, Bridge, and the Activity / Rewards large titles stay as they are.

### How many screens change

| Change | Screens | Notes |
| --- | --- | --- |
| Copy: sentence case, one period, the shortened titles above | **about 22** | The table in "Where it breaks", plus the six long titles if we shorten them. Perps, Card, and Rewards are most of it |
| Stop showing the title twice | **1** | Additional verification |
| Swap `SheetHeader` for `BottomSheetHeader` | **about 20** | Words stay. Do it when the screen is touched |
| Move Send's navbar off `HeaderCompactStandard` | **1 flow, 3 steps** | The title "Send" stays |

Everything else in the inventory already matches the rule, or is an entity name that should not be rewritten.

If Predict the Pitch and VIP Pilot are locked brand names, subtract those two and the copy count is about 20.

## Inventory

Grouped by code area. "Case" is sentence, title, mixed (a product name inside an otherwise sentence-case title), question, or single (one word, or a product phrase such as "Smart account"). `{…}` is a value filled in at runtime. Back and close are Yes when the screen passes `onBack` or `onClose`. "custom-start" and "custom-end" mean the screen draws its own accessory, usually the account avatar or a settings icon.

A few `HeadingLg` rows are section headings inside a titled screen ("More ways to earn") rather than the screen's name. They are listed because they use the large-title style. Debug screens (HIP-3, feature-flag override, developer options) are in the table and were left out of the counts above.

The scan resolved string literals and `strings('key')` calls, including keys chosen with a ternary and titles built inside `useMemo`. About 100 further headers take a runtime value (account name, market title, `transaction.title`) and are not English copy.

### Accounts

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Secure your wallet (`account_backup_step_1.title`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | sentence | 3 | `app/components/Views/AccountBackupStep1/index.js:158` |
| 🔒 | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/Views/AccountBackupStep1B/index.js:175` |
| Secure your wallet (`account_backup_step_1B.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/AccountBackupStep1B/index.js:176` |
| Disconnect all (`accounts.disconnect_all`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll/AccountPermissionsConfirmRevokeAll.tsx:81` |
| Connection details (`permissions.connection_details_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/Views/AccountPermissions/ConnectionDetails/ConnectionDetails.tsx:56` |
| Permitted networks (`permissions.permitted_networks`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/Views/AccountPermissions/PermittedNetworksInfoSheet/PermittedNetworksInfoSheet.tsx:43` |
| Accounts (`accounts.accounts_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/Views/AccountSelector/AccountSelector.tsx:327` |
| Add wallet (`multichain_accounts.add_wallet`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/AccountSelector/AccountSelector.tsx:368` |
| Wallet not found (`account_status.account_not_found`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/AccountStatus/index.tsx:381` |
| You already have a wallet (`account_status.account_already_exists`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/Views/AccountStatus/index.tsx:381` |
| Smart account (`multichain_accounts.account_details.smart_account`) | Sheet / modal | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 2 | `app/components/Views/MultichainAccounts/AccountDetails/components/SmartAccountModal/SmartAccountModal.tsx:78` |
| Connect accounts (`accounts.connect_accounts_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | Yes | No | sentence | 2 | `app/components/Views/MultichainAccounts/MultichainAccountConnect/MultichainAccountConnectMultiSelector/MultichainAccountConnectMultiSelector.tsx:199` |
| Remove account (`multichain_accounts.delete_account.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 2 | `app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount.tsx:98` |
| Edit account name (`multichain_accounts.edit_account_name.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 3 | `app/components/Views/MultichainAccounts/sheets/EditAccountName/EditAccountName.tsx:84` |
| Account Group | Sheet / modal | HeaderStandardGlass | center | BodyMd Bold | Yes | No | title | 2 | `app/components/Views/MultichainAccounts/sheets/EditMultichainAccountName/EditMultichainAccountName.tsx:117` |
| Account Group | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 2 | `app/components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions.tsx:143` |
| Show private key (`multichain_accounts.reveal_private_key.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | Yes | No | sentence | 3 | `app/components/Views/MultichainAccounts/sheets/RevealPrivateKey/RevealPrivateKey.tsx:19` |
| Security quiz (`multichain_accounts.reveal_srp.header`) | Sheet / modal | HeaderBase | center | HeadingSm | custom-start | No | sentence | 2 | `app/components/Views/MultichainAccounts/sheets/RevealSRP/RevealSRP.tsx:92` |
| Share address (`multichain_accounts.share_address.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 2 | `app/components/Views/MultichainAccounts/sheets/ShareAddress/ShareAddress.tsx:110` |
| {…} / {…} | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/MultichainAccounts/sheets/ShareAddressQR/ShareAddressQR.tsx:128` |

### Activity

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Transaction details are unavailable. (`activity_details.not_found`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence-period | 4 | `app/components/Views/ActivityDetails/ActivityDetails.tsx:147` |
| Unknown (`activity_details.unknown_token`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/ActivityDetails/components/ActivityDetailsApprovalTokenSection.tsx:36` |
| Activity (`activity_view.title`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/ActivityScreen/ActivityScreen.tsx:338` |
| Activity (`activity_view.title`) _duplicate_ | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/ActivityScreen/ActivityScreen.tsx:374` |
| Networks (`trending.networks`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/Views/ActivityScreen/components/ActivityNetworkFilterSheet/ActivityNetworkFilterSheet.tsx:112` |

### AddAsset

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Import tokens (`add_asset.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/AddAsset/Views/ConfirmAddTokenView/ConfirmAddAsset.tsx:118` |

### AddBookmark

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Add favorite (`add_favorite.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/AddBookmark/index.js:113` |

### AddDeviceToWallet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Waiting for extension... (`app_settings.add_device.waiting_for_extension`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/AddDeviceToWallet/DeviceAdded.tsx:72` |
| Add this device to wallet (`app_settings.add_device.add_device_to_wallet`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/Views/AddDeviceToWallet/index.tsx:223` |
| Enter code on extension (`app_settings.add_device.enter_code_on_extension`) | Sheet / modal | HeaderStandardGlass | center | BodyMd Bold | No | No | sentence | 4 | `app/components/Views/AddDeviceToWallet/VerificationCodeBottomSheet.tsx:43` |

### AddressSelector

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select an address (`address_selector.select_an_address`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/AddressSelector/AddressSelector.tsx:158` |

### AddWallet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Add wallet (`multichain_accounts.add_wallet`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/AddWallet/AddWallet.tsx:139` |

### AesCryptoTestForm

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AES crypto - test form (`app_settings.aes_crypto_test_form_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 5 | `app/components/Views/AesCryptoTestForm/AesCryptoTestForm.tsx:146` |

### AgenticCliApproval

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review request (`agentic_cli_approval.title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/Views/AgenticCliApproval/index.tsx:112` |

### AgenticCliDashboardWebview

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select project (`sdk_connect_v2.agentic_cli_dashboard_webview.title`) | Navigation header | getHeaderCompactStandardNavbarOptions | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/AgenticCliDashboardWebview/index.tsx:105` |

### Assets

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create {{ticker}} price alert (`price_alerts.create_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView.tsx:188` |
| Edit {{ticker}} price alert (`price_alerts.edit_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView.tsx:188` |
| % | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/PercentChangeAlertForm.tsx:204` |
| Price alerts (`price_alerts.manage_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.tsx:499` |
| Watchlist (`token_watchlist.fullscreen_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Assets/watchlist/Views/WatchlistFullScreenView/WatchlistFullScreenView.tsx:254` |

### BalanceEmptyState

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fund your wallet (`wallet.fund_your_wallet`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | sentence | 3 | `app/components/UI/BalanceEmptyState/BalanceEmptyState.tsx:94` |

### Browser

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Maximum tabs reached (`browser.max_tabs_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 3 | `app/components/Views/Browser/MaxBrowserTabsModal.tsx:41` |

### Buy, sell & ramp

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select region currency (`fiat_on_ramp_aggregator.select_region_currency`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Ramp/Aggregator/components/FiatSelectorModal/FiatSelectorModal.tsx:138` |
| Incompatible account (`fiat_on_ramp_aggregator.incompatible_token_account_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Ramp/Aggregator/components/IncompatibleAccountTokenModal/IncompatibleAccountTokenModal.tsx:37` |
| Select payment method (`fiat_on_ramp_aggregator.select_payment_method`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Ramp/Aggregator/components/PaymentMethodSelectorModal/PaymentMethodSelectorModal.tsx:103` |
| Select where to send your cash (`fiat_on_ramp_aggregator.select_cash_destination`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 6 | `app/components/UI/Ramp/Aggregator/components/PaymentMethodSelectorModal/PaymentMethodSelectorModal.tsx:103` |
| Select your region (`fiat_on_ramp_aggregator.region.title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | Yes | Yes | sentence | 3 | `app/components/UI/Ramp/Aggregator/components/RegionSelectorModal/RegionSelectorModal.tsx:336` |
| Select a cryptocurrency (`fiat_on_ramp_aggregator.select_a_cryptocurrency`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Ramp/Aggregator/components/TokenSelectModal/TokenSelectModal.tsx:247` |
| Region not supported (`fiat_on_ramp_aggregator.region.unsupported`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 3 | `app/components/UI/Ramp/Aggregator/components/UnsupportedRegionModal/UnsupportedRegionModal.tsx:68` |
| Buy (`fiat_on_ramp_aggregator.amount_to_buy`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx:920` |
| Sell (`fiat_on_ramp_aggregator.amount_to_sell`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx:920` |
| Settings (`fiat_on_ramp_aggregator.settings_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/Ramp/Aggregator/Views/Modals/Settings/SettingsModal.tsx:39` |
| Order details (`fiat_on_ramp_aggregator.order_details.details_main`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails.tsx:225` |
| Order details (`fiat_on_ramp_aggregator.order_details.details_main`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails.tsx:239` |
| Order details (`fiat_on_ramp_aggregator.order_details.details_main`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails.tsx:258` |
| Order details (`fiat_on_ramp_aggregator.order_details.details_main`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails.tsx:278` |
| Recommended quote (`fiat_on_ramp_aggregator.recommended_quote`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.tsx:959` |
| Select a quote (`fiat_on_ramp_aggregator.select_a_quote`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes.tsx:1070` |
| Sell crypto (`fiat_on_ramp_aggregator.send_transaction.sell_crypto`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/SendTransaction/SendTransaction.tsx:429` |
| Sell crypto (`fiat_on_ramp_aggregator.send_transaction.sell_crypto`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Aggregator/Views/SendTransaction/SendTransaction.tsx:455` |
| Add activation key (`app_settings.fiat_on_ramp.add_activation_key`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm.tsx:81` |
| Edit activation key (`app_settings.fiat_on_ramp.edit_activation_key`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm.tsx:81` |
| Buy and sell crypto (`app_settings.fiat_on_ramp.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/UI/Ramp/Aggregator/Views/Settings/Settings.tsx:61` |
| Eligibility check failed (`fiat_on_ramp_aggregator.eligibility_failed_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Ramp/components/EligibilityFailedModal/EligibilityFailedModal.tsx:60` |
| Buy {{ticker}} (`fiat_on_ramp.buy`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Ramp/Views/BuildQuote/BuildQuote.tsx:805` |
| Headless Buy playground (`app_settings.fiat_on_ramp.headless_playground.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | mixed | 3 | `app/components/UI/Ramp/Views/HeadlessPlayground/HeadlessPlayground.tsx:663` |
| Error details (`deposit.errors.error_details_title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Ramp/Views/Modals/ErrorDetailsModal/ErrorDetailsModal.tsx:95` |
| Pay with (`fiat_on_ramp.pay_with`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Ramp/Views/Modals/PaymentSelectionModal/PaymentSelectionModal.tsx:298` |
| Providers (`fiat_on_ramp.providers`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Ramp/Views/Modals/ProviderSelectionModal/ProviderSelection.tsx:370` |
| Providers (`fiat_on_ramp.providers`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Ramp/Views/Modals/ProviderSelectionModal/ProviderSelection.tsx:390` |
| Settings (`fiat_on_ramp.build_quote_settings_modal.title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/Ramp/Views/Modals/SettingsModal/SettingsModal.tsx:202` |
| Why we ask (`deposit.ssn_info_modal.title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Ramp/Views/Modals/SsnInfoModal/SsnInfoModal.tsx:31` |
| Not available (`fiat_on_ramp.token_unavailable_modal.title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Ramp/Views/Modals/TokenNotAvailableModal/TokenNotAvailableModal.tsx:182` |
| Region not supported (`deposit.unsupported_state_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Ramp/Views/Modals/UnsupportedStateModal/UnsupportedStateModal.tsx:86` |
| Not available (`deposit.token_modal.unsupported_token_title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Ramp/Views/Modals/UnsupportedTokenModal/UnsupportedTokenModal.tsx:32` |
| Additional verification (`deposit.additional_verification.title`) _duplicate_ | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/AdditionalVerification.tsx:64` |
| Additional verification (`deposit.additional_verification.title`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/AdditionalVerification.tsx:78` |
| {{paymentMethod}} bank transfer (`deposit.bank_details.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/BankDetails.tsx:356` |
| Verify your identity (`deposit.basic_info.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/BasicInfo.tsx:344` |
| Verify your identity (`deposit.enter_address.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/EnterAddress.tsx:257` |
| Enter your address (`deposit.enter_address.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/EnterAddress.tsx:272` |
| Verify your identity (`deposit.enter_email.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/EnterEmail.tsx:163` |
| Enter your email (`deposit.enter_email.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/EnterEmail.tsx:174` |
| Verify your identity (`deposit.kyc_processing.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/KycProcessing.tsx:222` |
| Verify your identity (`deposit.kyc_processing.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/KycProcessing.tsx:269` |
| Verify your identity (`deposit.kyc_processing.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/KycProcessing.tsx:321` |
| Deposit complete (`deposit.order_processing.success_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:98` |
| Deposit failed (`deposit.order_processing.error_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:98` |
| Processing deposit (`deposit.order_processing.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:98` |
| Processing deposit (`deposit.order_processing.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:98` |
| Deposit complete (`deposit.order_processing.success_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:115` |
| Deposit failed (`deposit.order_processing.error_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:115` |
| Processing deposit (`deposit.order_processing.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:115` |
| Processing deposit (`deposit.order_processing.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/NativeFlow/OrderProcessing.tsx:115` |
| Verify your identity (`deposit.otp_code.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/OtpCode.tsx:421` |
| Enter six-digit code (`deposit.otp_code.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/OtpCode.tsx:431` |
| Deposit (`deposit.verify_identity.navbar_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.tsx:196` |
| Verify your identity (`deposit.verify_identity.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.tsx:211` |
| Deposit order (`deposit.order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails.tsx:46` |
| Deposit order (`deposit.order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails.tsx:60` |
| Order details (`ramps_order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/OrderDetails.tsx:329` |
| Order details (`ramps_order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/OrderDetails.tsx:354` |
| Order details (`ramps_order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/OrderDetails.tsx:401` |
| Order details (`ramps_order_details.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/OrderDetails/OrderDetails.tsx:419` |
| Select your region (`fiat_on_ramp_aggregator.region.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/Settings/RegionSelector/RegionSelector.tsx:637` |
| Select your region (`fiat_on_ramp_aggregator.region.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Ramp/Views/Settings/RegionSelector/RegionSelector.tsx:637` |
| Select token (`deposit.token_modal.select_token`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/TokenSelection/TokenSelection.tsx:359` |
| Select token (`deposit.token_modal.select_token`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/TokenSelection/TokenSelection.tsx:383` |
| Select token (`deposit.token_modal.select_token`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Ramp/Views/TokenSelection/TokenSelection.tsx:412` |
| Add funds right from your bank (`virtual_bank_account.create_virtual_bank_account.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 6 | `app/components/UI/Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount.tsx:193` |
| Something went wrong (`virtual_bank_account.account_create_error.generic.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaAccountCreateError.tsx:117` |
| We couldn't verify your details (`virtual_bank_account.account_create_error.details.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaAccountCreateError.tsx:117` |
| Choose your currency (`virtual_bank_account.choose_currency.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaChooseCurrency.tsx:92` |
| Deposit debug | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaDepositDebugSheet.tsx:59` |
| Add money by bank transfer (`virtual_bank_account.vba_details.bank_transfer_title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails.tsx:819` |
| Add money with Pix (`virtual_bank_account.vba_details.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | mixed | 4 | `app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails.tsx:819` |

### Card

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select method (`card.add_funds_bottomsheet.select_method`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/AddFundsBottomSheet/AddFundsBottomSheet.tsx:169` |
| Using Apple Pay (`card.apple_pay_usage.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Card/components/ApplePayUsageSheet/ApplePayUsageSheet.tsx:56` |
| Select token and network (`card.select_asset`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Card/components/AssetSelectionBottomSheet/AssetSelectionBottomSheet.tsx:374` |
| Card (`app_settings.developer_options.card.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Card/components/CardDeveloperOptionsSection/CardDeveloperOptionsSection.tsx:65` |
| Transaction (`card.transactions.details_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Card/components/CardTransactionDetailsContent/CardTransactionDetailsContent.tsx:76` |
| Available balance (`card.credit_balance_tooltip.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/CreditBalanceTooltipSheet/CreditBalanceTooltipSheet.tsx:40` |
| Refund balance (`card.credit_screen.refund_info.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/CreditRefundTooltipSheet/CreditRefundTooltipSheet.tsx:31` |
| Add card to digital wallet (`card.digital_wallet_instructions.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 5 | `app/components/UI/Card/components/DigitalWalletInstructionsSheet/DigitalWalletInstructionsSheet.tsx:152` |
| Unlink card (`card.revoke_allowance_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/ImmersveRevokeAllowanceSheet/ImmersveRevokeAllowanceSheet.tsx:183` |
| Are you sure? (`money.metamask_card.unlink_card_sheet_title_with_funding_source`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 3 | `app/components/UI/Card/components/MoneyUnlinkCardSheet/MoneyUnlinkCardSheet.tsx:62` |
| Unlink Money account? (`money.metamask_card.unlink_card_sheet_title_no_funding_source`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question-mixed | 3 | `app/components/UI/Card/components/MoneyUnlinkCardSheet/MoneyUnlinkCardSheet.tsx:62` |
| You're not eligible for MetaMask Card right now (`card.card_onboarding.kyc_failed.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | mixed | 8 | `app/components/UI/Card/components/Onboarding/KYCFailed.tsx:107` |
| Awaiting approval (`card.card_onboarding.kyc_pending.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Card/components/Onboarding/KYCPending.tsx:92` |
| Select your Region (`card.card_onboarding.region_selector.title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | mixed | 3 | `app/components/UI/Card/components/Onboarding/RegionSelectorModal.tsx:220` |
| Enter password (`card.password_bottomsheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/PasswordBottomSheet/PasswordBottomSheet.tsx:80` |
| Recurring fee (`card.recurring_fee_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/components/RecurringFeeModal/RecurringFeeModal.tsx:46` |
| Which one is mine? (`card.card_authentication.sign_in_help_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 4 | `app/components/UI/Card/components/SignInHelpBottomSheet/SignInHelpBottomSheet.tsx:46` |
| Update your MetaMask Card (`card.uk_migration_bottom_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | mixed | 4 | `app/components/UI/Card/components/UkMigrationBottomSheet/UkMigrationBottomSheet.tsx:156` |
| Your Card PIN (`card.view_pin_bottomsheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 3 | `app/components/UI/Card/components/ViewPinBottomSheet/ViewPinBottomSheet.tsx:45` |
| Card Added Successfully (`card.apple_pay_confirmation.title`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | title | 3 | `app/components/UI/Card/Views/ApplePayConfirmation/ApplePayConfirmation.tsx:61` |
| MetaMask with Apple Pay (`card.apple_pay_splash.title`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | sentence | 4 | `app/components/UI/Card/Views/ApplePaySplash/ApplePaySplash.tsx:71` |
| Card (`card.card_home.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Card/Views/CardHome/CardHome.tsx:704` |
| Have you contacted the merchant? (`card.transactions.report_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | question | 5 | `app/components/UI/Card/Views/CardReportTransaction/CardReportTransaction.tsx:186` |
| Transaction (`card.transactions.details_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | No | single | 1 | `app/components/UI/Card/Views/CardTransactionDetails/CardTransactionDetails.tsx:257` |
| Transactions (`card.transactions.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Card/Views/CardTransactionHistory/CardTransactionHistory.tsx:239` |
| Choose your card (`card.choose_your_card.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Card/Views/ChooseYourCard/ChooseYourCard.tsx:396` |
| Upgrade to Metal (`card.choose_your_card.upgrade_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | mixed | 3 | `app/components/UI/Card/Views/ChooseYourCard/ChooseYourCard.tsx:396` |
| Contact details (`card.contact_details.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Card/Views/ContactDetails/ContactDetails.tsx:380` |
| {…} {…} | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Card/Views/RedeemWallet/RedeemWallet.tsx:424` |
| Review your order (`card.review_order.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Card/Views/ReviewOrder/ReviewOrder.tsx:239` |
| Spending limit (`card.card_spending_limit.restricted_limit_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Card/Views/SpendingLimit/components/SpendingLimitOptionsSheet.tsx:72` |
| Set up your card (`card.card_spending_limit.setup_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Card/Views/SpendingLimit/SpendingLimit.tsx:354` |

### CashTokensFullView

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Your balance (`money.your_balance`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/CashTokensFullView/CashTokensFullView.tsx:134` |
| Money (`money.title`) | Navigation header | HeaderBase | center | HeadingSm | custom-start | No | single | 1 | `app/components/Views/CashTokensFullView/CashTokensFullView.tsx:148` |

### ChangeInSimulationModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Results have changed (`change_in_simulation_modal.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 3 | `app/components/Views/ChangeInSimulationModal/ChangeInSimulationModal.tsx:73` |

### Charts

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Moving average (`asset_overview.ma_picker_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Charts/AdvancedChart/MAPickerSheet.tsx:82` |
| Candle intervals (`perps.chart.candle_intervals`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Charts/CandlePeriodSelector/CandlePeriodBottomSheet.tsx:173` |

### Compliance

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Access restricted (`access_restricted.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Compliance/AccessRestrictedModal/AccessRestrictedModal.tsx:29` |

### Confirmations

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| - | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/Views/confirmations/components/activity/transaction-details-hero/transaction-details-hero.tsx:274` |
| + | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/Views/confirmations/components/activity/transaction-details-hero/transaction-details-hero.tsx:274` |
| Select a token (`gas_fee_token_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/gas/gas-fee-token-modal/gas-fee-token-modal.tsx:72` |
|   | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | empty | 0 | `app/components/Views/confirmations/components/hero-token/hero-token.tsx:29` |
| Add to MetaMask Money (`confirm.title.money_account_deposit_header`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | mixed | 4 | `app/components/Views/confirmations/components/info/money-account-deposit-info/money-account-deposit-info.tsx:23` |
| Send (`confirm.title.money_account_send`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/components/info/money-account-withdraw-info/money-account-withdraw-info.tsx:21` |
| Add funds (`confirm.title.perps_deposit`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/confirmations/components/info/perps-deposit-info/perps-deposit-info.tsx:22` |
| Send to Perps (`perps.send_to_perps`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | mixed | 3 | `app/components/Views/confirmations/components/info/perps-deposit-info/perps-deposit-info.tsx:22` |
| Withdraw (`confirm.title.perps_withdraw`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/components/info/perps-withdraw-info/perps-withdraw-info.tsx:13` |
| Add Prediction funds (`confirm.title.predict_deposit`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | mixed | 3 | `app/components/Views/confirmations/components/info/predict-deposit-info/predict-deposit-info.tsx:22` |
| Send to Predictions (`predict.send_to_predictions`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | mixed | 3 | `app/components/Views/confirmations/components/info/predict-deposit-info/predict-deposit-info.tsx:22` |
| Withdraw (`confirm.title.predict_withdraw`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/components/info/predict-withdraw-info/predict-withdraw-info.tsx:13` |
| Transaction (`confirm.transaction`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/components/info/transaction-batch/transaction-batch.tsx:14` |
| Advanced network fee (`transactions.gas_modal.advanced_gas_fee`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/modals/advanced-eip1559-modal/advanced-eip1559-modal.tsx:141` |
| Advanced network fee (`transactions.gas_modal.advanced_gas_fee`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/modals/advanced-gas-price-modal/advanced-gas-price-modal.tsx:121` |
| Cancel Transaction (`transaction.cancel_speedup_cancel_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 2 | `app/components/Views/confirmations/components/modals/cancel-speedup-modal/cancel-speedup-modal.tsx:271` |
| Speed up Transaction (`transaction.cancel_speedup_speedup_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | mixed | 3 | `app/components/Views/confirmations/components/modals/cancel-speedup-modal/cancel-speedup-modal.tsx:271` |
| Edit approval limit (`confirm.edit_spending_cap_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/modals/edit-spending-cap-modal/edit-spending-cap-modal.tsx:74` |
| Edit network fee (`transactions.gas_modal.edit_network_fee`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/modals/estimates-modal/estimates-modal.tsx:46` |
| MMPay Debug | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 2 | `app/components/Views/confirmations/components/modals/mm-pay-debug-modal/mm-pay-debug-modal.tsx:101` |
| Pay with (`confirm.pay_with_bottom_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.tsx:48` |
| Receive (`confirm.pay_with_bottom_sheet.receive_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.tsx:48` |
| Select a token (`pay_with_modal.modal_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.tsx:277` |
| You won (`confirm.predict_claim.summary`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/confirmations/components/predict-confirmations/predict-claim-amount/predict-claim-amount.tsx:60` |
| You won (`confirm.predict_claim.summary`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/confirmations/components/predict-confirmations/predict-claim-amount/predict-claim-amount.tsx:89` |
| Claim (`stake.claim`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | No | No | single | 1 | `app/components/Views/confirmations/external/staking/info/staking-claim/staking-claim.tsx:28` |
| Stake (`stake.stake`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/external/staking/info/staking-deposit/staking-deposit.tsx:20` |
| Unstake (`stake.unstake`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/external/staking/info/staking-withdrawal/staking-withdrawal.tsx:24` |
| Edit transaction nonce (`transaction.edit_transaction_nonce`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/confirmations/legacy/components/CustomNonceModal/index.js:150` |

### ConnectHardware

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bluetooth is off (`ledger.bluetooth_off`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/ConnectHardware/SearchingForDevice/index.tsx:96` |
| Looking for your device (`ledger.looking_for_device`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/Views/ConnectHardware/SearchingForDevice/index.tsx:96` |
| Connect a hardware wallet (`connect_hardware.title_select_hardware`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 4 | `app/components/Views/ConnectHardware/SelectHardware/index.tsx:218` |

### DeleteWalletModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Forgot your password? (`login.forgot_password_desc`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 3 | `app/components/UI/DeleteWalletModal/index.tsx:131` |

### Earn

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select a token to deposit (`stake.select_a_token_to_deposit`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 5 | `app/components/UI/Earn/components/EarnTokenList/index.tsx:387` |
| Select a token to withdraw (`stake.select_a_token_to_withdraw`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 5 | `app/components/UI/Earn/components/EarnTokenList/index.tsx:387` |
| Max (`stake.max_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/Earn/components/MaxInputModal/index.tsx:44` |
| mUSD | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | lowercase | 1 | `app/components/UI/Earn/components/MusdDeveloperOptionsSection.tsx:51` |
| Stake TRX and earn (`stake.trx_learn_more.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Earn/components/Tron/TronStakingLearnMoreModal/index.tsx:101` |
| Convert and get {{percentage}}% (`earn.musd_conversion.convert_and_get_percentage_bonus`) | Navigation header | useNavbar → HeaderCompactStandard | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/UI/Earn/hooks/useMusdConversionNavbar.tsx:113` |
| How it works (`earn.how_it_works`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/UI/Earn/LendingLearnMoreModal/index.tsx:291` |
| Choose how to earn (`earn.strategy_selection.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Earn/modals/EarnStrategySelectionModal/index.tsx:382` |
| Why can't I withdraw my full balance? (`earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.why_cant_i_withdraw_full_balance`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 7 | `app/components/UI/Earn/modals/LendingMaxWithdrawalModal/index.tsx:38` |
| Stake {…} (`stake.stake`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx:1063` |
| Supply {…} (`earn.supply`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx:1063` |
| Supply {…} (`earn.supply`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/index.tsx:793` |
| Withdraw {…} (`earn.withdraw`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Earn/Views/EarnLendingWithdrawalConfirmationView/index.tsx:460` |
| Earn on your crypto (`money.potential_earnings.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Earn/Views/EarnSectionListView/EarnSectionListView.tsx:560` |
| Earn on your crypto (`money.potential_earnings.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Earn/Views/EarnSectionListView/EarnSectionListView.tsx:575` |
| More ways to earn (`earn_module.more_ways_to_earn`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Earn/Views/EarnSectionListView/EarnSectionListView.tsx:610` |
| Unstake {…} (`stake.unstake`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx:912` |
| Withdraw {…} (`earn.withdraw`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx:912` |

### EnterPasswordSimple

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enter your password (`enter_password.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/EnterPasswordSimple/index.js:110` |

### ErrorBoundary

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| An error occurred (`onboarding_error_fallback.title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 3 | `app/components/Views/ErrorBoundary/index.js:266` |
| An error occurred (`error_screen.title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 3 | `app/components/Views/ErrorBoundary/index.js:266` |

### Explore

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trending (`trending.trending_tokens`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Trending/components/TrendingListHeader/TrendingListHeader.tsx:106` |
| Networks (`trending.networks`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet.tsx:119` |
| Sort by (`trending.sort_by`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenPriceChangeBottomSheet.tsx:181` |
| Time (`trending.time`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet.tsx:142` |
| Select device (`ledger.select_device`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Views/ConnectHardware/HardwareWalletDiscoveryFlow/screens/DiscoverySelectDevice.tsx:68` |

### FeatureFlagOverride

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Feature Flag Override | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | title | 3 | `app/components/Views/FeatureFlagOverride/FeatureFlagOverride.tsx:513` |

### Homepage

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unable to load balance (`balance_breakdown.error.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/Views/Homepage/components/HomepageBalanceBreakdown/HomepageBalanceBreakdownRow.tsx:354` |

### KYC

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Couldn't start verification (`virtual_bank_account.kyc_email.error_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/KYC/Views/EmailAdapter.tsx:185` |
| Identity verified (`virtual_bank_account.identity_verified.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/KYC/Views/Status/IdentityVerified.tsx:94` |
| Verifying your identity (`virtual_bank_account.kyc_taking_longer.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/KYC/Views/Status/KycPending.tsx:66` |
| Data and privacy (`virtual_bank_account.verify_identity.terms_sheet_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/KYC/Views/SumSub/ProviderTermsSheet.tsx:126` |
| Verify your identity (`virtual_bank_account.verify_identity.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/KYC/Views/SumSub/VerifyIdentity.tsx:159` |

### Login & recovery

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create a password (`choose_password.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/ChoosePassword/index.tsx:960` |
| Import a wallet (`import_from_seed.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/ImportFromSecretRecoveryPhrase/index.tsx:785` |
| MetaMask password (`import_from_seed.metamask_password`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/ImportFromSecretRecoveryPhrase/index.tsx:838` |
| Import a wallet (`import_new_secret_recovery_phrase.import_wallet_title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/ImportNewSecretRecoveryPhrase/index.tsx:298` |
| Import account (`import_private_key.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/ImportPrivateKey/index.tsx:179` |
| Save your Secret Recovery Phrase (`manual_backup_step_1.action`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/Views/ManualBackupStep1/index.tsx:357` |
| Confirm your Secret Recovery Phrase (`manual_backup_step_2.action`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 5 | `app/components/Views/ManualBackupStep2/index.js:429` |
| Changing password... (`reset_password.changing_password`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/ResetPassword/index.tsx:532` |
| Change password (`password_reset.change_password`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/ResetPassword/index.tsx:844` |
| Correct! (`srp_security_quiz.correct`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/RevealPrivateCredential/components/SRPSecurityQuiz.tsx:57` |
| Incorrect! (`srp_security_quiz.incorrect`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/RevealPrivateCredential/components/SRPSecurityQuiz.tsx:57` |
| Reveal Secret Recovery Phrase (`reveal_credential.seed_phrase_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx:395` |

### ManageAccounts

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manage accounts (`multichain_accounts.manage_accounts.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/ManageAccounts/ManageAccountsView.tsx:121` |

### MarketInsights

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI-generated content (`market_insights.disclaimer_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/MarketInsights/components/MarketInsightsEntryCard/MarketInsightsDisclaimerBottomSheet.tsx:53` |
| Feedback (`market_insights.feedback.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/MarketInsights/components/MarketInsightsFeedbackBottomSheet.tsx:149` |
| News sources (`market_insights.sources_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/MarketInsights/components/MarketInsightsTrendSourcesBottomSheet.tsx:68` |

### Mfa

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scan QR code (`mfa.totp_setup.qr_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/Mfa/MfaFlowHost/steps/TotpSetupStep.tsx:166` |
| Passkeys (`mfa.settings.passkeys`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Mfa/MfaPasskeys/MfaPasskeys.tsx:70` |
| 2-step verification (`mfa.settings.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/Mfa/MfaSettings/MfaSettings.tsx:151` |

### Money

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Add funds (`money.add_money_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.tsx:328` |
| Annual Percentage Yield (APY) (`money.apy_tooltip.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 4 | `app/components/UI/Money/components/MoneyApyInfoSheet/MoneyApyInfoSheet.tsx:78` |
| Money balance (`money.balance_card.info_sheet_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Money/components/MoneyBalanceInfoSheet/MoneyBalanceInfoSheet.tsx:47` |
| Earn on your crypto (`money.earn_crypto_info_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Money/components/MoneyEarnCryptoInfoSheet/MoneyEarnCryptoInfoSheet.tsx:91` |
| Projected 1-year balance (`money.earn_crypto_info_sheet.deposit_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Money/components/MoneyEarnCryptoInfoSheet/MoneyEarnCryptoInfoSheet.tsx:91` |
| Eligibility check failed (`fiat_on_ramp_aggregator.eligibility_failed_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Money/components/MoneyGeoBlockSheet/MoneyGeoBlockSheet.tsx:76` |
| Money account unavailable (`money.geo_block.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Money/components/MoneyGeoBlockSheet/MoneyGeoBlockSheet.tsx:76` |
| Money (`money.title`) | Navigation header | HeaderStandardAnimatedGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Money/components/MoneyHeader/MoneyHeader.tsx:61` |
| Money (`money.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Money/components/MoneyHeader/useMoneyNativeHeader.tsx:35` |
| Spend and earn (`money.metamask_card.link_card_sheet_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Money/components/MoneyLinkCardSheet/MoneyLinkCardSheet.tsx:244` |
| More (`money.more_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/Money/components/MoneyMoreSheet/MoneyMoreSheet.tsx:129` |
| Send funds to (`money.transfer_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Money/components/MoneyTransferSheet/MoneyTransferSheet.tsx:246` |
| Money UI | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Money/components/MoneyUiDeveloperOptionsSection.tsx:77` |
| Select account (`money.musd_rescue_send.recipient_label`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Money/components/MusdRescueSendSheet/MusdRescueRecipientSelector.tsx:175` |
| Send (`money.musd_rescue_send.title`) | Sheet / modal | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Money/components/MusdRescueSendSheet/MusdRescueSendSheet.tsx:222` |
| Balance unavailable — try again shortly (`money.musd_rescue_send.error_balance_unavailable`) | In-screen large title | Text DisplayLg | left | DisplayLg | No | No | sentence | 6 | `app/components/UI/Money/components/MusdRescueSendSheet/MusdRescueSendSheet.tsx:232` |
| Activity (`money.activity.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Money/Views/MoneyActivityView/MoneyActivityView.tsx:331` |
| +US{…} | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/UI/Money/Views/MoneyApiActivityDetailsView/MoneyApiActivityDetailsView.tsx:536` |
| US{…} | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/UI/Money/Views/MoneyApiActivityDetailsView/MoneyApiActivityDetailsView.tsx:723` |
| Earn on your crypto (`money.potential_earnings.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Money/Views/MoneyPotentialEarningsView/MoneyPotentialEarningsView.tsx:197` |

### MultiRpcModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Network RPCs Updated | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | title | 3 | `app/components/Views/MultiRpcModal/MultiRpcModal.tsx:76` |

### Networks

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Networks (`wallet.networks`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/NetworkManager/index.tsx:364` |
| Delete {…} Network (`app_settings.delete`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | title-period | 3 | `app/components/UI/NetworkManager/index.tsx:419` |
| New network added (`networks.new_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 3 | `app/components/UI/NetworkModal/NetworkAdded/index.tsx:63` |
| Add {{network_name}} (`networks.add_specific_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/UI/NetworkVerificationInfo/NetworkVerificationInfo.tsx:407` |
| Add custom network (`networks.add_custom_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 3 | `app/components/UI/NetworkVerificationInfo/NetworkVerificationInfo.tsx:407` |
| Update {{network_name}} (`networks.update_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/UI/NetworkVerificationInfo/NetworkVerificationInfo.tsx:407` |
| Select a network (`networks.select_network`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/Views/AddAsset/components/NetworkListBottomSheet/NetworkListBottomSheet.tsx:142` |
| Edit networks (`networks.edit_networks_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | Yes | No | sentence | 2 | `app/components/Views/NetworkConnect/NetworkConnectMultiSelector/NetworkConnectMultiSelector.tsx:205` |
|   | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | empty | 0 | `app/components/Views/NetworkSelector/NetworkSelector.tsx:541` |
|   | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | empty | 0 | `app/components/Views/NetworkSelector/NetworkSelector.tsx:541` |
| Delete (`app_settings.delete`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | single | 1 | `app/components/Views/NetworkSelector/NetworkSelector.tsx:541` |
| Network (`asset_details.network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | single | 1 | `app/components/Views/NetworkSelector/NetworkSelector.tsx:541` |
|   | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | empty | 0 | `app/components/Views/NetworkSelector/RpcSelectionModal/RpcSelectionModal.tsx:157` |
| Select RPC URL (`app_settings.select_rpc_url`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 3 | `app/components/Views/NetworkSelector/RpcSelectionModal/RpcSelectionModal.tsx:157` |
| Delete {…} network (`app_settings.delete`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/NetworksManagement/components/DeleteNetworkModal.tsx:47` |
| Add block explorer URL (`app_settings.add_block_explorer_url`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 4 | `app/components/Views/NetworksManagement/NetworkDetailsView/components/BlockExplorerSection.tsx:312` |
| Add RPC URL (`app_settings.add_rpc_url`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 3 | `app/components/Views/NetworksManagement/NetworkDetailsView/components/RpcEndpointSection.tsx:444` |
| Add a network (`app_settings.add_network_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 3 | `app/components/Views/NetworksManagement/NetworkDetailsView/NetworkDetailsView.tsx:270` |
| Network name (`app_settings.network_name_label`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/Views/NetworksManagement/NetworkDetailsView/NetworkDetailsView.tsx:270` |
| Networks (`app_settings.networks_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/NetworksManagement/NetworksManagementView.tsx:126` |

### NFTAutoDetectionModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enable NFT autodetection (`enable_nft-auto-detection.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 3 | `app/components/Views/NFTAutoDetectionModal/NFTAutoDetectionModal.tsx:64` |

### NftGrid

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Collectible options (`wallet.collectible_action_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/NftGrid/NftGridItemBottomSheet.tsx:82` |

### Notifications

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Notifications (`app_settings.developer_options.notifications.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Notification/DeveloperOptionsSection/NotificationsDeveloperOptionsSection.tsx:24` |
| Notifications (`app_settings.notifications_title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/Views/Notifications/index.tsx:130` |
| Introducing personalized alerts (`notifications.push_onboarding.existing_user.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/Notifications/PushNotificationOnboarding/ExistingUserSheet/ExistingUserSheet.tsx:77` |

### Onboarding

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| What's your experience with crypto? (`onboarding_crypto_experience_questionnaire.title`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | question | 5 | `app/components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.tsx:128` |
| How will you use MetaMask? (`onboarding_interest_questionnaire.title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | question | 5 | `app/components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.tsx:239` |
| Other (`onboarding_interest_questionnaire.option_other`) | Sheet / modal | HeaderStandardGlass | center | BodyMd Bold | No | Yes | single | 1 | `app/components/Views/OnboardingInterestQuestionnaire/OtherBottomSheet/OtherBottomSheet.tsx:104` |
| Default settings (`default_settings.default_settings`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/OnboardingSuccess/DefaultSettings/index.tsx:56` |
| Assets (`default_settings.drawer_assets_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/OnboardingSuccess/OnboardingAssetsSettings/index.tsx:38` |
| General (`default_settings.drawer_general_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/OnboardingSuccess/OnboardingGeneralSettings/index.tsx:77` |
| Security (`default_settings.drawer_security_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/OnboardingSuccess/OnboardingSecuritySettings/index.tsx:51` |

### OptinMetrics

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Help us improve MetaMask (`privacy_policy.description_title`) | In-screen large title | TitleStandard | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/OptinMetrics/index.tsx:412` |

### OriginSpamModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| You've temporarily blocked this site (`spam_filter.site_blocked_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 5 | `app/components/Views/OriginSpamModal/OriginSpamModal.tsx:147` |

### OTAUpdatesModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Update ready (`ota_update_modal.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/OTAUpdatesModal/OTAUpdatesModal.tsx:119` |

### Other

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Confirm membership (`confirm_membership.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Approvals/ConfirmMembershipApproval/components/ConfirmMembershipContent/ConfirmMembershipContent.tsx:76` |
| Connection request (`install_snap.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.tsx:87` |
| Install failed (`install_snap.error_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Approvals/InstallSnapApproval/components/InstallSnapError/InstallSnapError.tsx:72` |
| Permissions request (`install_snap.permissions_request_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.tsx:70` |
| Installed (`install_snap.installed`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | single | 1 | `app/components/Approvals/InstallSnapApproval/components/InstallSnapSuccess/InstallSnapSuccess.tsx:65` |
| Add account to MetaMask (`snap_account_custom_name_approval.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 4 | `app/components/Approvals/SnapAccountCustomNameApproval/SnapAccountCustomNameApproval.tsx:93` |
| You might be getting scammed right now (`scam_questionnaire.warning.title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 7 | `app/components/product-safety/scam-questionnaire/scam-warning.tsx:120` |
| Sample feature (`sample_feature.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/features/SampleFeature/components/views/SampleFeature.tsx:58` |
| Sample feature (`sample_feature.title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 2 | `app/features/SampleFeature/components/views/SampleFeatureDevSettingsEntryPoint/SampleFeatureDevSettingsEntryPoint.tsx:66` |

### Perpetuals

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Edit margin (`perps.adjust_margin.edit_title`) | Navigation header | HeaderSubpage | left | BodyMd Medium | No | custom-end | sentence | 2 | `app/components/UI/Perps/components/PerpsAdjustMarginBottomSheet/PerpsAdjustMarginBottomSheet.tsx:549` |
|  {…} | In-screen large title | Text DisplayLg | left | DisplayLg | No | No | lowercase | 1 | `app/components/UI/Perps/components/PerpsAmountDisplay/PerpsAmountDisplay.tsx:160` |
| Cross margin not supported (`perps.crossMargin.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Perps/components/PerpsCrossMarginWarningBottomSheet/PerpsCrossMarginWarningBottomSheet.tsx:54` |
| Perps trading (`perps.perps_trading`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Perps/components/PerpsDeveloperOptionsSection/PerpsDeveloperOptionsSection.tsx:31` |
| Reverse Position (`perps.flip_position.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 2 | `app/components/UI/Perps/components/PerpsFlipPositionConfirmSheet/PerpsFlipPositionConfirmSheet.tsx:231` |
| Leverage (`perps.order.leverage_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | Yes | single | 1 | `app/components/UI/Perps/components/PerpsLeverageBottomSheet/PerpsLeverageBottomSheet.tsx:480` |
| Set limit price (`perps.order.limit_price_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet.tsx:197` |
| Choose margin mode (`perps.margin_mode.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/components/PerpsMarginModeBottomSheet/PerpsMarginModeBottomSheet.tsx:72` |
| {…}-{…} | Navigation header | HeaderSubpage | left | BodyMd Medium | custom-start | custom-end | lowercase | 1 | `app/components/UI/Perps/components/PerpsMarketInlineHeader/PerpsMarketInlineHeader.tsx:90` |
| Sort by (`perps.sort.sort_by`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/components/PerpsMarketSortFieldBottomSheet/PerpsMarketSortFieldBottomSheet.tsx:152` |
| Choose how you trade (`perps.mode.selection_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 4 | `app/components/UI/Perps/components/PerpsModeSelectionBottomSheet/PerpsModeSelectionBottomSheet.tsx:193` |
| {…} {…} | Navigation header | HeaderSubpage | left | BodyMd Medium | Yes | custom-end | sentence | 2 | `app/components/UI/Perps/components/PerpsOrderHeader/PerpsOrderHeader.tsx:148` |
| Edit size (`perps.order.size_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/components/PerpsOrderSizeBottomSheet/PerpsOrderSizeBottomSheet.tsx:220` |
| Select Provider (`perps.provider_selector.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 2 | `app/components/UI/Perps/components/PerpsProviderSelector/PerpsProviderSelectorSheet.tsx:54` |
| Quote expired (`perps.deposit.quote_expired_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/components/PerpsQuoteExpiredModal/PerpsQuoteExpiredModal.tsx:32` |
| Use custom slippage (`perps.slippage.use_custom_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/components/PerpsSlippageBottomSheet/PerpsCustomSlippageBottomSheet.tsx:145` |
| Set slippage (`perps.slippage.config_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/components/PerpsSlippageBottomSheet/PerpsSlippageBottomSheet.tsx:134` |
| Pay with (`confirm.pay_with_bottom_sheet.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Perps/components/PerpsTradeBottomSheet/PerpsTradeNestedScreens.tsx:292` |
| Auto close (`perps.tpsl.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Perps/components/PerpsTradeBottomSheet/PerpsTradeTPSLScreen.tsx:600` |
| Debug Tools | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 2 | `app/components/UI/Perps/Debug/HIP3DebugView.tsx:481` |
| HIP-3 Debug Tools | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 3 | `app/components/UI/Perps/Debug/HIP3DebugView.tsx:498` |
| HIP-3 Debug Tools | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 3 | `app/components/UI/Perps/Debug/HIP3DebugView.tsx:514` |
| Add Margin (`perps.adjust_margin.add_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 2 | `app/components/UI/Perps/Views/PerpsAdjustMarginView/PerpsAdjustMarginView.tsx:461` |
| Remove Margin (`perps.adjust_margin.remove_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 2 | `app/components/UI/Perps/Views/PerpsAdjustMarginView/PerpsAdjustMarginView.tsx:461` |
| Cancel orders (`perps.cancel_all_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView.tsx:190` |
| Close all positions (`perps.close_all_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:297` |
| Close positions (`perps.close_all_modal.title_filtered`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:297` |
| Close all positions (`perps.close_all_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:324` |
| Close positions (`perps.close_all_modal.title_filtered`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:324` |
| Close all positions (`perps.close_all_modal.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:352` |
| Close positions (`perps.close_all_modal.title_filtered`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx:352` |
| Perps (`perps.title`) | Navigation header | HeaderStandardAnimatedGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx:1249` |
| Markets (`perps.home.markets`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx:972` |
| {…}-USD | Navigation header | HeaderSubpage | left | BodyMd Medium | Yes | custom-end | lowercase | 1 | `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx:411` |
| Select Price Grouping (`perps.order_book.depth_band.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | title | 3 | `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx:833` |
| You're one of our top perp traders (`perps.outreach_details.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 7 | `app/components/UI/Perps/Views/PerpsOutreachDetailsView/PerpsOutreachDetailsView.tsx:234` |
| Filter by (`perps.market_type.filter_by`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProActivityFilterSheet.tsx:77` |
| Order book settings (`perps.order_book.config_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderBookConfigSheet.tsx:315` |
| Filter by (`perps.market_type.filter_by`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionsSideFilterSheet.tsx:67` |
| Terminate {{symbol}} TWAP? (`perps.pro_positions_panel.twap_terminate.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 3 | `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProTwapTerminateSheet.tsx:89` |
| Share position (`perps.share_position.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Perps/Views/PerpsSharePositionView/PerpsSharePositionView.tsx:140` |
| Auto close (`perps.tpsl.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView.tsx:1579` |
| Auto close (`perps.tpsl.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView.tsx:1591` |
| Withdraw (`perps.withdrawal.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Perps/Views/PerpsWithdrawView/PerpsWithdrawView.tsx:349` |

### Predictions

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Activity details (`predict.transactions.activity_details`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Predict/components/PredictActivityDetail/PredictActivityDetail.tsx:522` |
| Add funds (`predict.add_funds_sheet.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Predict/components/PredictAddFundsSheet/PredictAddFundsSheet.tsx:72` |
| Predictions (`wallet.predict`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Predict/components/PredictBalance/PredictBalance.tsx:212` |
| How this market settles (`predict.crypto_up_down.twap_info.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 4 | `app/components/UI/Predict/components/PredictCryptoUpDownDetails/PredictCryptoTwapInfoSheet.tsx:26` |
| Price details (`predict.fee_summary.price_details`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/UI/Predict/components/PredictFeeBreakdownSheet/PredictFeeBreakdownSheet.tsx:81` |
| Regulation time (`predict.reg_time_info.title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/UI/Predict/components/PredictGameDetailsContent/PredictRegTimeInfoSheet.tsx:23` |
| About (`predict.tabs.about`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | single | 1 | `app/components/UI/Predict/components/PredictGameDetailsFooter/PredictGameAboutSheet.tsx:41` |
| Unavailable in your region (`predict.unavailable.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 4 | `app/components/UI/Predict/components/PredictUnavailable/PredictUnavailable.tsx:120` |
| Withdrawals temporarily unavailable (`predict.withdraw.unavailable_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Predict/components/PredictWithdrawUnavailableSheet/PredictWithdrawUnavailableSheet.tsx:48` |
| Market unavailable (`predict.market_unavailable.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Predict/views/PredictMarketUnavailableModal/PredictMarketUnavailableModal.tsx:41` |
| Positions (`predict.tabs.positions`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.tsx:219` |
| Cash out (`predict.cash_out`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.tsx:298` |

### PredictNext

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/PredictNext/events/markets/internal/MarketCard.tsx:66` |
| Prediction market (`predict_next.venue_selector.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/PredictNext/venueSelection/internal/VenueSelectorSheet.tsx:81` |
| Rules (`predict.rules.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/PredictNext/views/PredictEvent/internal/RulesBottomSheet.tsx:93` |
| Predictions (`predict_next.home_title`) _duplicate_ | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | No | custom-end | single | 1 | `app/components/UI/PredictNext/views/PredictHome/PredictHome.tsx:198` |
| Predictions (`predict_next.home_title`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/PredictNext/views/PredictHome/PredictHome.tsx:242` |
| {…}{…} | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | lowercase | 1 | `app/components/UI/PredictNext/views/PredictOrderFlow/internal/OrderAmountInput.tsx:65` |
| Price details (`predict_next.order_preview.price_details`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/PredictNext/views/PredictOrderFlow/internal/OrderBreakdownSheet.tsx:34` |
| Portfolio (`predict_next.portfolio.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/PredictNext/views/PredictPortfolio/PredictPortfolioScreen.tsx:121` |

### ProHub

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MetaMask Orange (`pro_hub.title`) | Navigation header | HeaderBase | center | HeadingSm | custom-start | custom-end | title | 2 | `app/components/Views/ProHub/ProHub.tsx:201` |
| Pro has paid for itself (`pro_hub.earned.paid_for_itself_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 5 | `app/components/Views/ProHub/screens/Earned/Earned.tsx:147` |
| Grow your balance (`pro_hub.earned.grow_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/ProHub/screens/Earned/Earned.tsx:180` |

### ProSubscription

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Payment failed (`pro_subscription.payment.failed_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Views/ProSubscription/components/PaymentFailedSheet/PaymentFailedSheet.tsx:101` |
| MetaMask Orange (`pro_subscription.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | title | 2 | `app/components/Views/ProSubscription/screens/Benefits/Benefits.tsx:173` |
| You just leveled up (`pro_subscription.success.title`) | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | sentence | 4 | `app/components/Views/ProSubscription/screens/Success/Success.tsx:45` |

### QuickBuy

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select network (`bridge.select_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 2 | `app/components/UI/QuickBuy/QuickBuyNetworkListScreen.tsx:50` |
| Pay with (`social_leaderboard.quick_buy.pay_with`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 2 | `app/components/UI/QuickBuy/QuickBuyTokenSelectScreen.tsx:56` |
| Receive (`social_leaderboard.quick_buy.receive`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | single | 1 | `app/components/UI/QuickBuy/QuickBuyTokenSelectScreen.tsx:56` |

### RestoreWallet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Restore needed (`restore_wallet.restore_needed_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/RestoreWallet/RestoreWallet.tsx:107` |
| New wallet needed (`new_wallet_needed.new_wallet_needed_title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 3 | `app/components/Views/RestoreWallet/WalletResetNeeded.tsx:87` |
| Your wallet is ready! (`wallet_restored.wallet_restored_title`) | In-screen large title | Text HeadingLG | left | HeadingLG | No | No | sentence | 4 | `app/components/Views/RestoreWallet/WalletRestored.tsx:83` |

### Rewards

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  {…} | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | lowercase | 1 | `app/components/UI/Rewards/components/Campaigns/OndoAccountPickerSheet.tsx:57` |
| Accounts with  (`rewards.ondo_campaign_portfolio.switch_account_sheet_prefix`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Rewards/components/Campaigns/OndoAccountPickerSheet.tsx:57` |
| You earned {{amount}} $LINEA (`rewards.linea_tokens.title_earned`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/Rewards/components/EndOfSeasonClaimBottomSheet/EndOfSeasonClaimBottomSheet.tsx:386` |
| - | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Rewards/components/Money/RefererHeroCard.tsx:123` |
| — | In-screen large title | Text DisplayMd | left | DisplayMd | No | No | single | 1 | `app/components/UI/Rewards/components/Money/Tabs/PerformanceTab.tsx:252` |
| Start earning rewards (`rewards.onboarding.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/Rewards/components/Onboarding/OnboardingMainStep.tsx:266` |
| Update required (`rewards.version_guard.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/UI/Rewards/components/RewardsUpdateRequired/RewardsUpdateRequired.tsx:70` |
| Missing Enrolled Accounts (`rewards.settings.off_device_accounts_sheet_title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | title | 3 | `app/components/UI/Rewards/components/Settings/LinkedOffDeviceAccountsSheet.tsx:156` |
| Claim Benefit (`rewards.benefits.title_claim`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 2 | `app/components/UI/Rewards/Views/BenefitFullView.tsx:129` |
| Benefits (`rewards.benefits.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Rewards/Views/BenefitsFullView.tsx:66` |
| Rules and eligibility (`rewards.campaign_mechanics.title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/UI/Rewards/Views/CampaignMechanicsView.tsx:62` |
| Campaigns (`rewards.campaigns_view.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Rewards/Views/CampaignsView.tsx:118` |
| Activity (`rewards.ondo_campaign_portfolio.activity_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/OndoCampaignPortfolioView.tsx:180` |
| Perps Trading Competition (`rewards.perps_trading_campaign.title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | title | 3 | `app/components/UI/Rewards/Views/PerpsTradingCampaignDetailsView.tsx:251` |
| Leaderboard (`rewards.perps_trading_campaign.leaderboard_title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/PerpsTradingCampaignLeaderboardView.tsx:92` |
| Stats (`rewards.perps_trading_campaign.stats_title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/PerpsTradingCampaignStatsView.tsx:146` |
| Predict The Pitch (`rewards.predict_the_pitch_campaign.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | title | 3 | `app/components/UI/Rewards/Views/PredictThePitchCampaignDetailsView.tsx:327` |
| Leaderboard (`rewards.predict_the_pitch_campaign.leaderboard_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/PredictThePitchCampaignLeaderboardView.tsx:106` |
| Your predictions (`rewards.predict_the_pitch_campaign.positions_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/UI/Rewards/Views/PredictThePitchCampaignPortfolioView.tsx:272` |
| Stats (`rewards.predict_the_pitch_campaign.stats_title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/PredictThePitchCampaignStatsView.tsx:136` |
| Rewards (`rewards.main_title`) _duplicate_ | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/RewardsDashboard.tsx:403` |
| Rewards (`rewards.main_title`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Rewards/Views/RewardsDashboard.tsx:423` |
| Rewards (`rewards.main_title`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/UI/Rewards/Views/RewardsDashboard.tsx:451` |
| Rewards (`rewards.main_title`) _duplicate_ | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Rewards/Views/RewardsMoneyDashboard.tsx:305` |
| Rewards (`rewards.main_title`) _duplicate_ | In-screen large title | TitleStandard | left | HeadingLg | No | No | single | 1 | `app/components/UI/Rewards/Views/RewardsMoneyDashboard.tsx:323` |
| Rewards settings (`rewards.settings.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Rewards/Views/RewardsSettingsView.tsx:86` |
| VIP Pilot (`rewards.vip.referee_page_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | title | 2 | `app/components/UI/Rewards/Views/RewardsVipRefereeView.tsx:259` |
| Tiers (`rewards.vip.tiers_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Rewards/Views/RewardsVipTiersView.tsx:79` |

### SDK

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Link MetaMask Agent wallet (`sdk_connect_v2.show_otp.modal_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | mixed | 4 | `app/components/Views/SDK/SDKConnectV2OtpModal/SDKConnectV2OtpModal.tsx:114` |
| Manage connections (`sdk.manage_connections`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/Views/SDK/SDKSessionModal/SDKSessionModal.tsx:124` |
| Manage connections (`app_settings.manage_sdk_connections_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/SDK/SDKSessionsManager/SDKSessionsManager.tsx:156` |

### SeedphraseModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Secret Recovery Phrase (`account_backup_step_1.what_is_seedphrase_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 3 | `app/components/UI/SeedphraseModal/index.tsx:43` |

### SelectSRP

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select Secret Recovery Phrase (`secure_your_wallet.srp_list_selection`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | sentence | 4 | `app/components/Views/SelectSRP/SelectSRPBottomSheet.tsx:41` |

### Send

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Send (`send.title`) | Navigation header | getHeaderCompactStandardNavbarOptions | center | BodyMd Bold | Yes | Yes | single | 1 | `app/components/Views/confirmations/hooks/send/useSendNavbar.tsx:65` |
| Send (`send.title`) | Navigation header | getHeaderCompactStandardNavbarOptions | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/confirmations/hooks/send/useSendNavbar.tsx:73` |
| Send (`send.title`) | Navigation header | getHeaderCompactStandardNavbarOptions | center | BodyMd Bold | Yes | Yes | single | 1 | `app/components/Views/confirmations/hooks/send/useSendNavbar.tsx:79` |

### Settings

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Advanced (`app_settings.advanced_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/AdvancedSettings/index.tsx:167` |
| About MetaMask (`app_settings.info_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/Settings/AppInformation/index.tsx:157` |
| This is a duplicate address (`duplicate_address.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 5 | `app/components/Views/Settings/Contacts/AmbiguousAddressSheet/AmbiguousAddressSheet.tsx:27` |
| Add contact (`address_book.add_contact_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/Settings/Contacts/ContactForm/index.tsx:411` |
| Edit contact (`address_book.edit_contact_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/Settings/Contacts/ContactForm/index.tsx:411` |
| Contacts (`app_settings.contacts_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/Contacts/index.tsx:167` |
| Haptics (`app_settings.developer_options.haptics.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/Settings/DeveloperOptions/HapticsDeveloperOptionsSection.tsx:135` |
| Identity (`app_settings.developer_options.identity.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/Settings/DeveloperOptions/IdentityDeveloperOptionsSection.tsx:37` |
| Developer options (`app_settings.developer_options.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | Yes | sentence | 2 | `app/components/Views/Settings/DeveloperOptions/index.tsx:70` |
| New wallet (`app_settings.developer_options.new_wallet.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/Settings/DeveloperOptions/NewWalletDeveloperOptionsSection.tsx:158` |
| Sentry | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/Settings/DeveloperOptions/SentryTest.tsx:80` |
| Experimental (`app_settings.experimental_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/ExperimentalSettings/index.tsx:190` |
| General (`app_settings.general_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/GeneralSettings/index.tsx:225` |
| Backup and sync (`backupAndSync.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/Settings/Identity/BackupAndSyncSettings.tsx:38` |
| Settings (`app_settings.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/index.tsx:123` |
| Notifications (`app_settings.notifications_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/Settings/NotificationsSettings/index.tsx:161` |
| Notifications (`app_settings.notifications_title`) | Navigation header | HeaderCompactStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Settings/NotificationsSettings/NotificationSettingsSection.tsx:72` |
| Security and privacy (`app_settings.security_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/Settings/SecuritySettings/SecuritySettings.tsx:373` |

### ShowDisplayMediaNFTSheet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Display NFT media (`show_display_nft_media.show_display_nft_media_title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 3 | `app/components/Views/ShowDisplayMediaNFTSheet/ShowDisplayNFTMediaSheet.tsx:52` |

### ShowIpfsGatewaySheet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IPFS gateway (`ipfs_gateway.ipfs_gateway_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.tsx:44` |
| Show NFT (`show_nft.show_nft_title`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.tsx:44` |

### ShowTokenIdSheet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Token ID (`nft_details.token_id`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 2 | `app/components/Views/ShowTokenIdSheet/ShowTokenIdSheet.tsx:25` |

### SitesFullView

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Favorites (`autocomplete.favorites`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/Views/SitesFullView/SitesFullView.tsx:165` |
| Popular sites (`trending.popular_sites`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/Views/SitesFullView/SitesFullView.tsx:165` |

### Snaps

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Remove Snap (`app_settings.snaps.snap_settings.remove_account_snap_warning.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 2 | `app/components/Views/Snaps/KeyringSnapRemovalWarning/KeyringSnapRemovalWarning.tsx:160` |
| Snaps (`app_settings.snaps.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/Snaps/SnapsSettingsList/SnapsSettingsList.tsx:41` |

### Social

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Options (`social_leaderboard.entry_options.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/SocialFeed/components/SocialEntryOptionsBottomSheet.tsx:130` |
| Report (`social_leaderboard.entry_options.report_reason_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/SocialFeed/components/SocialEntryOptionsBottomSheet.tsx:130` |
| Social Leaderboard (`app_settings.developer_options.social_leaderboard.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | title | 2 | `app/components/Views/SocialLeaderboard/components/SocialLeaderboardDeveloperOptionsSection/SocialLeaderboardDeveloperOptionsSection.tsx:47` |
| Notifications (`app_settings.notifications_title`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/Views/SocialLeaderboard/components/TradingSignalsSetupBottomSheet/TradingSignalsSetupBottomSheet.tsx:62` |
| Create your profile (`social_leaderboard.my_profile.no_profile_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/Views/SocialLeaderboard/MyProfileView/MyProfileView.tsx:877` |
| Select an account (`social_leaderboard.profile_onboarding.select_account`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/SocialLeaderboard/ProfileOnboarding/LinkedAccountPicker.tsx:187` |
| 🦊 | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | single | 1 | `app/components/Views/SocialLeaderboard/ProfileOnboarding/SocialProfileOnboardingView.tsx:264` |
| Profiles to follow (`social_leaderboard.profiles_to_follow.title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/SocialLeaderboard/ProfilesToFollowView/ProfilesToFollowView.tsx:184` |
| Filter (`social_leaderboard.shell.filters.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/Views/SocialLeaderboard/shell/filters/SocialFiltersBottomSheet.tsx:253` |
| Add a position (`social_leaderboard.composer.add_position_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/SocialLeaderboard/SocialPostComposerView/AddPositionBottomSheet.tsx:200` |
| Add a GIF (`social_leaderboard.composer.gifs_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/SocialLeaderboard/SocialPostComposerView/GifPickerSheet.tsx:95` |
| Why don't I see a position? (`social_leaderboard.composer.empty_help`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | No | question | 6 | `app/components/Views/SocialLeaderboard/SocialPostComposerView/HiddenPositionInfo.tsx:36` |
| Top traders (`homepage.sections.top_traders`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/SocialLeaderboard/SocialV0View/SocialV0View.tsx:448` |
| Top traders (`homepage.sections.top_traders`) _duplicate_ | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | Yes | custom-end | sentence | 2 | `app/components/Views/SocialLeaderboard/SocialV0View/SocialV0View.tsx:522` |
| Top traders (`homepage.sections.top_traders`) _duplicate_ | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/SocialLeaderboard/SocialV0View/SocialV0View.tsx:543` |
| Top traders (`homepage.sections.top_traders`) | Navigation header | HeaderStandardAnimated | center | BodyMd Bold | custom-start | custom-end | sentence | 2 | `app/components/Views/SocialLeaderboard/SocialV1View/SocialV1View.tsx:653` |
| Review our Terms of Use (`social_leaderboard.terms.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | mixed | 5 | `app/components/Views/SocialLeaderboard/terms/SocialTermsSheet/SocialTermsSheet.tsx:202` |
| Profile options (`social_leaderboard.trader_profile.profile_options`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Views/SocialLeaderboard/TraderProfileView/components/ProfileOptionsSheet.tsx:48` |
| Linked social account (`manage_profile.linked_social_account`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/SocialProfile/LinkedSocialAccount/LinkedSocialAccount.tsx:63` |
| Disconnect X account? (`manage_profile.x_account_disconnect_sheet_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 3 | `app/components/Views/SocialProfile/ManageProfile/DisconnectXAccountSheet.tsx:95` |
| Manage profile (`manage_profile.header`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/SocialProfile/ManageProfile/ManageProfile.tsx:147` |
| Bio (`manage_profile.bio`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/Views/SocialProfile/ManageProfile/ManageProfileField.tsx:143` |
| Display name (`manage_profile.display_name`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/SocialProfile/ManageProfile/ManageProfileField.tsx:143` |
| Trading activity (`manage_profile.trading_activity`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/SocialProfile/ManageProfile/ManageProfileField.tsx:143` |
| X account (`manage_profile.x_account`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/SocialProfile/ManageProfile/ManageProfileXAccount.tsx:183` |
| Show trading activity (`manage_profile.show_trading_activity`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/Views/SocialProfile/ManageProfile/ProfileToggleCard.tsx:139` |
| Create profile (`profile_drawer.create_profile`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/SocialProfile/ProfileDrawer/ProfileDrawer.tsx:272` |
| Create profile (`profile_drawer.create_profile`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 2 | `app/components/Views/SocialProfile/ProfileDrawer/ProfileDrawer.tsx:299` |

### Stake

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gas cost impact (`stake.gas_cost_impact`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Stake/components/GasImpactModal/index.tsx:172` |
| Stake ETH and earn (`stake.stake_eth_and_earn`) | Navigation header | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 4 | `app/components/UI/Stake/components/PoolStakingLearnMoreModal/index.tsx:157` |
| Stake (`stake.stake`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Stake/Views/StakeConfirmationView/StakeConfirmationView.tsx:55` |
| {{ticker}} earnings (`stake.earnings_history_title`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Stake/Views/StakeEarningsHistoryView/StakeEarningsHistoryView.tsx:28` |
| Unstake (`stake.unstake`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.tsx:54` |

### SupportConsentSheet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Share your User ID with Support (`support_consent.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | mixed | 6 | `app/components/UI/SupportConsentSheet/index.tsx:73` |

### Swap & bridge

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Select a stablecoin (`bridge.batch_sell_select_stablecoin`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/BatchSellDestinationTokenSelectorModal/index.tsx:108` |
| Review (`bridge.batch_sell_review`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/Bridge/components/BatchSellFinalReviewModal/index.tsx:435` |
| Minimum received (`bridge.minimum_received_tooltip_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | Yes | sentence | 2 | `app/components/UI/Bridge/components/BatchSellMinimumReceivedInfoModal/index.tsx:30` |
| Network fee (`bridge.network_fee_info_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | Yes | Yes | sentence | 2 | `app/components/UI/Bridge/components/BatchSellNetworkFeeInfoModal/index.tsx:30` |
| High price impact (`bridge.batch_sell_high_price_impact`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/BatchSellPriceImpactInfoModal/index.tsx:37` |
| Total received (`bridge.batch_sell_total_received`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/BatchSellQuoteDetailsModal/index.tsx:51` |
| Transaction failed in simulation (`blockaid_modal.simulation_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/Bridge/components/BlockaidModal/BlockaidModal.tsx:62` |
| Transaction failed validation (`blockaid_modal.validation_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/BlockaidModal/BlockaidModal.tsx:62` |
| Select token (`bridge.select_token`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector.tsx:1172` |
| Select network (`bridge.select_network`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/BridgeTokenSelector/NetworkListModal.tsx:174` |
| Cancel order (`bridge.limit.cancel_order`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/CancelLimitOrderModal/CancelLimitOrderModal.tsx:41` |
| High rate alert (`bridge.batch_sell_single_token_dialog_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/HighRateAlertModal/index.tsx:53` |
| Account upgrade fee (`bridge.limit.account_upgrade_fee_info_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/LimitOrderAccountUpgradeFeeInfoSheet/LimitOrderAccountUpgradeFeeInfoSheet.tsx:30` |
| {{source}} → {{dest}} (`bridge.limit.pair`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/LimitOrderConfirmationModal/LimitOrderConfirmationModal.tsx:97` |
| Price tolerance (`bridge.cost_tolerance`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/LimitOrderCostToleranceInfoSheet/LimitOrderCostToleranceInfoSheet.tsx:30` |
| MetaMask fee (`bridge.limit.metamask_fee_info_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/LimitOrderMetaMaskFeeInfoSheet/LimitOrderMetaMaskFeeInfoSheet.tsx:49` |
| Market is closed (`bridge.market_closed.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/MarketClosedBottomSheets/MarketClosedBottomSheet.tsx:46` |
| {{source}} → {{dest}} (`bridge.limit.pair`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/OpenLimitOrderDetailsModal/OpenLimitOrderDetailsModal.tsx:52` |
| Price range (`bridge.recurring.price_range.label`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/PriceRangeSheet/PriceRangeSheet.tsx:308` |
| Select Quote (`bridge.select_quote`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | title | 2 | `app/components/UI/Bridge/components/QuoteSelectorView/index.tsx:132` |
| Recipient account | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/RecipientSelectorModal/RecipientSelectorModal.tsx:163` |
| Confirm recurring order (`bridge.recurring.confirm_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.tsx:319` |
| Account upgrade fee (`bridge.recurring.account_upgrade_fee_info_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 3 | `app/components/UI/Bridge/components/RecurringDelegationFeeInfoSheet/RecurringDelegationFeeInfoSheet.tsx:31` |
| Every (`bridge.recurring.every`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | single | 1 | `app/components/UI/Bridge/components/RecurringIntervalSheet/RecurringIntervalSheet.tsx:66` |
| Repeat orders (`bridge.recurring.repeat_info_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/RecurringRepeatInfoSheet/RecurringRepeatInfoSheet.tsx:30` |
| Slippage (`bridge.slippage`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/Bridge/components/SlippageModal/CustomSlippageModal.tsx:102` |
| Slippage (`bridge.slippage`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | single | 1 | `app/components/UI/Bridge/components/SlippageModal/DefaultSlippageModal.tsx:85` |
| Price tolerance (`bridge.cost_tolerance`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/SwapsLimitOrderCostToleranceModal/SwapsLimitOrderCustomCostToleranceModal.tsx:133` |
| Price tolerance (`bridge.cost_tolerance`) | Sheet / modal | HeaderStandard | center | BodyMd Bold | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/SwapsLimitOrderCostToleranceModal/SwapsLimitOrderDefaultCostToleranceModal.tsx:85` |
| Expires after (`bridge.limit.expiration`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Bridge/components/SwapsLimitOrderExpirationModal/SwapsLimitOrderExpirationModal.tsx:67` |
| View on block explorer (`bridge_transaction_details.view_on_block_explorer`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 4 | `app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal.tsx:112` |
| Transaction details (`bridge_transaction_details.transaction_details`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Bridge/components/TransactionDetails/TransactionDetails.tsx:175` |
| Bridged (`bridge_transaction_details.bridged`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Bridge/components/TransactionDetails/TransactionDetails.tsx:390` |
| Bridged {{symbol}} (`bridge_transaction_details.bridged_token`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/UI/Bridge/components/TransactionDetails/TransactionDetails.tsx:390` |
| Swapped (`bridge_transaction_details.swapped`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Bridge/components/TransactionDetails/TransactionDetails.tsx:390` |
| Select up to 5 tokens (`bridge.batch_sell_select_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 5 | `app/components/UI/Bridge/Views/BatchSellTokenSelect/BatchSellTokenSelect.tsx:702` |
| Bridge (`bridge.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Bridge/Views/BridgeView/index.tsx:366` |
| Swap (`swaps.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/UI/Bridge/Views/BridgeView/index.tsx:366` |
| Are you sure? (`bridge.recurring.cancel_confirmation_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 3 | `app/components/UI/Bridge/Views/RecurringOrderDetailsView/RecurringOrderCancelSheet.tsx:65` |
| Recurring (`bridge.tabs.recurring`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | single | 1 | `app/components/UI/Bridge/Views/RecurringOrderDetailsView/RecurringOrderDetailsView.tsx:284` |
| Swapped {{source}} to {{dest}} (`bridge.recurring.swap_details_title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 4 | `app/components/UI/Bridge/Views/RecurringSwapDetailsView/RecurringSwapDetailsView.tsx:300` |

### TokensFullView

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tokens (`wallet.tokens`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | custom-end | single | 1 | `app/components/Views/TokensFullView/TokensFullView.tsx:53` |

### TurnOffRememberMeModal

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Turn off Remember Me (`turn_off_remember_me.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | mixed | 4 | `app/components/UI/TurnOffRememberMeModal/TurnOffRememberMeModal.tsx:119` |

### UpdateNeeded

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Get the newest features (`update_needed.title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/UpdateNeeded/UpdateNeeded.tsx:127` |

### Wallet

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unavailable in your region (`rwa.unavailable.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 4 | `app/components/UI/TokenDetails/components/RwaUnavailableBottomSheet/RwaUnavailableBottomSheet.tsx:104` |
| Share token info (`share_token.title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | No | sentence | 3 | `app/components/UI/TokenDetails/components/ShareTokenBottomSheet.tsx:329` |
| Post your trade (`token_details_v1.feed_tab.empty.no_balance_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 3 | `app/components/UI/TokenDetails/components/tabs/TokenDetailsFeedEmptyState.tsx:171` |
| Start your first post (`token_details_v1.feed_tab.empty.has_balance_title`) | In-screen large title | Text HeadingLg | left | HeadingLg | No | No | sentence | 4 | `app/components/UI/TokenDetails/components/tabs/TokenDetailsFeedEmptyState.tsx:171` |
| Hide token? (`wallet.remove_token_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | question | 2 | `app/components/UI/Tokens/TokenList/RemoveTokenBottomSheet.tsx:52` |
| This is a potential scam (`wallet.potential_scam`) | Sheet / modal | SheetHeader | center | HeadingMD (legacy) | No | No | sentence | 5 | `app/components/UI/Tokens/TokenList/ScamWarningModal/ScamWarningModal.tsx:105` |
| Sort by (`wallet.sort_by`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/UI/Tokens/TokenSortBottomSheet/TokenSortBottomSheet.tsx:155` |

### WalletConnectSessions

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WalletConnect sessions (`experimental_settings.wallet_connect_dapps`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/WalletConnectSessions/index.js:204` |

### WalletRecovery

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manage recovery methods (`app_settings.manage_recovery_method`) | Navigation header | HeaderStandardGlass | center | BodyMd Bold | Yes | No | sentence | 3 | `app/components/Views/WalletRecovery/index.tsx:311` |

### WhatsHappeningDetailView

| Title | Surface | Component | Align | Type | Back | Close | Case | Words | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| News sources (`market_insights.sources_title`) | Sheet / modal | BottomSheetHeader | center | HeadingSm | No | Yes | sentence | 2 | `app/components/Views/WhatsHappeningDetailView/components/WhatsHappeningSourcesBottomSheet.tsx:78` |
| What's happening (`whats_happening.title`) | Navigation header | HeaderStandard | center | BodyMd Bold | Yes | No | sentence | 2 | `app/components/Views/WhatsHappeningDetailView/WhatsHappeningDetailView.tsx:275` |
