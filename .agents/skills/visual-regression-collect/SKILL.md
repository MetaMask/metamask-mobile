# Visual Regression Collect

Batch-process component migration PRs: capture before/after Storybook screenshots on the iOS Simulator, push them to a dedicated screenshots branch, and post before/after comparison tables as PR comments.

## Prerequisites

Before running this workflow, ensure:

1. **iOS Simulator booted** with a MetaMask development build installed
2. **Storybook running** — `index.js` has Storybook enabled and Metro is serving
3. **`gh` CLI authenticated** — `gh auth status` succeeds
4. **Clean working tree** — `git status` shows no uncommitted changes

If Storybook is NOT already running, set it up first:

```bash
# 1. Enable Storybook in index.js (uncomment lines 102-103, comment lines 108-111)
# 2. Regenerate story manifest
yarn storybook-generate
# 3. Start Metro
yarn watch:clean
# 4. Build and run on simulator
yarn start:ios
```

---

## Phase 1 — Discover Target PRs

### Mode A — Auto-discover (default)

Find all open migration PRs that don't yet have a visual regression comment:

```bash
gh pr list --search "refactor: migrate Text in:title" --state open --json number,title,headRefName,baseRefName,url --limit 20
```

For each PR, check if it already has a visual regression comment:

```bash
gh api repos/{owner}/{repo}/issues/{PR_NUMBER}/comments --jq '.[] | select(.body | startswith("## Visual Regression Screenshots")) | .id'
```

If a comment ID is returned, skip that PR (already processed). Collect the remaining PRs as `TARGET_PRS`.

### Mode B — Explicit PR numbers

If the user provides PR numbers (e.g., `27565 27580`), use those directly:

```bash
gh pr view {PR_NUMBER} --json number,title,headRefName,baseRefName,url,files
```

### For each PR in TARGET_PRS

Fetch the changed files:

```bash
gh pr view {PR_NUMBER} --json files --jq '.files[].path'
```

**Filter to renderable components.** Keep only files where ALL of:

- Extension is `.tsx`
- Basename is PascalCase (starts uppercase letter)

**Skip if any:**

- Path contains `__snapshots__`
- Filename ends in `.test.tsx` or `.spec.tsx`
- Filename contains `.styles.` or `.types.` or `.constants.`
- Basename is `index.tsx`
- Path contains: `/hooks/`, `/utils/`, `/util/`, `/routes/`, `/sdk/`, `/context/`, `/selectors/`, `/actions/`

Record the result as a per-PR component list. Also build a **deduplicated master list** of all unique component file paths across all PRs (for the before pass).

If a PR has zero renderable components after filtering, skip it and note why.

### Save current state

```bash
CURRENT_BRANCH=$(git branch --show-current)
git stash push -u -m "visual-regression-collect-autostash"
```

Record whether a stash was created.

### Create temp directories

```bash
BATCH_DIR=/tmp/vr-batch-$(date +%Y%m%d-%H%M%S)
mkdir -p $BATCH_DIR/before
# Per-PR after directories created in Phase 3
```

---

## Phase 2 — Before Pass (main branch, once)

### Step 2a — Checkout main

```bash
git checkout main
git pull origin main --ff-only
```

### Step 2b — Create sandbox story directory

```bash
mkdir -p app/components/VisualRegressionSandbox
```

Write initial stub to `app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx`:

```tsx
// TEMP FILE — visual regression only, do not commit
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

storiesOf('VisualRegression', module).add('Current', () => (
  <View style={{ flex: 1, justifyContent: 'center', padding: 16 }} />
));
```

### Step 2c — Regenerate Storybook manifest

```bash
yarn storybook-generate
```

Wait for Metro to pick up the new story.

### Step 2d — For each component in the master list

Process every unique component across all PRs. **Never abort on a single failure — mark it SKIPPED and continue.**

#### 2d-i. Derive flat PNG filename

Replace every `/` with `_` in the relative path, change extension to `.png`:

- `app/components/UI/Ramp/components/RampUnsupportedModal/RampUnsupportedModal.tsx`
  -> `app_components_UI_Ramp_components_RampUnsupportedModal_RampUnsupportedModal.png`

#### 2d-ii. Write sandbox story

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
    <ComponentName prop1="value" prop2={42} />
  </View>
));
```

**Props must reflect real usage** — read the component's TypeScript interface, existing test files, or call sites to pick realistic static values. The goal is the same visual output the user would see.

If the component requires context providers beyond what `.storybook/preview.js` supplies (theme, navigation, safe area, mock store are already provided), wrap it appropriately.

#### 2d-iii. Navigate to the story in Storybook

Use `mcp__ios-simulator__ui_describe_all` to confirm Storybook is visible.

Navigate to **VisualRegression -> Current** using `mcp__ios-simulator__ui_tap`.

Wait for the component to render fully. If Storybook shows a red error screen, mark this component SKIPPED with reason "Story crashed — missing context" and continue to the next component.

#### 2d-iv. Take the screenshot

```
mcp__ios-simulator__screenshot -> $BATCH_DIR/before/<derived-filename>
```

### Step 2e — Teardown after before pass

1. Delete sandbox:

   ```bash
   rm -f app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
   rmdir app/components/VisualRegressionSandbox 2>/dev/null || true
   ```

2. Regenerate Storybook manifest:

   ```bash
   yarn storybook-generate
   ```

3. Verify clean working tree:

   ```bash
   git checkout -- .
   git diff --name-only
   ```

   Output must be empty. If files appear, reset them before proceeding.

---

## Phase 3 — After Pass (per PR branch)

Repeat this entire phase for each PR in `TARGET_PRS`.

### Step 3a — Checkout PR branch

```bash
git fetch origin {HEAD_BRANCH}
git checkout {HEAD_BRANCH}
```

### Step 3b — Create sandbox and after directory

```bash
mkdir -p app/components/VisualRegressionSandbox
mkdir -p $BATCH_DIR/pr-{PR_NUMBER}/after
```

Write the initial stub story (same as Step 2b).

### Step 3c — Regenerate Storybook manifest

```bash
yarn storybook-generate
```

### Step 3d — For each component in THIS PR's file list

Skip any component already marked SKIPPED in the before pass (no before image = skip after too).

#### 3d-i. Add pink highlight borders to MMDS `<Text>` elements

In the target component file (on the PR branch), temporarily add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}` to **every** `<Text>` element imported from `@metamask/design-system-react-native`.

Rules:

- No existing `style` prop -> add `style={{ borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing inline object -> merge: `style={{ ...existingStyles, borderWidth: 2, borderColor: '#FF00FF' }}`
- Existing `styles.foo` reference -> array: `style={[styles.foo, { borderWidth: 2, borderColor: '#FF00FF' }]}`
- Do **not** modify any other element types (Box, Button, etc.)

#### 3d-ii. Write sandbox story

Same as Step 2d-ii — overwrite the sandbox story to render this component with realistic props. Metro hot-reloads the pink-bordered component.

#### 3d-iii. Navigate to the story in Storybook

Same as Step 2d-iii. Mark SKIPPED on red error screen.

#### 3d-iv. Take the screenshot

```
mcp__ios-simulator__screenshot -> $BATCH_DIR/pr-{PR_NUMBER}/after/<derived-filename>
```

#### 3d-v. Remove pink borders

Revert only the `borderWidth`/`borderColor` changes:

```bash
git checkout -- {component-file-path}
```

Verify with `git diff {component-file-path}` — no changes should remain.

### Step 3e — Teardown after this PR's after pass

1. Delete sandbox:

   ```bash
   rm -f app/components/VisualRegressionSandbox/VisualRegressionSandbox.stories.tsx
   rmdir app/components/VisualRegressionSandbox 2>/dev/null || true
   ```

2. Regenerate Storybook manifest:

   ```bash
   yarn storybook-generate
   ```

3. Verify clean working tree:

   ```bash
   git checkout -- .
   git diff --name-only
   ```

**Then proceed to the next PR (loop back to Step 3a), or continue to Phase 4 if all PRs are done.**

---

## Phase 4 — Upload Screenshots

Use a git worktree so the main checkout stays undisturbed.

```bash
WORKTREE=/tmp/mm-screenshots-worktree-$(date +%s)

# Check if branch exists on remote
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
```

### Copy screenshots for each PR

```bash
for each PR_NUMBER in TARGET_PRS:
  mkdir -p $WORKTREE/pr-{PR_NUMBER}/before
  mkdir -p $WORKTREE/pr-{PR_NUMBER}/after

  # Copy before images (only the ones relevant to this PR)
  for each component in PR's file list:
    cp $BATCH_DIR/before/<derived-filename> $WORKTREE/pr-{PR_NUMBER}/before/
  done

  # Copy after images
  cp $BATCH_DIR/pr-{PR_NUMBER}/after/*.png $WORKTREE/pr-{PR_NUMBER}/after/
done
```

### Commit and push

```bash
cd $WORKTREE
git add .
git commit --author="georgewrmarshall <george.marshall@consensys.net>" \
  -m "chore: visual regression screenshots for PRs #NUM1, #NUM2, ..."
git push origin screenshots/visual-regression
```

### Clean up worktree

```bash
cd -
git worktree remove $WORKTREE --force
```

If `git push` fails, copy screenshots to `~/Desktop/vr-batch/` as fallback and skip to Phase 5 (print comment body to stdout instead).

---

## Phase 5 — Post Inline File Comments

Post before/after screenshots as **inline file-level comments** on each changed component file. These appear directly on the file in the "Files changed" tab.

### Get the PR head commit SHA

```bash
COMMIT_SHA=$(gh pr view {PR_NUMBER} --json headRefOid --jq '.headRefOid')
```

### Image URL base

```
https://raw.githubusercontent.com/MetaMask/metamask-mobile/screenshots/visual-regression/pr-{PR_NUMBER}/
```

### For each successfully captured component

Post a file-level review comment using the GitHub API. The two `<img>` tags must be on the same line with no space so GitHub renders them side-by-side.

```bash
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments \
  -f body='### Before / After

<img width="350" alt="Before" src="{BASE_URL}before/{DERIVED_FILENAME}" /><img width="350" alt="After (pink borders = migrated Text)" src="{BASE_URL}after/{DERIVED_FILENAME}" />' \
  -f commit_id="$COMMIT_SHA" \
  -f path="{COMPONENT_FILE_PATH}" \
  -f subject_type="file"
```

Replace:

- `{OWNER}/{REPO}` with the repository (e.g. `MetaMask/metamask-mobile`)
- `{PR_NUMBER}` with the PR number
- `{BASE_URL}` with the raw GitHub URL base
- `{DERIVED_FILENAME}` with the flat PNG filename (e.g. `app_components_UI_Ramp_components_EligibilityFailedModal_EligibilityFailedModal.png`)
- `{COMPONENT_FILE_PATH}` with the relative file path in the repo

Skip any component where either the before or after screenshot is missing.

If `gh api` fails, print the comment body to stdout with the file path for manual paste.

### Update the PR description

Replace the `## **Screenshots/Recordings**` section in the PR body to reference the inline comments.

1. Fetch the current body: `gh pr view {PR_NUMBER} --json body --jq '.body' > /tmp/pr-body.md`
2. Edit `/tmp/pr-body.md` — replace everything between `## **Screenshots/Recordings**` and the next `## **` heading with:

   ```
   ## **Screenshots/Recordings**

   Before/after screenshots added as inline comments on each changed file in the **Files changed** tab. Pink borders highlight migrated `<Text>` elements.
   ```

3. Push via REST API (avoids `gh pr edit` issues with classic projects):
   ```bash
   gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER} --method PATCH --field body="$(cat /tmp/pr-body.md)"
   ```

---

## Phase 6 — Restore and Cleanup

```bash
git checkout {CURRENT_BRANCH}
```

If a stash was created in Phase 1:

```bash
git stash pop
```

If `stash pop` conflicts, report them and do NOT auto-resolve. Leave the stash in place.

```bash
rm -rf $BATCH_DIR
```

### Final verification

```bash
git status
git worktree list
```

`git status` should show a clean working tree (or only original untracked files). `git worktree list` should show no `/tmp/mm-screenshots-worktree*` entries.

---

## Final Summary

Print a summary report:

```
Visual Regression Batch — {TODAY_DATE}

PRs processed: {N}

PR #{NUM1}: {PR_TITLE}
  Branch: {HEAD_BRANCH} -> {BASE_BRANCH}
  Captured: {X} components
    ✓ app/components/.../ComponentA.tsx
    ✓ app/components/.../ComponentB.tsx
  Skipped: {Y} components
    ✗ app/components/.../ComponentC.tsx — Story crashed
  Comment: posted ✓

PR #{NUM2}: {PR_TITLE}
  ...

Screenshots branch: https://github.com/MetaMask/metamask-mobile/tree/screenshots/visual-regression
Working tree: clean
Worktrees: no leftovers
```

---

## Error Handling Reference

| Situation                              | Action                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `gh` auth failure                      | Stop immediately. Print: `Run 'gh auth login' then retry.`               |
| PR not found                           | Skip that PR, continue to next. Report at end.                           |
| Zero renderable components in a PR     | Skip that PR. Note in summary.                                           |
| Dirty working tree after cleanup       | Stop. Do not proceed to next `git checkout`. Fix first.                  |
| Story crashes (red screen)             | Mark SKIPPED, continue to next component. Never abort.                   |
| `git push` to screenshots branch fails | Copy PNGs to `~/Desktop/vr-batch/`. Print comment body to stdout.        |
| `stash pop` conflicts                  | Report to user. Leave stash in place. Do not auto-resolve.               |
| Metro not responding                   | Verify `yarn watch:clean` is running. Restart if needed.                 |
| Simulator not visible                  | Run `mcp__ios-simulator__get_booted_sim_id` to verify. Reboot if needed. |
| Missing `before` PNG for a component   | Omit from PR comment table. Do not post broken image URL.                |

---

## Notes

- **Storybook must be running before starting.** This workflow does NOT build or install the app — it assumes hot reload is active.
- **`index.js` is NOT modified.** Unlike the standalone visual-regression-pr command, this workflow assumes Storybook is already enabled. The sandbox story + hot reload handles all component switching.
- **The sandbox story is always temporary.** Never committed. `yarn storybook-generate` is run to register/unregister it.
- **Pink borders are temporary debug markup.** Always revert with `git checkout -- <file>` after each component.
- **Git worktree** keeps the main checkout undisturbed during upload. Always remove with `--force` before finishing.
- **Before screenshots are shared across PRs.** A component that appears in multiple PRs gets one before screenshot, copied into each PR's directory.
- **The `screenshots/visual-regression` orphan branch** has no shared history with `main`. Safe to push freely.
