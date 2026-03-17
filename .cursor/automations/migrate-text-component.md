# Text Component Migration Automation

## Purpose

Migrate deprecated Text components to `@metamask/design-system-react-native` in the MetaMask Mobile codebase. Part of [MetaMask/metamask-mobile#6887](https://github.com/MetaMask/metamask-mobile/issues/6887).

There are 2000+ legacy Text instances across the codebase. This automation plays the long game: each run produces one small, reviewable PR (max 5 files, one code owner). Over many runs the automation gradually eliminates all deprecated usages.

---

## Cursor Automation Configuration

**Trigger:** Schedule — run once per day (or on demand via webhook)
**Tools required:** GitHub (read repo, create branches, open PRs), Slack (configured recipient), Memory (track progress across runs)
**Prompt:** See "Agent Instructions" section below

---

## Agent Instructions

### Step 0 — Consult Memory

Before doing anything else, read your memory notes for this automation. Look for:

- A list of files already migrated in previous runs (to avoid re-migrating or duplicating PR work)
- The last code owner targeted (to prefer a different one this run for variety, or continue one with many files remaining)
- Any known edge cases or patterns flagged in previous runs

If no memory exists yet, treat everything as fresh.

---

### Step 1 — Select Target Files

**Pick one code owner** from the table below. Choose one that has remaining deprecated Text usages and has not been fully migrated.

| Path pattern                                                                                           | Owner                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------- |
| `app/components/UI/Ramp/components/`, `app/components/UI/Ramp/hooks/`, `app/components/UI/Ramp/Views/` | @MetaMask/ramp            |
| `app/components/Views/confirmations/`                                                                  | @MetaMask/confirmations   |
| `app/components/UI/Bridge/`, `app/components/UI/Swaps`                                                 | @MetaMask/swaps-engineers |
| `app/components/UI/Earn/`, `**/Earn/**`                                                                | @MetaMask/metamask-earn   |
| `app/components/UI/Perps/`, `**/Perps/**`                                                              | @MetaMask/perps           |
| `app/components/UI/Predict/`, `**/Predict/**`                                                          | @MetaMask/predict         |
| `app/components/UI/Card/`                                                                              | @MetaMask/card            |
| `app/components/UI/Assets/`, `app/components/UI/TokenDetails/`                                         | @MetaMask/metamask-assets |
| `app/components/Views/Login/`, `app/components/Views/Settings/`                                        | @MetaMask/mobile-core-ux  |
| `app/components/Views/Onboarding/`                                                                     | @MetaMask/web3auth        |

**Note for @MetaMask/ramp:** Only target the new combined flow folders — `Ramp/components/`, `Ramp/hooks/`, and `Ramp/Views/`. **Do not touch** `Ramp/Aggregator/` or `Ramp/Deposit/` — these are legacy experiences that will not be refactored and are excluded from DS adoption work.

**Find deprecated Text imports** within that owner's paths. Search for files containing any of:

- `from '../../../component-library/components/Texts/Text'`
- `from '../../component-library/components/Texts/Text'`
- `from 'app/component-library/components/Texts/Text'`
- `from '../../../components/Base/Text'`
- `from '../../components/Base/Text'`
- `from 'app/components/Base/Text'`
- Any relative path resolving to `app/component-library/components/Texts/Text` or `app/components/Base/Text`

**Exclude** files already in memory as migrated. **Pick at most 5 files** for this run — prefer simpler files (fewer Text usages) to keep the PR reviewable.

---

### Step 2 — Apply Migration Rules

For each selected file, apply the rules below. Preserve all existing behavior. Do not refactor anything unrelated to the Text migration.

#### 2a. Import Change

**Component-library Text** — replace:

```ts
import {
  Text,
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
// or any relative path to app/component-library/components/Texts/Text
```

With:

```ts
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  FontStyle,
} from '@metamask/design-system-react-native';
```

Only import what is actually used. Remove `TextVariant`, `TextColor`, `FontWeight`, `FontStyle` from the import if not referenced in the file after migration.

**Base/Text** — replace:

```ts
import Text from '../../../components/Base/Text';
// or any relative path to app/components/Base/Text
```

With:

```ts
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  FontStyle,
} from '@metamask/design-system-react-native';
```

Same rule: only import what ends up used.

If the file also imports `TextButton` for link migration, add it to the same import line:

```ts
import {
  Text,
  TextButton,
  TextButtonSize,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
```

#### 2b. Variant Name Casing (component-library Text)

All variants use consistent mixed-case in the design system. Replace:

| Old                     | New                     |
| ----------------------- | ----------------------- |
| `TextVariant.DisplayLG` | `TextVariant.DisplayLg` |
| `TextVariant.DisplayMD` | `TextVariant.DisplayMd` |
| `TextVariant.HeadingLG` | `TextVariant.HeadingLg` |
| `TextVariant.HeadingMD` | `TextVariant.HeadingMd` |
| `TextVariant.HeadingSM` | `TextVariant.HeadingSm` |
| `TextVariant.BodyMD`    | `TextVariant.BodyMd`    |
| `TextVariant.BodySM`    | `TextVariant.BodySm`    |
| `TextVariant.BodyXS`    | `TextVariant.BodyXs`    |

#### 2c. Font Weight Separation (component-library Text)

Font weight is now a separate prop. Replace combined variants:

| Old                        | New                                                           |
| -------------------------- | ------------------------------------------------------------- |
| `TextVariant.BodyLGMedium` | `variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}` |
| `TextVariant.BodyMDMedium` | `variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}` |
| `TextVariant.BodyMDBold`   | `variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}`   |
| `TextVariant.BodySMMedium` | `variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}` |
| `TextVariant.BodySMBold`   | `variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}`   |
| `TextVariant.BodyXSMedium` | `variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}` |

#### 2d. Color Mapping (component-library Text)

Colors now carry semantic prefixes:

| Old                            | New                                                          |
| ------------------------------ | ------------------------------------------------------------ |
| `TextColor.Default`            | `TextColor.TextDefault`                                      |
| `TextColor.Alternative`        | `TextColor.TextAlternative`                                  |
| `TextColor.Muted`              | `TextColor.TextMuted`                                        |
| `TextColor.Primary`            | `TextColor.PrimaryDefault`                                   |
| `TextColor.PrimaryAlternative` | `TextColor.PrimaryAlternative` _(verify — may be unchanged)_ |
| `TextColor.Success`            | `TextColor.SuccessDefault`                                   |
| `TextColor.Error`              | `TextColor.ErrorDefault`                                     |
| `TextColor.ErrorAlternative`   | `TextColor.ErrorAlternative` _(verify — may be unchanged)_   |
| `TextColor.Warning`            | `TextColor.WarningDefault`                                   |
| `TextColor.Info`               | `TextColor.InfoDefault`                                      |
| `TextColor.Inverse`            | `TextColor.OverlayInverse`                                   |

#### 2e. Base/Text Boolean Prop Mapping

The Base/Text component uses boolean shorthand props. Map each to the MMDS Text API:

| Base/Text prop    | MMDS equivalent                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bold`            | `fontWeight={FontWeight.Bold}`                                                                                                                                      |
| `centered`        | `twClassName="text-center"`                                                                                                                                         |
| `right`           | `twClassName="text-right"`                                                                                                                                          |
| `small`           | `variant={TextVariant.BodySm}`                                                                                                                                      |
| `big`             | `variant={TextVariant.BodyLg}`                                                                                                                                      |
| `bigger`          | `variant={TextVariant.BodyLg}` _(closest match; fontSize 18 vs BodyLg — note in PR if visually different)_                                                          |
| `upper`           | `twClassName="uppercase"`                                                                                                                                           |
| `bold + centered` | `fontWeight={FontWeight.Bold} twClassName="text-center"`                                                                                                            |
| `primary`         | Omit — `TextDefault` is the MMDS Text default color                                                                                                                 |
| `black`           | Omit — `TextDefault` is the MMDS Text default color                                                                                                                 |
| `muted`           | `color={TextColor.TextMuted}`                                                                                                                                       |
| `grey`            | `color={TextColor.TextAlternative}` _(maps to colors.text.alternative)_                                                                                             |
| `red`             | `color={TextColor.ErrorDefault}`                                                                                                                                    |
| `green`           | `color={TextColor.SuccessDefault}`                                                                                                                                  |
| `blue`            | `color={TextColor.PrimaryDefault}` — but if combined with `underline` on a `<Text>` inside a `TouchableOpacity`, collapse both into `<TextButton>` (see Section 2f) |
| `orange`          | `color={TextColor.WarningDefault}`                                                                                                                                  |
| `strikethrough`   | `twClassName="line-through"`                                                                                                                                        |
| `underline`       | `twClassName="underline"` — but if combined with `blue` or `link` on a `<Text>` inside a `TouchableOpacity`, collapse into `<TextButton>` (see Section 2f)          |
| `noMargin`        | `twClassName="my-0"`                                                                                                                                                |
| `reset`           | Omit default styling — just use `<Text>` with explicit props only; no special prop needed                                                                           |
| `disclaimer`      | `variant={TextVariant.BodySm} fontStyle={FontStyle.Italic}` — add `style={{ letterSpacing: 0.15 }}` if letter-spacing is visually important                         |
| `modal`           | `variant={TextVariant.BodyLg}` _(fontSize 16, lineHeight ~22 — note if line-height matters)_                                                                        |
| `infoModal`       | Use `style={{ lineHeight: 20, marginVertical: 6 }}` until a Tailwind equivalent is confirmed                                                                        |
| `link`            | **Use `<TextButton>` instead of `<Text>`** — see Section 2f                                                                                                         |

When multiple boolean props combine on one element, apply all the mappings together:

```tsx
// Before (Base/Text)
<Text bold centered red>{message}</Text>

// After (MMDS)
<Text fontWeight={FontWeight.Bold} twClassName="text-center" color={TextColor.ErrorDefault}>
  {message}
</Text>
```

#### 2f. Interactive / Link Text — Use TextButton

A `TouchableOpacity` (or `Pressable`) wrapping a link-styled `<Text>` should collapse into a single `<TextButton>`. The `onPress` lives on the wrapper, never on `<Text>` itself — so the whole pair becomes one element.

Treat the following as link patterns that warrant `<TextButton>`:

1. `TouchableOpacity` wrapping `<Text link>`
2. `TouchableOpacity` wrapping `<Text link underline>` or `<Text small link underline>`
3. `TouchableOpacity` wrapping `<Text blue underline>` — visual link styling even without `link` prop
4. `TouchableOpacity` wrapping any `<Text>` whose sole purpose is to be tappable (wrapper has no other layout role)

```tsx
// Before
<TouchableOpacity onPress={handlePress}>
  <Text small link underline centered>
    {providerWebsite}
  </Text>
</TouchableOpacity>

// After
<TextButton size={TextButtonSize.BodySm} onPress={handlePress} twClassName="text-center">
  {providerWebsite}
</TextButton>
```

Size the TextButton to match surrounding text:

```tsx
import {
  TextButton,
  TextButtonSize,
} from '@metamask/design-system-react-native';

<TextButton size={TextButtonSize.BodySm} onPress={handlePress}>
  {linkText}
</TextButton>;
```

Available sizes: `TextButtonSize.BodySm`, `TextButtonSize.BodyMd`, `TextButtonSize.BodyLg`.

If the existing code uses `Linking.openURL` in the press handler, keep that logic unchanged — just move it to `onPress` on `TextButton`.

#### 2g. Style Prop — Layout vs. Text Styles

The MMDS `Text` component still accepts a `style` prop for cases where the design system API does not cover the need (e.g. layout styles like `flexShrink`, `marginHorizontal` for positioning within a parent, external `StyleSheet` styles passed as props).

**Rule of thumb:**

- **Text-specific styles** (color, fontSize, fontWeight, textAlign, textTransform, textDecorationLine) → use Text API props and `twClassName`
- **Layout / structural styles** (flex, margin for positioning, padding, width) → keep in `style` prop via `StyleSheet`
- **Conditional / dynamic styles** → use `tw.style()` from `useTailwind()` hook:

```tsx
import { useTailwind } from '@metamask/design-system-react-native';

const tw = useTailwind();
<Text style={tw.style(isError && 'text-error-default')}>...</Text>;
```

Do **not** use `StyleSheet.create()` for static text-appearance styles — prefer `twClassName`.

#### 2g-i. Migrate StyleSheet Text-Appearance Entries

When migrating a component, **also inspect its companion styles file** (e.g. `Component.styles.ts`). Any `StyleSheet` entry that is applied exclusively to a `Text` element and contains only text-appearance properties (`fontSize`, `fontWeight`, `color`) must be migrated to Text props. Remove the entry from the `StyleSheet` and remove the `style={styles.x}` prop from the `<Text>`.

Map the values as follows:

| StyleSheet value                           | Text prop                           |
| ------------------------------------------ | ----------------------------------- |
| `fontSize: 12` (or scale equivalent)       | `variant={TextVariant.BodySm}`      |
| `fontSize: 14` (or scale equivalent)       | _(default BodyMd — omit variant)_   |
| `fontSize: 16`                             | `variant={TextVariant.BodyLg}`      |
| `fontWeight: '400'`                        | _(default — omit fontWeight)_       |
| `fontWeight: '500'`                        | `fontWeight={FontWeight.Medium}`    |
| `fontWeight: '600'` or `'700'` or `'bold'` | `fontWeight={FontWeight.Bold}`      |
| `color: theme.colors.text.default`         | _(default — omit color)_            |
| `color: theme.colors.text.alternative`     | `color={TextColor.TextAlternative}` |
| `color: theme.colors.text.muted`           | `color={TextColor.TextMuted}`       |
| `color: theme.colors.primary.default`      | `color={TextColor.PrimaryDefault}`  |
| `color: theme.colors.error.default`        | `color={TextColor.ErrorDefault}`    |
| `color: theme.colors.success.default`      | `color={TextColor.SuccessDefault}`  |
| `color: theme.colors.warning.default`      | `color={TextColor.WarningDefault}`  |

If the StyleSheet entry mixes text-appearance and layout properties, **split them**: keep only the layout properties in the `StyleSheet` entry, and move the text-appearance properties to Text props.

**Example** (from `SpendingLimitWarning.styles.ts`):

```ts
// Before — StyleSheet entries used on <Text> elements
mainText: {
  fontSize: 16,
  fontWeight: '600',
  color: theme.colors.text.default,
  marginBottom: 4,         // layout — stays
},
subText: {
  fontSize: 14,
  fontWeight: '400',
  color: theme.colors.text.alternative,
},
```

```ts
// After — only layout properties remain in StyleSheet
mainText: {
  marginBottom: 4,         // layout — kept
},
// subText removed entirely (no layout properties left)
```

```tsx
// Before
<Text style={styles.mainText}>...</Text>
<Text style={styles.subText}>...</Text>

// After
<Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Bold} style={styles.mainText}>
  ...
</Text>
<Text color={TextColor.TextAlternative}>
  ...
</Text>
```

**Always delete the StyleSheet entry** when it contains only text-appearance properties (nothing layout-related remains). Remove the entry from `StyleSheet.create()`, remove the `style={styles.x}` prop from the `<Text>`, and delete the style key. If the `createStyles` function or styles object becomes empty as a result, delete the styles file and its import.

#### 2h. Snapshot Tests

If the file has a corresponding `__snapshots__` file or `.test.tsx` that renders the component, snapshot diffs are expected. Update snapshots after migration:

```bash
yarn jest <path-to-test-file> -u
```

Re-run without `-u` to confirm tests pass. Do **not** add new `.toMatchSnapshot()` calls.

---

### Step 3 — Verify

After making all edits, run the following checks in order. Do not open a PR if any step fails.

```bash
# 1. TypeScript — no type errors in changed files
yarn lint:tsc

# 2. Lint
yarn lint

# 3. Format
yarn format:check

# 4. Unit tests for changed files (update snapshots if needed)
yarn jest --testPathPattern="<changed-file-basename>" --passWithNoTests

# 5. If snapshot updates were needed:
yarn jest --testPathPattern="<changed-file-basename>" -u
yarn jest --testPathPattern="<changed-file-basename>"
```

If `yarn lint:tsc` fails due to unknown props on the MMDS Text component, check the `@metamask/design-system-react-native` package types. If a prop genuinely does not exist, use `style` as a fallback and add a `// TODO: use design system prop when available` comment.

---

### Step 4 — Compliance Check

Before opening the PR, confirm:

- [ ] No `from 'react-native'` bare `Text` imports remain for display text (only `RNText` aliased imports for internal wrappers are OK)
- [ ] No `StyleSheet.create()` entries that only exist to style text appearance (color, weight, size, align) — these must move to MMDS props
- [ ] No `import Text from 'app/components/Base/Text'` or component-library Text imports remain in changed files
- [ ] `FontWeight`, `FontStyle`, `TextVariant`, `TextColor` are all imported from `@metamask/design-system-react-native` (not from component-library)
- [ ] PR title follows Conventional Commits: `refactor: migrate Text to design system in <owner> components`
- [ ] Branch name: `refactor/6887_migrate-text-<owner-slug>` (e.g. `refactor/6887_migrate-text-ramp`)

---

### Step 5 — Open PR and Notify Slack

**Open the PR** using the Open Pull Request tool with the title and body below.

**Then send a Slack message** using the Slack tool with a short summary:

```
Text migration PR open for @MetaMask/<owner>:

*Branch:* `refactor/6887_migrate-text-<owner-slug>`
*Files migrated:*
  • path/to/File1.tsx
  • path/to/File2.tsx

*PR:* <link to opened PR>
```

**PR body to use when opening the PR:**

```
## **Description**

Migrates deprecated `Text` components to `@metamask/design-system-react-native` in the
@MetaMask/<owner> code owner paths. Part of the ongoing #6887 migration.

Files migrated:
- `path/to/File1.tsx`
- `path/to/File2.tsx`

**What:** Replace `app/components/Base/Text` and `app/component-library/components/Texts/Text`
imports with `Text`, `TextButton` from `@metamask/design-system-react-native`.

**Why:** Part of https://github.com/MetaMask/metamask-mobile/issues/6887 — eliminating
deprecated internal Text wrappers in favour of the shared design system component.

## **Changelog**

CHANGELOG entry: null (internal refactor, no user-visible change)

## **Related issues**

Part of: https://github.com/MetaMask/metamask-mobile/issues/6887

## **Manual testing steps**

Feature: Text migration visual parity

  Scenario: user views affected screens
    Given the app is open
    When the user navigates to the screen(s) affected by the changed files
    Then all text renders correctly with the same visual appearance as before

## **Screenshots/Recordings**

N/A — styling parity migration, no visual change intended.
*(If a visual difference is noticed, add before/after screenshots.)*

### **Before**

<!-- [screenshots/recordings] -->

### **After**

<!-- [screenshots/recordings] -->

## **Pre-merge author checklist**

- [x] I've followed MetaMask Contributor Docs and MetaMask Mobile Coding Standards.
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [ ] I've documented my code using JSDoc format if applicable
- [ ] I've applied the right labels on the PR. Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
```

---

### Step 6 — Update Memory

After the PR is opened, save to memory:

- The list of files migrated in this run (append to the running list)
- The owner targeted
- Any edge cases or unusual patterns encountered (e.g. files using `infoModal`, `disclaimer`, `reset`, or complex conditional styles that needed `tw.style()`)
- Any files that were skipped and why (complex, needs manual review, etc.)

Example memory entry format:

```
## Run <date>
Owner: @MetaMask/ramp
Files migrated:
  - app/components/UI/Ramp/Aggregator/components/Account.tsx
  - app/components/UI/Ramp/Aggregator/components/ErrorView.tsx
PR: #XXXXX
Notes: Account.tsx retained StyleSheet for layout styles on Text (flexShrink, marginHorizontal).
```

---

## Migration Reference

### Complete Base/Text Props

Sourced from `app/components/Base/Text/Text.tsx`:

| Prop            | Type | Underlying style                     | MMDS migration                                                                                                                            |
| --------------- | ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `reset`         | bool | removes all defaults                 | Use bare `<Text>` with explicit props                                                                                                     |
| `centered`      | bool | `textAlign: 'center'`                | `twClassName="text-center"`                                                                                                               |
| `right`         | bool | `textAlign: 'right'`                 | `twClassName="text-right"`                                                                                                                |
| `bold`          | bool | `fontWeight: 'bold'`                 | `fontWeight={FontWeight.Bold}`                                                                                                            |
| `green`         | bool | `colors.success.default`             | `color={TextColor.SuccessDefault}`                                                                                                        |
| `black`         | bool | `colors.text.default`                | Omit — `TextDefault` is the MMDS Text default color                                                                                       |
| `blue`          | bool | `colors.primary.default`             | `color={TextColor.PrimaryDefault}` — if combined with `underline` on a `<Text>` inside a `TouchableOpacity`, collapse into `<TextButton>` |
| `red`           | bool | `colors.error.default`               | `color={TextColor.ErrorDefault}`                                                                                                          |
| `grey`          | bool | `colors.text.alternative`            | `color={TextColor.TextAlternative}`                                                                                                       |
| `orange`        | bool | `colors.warning.default`             | `color={TextColor.WarningDefault}`                                                                                                        |
| `primary`       | bool | `colors.text.default`                | Omit — `TextDefault` is the MMDS Text default color                                                                                       |
| `muted`         | bool | `colors.text.muted`                  | `color={TextColor.TextMuted}`                                                                                                             |
| `small`         | bool | `fontSize: 12`                       | `variant={TextVariant.BodySm}`                                                                                                            |
| `big`           | bool | `fontSize: 16`                       | `variant={TextVariant.BodyLg}`                                                                                                            |
| `bigger`        | bool | `fontSize: 18`                       | `variant={TextVariant.BodyLg}` + note in PR                                                                                               |
| `upper`         | bool | `textTransform: 'uppercase'`         | `twClassName="uppercase"`                                                                                                                 |
| `disclaimer`    | bool | BodySm + italic + letterSpacing 0.15 | `variant={TextVariant.BodySm} fontStyle={FontStyle.Italic}` + `style={{ letterSpacing: 0.15 }}` if needed                                 |
| `modal`         | bool | fontSize 16, lineHeight 22.4         | `variant={TextVariant.BodyLg}`                                                                                                            |
| `infoModal`     | bool | lineHeight 20, marginVertical 6      | `style={{ lineHeight: 20, marginVertical: 6 }}`                                                                                           |
| `link`          | bool | `colors.primary.default`             | **Replace element with `<TextButton>`**                                                                                                   |
| `strikethrough` | bool | `textDecorationLine: 'line-through'` | `twClassName="line-through"`                                                                                                              |
| `underline`     | bool | `textDecorationLine: 'underline'`    | `twClassName="underline"` — if combined with `blue` or `link` on a `<Text>` inside a `TouchableOpacity`, collapse into `<TextButton>`     |
| `noMargin`      | bool | `marginVertical: 0`                  | `twClassName="my-0"`                                                                                                                      |

Note: Base/Text default style adds `marginVertical: 2` and `fontSize: scale(14)`. When migrating, the MMDS BodyMd variant (the default) will have different default spacing. This may produce minor layout shifts — note these in the PR.

### Complete Component-Library TextVariant Enum

Sourced from `app/component-library/components/Texts/Text/Text.types.ts`:

| Old enum value             | New enum value          | Font weight change needed        |
| -------------------------- | ----------------------- | -------------------------------- |
| `TextVariant.DisplayLG`    | `TextVariant.DisplayLg` | No                               |
| `TextVariant.DisplayMD`    | `TextVariant.DisplayMd` | No                               |
| `TextVariant.HeadingLG`    | `TextVariant.HeadingLg` | No                               |
| `TextVariant.HeadingMD`    | `TextVariant.HeadingMd` | No                               |
| `TextVariant.HeadingSM`    | `TextVariant.HeadingSm` | No                               |
| `TextVariant.BodyLGMedium` | `TextVariant.BodyLg`    | `fontWeight={FontWeight.Medium}` |
| `TextVariant.BodyMD`       | `TextVariant.BodyMd`    | No                               |
| `TextVariant.BodyMDMedium` | `TextVariant.BodyMd`    | `fontWeight={FontWeight.Medium}` |
| `TextVariant.BodyMDBold`   | `TextVariant.BodyMd`    | `fontWeight={FontWeight.Bold}`   |
| `TextVariant.BodySM`       | `TextVariant.BodySm`    | No                               |
| `TextVariant.BodySMMedium` | `TextVariant.BodySm`    | `fontWeight={FontWeight.Medium}` |
| `TextVariant.BodySMBold`   | `TextVariant.BodySm`    | `fontWeight={FontWeight.Bold}`   |
| `TextVariant.BodyXS`       | `TextVariant.BodyXs`    | No                               |
| `TextVariant.BodyXSMedium` | `TextVariant.BodyXs`    | `fontWeight={FontWeight.Medium}` |

### Complete Component-Library TextColor Enum

| Old                            | New                                                                 |
| ------------------------------ | ------------------------------------------------------------------- |
| `TextColor.Default`            | `TextColor.TextDefault`                                             |
| `TextColor.Alternative`        | `TextColor.TextAlternative`                                         |
| `TextColor.Muted`              | `TextColor.TextMuted`                                               |
| `TextColor.Primary`            | `TextColor.PrimaryDefault`                                          |
| `TextColor.PrimaryAlternative` | Verify against MMDS package — likely `TextColor.PrimaryAlternative` |
| `TextColor.Success`            | `TextColor.SuccessDefault`                                          |
| `TextColor.Error`              | `TextColor.ErrorDefault`                                            |
| `TextColor.ErrorAlternative`   | Verify against MMDS package                                         |
| `TextColor.Warning`            | `TextColor.WarningDefault`                                          |
| `TextColor.Info`               | `TextColor.InfoDefault`                                             |
| `TextColor.Inverse`            | `TextColor.OverlayInverse`                                          |

---

## Examples from Existing Migrations (Ramp PR)

These real examples from `refactor/6887_migrate-text-ramp` show correct patterns to follow.

### Pattern: Layout StyleSheet + MMDS Text

Keep `StyleSheet` for structural/layout styles. Use MMDS props for text appearance:

```tsx
// app/components/UI/Ramp/Aggregator/components/Account.tsx
const createStyles = () =>
  StyleSheet.create({
    accountText: {
      flexShrink: 1, // layout — stays in StyleSheet
      marginVertical: 3, // positioning — stays in StyleSheet
      marginHorizontal: 5, // positioning — stays in StyleSheet
    },
  });

<Text style={styles.accountText} twClassName="text-center" numberOfLines={1}>
  {accountName}
</Text>;
```

### Pattern: TextButton for Link Text

```tsx
// app/components/UI/Ramp/Aggregator/components/RegionAlert.tsx
import {
  TextButton,
  TextButtonSize,
} from '@metamask/design-system-react-native';

<TextButton
  size={TextButtonSize.BodySm}
  onPress={handleSupportLinkPress}
  style={styles.link}
>
  {link as string}
</TextButton>;
```

### Pattern: Conditional fontWeight from a Prop

```tsx
// app/components/UI/Ramp/Aggregator/components/ScreenLayout.tsx
<Text
  variant={TextVariant.BodyMd}
  color={TextColor.TextDefault}
  fontWeight={bold ? FontWeight.Bold : undefined}
  twClassName="text-center"
  style={titleStyle as any}
>
  {typeof title === 'function' ? title() : title}
</Text>
```

### Pattern: Simple color + alignment

```tsx
// app/components/UI/Ramp/Aggregator/components/ErrorView.tsx
<Text color={TextColor.TextAlternative} twClassName="text-center">
  {description}
</Text>
```

---

## Constraints

- Do **not** remove the deprecated Text components themselves until **all** usages across the entire codebase are migrated.
- For `@MetaMask/ramp`: only search within `Ramp/components/`, `Ramp/hooks/`, and `Ramp/Views/`. Files under `Ramp/Aggregator/` and `Ramp/Deposit/` are legacy, will not be refactored, and must be skipped entirely.
- Do **not** migrate more than 5 files per run.
- Do **not** mix files from different code owners in a single PR.
- Do **not** refactor surrounding code, rename variables, or make unrelated improvements.
- Follow `.cursor/rules/ui-development-guidelines.mdc`: design system first, `useTailwind`, `Box`/`Text` from design system.
- Follow `.cursor/rules/general-coding-guidelines.mdc`: TypeScript only, no `any` (except pre-existing TODOs), yarn only.
- If a file is too complex (e.g. deeply conditional styles, many `disclaimer`/`infoModal`/`reset` props, or a custom Text wrapper), skip it for this run, note it in memory, and flag it for manual review.
