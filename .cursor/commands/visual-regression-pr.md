# Visual Regression PR — Before/After Screenshots

Automates the full visual regression workflow for a GitHub PR: fetches changed files, captures before (base branch) and after (PR branch) screenshots in Storybook, uploads them to a dedicated `screenshots/visual-regression` branch, and posts a before/after comparison table as a PR comment.

**Usage:** `/visual-regression-pr {PR_NUMBER}`

---

## Phase 1 — Preflight

### Step 1a — Fetch PR metadata

```bash
gh pr view {PR_NUMBER} --json files,baseRefName,headRefName,title,url
```

If `gh` auth fails → stop immediately and print: `Run 'gh auth login' then retry.`
If PR not found → stop and report the PR number.

Record:

- `PR_NUMBER` = the number passed as argument
- `BASE_BRANCH` = `baseRefName`
- `HEAD_BRANCH` = `headRefName`
- `PR_TITLE` = `title`
- `PR_URL` = `url`
- `CHANGED_FILES` = full list of files from `files[].path`

### Step 1b — Filter to renderable components

From `CHANGED_FILES`, keep only files that pass **all** of these:

**Keep if:**

- Extension is `.tsx`
- Filename (basename without extension) is PascalCase (starts with an uppercase letter)

**Skip if any condition is true:**

- Path contains `__snapshots__`
- Filename ends in `.test.tsx` or `.spec.tsx`
- Filename contains `.styles.` or `.types.`
- Basename is `index.tsx`
- Path contains any of: `/hooks/`, `/utils/`, `/util/`, `/routes/`, `/sdk/`, `/context/`

Record the final list as `TARGET_FILES`. For each skipped file, record its path and the reason it was skipped.

If `TARGET_FILES` is empty → stop and print a table of all files with their skip reasons.

### Step 1c — Save current state

```bash
CURRENT_BRANCH=$(git branch --show-current)
git stash push -u -m "visual-regression-pr-{PR_NUMBER}-autostash"
```

Record whether a stash was created (non-zero output = stash created, "No local changes" = no stash).

### Step 1d — Create temp dirs

```bash
mkdir -p /tmp/vr-pr-{PR_NUMBER}/before
mkdir -p /tmp/vr-pr-{PR_NUMBER}/after
```

---

## Phase 2 — Before Pass (base branch)

### Step 2a — Check out base branch

```bash
git checkout {BASE_BRANCH}
git pull origin {BASE_BRANCH} --ff-only
```

### Step 2b — Enable Storybook in `index.js`

In `index.js` at the project root:

```js
// Uncomment these two lines (currently lines 102-103):
import Storybook from './.storybook';
AppRegistry.registerComponent(name, () => Storybook);

// Comment out the normal app registration (currently lines 108-111):
// AppRegistry.registerComponent(name, () =>
//   isE2E ? Root : Sentry.wrap(Root),
// );
```

### Step 2c — Create sandbox story directory and stub

```bash
mkdir -p app/components/VisualRegressionSandbox
```

Write a minimal stub to `app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx`:

```tsx
// TEMP FILE — visual regression only, do not commit
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

storiesOf('VisualRegression', module).add('Current', () => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 16 }} />
));
```

### Step 2d — Regenerate Storybook manifest

```bash
yarn storybook-generate
```

### Step 2e — For each file in TARGET_FILES (before pass)

Repeat for every file. **Never abort on a single failure — mark it SKIPPED and continue.**

#### 2e-i. Derive flat PNG filename

Replace every `/` with `_` in the relative path, change extension to `.png`:

- `app/components/UI/Card/components/CardMessageBox/CardMessageBox.tsx`
  → `app_components_UI_Card_components_CardMessageBox_CardMessageBox.png`

Save target path: `/tmp/vr-pr-{PR_NUMBER}/before/<derived-filename>`

#### 2e-ii. Write sandbox story (no pink borders — this is the before pass)

Read the component's TypeScript interface and any test files or call sites to derive realistic props.

Overwrite `app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx`:

```tsx
// TEMP FILE — visual regression only, do not commit
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import ComponentName from '../relative/path/to/ComponentName';

storiesOf('VisualRegression', module).add('Current', () => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
    <ComponentName prop1="value" />
  </View>
));
```

**Props must reflect real usage** — read the component's TypeScript interface and any existing test files or call sites to pick realistic static values. Global decorators (ThemeProvider, SafeArea, Navigation, MockStore) apply automatically via `.storybook/preview.js`.

#### 2e-iii. Navigate to the story in Storybook

Use `mcp__ios-simulator__ui_describe_all` to confirm Storybook is visible.
Navigate to **VisualRegression → Current** using `mcp__ios-simulator__ui_tap`.
Wait for the component to render fully.

If a red error screen is visible → mark this file SKIPPED with reason "Story crashed — missing context", continue to next file.

#### 2e-iv. Take the screenshot

```
mcp__ios-simulator__screenshot → /tmp/vr-pr-{PR_NUMBER}/before/<derived-filename>
```

### Step 2f — Teardown after before pass

1. Delete sandbox file and directory:

   ```bash
   rm app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
   rmdir app/components/VisualRegressionSandbox 2>/dev/null || true
   ```

2. Restore `index.js`:

   ```js
   // Re-comment Storybook lines:
   // import Storybook from './.storybook';
   // AppRegistry.registerComponent(name, () => Storybook);

   // Uncomment normal app registration:
   AppRegistry.registerComponent(name, () =>
     isE2E ? Root : Sentry.wrap(Root),
   );
   ```

3. Regenerate Storybook manifest:

   ```bash
   yarn storybook-generate
   ```

4. Verify clean working tree:
   ```bash
   git diff --name-only
   ```
   Output must be empty. If any files appear → **stop immediately**. Do not proceed to checkout until the tree is clean.

---

## Phase 3 — After Pass (PR branch)

### Step 3a — Check out PR branch

```bash
git fetch origin {HEAD_BRANCH}
git checkout {HEAD_BRANCH}
```

### Step 3b — Enable Storybook in `index.js`

Same as Step 2b.

### Step 3c — Recreate sandbox directory

Same as Step 2c.

### Step 3d — Regenerate Storybook manifest

```bash
yarn storybook-generate
```

### Step 3e — For each file in TARGET_FILES (after pass)

Repeat for every file that was not already SKIPPED in the before pass.

#### 3e-i. Derive flat PNG filename

Same derivation as before pass. Save target path: `/tmp/vr-pr-{PR_NUMBER}/after/<derived-filename>`

#### 3e-ii. Add pink highlight borders to MMDS `<Text>` elements

In the target component file (on the PR branch), temporarily add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}` to **every** `<Text>` element imported from `@metamask/design-system-react-native`.

Rules:

- No existing `style` prop → add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing inline object → merge: `style={{ ...existingStyles, borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing `styles.foo` reference → use array: `style={[styles.foo, { borderWidth: 2, borderColor: '#FF00FF' }]}`
- Do **not** modify any other element types.

#### 3e-iii. Write sandbox story

Same as Step 2e-ii. Metro hot-reloads the pink-bordered component.

#### 3e-iv. Navigate to the story in Storybook

Same as Step 2e-iii. Mark SKIPPED on red error screen.

#### 3e-v. Take the screenshot

```
mcp__ios-simulator__screenshot → /tmp/vr-pr-{PR_NUMBER}/after/<derived-filename>
```

#### 3e-vi. Remove pink borders

Revert only the `borderWidth`/`borderColor` changes added in step 3e-ii. Verify with:

```bash
git diff <file>
```

No changes should remain in the component file. If any do → fix before moving to the next file.

### Step 3f — Teardown after after pass

Same as Step 2f. Verify clean working tree before proceeding.

---

## Phase 4 — Upload to `screenshots/visual-regression` branch

Use a git worktree so the main checkout stays on `{HEAD_BRANCH}`.

```bash
WORKTREE=/tmp/mm-screenshots-worktree

# Check if branch exists on remote:
git fetch origin screenshots/visual-regression 2>/dev/null
BRANCH_EXISTS=$?

if [ $BRANCH_EXISTS -ne 0 ]; then
  # Branch does not exist — create orphan
  git worktree add --orphan -b screenshots/visual-regression $WORKTREE
  cd $WORKTREE
  echo "# MetaMask Mobile Visual Regression Screenshots" > README.md
  git add README.md
  git commit --author="georgewrmarshall <george.marshall@consensys.net>" -m "chore: initialize screenshots/visual-regression branch"
  git push -u origin screenshots/visual-regression
else
  # Branch exists — check it out
  git worktree add $WORKTREE screenshots/visual-regression
  cd $WORKTREE
  git pull --ff-only
fi

# Copy screenshots
mkdir -p $WORKTREE/pr-{PR_NUMBER}/before $WORKTREE/pr-{PR_NUMBER}/after
cp /tmp/vr-pr-{PR_NUMBER}/before/*.png $WORKTREE/pr-{PR_NUMBER}/before/
cp /tmp/vr-pr-{PR_NUMBER}/after/*.png  $WORKTREE/pr-{PR_NUMBER}/after/

# Commit and push
cd $WORKTREE
git add pr-{PR_NUMBER}/
git commit --author="georgewrmarshall <george.marshall@consensys.net>" -m "chore: visual regression screenshots for PR #{PR_NUMBER}"
git push origin screenshots/visual-regression

# Clean up worktree
cd -
git worktree remove $WORKTREE --force
```

If `git push` fails → copy screenshots to `~/Desktop/vr-pr-{PR_NUMBER}/` as fallback and skip to Phase 5 (post comment body to stdout instead).

Raw URL base for posted images:
`https://raw.githubusercontent.com/MetaMask/metamask-mobile/screenshots/visual-regression/pr-{PR_NUMBER}/`

---

## Phase 5 — Post PR Comment

Build the comment body. Use `{TODAY_DATE}` in `YYYY-MM-DD` format.

```markdown
## Visual Regression Screenshots — PR #{PR_NUMBER}

> Auto-generated {TODAY_DATE}. Pink borders highlight migrated `<Text>` elements from `@metamask/design-system-react-native`.

| Component       |                                                                       Before                                                                        |                                                                       After                                                                       |
| --------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------: |
| `ComponentName` | ![before](https://raw.githubusercontent.com/MetaMask/metamask-mobile/screenshots/visual-regression/pr-{PR_NUMBER}/before/app_..._ComponentName.png) | ![after](https://raw.githubusercontent.com/MetaMask/metamask-mobile/screenshots/visual-regression/pr-{PR_NUMBER}/after/app_..._ComponentName.png) |
```

Add a row for each successfully captured component (before + after both present).

If there were any skipped files, append:

```markdown
### Skipped

| File                    | Reason                          |
| ----------------------- | ------------------------------- |
| `path/to/Component.tsx` | Story crashed — missing context |
```

Post the comment:

```bash
gh pr comment {PR_NUMBER} --body "$(cat <<'COMMENT_EOF'
{COMMENT_BODY}
COMMENT_EOF
)"
```

If `gh pr comment` fails → print the full Markdown to stdout with instructions for manual paste.

---

## Phase 6 — Restore and Cleanup

```bash
git checkout {CURRENT_BRANCH}
```

If a stash was created in Step 1c:

```bash
git stash pop
```

If `stash pop` has conflicts → report them and do NOT auto-resolve. Leave the stash in place and tell the user.

```bash
rm -rf /tmp/vr-pr-{PR_NUMBER}
```

Verify:

```bash
git status
git worktree list
```

`git status` should show a clean working tree (or only the original untracked files). `git worktree list` should show no `/tmp/mm-screenshots-worktree` entry.

---

## Final Summary

Print a summary report:

```
Visual Regression — PR #{PR_NUMBER}: {PR_TITLE}

Branch:   {HEAD_BRANCH} → {BASE_BRANCH}
Date:     {TODAY_DATE}

Captured ({N} components):
  ✓ app/components/.../ComponentA.tsx
  ✓ app/components/.../ComponentB.tsx

Skipped ({M} components):
  ✗ app/components/.../ComponentC.tsx — Story crashed — missing context

Screenshots branch: https://github.com/MetaMask/metamask-mobile/tree/screenshots/visual-regression
PR comment: {PR_URL}

Working tree: clean
Worktrees:   no leftovers
```

---

## Error Handling Reference

| Situation                                  | Action                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `gh` auth failure                          | Stop immediately. Print: `Run 'gh auth login' then retry.`                 |
| PR not found                               | Stop. Report the PR number.                                                |
| Zero renderable components after filtering | Stop. Print table of all files with skip reasons.                          |
| Dirty working tree after cleanup           | Stop. Do not proceed to the next `git checkout`.                           |
| Story crashes (red screen)                 | Mark SKIPPED, continue to next component. Never abort the run.             |
| `git push` to screenshots branch fails     | Copy PNGs to `~/Desktop/vr-pr-{PR_NUMBER}/`. Print comment body to stdout. |
| `stash pop` conflicts                      | Report to user. Leave stash in place. Do not auto-resolve.                 |
| Missing `before/` PNG for a component      | Omit it from the PR comment table rather than posting a broken image URL.  |

---

## Notes

- **`index.js` is touched exactly twice per pass** — once to enable Storybook, once to restore it. All component swaps go through the sandbox story + hot reload.
- **The sandbox story is always temporary.** Never committed. `yarn storybook-generate` is run at start and end of each pass.
- **Pink borders are temporary debug markup.** Verify with `git diff` after each component — they must never remain.
- **The `screenshots/visual-regression` orphan branch** holds only screenshots — it has no shared history with `main`. It is safe to push to freely.
- **Git worktree** keeps the main checkout on `{HEAD_BRANCH}` throughout the upload phase. Always remove it with `git worktree remove --force` before finishing.
- **Stash is only created if there are local changes.** Check the output of `git stash push` before recording that a stash exists.
