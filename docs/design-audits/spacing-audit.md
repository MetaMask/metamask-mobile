# Spacing audit

Audit of how MetaMask Mobile applies spacing today, a proposal that stays on the scale the design system already ships, and a fix order for after that scale is signed off.

This pull request adds the document only. It does not change product code.

**Scope of the count.** 9,716 production files under `app/` (`*.ts`, `*.tsx`, `*.js`, `*.jsx`). Tests, stories, specs, mocks, and snapshots are excluded. Comments are stripped. Counted properties are `padding*`, `margin*`, `gap`, `rowGap`, and `columnGap`, plus the matching Tailwind utilities (`p-*`, `px-*`, `m-*`, `gap-*`, `space-*`, including negatives and arbitrary values). Width, height, border, radius, letter-spacing, and position offsets are out of scope. A shared style counts once, at the declaration, so a shell used by many screens is one hit.

Packages these numbers were read against:

| Package | Resolved version | What it contributes |
| --- | --- | --- |
| `@metamask/design-tokens` | 12.0.0 | Colors, typography, shadows, brand colors, animation durations. No spacing export. |
| `@metamask/design-system-shared` | 0.43.0 | `BoxSpacing = 0 \| 1 \| … \| 12` |
| `@metamask/design-system-react-native` | 0.54.0 | `Box` props and component defaults below |
| `@metamask/design-system-twrnc-preset` | 0.13.0 | Tailwind preset. It does not override `theme.spacing`. |

`app/util/theme/models.ts` extends the design-token `Theme` with appearance and brand colors. There is no `theme.spacing`. ESLint enforces `@metamask/design-tokens/color-no-hex`. Nothing equivalent flags a raw spacing number.

---

## The scale that already exists

`Box` spacing props and the integer Tailwind steps `0`–`12` are the same scale. One step is 4px. The preset leaves Tailwind’s default spacing in place, so half steps and steps past 12 still compile. They are legal classes and they are off the Box scale.

| Step | px | Step | px |
| --- | --- | --- | --- |
| 0 | 0 | 7 | 28 |
| 1 | 4 | 8 | 32 |
| 2 | 8 | 9 | 36 |
| 3 | 12 | 10 | 40 |
| 4 | 16 | 11 | 44 |
| 5 | 20 | 12 | 48 |
| 6 | 24 | | |

Tailwind half steps that are **not** on this scale: `0.5` = 2px, `1.5` = 6px, `2.5` = 10px, `3.5` = 14px, plus the `px` utility (1px). Steps `14` and up are 56px and larger.

The installed design-system components already encode roles on this scale:

| Component | Default | px |
| --- | --- | --- |
| `Card` | `p-4` | 16 |
| `ListItem` | `px-4 py-3` | 16 horizontal, 12 vertical |
| `SectionHeader` | `px-4 pt-3 pb-2`, inner `gap={1}` | 16 / 12 / 8, inner gap 4 |
| `TextField` | `px-4 gap-3 h-12` | 16 horizontal, 12 between accessories, 48 tall |
| `ButtonBase` | `px-4`; `px-3` on a side that has an icon; icon `gap={1}` | 16, or 12 beside an icon; 4 between icon and label |
| `HeaderStandard`, `BottomSheetHeader` | `px-2` | 8 |
| `HeaderBase` | `gap-4` between slots, `gap-2` for accessory groups | 16 and 8 |
| `BottomSheetFooter` | `px-4`, `mt-4` / `ml-4` between buttons | 16 |
| `SectionDivider` | `marginVertical={5}` | 20 |

The legacy `app/component-library` primitives hardcode the same 16px in StyleSheets, with three disagreements called out below:

| Legacy primitive | Hardcoded value | Design-system equivalent |
| --- | --- | --- |
| `Card` | `padding: 16` | `p-4` (same pixels) |
| `ListItem` | `padding: 16` on all sides. `gap` is a **pixel** spacer, default 16 (`DEFAULT_LISTITEM_GAP`) | `px-4 py-3`. Accessory gap is a Box step |
| `ButtonBase` | `paddingHorizontal: 16`, icon `marginLeft` / `marginRight: 8` | `px-4`, icon gap 4 |
| `TextField` | `paddingHorizontal: 16`, accessory margin 12, height 48 | `px-4 gap-3 h-12` (same pixels) |
| `BottomSheetHeader` | `paddingHorizontal: 16` | `px-2` (8px) |

---

## How spacing is applied

Three mechanisms, 9,988 declarations:

| Mechanism | Declarations | Files | Share |
| --- | ---: | ---: | ---: |
| Tailwind spacing classes | 5,620 | 1,106 | 56% |
| StyleSheet / inline numeric literals | 3,428 | 684 | 34% |
| JSX spacing props (`padding={4}`, `gap={2}`, …) | 940 | 380 | 9% |

Surrounding context: 871 files still call `StyleSheet.create`. 1,343 files use the Tailwind hook or `twClassName` / `tw.style`. 108 files do both. 56 files mix a raw spacing literal with a Tailwind class or a JSX spacing prop. Another 251 StyleSheet spacing values are expressions (`insets.bottom`, ternaries) and 95 are named identifiers (`headerInset`, `FIXED_BOTTOM_CONTAINER_PADDING`). Those stay out of the histograms. Most of the expressions are safe-area and tab-bar math and should stay dynamic.

### On the scale, or beside it

**Tailwind.** 5,289 of 5,620 classes (94%) resolve to a Box step from 0 to 48px. The rest: 160 half-steps or 1px, 20 values above 48px, 80 negative margins, 71 arbitrary classes such as `pb-[3px]`, `gap-[10px]`, `pl-[25px]`, `py-[6.4px]`.

**StyleSheet literals.** 2,888 of 3,428 (84%) are a multiple of 4 from −48 to 48. 32 more are multiples of 4 above 48 (56, 64, 80, 100, 112, 120). **508 (15%) are off the 4px grid.** About 100 of those are 1px or 2px.

**JSX props.** 924 of 940 use an integer from 0 to 12. That number is a Box step on the design-system `Box`, and a **pixel** on the deprecated local `Box`. See the unit trap below. Files that import only the design-system `Box` have **zero** spacing props outside 0–12.

### Which values actually get used

Mode in every mechanism is 16px (step 4).

StyleSheet literals, top values:

| px | Count | On the Box scale? |
| ---: | ---: | --- |
| 16 | 1,044 | yes (4) |
| 8 | 650 | yes (2) |
| 12 | 275 | yes (3) |
| 4 | 272 | yes (1) |
| 0 | 212 | yes (0) |
| 24 | 204 | yes (6) |
| **10** | **166** | no |
| 20 | 107 | yes (5) |
| **6** | **79** | no |
| **2** | **74** | no |
| 32 | 48 | yes (8) |
| **5** | **34** | no |
| **15** | **26** | no |
| **1** | **24** | no |
| 40 | 21 | yes (10) |
| **14** | **18** | no |
| **30** | **15** | no |
| 48 | 13 | yes (12) |

Tailwind pixels (class resolved through the 16px rem): 16 (2,086), 8 (1,081), 12 (858), 4 (553), 24 (337), 0 (119), 32 (113), 20 (83), 2 (76), 6 (50), 10 (25), 48 (24). The single most used class is `px-4` (914), then `gap-2` (399), `gap-3` (276), `gap-1` (236), `gap-4` (216), `p-4` (178).

JSX prop steps (the raw number, before the pixel-versus-step distinction): 4 (278), 2 (215), 3 (168), 1 (127), 8 (39), 6 (29), 12 (27), 0 (24), 5 (12), 10 (5).

Off-grid layout clusters on **10, then 6, then 15, 5, 14, and 30**. The 1px and 2px hits are a mix of type-alignment nudges and accidentally tight padding. They are real, and they are a poor candidate for a new token.

---

## Where the same role gets different values

### Screen horizontal padding

Horizontal padding (`paddingHorizontal`, `paddingLeft`, `paddingRight`, `px-*`, `pl-*`, `pr-*`, and `paddingHorizontal={n}`):

| px | Approx. declarations | Reading |
| ---: | ---: | --- |
| 16 | ~1,390 | The screen inset. About two thirds of horizontal padding. |
| 8 | ~210 | Dense rows and the design-system header (`px-2`). |
| 12 | ~130 | A third inset, mostly inside controls. |
| 24 | ~105 | Sheets and a few full screens (account approval uses 24 throughout). |
| 0 | ~80 | Full-bleed sections. |
| 4 | ~55 | Hairline inset. |
| 10 | 31 StyleSheet hits | Off the scale. |
| 32 | ~30 | Occasional wide inset (Perps slider section). |
| 20 | ~25 | On the scale, rarely, and often next to a 15. |

On files under `Views/` or named like a screen, 16px is even more dominant (about 770 of the screen-scoped horizontal hits), with 8, 12, and 24 as the only meaningful alternates.

### List rows

The design-system row is 16 horizontal and 12 vertical. Legacy rows restate that in pixels and then drift:

- `app/component-library/components/List/ListItem/ListItem.styles.ts` — `padding: 16` on every side, so vertical is 16, not 12.
- `app/components/UI/ActivityListItemRow/ActivityListItemRow.styles.ts` — horizontal 16, vertical 8.
- `app/components/Base/ListItem.tsx` — `padding: 15`, `marginBottom: 10`, `paddingTop: 10`, `paddingLeft: 40`.
- `app/components/UI/Bridge/components/SkeletonItem.tsx` — `paddingLeft: 18`, `paddingRight: 10`, `paddingVertical: 12`, plus a pixel `gap={16}`.
- `app/component-library/components-temp/Accounts/AccountBalance/AccountBalance.styles.ts` — `marginHorizontal: 10`.

### Cards

Both card primitives are 16px (`p-4` and `padding: 16`). Feature cards that use Tailwind stay there: `px-4` / `p-4` is the mode, with `p-3` (12) and `px-6` (24) as the secondary choices. Off-card values show up in one-off styles (`padding: 20`, `padding: 3`) rather than in the primitive.

### Section rhythm

There is no section token. Measured gaps, from most common to least:

| px | What uses it |
| ---: | --- |
| 8 | Most common `gap`. `gap-2` (399) plus Box `gap={2}`. Tight stacks and icon rows. |
| 12 | `gap-3` (276). Text field accessory gap. Title-plus-body stacks. |
| 4 | `gap-1` (236). Icon-to-label inside `SectionHeader` and `ButtonBase`. |
| 16 | `gap-4` (216). Grouped blocks, sheet button stacks. |
| 24 | Largest *common* vertical step. 337 Tailwind hits and 204 StyleSheet hits at 24px. Settings rows (`marginTop: 24`). |
| 32 | Real but secondary. 113 Tailwind hits and 48 StyleSheet hits. Predict’s section rhythm (changelog: 32px under section headers) lives here, as step 8. |
| 20 | `SectionDivider`’s default `marginVertical={5}`. Also a handful of screen insets. |

### Buttons and inputs

Design-system controls are consistent (table above). Legacy controls are the off-grid source:

- `app/components/UI/StyledButton/styledButtonStyles.ts` — `padding: 15`.
- `app/component-library/components/Buttons/Button/.../ButtonBase.styles.ts` — 16 horizontal, 8 beside the icon (design-system icon gap is 4).
- `app/component-library/components/Form/TextField/TextField.styles.ts` — matches the design system in pixels (16, accessory 12, height 48) and still writes the numbers by hand.
- `app/components/Views/NetworkSelector/NetworkSearchTextInput/NetworkSearchTextInput.styles.ts` — every padding in the file is 10.
- `app/component-library/components/Toast/Toast.styles.ts` — `paddingTop: 10`.

### The unit trap

Two components are named `Box` and they do not share a unit.

| | Files importing it | `gap={16}` means |
| --- | ---: | --- |
| `Box` from `@metamask/design-system-react-native` | 1,197 | Illegal. Step 16 is outside `BoxSpacing`. No production `gap` / `padding` on this Box uses a number outside 0–12. |
| `Box` from `app/components/UI/Box/Box.tsx` (deprecated in the file’s own comment) | 62 | **16 pixels.** The prop is passed straight to React Native. |
| Legacy `ListItem` `gap` | component-library | **Pixels.** It sets the width of a spacer view. Default 16. |

No file imports both Boxes by name. 40 of the 62 pixel-Box files already import other design-system components (`HeaderBase`, `BottomSheet`, `Button`) in the same file, which makes a partial swap look finished. The hazard is the migration: replacing the import and leaving the number turns `gap={16}` from 16px into a dropped class, and turns `gap={4}` from 4px into 16px.

Pixel `gap` values on that local Box (64 props): `gap={8}` ×19, `gap={4}` ×11, `gap={12}` ×8, `gap={2}` ×7, `gap={6}` ×6, `gap={16}` ×5, `gap={10}` ×2, `gap={3}` ×2, and one each of `0`, `14`, `20`, `24`. The `gap={4}` and `gap={8}` sites are the silent ones. They look like steps.

Call sites that are off the scale, or that use a number past 12:

| Call site | Prop | Pixels today | Nearest step |
| --- | --- | ---: | --- |
| `app/components/Snaps/SnapUICard/SnapUICard.tsx` | `gap={16}` | 16 | 4 |
| `app/components/Snaps/SnapUIAccountSelector/SnapUIAccountSelector.tsx` | `gap={16}` | 16 | 4 |
| `app/components/Snaps/SnapUIAssetSelector/SnapUIAssetSelector.tsx` | `gap={16}` | 16 | 4 |
| `app/components/UI/Bridge/components/SkeletonItem.tsx` | `gap={16}` and `gap={4}` | 16 and 4 | 4 and 1 |
| `app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal.tsx` | `gap={20}` | 20 | 5 |
| `app/components/Views/confirmations/components/info/custom-amount-info/custom-amount-info.tsx` | `gap={16}` | 16 | 4 |
| `app/components/Views/confirmations/components/rows/bridge-fee-row/bridge-fee-row.tsx` | `gap={14}` and `gap={6}` | 14 and 6 | 4 or 3, and 1 or 2 |
| `app/components/Views/confirmations/components/edit-amount-keyboard/edit-amount-keyboard.tsx` | `gap={10}` | 10 | 2 or 3 |
| `app/components/Views/confirmations/components/deposit-keyboard/deposit-keyboard.tsx` | `gap={10}` | 10 | 2 or 3 |
| `app/components/Views/MultichainAccounts/AccountDetails/AccountTypes/BaseAccountDetails/index.tsx` | `gap={24}` | 24 | 6 |
| `app/components/UI/SettingsDrawer/index.js` | `ListItem gap={16}` | 16px spacer | leave until the row is the design-system `ListItem` |
| `app/components/Views/AddAsset/components/SearchTokenResults/SearchTokenResults.tsx` | `gap={20}` on legacy list items | 20px spacer | step 5 only after the component changes |

`gap={6}` also shows up on the confirmation activity rows (`transaction-details-status`, `transaction-details-account-row`, `transaction-details-paid-with-row`, `transaction-details-to-row`). Those are 6px today.

---

## Where it clusters

Newest surfaces already speak the scale. Older StyleSheets hold the off-grid values.

| Area | Style literals | Off-grid | Tailwind classes | What that means |
| --- | ---: | ---: | ---: | --- |
| `UI/Rewards` | 6 | 1 | 887 | On the scale. |
| `UI/Predict` | 34 | 0 | 513 | On the scale. |
| `UI/Card` | 5 | 1 | 394 | On the scale. |
| `Views/Homepage` | 5 | 1 | 97 | Shell is on the scale. |
| `UI/Perps` | 430 | 35 | 564 | Half migrated. Off-grid is concentrated, not spread through every class. |
| `UI/Ramp` | 340 | 53 | 94 | Worst product cluster. Shared `ScreenLayout` is part of it. |
| `Views/confirmations` | 319 | 41 | 97 | Legacy confirmation styles plus the pixel Box. |
| `Views/MultichainAccounts` | 176 | 10 | 44 | Includes the pixel `Box gap={24}`. Several account-detail files import the pixel Box next to design-system headers. |
| `Views/Settings` | 165 | 4 | 47 | Mostly on-scale, many different steps in one screen. |
| `component-library` | 150 | 7 | 58 | Primitives are 16px. The 7 misses are 10px and 1–2px. |
| `UI/Earn` | 125 | 11 | 70 | Mixed. |
| `UI/Bridge` | 111 | 17 | 148 | Skeleton row and a few arbitrary classes. |
| `UI/AccountApproval` | 41 | 13 | 0 | Connect sheet. 24px inset plus 2, 15, 20, 10. |
| `Views/NetworkSelector` | 39 | 12 | 1 | Search field is entirely 10px. |
| `components/Base` | 36 | 16 | 0 | `ListItem` at 15 and 10. |
| `UI/DesignerMode` | 83 | 50 | 0 | Dev-only inspector chrome. Densest off-grid file, not a product screen. |

### Worst product files

Off-grid literal count, Designer Mode set aside. Dev playgrounds are listed and marked so they are not scheduled ahead of product screens.

| Off-grid | File | What is wrong |
| ---: | --- | --- |
| 15 | `app/components/UI/Ramp/Views/HeadlessPlayground/HeadlessPlayground.styles.ts` | Dev playground. 2, 6, 10. |
| 13 | `app/components/UI/AccountApproval/styles.ts` | Connect / reconnect sheet. Inset is 24 (on scale) and then `padding: 2`, horizontal 20, and 10s. |
| 9 | `app/components/UI/NetworkInfo/index.tsx` | Network education modal. `marginVertical: 10`, `padding: 10`, `marginBottom: 30`, `padding: 20`, `padding: 5`, `padding: 15`. |
| 7 | `app/components/UI/AccountOverview/index.js` | Account header on the wallet. `paddingHorizontal: 20` next to `paddingHorizontal: 15`, plus 7, 5, and 2. |
| 7 | `app/components/UI/HardwareWallet/AccountSelector/styles.tsx` | 5, 10, 15, 30. |
| 7 | `app/components/UI/UrlAutocomplete/styles.ts` | 15, 10, 7. |
| 6 | `app/components/Views/NetworkSelector/NetworkSelector.styles.ts` | Screen inset is 16, then 1, 2, and 10 on cells and the search affordance. |
| 6 | `app/components/Views/NetworkSelector/NetworkSearchTextInput/NetworkSearchTextInput.styles.ts` | All six paddings are 10. |
| 6 | `app/components/UI/Tabs/TabThumbnail/TabThumbnail.styles.ts` | 2 and 6. |
| 6 | `app/components/Views/confirmations/legacy/components/CustomNonceModal/index.js` | 10, 6, 14. |
| 5 | `app/components/Base/InfoModal.tsx` | Shared base modal. |
| 5 | `app/components/UI/AddressInputs/index.js` | 10, 6, 2. |
| 5 | `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.styles.ts` | Layout itself is 16. The off-grid set is the info-icon hit target: `padding: 10` and margins of −6 and −10. |
| 5 | `app/components/UI/ReviewModal/styles.ts` | 14, 30, 6. |
| 5 | `app/components/product-safety/scam-questionnaire/scam-questionnaire.styles.ts` | 18, 10, 14, 2, in a file that already uses 13 different spacing values. |

On-scale files that still feel inconsistent, because one screen uses too many steps:

- `app/components/Views/Settings/SecuritySettings/SecuritySettings.styles.ts` — 16 and 24 for settings rows, 20 for the modal, 48 and 112 for scroll clearance.
- `app/components/UI/PermissionsSummary/PermissionsSummary.styles.ts` — 35 literals, six distinct values, almost all on-scale.
- `app/components/Views/MultichainAccounts/MultichainPermissionsSummary/MultichainPermissionsSummary.styles.ts` — same pattern, 34 literals.
- `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.styles.ts` — 32 literals.

Shared shells worth fixing once, because many screens inherit them:

- `app/components/UI/Ramp/Aggregator/components/ScreenLayout.tsx` — `padding: 15`, then `paddingHorizontal: 16`, and `marginHorizontal: 20` on the description.
- `app/components/Base/ListItem.tsx` — `padding: 15`.
- `app/components/UI/StyledButton/styledButtonStyles.ts` — `padding: 15`.
- `app/components/UI/BlockingActionModal/index.tsx` — `padding: 15`.
- `app/components/Views/Quiz/QuizContent/styles.ts` — `padding: 15`.
- `app/core/HardwareWallet/components/HardwareWalletBottomSheet/contents/ContentLayout.tsx` — `paddingHorizontal: 24`.

Arbitrary classes worth naming:

- `app/components/UI/PredictNext/events/markets/MarketCard.tsx` and `MarketFooterCard.tsx` — `gap-[10px]` beside `px-4`.
- `app/components/UI/Bridge/components/TokenWarningModal/index.tsx` — `pl-[25px]`.
- `app/components/Views/AddAsset/components/AddCustomToken/AddCustomToken.tsx` (and the collectible sibling) — `pb-[3px]` on labels.
- `app/components/UI/MarketingMomentTitle/MarketingMomentTitle.utils.ts` — `py-[6.4px]` and matching negative margins. This is type alignment, not layout padding.
- `app/components/Views/ResetPassword/index.tsx` — `pb-[30px]`.

---

## Proposal

Keep the Box scale. Map roles onto steps the components already use. Add names for those roles in documentation and, later, in one constant module for StyleSheet files. Leave safe-area insets, keyboard padding, and 1–2px type alignment off the scale.

### Semantic rules

| Role | Step | px | Write it as | Grounded in |
| --- | ---: | ---: | --- | --- |
| Screen content inset | 4 | 16 | `paddingHorizontal={4}` or `px-4` | Dominant horizontal padding. `Card`, `ListItem`, `TextField`, `SectionHeader`, `BottomSheetFooter`. |
| Header inset | 2 | 8 | `px-2` | `HeaderStandard`, design-system `BottomSheetHeader`. |
| List row | 4 and 3 | 16 and 12 | `px-4 py-3` | Design-system `ListItem`. |
| Card padding | 4 | 16 | `p-4` | Both card primitives. |
| Text field | 4 and 3 | 16 and 12 | `px-4 gap-3` | Design-system `TextField`. Matches legacy field pixels. |
| Button, label only | 4 | 16 | `px-4` | `ButtonBase`. |
| Button, side with an icon | 3 | 12 | `pl-3` / `pr-3` | `getButtonBaseHorizontalPaddingTwClasses`. |
| Icon-to-label gap | 1 | 4 | `gap={1}` | `ButtonBase`, `SectionHeader`. |
| Tight stack, icon row | 2 | 8 | `gap={2}` / `gap-2` | Most common gap in the app. Header accessory groups. |
| Related stack (title and body, field group) | 3 | 12 | `gap={3}` / `gap-3` | Second most common gap. Text field. |
| Group gap, sheet button stack | 4 | 16 | `gap={4}` / `mt-4` | `gap-4`, `BottomSheetFooter`. |
| Section break | 6 | 24 | `gap={6}` / `mt-6` | Most common large vertical step. |
| Large section break | 8 | 32 | `gap={8}` / `mb-8` | Predict section rhythm. Use when the screen is already on 32. |
| Divider margin | 5 | 20 | `marginVertical={5}` | `SectionDivider` default. |
| Full bleed | 0 | 0 | `px-0` | Charts, media, lists that inset their own rows. |

### Decisions to sign off before editing pixels

These are the places the legacy library and the design system disagree. The audit recommends the design-system column for **new** work. Changing the legacy primitive moves every existing screen, so that stays a separate, visual pass.

1. **Sheet header inset.** Design-system header is 8px (`px-2`). Legacy `BottomSheetHeader` is 16px. Recommend 8 for anything built on the design-system header, and leave the legacy 16 until a dedicated header pass.
2. **List row vertical padding.** Design-system row is 12. Legacy `ListItem` is 16. Activity rows are 8. Recommend 12 for new rows.
3. **Button icon gap.** Design system is 4. Legacy `ButtonBase` is 8. Recommend 4 for new buttons.
4. **Section break.** 24 is the common large step. 32 is established on Predict. Recommend 24 as the default and 32 as the one allowed larger break, rather than also keeping 20, 28, and 40 as section gaps.
5. **Modal inset.** Account approval and the hardware-wallet sheet use 24, which is on the scale. Recommend 16 for screen content and for sheet **body** copy, matching `BottomSheetFooter`’s `px-4`. A sheet that needs 24 says so on purpose, in one place.

### What the system does not have yet

- A spacing object on `Theme`. StyleSheet files cannot write `theme.spacing[4]`. They write `16`.
- Semantic names. Every call site repeats `px-4`. The role lives in the component default, and feature code re-implements it.
- A closed scale in Tailwind. Half steps and `p-14` (56px) compile because the preset does not remove them.
- One `Box`. The deprecated pixel `Box` and the step `Box` accept the same prop names.
- A lint rule. Color hex is an error. `padding: 15` is silent.
- A step above 48. Scroll clearance (`paddingBottom: 112` in Security settings) and safe-area math should stay expressions (`insets.bottom`, `headerInset`), not new steps.

### Values to retire

Retire as layout spacing, snapping to the nearest role above: **10, 6, 15, 5, 14, 18, 25, 30**. Keep 20 only for divider margin (step 5) and the rare case that already matches `SectionDivider`. Keep 1px and 2px only as a commented optical adjustment (type, badge overlap), which is how `Toast`, `TagBase`, `MainActionButton`, and `MarketingMomentTitle` already behave.

---

## Fix plan

Highest leverage and lowest risk first. Each item is a later pull request. None of them is a repo-wide StyleSheet migration: 871 files call `StyleSheet.create`, and Rewards, Predict, Card, and Homepage show that new work can land on the scale without rewriting the old files.

### 1. Sign off the table above

No code. The open choices are the five decisions in the previous section. After sign-off, new work uses the table. Existing screens move only in the items below.

### 2. Retire the pixel `Box` before any further Box migration

62 files import `app/components/UI/Box/Box.tsx`. Convert `gap` from pixels to steps in the same edit that switches the import. 40 of those files already import other design-system components, so the diff should replace the Box import only and rescale every `gap`. Start with the off-scale and double-digit gaps, where a wrong unit is obvious on screen:

- `app/components/Snaps/SnapUICard/SnapUICard.tsx`
- `app/components/Snaps/SnapUIAccountSelector/SnapUIAccountSelector.tsx`
- `app/components/Snaps/SnapUIAssetSelector/SnapUIAssetSelector.tsx`
- `app/components/UI/Bridge/components/SkeletonItem.tsx` (`gap={16}` → step 4, `gap={4}` → step 1, and snap `paddingLeft: 18` / `paddingRight: 10` to 16 / 8 or 12)
- `app/components/Views/confirmations/components/info/custom-amount-info/custom-amount-info.tsx`
- `app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal.tsx` (`gap={20}` → step 5)
- `app/components/Views/confirmations/components/rows/bridge-fee-row/bridge-fee-row.tsx` (`gap={14}` → 12 or 16, `gap={6}` → 4 or 8)
- `app/components/Views/confirmations/components/edit-amount-keyboard/edit-amount-keyboard.tsx` and `deposit-keyboard.tsx` (`gap={10}`)
- `app/components/Views/MultichainAccounts/AccountDetails/AccountTypes/BaseAccountDetails/index.tsx` (`gap={24}` → step 6)

Then the remaining local Box files. The quiet ones need the same conversion: `gap={8}` (19 props) → step 2, `gap={4}` (11) → step 1, `gap={12}` (8) → step 3, `gap={2}` (7) → step 1 or 0. Confirmation activity rows and account-details sheets are the bulk of the import list.

Leave legacy `ListItem gap={16}` and `gap={20}` alone until that row is rebuilt on the design-system `ListItem`. The prop is a pixel spacer, and the design-system component does not take `gap` in pixels.

### 3. Correct the shared shells that hardcode 15

One file each, many screens. Snap 15 → 16 and 20 → 16 where 20 is sitting next to a 16 in the same shell.

- `app/components/UI/Ramp/Aggregator/components/ScreenLayout.tsx` — this is why Ramp is the worst off-grid feature (53 literals). `padding: 15` and `marginHorizontal: 20` become 16. `paddingHorizontal: 16` is already right.
- `app/components/Base/ListItem.tsx` — `padding: 15` → 16, `marginBottom: 10` and `paddingTop: 10` → 8 or 12.
- `app/components/UI/StyledButton/styledButtonStyles.ts` — `padding: 15` → 16.
- `app/components/UI/BlockingActionModal/index.tsx` — `padding: 15` → 16.
- `app/components/Views/Quiz/QuizContent/styles.ts` — `padding: 15` → 16.

`ContentLayout.tsx` under Hardware Wallet (`paddingHorizontal: 24`) waits on decision 5. 24 is on the scale.

### 4. Snap the 10px cluster on visible legacy screens

Literal swaps only. Keep the StyleSheet. Touch the info-icon hit target separately from layout padding.

Product screens, in order:

1. `app/components/UI/AccountOverview/index.js` — wallet account header. 20 and 15 become 16. 7 and 5 become 8 or 4. Leave a 2 only if it is aligning type.
2. `app/components/UI/AccountApproval/styles.ts` — keep the 24px sheet inset if decision 5 allows it; replace `padding: 2` and the 20 / 10 values.
3. `app/components/Views/NetworkSelector/NetworkSearchTextInput/NetworkSearchTextInput.styles.ts` — 10 → 12 (step 3, the field scale) or 8.
4. `app/components/Views/NetworkSelector/NetworkSelector.styles.ts` — 10, 2, and 1 on cells. The 16px screen inset stays.
5. `app/components/UI/NetworkInfo/index.tsx` — 10, 30, 15, 5. 30 → 32, 20 can stay (step 5) or become 16 with the modal inset.
6. `app/components/UI/UrlAutocomplete/styles.ts`, `app/components/UI/AddressInputs/index.js`, `app/components/UI/ReviewModal/styles.ts`, `app/components/Views/confirmations/legacy/components/CustomNonceModal/index.js`.
7. `app/components/UI/PredictNext/events/markets/internal/MarketCard.tsx` and `MarketFooterCard.tsx` — `gap-[10px]` → `gap-2` or `gap-3`.
8. `app/components/UI/Bridge/components/TokenWarningModal/index.tsx` — `pl-[25px]` → `pl-6` (24) or `pl-4` (16).
9. `app/component-library/components/Toast/Toast.styles.ts` (`paddingTop: 10`) and `app/component-library/components-temp/Accounts/AccountBalance/AccountBalance.styles.ts` (`marginHorizontal: 10`).

Do last, or never, as product work: `DesignerModeRN.tsx` (50 off-grid values, dev-only), `HeadlessPlayground.styles.ts`, `AesCryptoTestForm`.

`PerpsOrderView.styles.ts` layout padding is already 16. The `padding: 10` and negative margins belong to the info icon’s hit area. Change that with a tap-target check, not with the layout snap.

### 5. Give StyleSheet a name for the scale, and warn on the next 15

Add one module, for example `app/component-library/constants/spacing.ts`, that exports the step table (`spacing[4] === 16`). Point the legacy primitives at it so 16 is written once:

- `app/component-library/components/Cards/Card/Card.styles.ts`
- `app/component-library/components/List/ListItem/ListItem.styles.ts`
- `app/component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase.styles.ts`
- `app/component-library/components/Form/TextField/TextField.styles.ts`
- `app/component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader.styles.ts`

That edit is a rename of literals the primitives already use. It does not change pixels, including the three disagreements (list vertical 16, header 16, icon gap 8). Those move only after the decisions above.

Then a warn-level lint, scoped at first to `app/component-library` and `app/components/Views`, for `padding` / `margin` / `gap` literals outside the scale. Color already has this pattern (`color-no-hex`). Spacing does not. Warning rather than error, so the 508 existing misses do not block the tree.

Perps already has a local version of this (`FIXED_BOTTOM_CONTAINER_PADDING = 16` in `app/components/UI/Perps/constants/perpsUIConfig.ts`). A shared map replaces further one-off constants.

### Later, one surface at a time, while those files are already open

Not a sweep. The remaining StyleSheet mass, once the shells and the 10px cluster are done:

| Surface | Why it waits |
| --- | --- |
| `UI/Perps` stylesheets (430 literals, 35 off-grid) | Mixed with 564 Tailwind classes. Snap off-grid files as each Perps view is touched. `PerpsMarketListView` and `PerpsHomeView` are the large ones. |
| `Views/confirmations` (319 literals, 41 off-grid) | After the pixel Box swap. Legacy modals (`CustomNonceModal`) can go in item 4. |
| `UI/Ramp` beyond `ScreenLayout` | The shell fix removes the inherited 15. What remains is feature styles. |
| `Views/Settings`, `Views/MultichainAccounts`, `UI/Earn` | Mostly on-scale. Collapse extra steps (20 beside 16, 48 beside 24) when the screen is edited. `SecuritySettings.styles.ts` is the example. |
| Rewards, Predict, Card, Homepage | Already on the scale. Leave them. |

### Leave for a visual pass after sign-off

- Restyling legacy `ListItem` from `padding: 16` to `px-4 py-3`.
- Restyling legacy `BottomSheetHeader` from 16 to 8.
- Restyling legacy button icon margin from 8 to 4.
- Rewriting StyleSheet files into Tailwind for its own sake.
- Encoding safe-area, keyboard, and tab-bar insets as steps. `pb-[${floatingTabBarInset}px]` and `headerInset` are the right shape.
