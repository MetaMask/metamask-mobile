# Visual Regression Screenshot — Text Migration

Captures screenshots of every component modified in the current migration branch, with a bright pink highlight border on each migrated `<Text>` element so reviewers can see exactly what changed. Images are saved to the Desktop for before/after comparison.

---

## When to Run

Run this command **twice** to produce a full before/after pair:

1. **Before** — check out `main`, run the command, screenshots saved to `~/Desktop/mmds-text-migration-<date>/before/`
2. **After** — check out the migration branch, run the command, screenshots saved to `~/Desktop/mmds-text-migration-<date>/after/`

Or run on the migration branch only to produce "after with highlights" screenshots for the PR description.

---

## Steps

### Step 1 — Setup

1. Get today's date in `YYYY-MM-DD` format.
2. Create the output directories on the Desktop:
   ```bash
   mkdir -p ~/Desktop/mmds-text-migration-<date>/before
   mkdir -p ~/Desktop/mmds-text-migration-<date>/after
   ```
3. Determine which component `.tsx` files were changed in this branch (excluding snapshots and style files):
   ```bash
   git diff main...HEAD --name-only | grep '\.tsx$' | grep -v '__snapshots__'
   ```
   This is your **target file list** for the run.

---

### Step 2 — Switch to Storybook mode (once)

Modify `index.js` at the project root **once** at the start of the run — not per component:

```js
// Uncomment these two lines (currently lines 102-103):
import Storybook from './.storybook';
AppRegistry.registerComponent(name, () => Storybook);

// Comment out the normal app registration (currently lines 108-111):
// AppRegistry.registerComponent(name, () =>
//   isE2E ? Root : Sentry.wrap(Root),
// );
```

Create (or overwrite) the sandbox story file that will be reused for every component:

```
app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
```

Register it with Storybook by running:

```bash
yarn storybook-generate
```

Wait for Metro to reload. All subsequent component swaps use hot reload — no further `index.js` changes until the very end.

---

### Step 3 — For Each Target File

Repeat the sub-sequence below for every file in the target list.

#### 3a. Derive the screenshot filename

Convert the relative file path to a flat filename by replacing every `/` with `_`:

- `app/components/UI/Card/components/CardMessageBox/CardMessageBox.tsx`
  → `CardMessageBox.tsx.png`

Save path: `~/Desktop/mmds-text-migration-<date>/after/<derived-filename>`

#### 3b. Add pink highlight borders

In the target component file, temporarily add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}` to **every** `<Text>` element imported from `@metamask/design-system-react-native`.

Rules:

- No existing `style` prop → add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing inline object → merge: `style={{ ...existingStyles, borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing `styles.foo` reference → use array: `style={[styles.foo, { borderWidth: 2, borderColor: '#FF00FF' }]}`
- Do **not** modify any other element types.

#### 3c. Update the sandbox story

Overwrite `VisualRegressionSandbox.stories.tsx` to render the current component with realistic static props. Metro hot-reloads the change in seconds.

```tsx
// app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
// TEMP FILE — used for visual regression screenshots only, do not commit
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
// Replace this import for each component:
import CardMessageBox from '../UI/Card/components/CardMessageBox/CardMessageBox';

storiesOf('VisualRegression', module).add('Current', () => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
    {/* Replace props to match real usage as closely as possible */}
    <CardMessageBox
      config={{
        type: 'info',
        title: 'Sample title',
        description: 'Sample description for visual regression',
      }}
    />
  </View>
));
```

**Props should reflect real usage.** Read the component's TypeScript interface and any existing test files or call sites to pick realistic static values. The goal is the same visual output the user would see — not a minimal stub.

If the component requires context providers (theme, navigation, Redux), wrap it appropriately. Check existing stories in the codebase for the correct decorator pattern.

#### 3d. Navigate to the story in Storybook

Use `mcp__ios-simulator__ui_describe_all` to confirm Storybook is visible.
Navigate to **VisualRegression → Current** using `mcp__ios-simulator__ui_tap`.
Wait for the component to render fully.

#### 3e. Take the screenshot

```
mcp__ios-simulator__screenshot → save to ~/Desktop/mmds-text-migration-<date>/after/<derived-filename>
```

#### 3f. Remove pink borders

Revert only the `borderWidth`/`borderColor` changes added in step 3b. Verify with `git diff <file>` — no other changes should be present.

---

### Step 4 — Teardown (once, after all components)

1. **Delete the sandbox story file:**

   ```bash
   rm app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
   rmdir app/components/VisualRegressionSandbox 2>/dev/null || true
   ```

2. **Restore `index.js`:**

   ```js
   // Re-comment the Storybook lines:
   // import Storybook from './.storybook';
   // AppRegistry.registerComponent(name, () => Storybook);

   // Uncomment the normal app registration:
   AppRegistry.registerComponent(name, () =>
     isE2E ? Root : Sentry.wrap(Root),
   );
   ```

3. **Regenerate Storybook requires** (removes the deleted story):

   ```bash
   yarn storybook-generate
   ```

4. **Verify clean working tree:**
   ```bash
   git diff --name-only
   ```
   Output must be empty (or only unrelated changes). If any `.tsx` files or `index.js` appear, the cleanup is incomplete — fix before finishing.

---

### Step 5 — Output Summary

Report:

```
Screenshots saved to: ~/Desktop/mmds-text-migration-<date>/after/

Files captured:
  ✓ app_components_UI_Card_components_CardMessageBox_CardMessageBox.tsx.png
  ✓ app_components_UI_Card_components_ManageCardListItem_ManageCardListItem.tsx.png
  ✓ app_components_UI_Card_components_SpendingLimitProgressBar_SpendingLimitProgressBar.tsx.png
  ✓ app_components_UI_Card_components_SpendingLimitWarning_SpendingLimitWarning.tsx.png

Files skipped (with reason):
  ✗ path/to/File.tsx — explain why even sandbox story could not render it
```

---

## Notes

- **`index.js` is only touched twice** — once to enable Storybook at the start, once to restore it at the end. All component swaps go through the sandbox story file and hot-reload.
- **The sandbox story is always temporary.** It is never committed. `yarn storybook-generate` is run at start and end to keep the Storybook manifest consistent.
- **Pink borders are temporary debug markup.** They must never be committed. Always verify with `git diff` after each component's cleanup.
- **File naming uses the full relative path.** This makes it easy to match a screenshot back to its source file without ambiguity.
- **Desktop folder persists across runs.** Screenshots overwrite on re-run — intentional for iteration.
