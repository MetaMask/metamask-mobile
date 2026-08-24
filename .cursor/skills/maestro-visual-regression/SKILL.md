---
name: maestro-visual-regression
description: >-
  Runs a local Maestro visual-regression compare of a candidate git branch
  against a base branch (default main), then embeds the PNGs into the open
  PR: main → Screenshots/Recordings Before, candidate branch → After. Use
  when the user wants Maestro screenshot tests, visual regressions vs main,
  or PR before/after screenshots. Always collect the candidate branch name
  first.
---

# Maestro visual regression (branch vs base)

Local Maestro CLI compare. **Maestro Studio is not required** to run the test — only to debug selectors. Do not install Maestro into the repo; it stays on the machine.

This is **not** the Appium `aiVisualTest` path in `tests/framework/ai-visual/`.

## Step 0 — Branch name (mandatory, do this first)

Do **not** checkout, install, write YAML, or run `maestro test` until `CANDIDATE_BRANCH` is known.

1. If the user gave a **branch name**, use it as `CANDIDATE_BRANCH`.
2. If they gave a **PR URL or number**, resolve it:

   ```bash
   gh pr view <n> --json number,url,headRefName,baseRefName,title,files
   ```

   Set `CANDIDATE_BRANCH` from `headRefName`, `BASE_BRANCH` from `baseRefName`, and `PR_NUMBER` from `number`.

3. If they gave a branch but no PR, resolve the PR from the branch:

   ```bash
   gh pr view "${CANDIDATE_BRANCH}" --json number,url,headRefName,baseRefName
   ```

4. If they gave **neither branch nor PR**, **ask**. Do not assume `git branch --show-current`.
5. Default `BASE_BRANCH` to `main` unless the PR or user says otherwise.
6. Confirm `CANDIDATE_BRANCH`, `BASE_BRANCH`, and `PR_NUMBER` back to the user before continuing.

Then inspect **what actually changed** so the flow targets real UI, not a leftover screen:

```bash
git fetch origin "${BASE_BRANCH}" "${CANDIDATE_BRANCH}"
git diff "origin/${BASE_BRANCH}...origin/${CANDIDATE_BRANCH}" --stat
git log --oneline "origin/${BASE_BRANCH}..origin/${CANDIDATE_BRANCH}"
```

From the diff, pick the screen(s) and stable selectors (testIDs / visible text) to screenshot. Crop to the changed control (toast, button, banner). Do not screenshot the whole wallet home if only a toast changed.

A PR is required for the Before/After embed. If none exists, stop after capturing PNGs and say so — do not open a PR unless asked.

## Defaults (MetaMask Mobile)

|                  | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| iOS `appId`      | `io.metamask.MetaMask`                                                              |
| Android `appId`  | `io.metamask`                                                                       |
| Install / run    | `yarn setup:expo` → `yarn watch:clean` → `yarn start:ios` (or `yarn start:android`) |
| Artifact dir     | `maestro/` (local; do not commit `runs/`, `before/`, or `after/` unless asked)      |
| Screenshot width | **390px** (downscale after capture; do not upscale crops that are already narrower) |

Same **device**, same **logged-in wallet**, same **language** for both legs. Prefer the already-booted simulator.

```bash
xcrun simctl list devices | rg Booted
maestro list-devices
```

Pass `--device` explicitly, e.g. `--device "iPhone-17"`.

`launchApp.clearState` must be `false` so onboarding is not wiped.

## Step 1 — Write the capture flow from the diff

Copy [templates/capture.yaml](templates/capture.yaml) into `maestro/<flow>-capture.yaml` and replace placeholders (`APP_ID`, selectors, screenshot names).

Use that **same** capture flow on both branches. You need real PNGs from each side for the PR:

- **Before** = screenshots taken while running the **base** branch (`main`)
- **After** = screenshots taken while running **`CANDIDATE_BRANCH`**

Optional: also copy [templates/assert.yaml](templates/assert.yaml) if the user wants a pixel pass/fail in addition to PR images.

- For a disappearing toast: `assertVisible` on the toast text, then screenshot **immediately**. Do not `waitForAnimationToEnd` first.
- If a control is flag-gated, it must be visible on **both** builds or the run is invalid.

## Step 2 — Before PNGs on the base branch

```bash
git checkout "${BASE_BRANCH}"
# install/run the app on the chosen device; user stays logged in
# leave the app on the screen the flow starts from (usually wallet home)

mkdir -p maestro/before maestro/after maestro/runs
maestro test maestro/<flow>-capture.yaml --device "<device>" --test-output-dir maestro/runs/base
cp maestro/runs/base/**/takeScreenshot/*.png maestro/before/
python3 .cursor/skills/maestro-visual-regression/scripts/resize_screenshots.py maestro/before
```

Those files are **Before** (`main`), at 390px width.

## Step 3 — After PNGs on the candidate branch

```bash
git checkout "${CANDIDATE_BRANCH}"
# install/run this branch on the same device; do not wipe the simulator

maestro test maestro/<flow>-capture.yaml --device "<device>" --test-output-dir "maestro/runs/${CANDIDATE_BRANCH}"
cp "maestro/runs/${CANDIDATE_BRANCH}"/**/takeScreenshot/*.png maestro/after/
python3 .cursor/skills/maestro-visual-regression/scripts/resize_screenshots.py maestro/after
```

Those files are **After** (the branch under test), at 390px width.

## Step 4 — Put the images on the PR

Replace `N/A` (or empty placeholders) in the existing PR body. Keep the exact headings `### **Before**` and `### **After**`. Do not rewrite other sections.

```bash
python3 .cursor/skills/maestro-visual-regression/scripts/embed_pr_screenshots.py \
  --pr "${PR_NUMBER}" \
  --before-dir maestro/before \
  --after-dir maestro/after \
  --base-branch "${BASE_BRANCH}" \
  --candidate-branch "${CANDIDATE_BRANCH}"
```

The script downscales copies to **390px** width (same default as `resize_screenshots.py`), uploads them to a **secret gist** (so they are not committed to the product PR), and runs `gh pr edit` so GitHub renders them inline at that width:

| PR section       | Source                                            |
| ---------------- | ------------------------------------------------- |
| `### **Before**` | `maestro/before/` — captured on `BASE_BRANCH`     |
| `### **After**`  | `maestro/after/` — captured on `CANDIDATE_BRANCH` |

If several PNGs were captured (e.g. add toast + remove toast), every file in `before/` goes under Before and every file in `after/` goes under After, in filename order.

## Step 5 — Report

Tell the user the PR URL and that Before/After now show the screenshots. Optionally mention local paths (`maestro/before/`, `maestro/after/`) so they can open the PNGs in Preview.

If an optional `assertScreenshot` run failed, attach the diff path as well — still embed Before/After so reviewers can see the change.

## Do not

- Start Maestro Studio unless selectors fail and you need to inspect the tree.
- Use Appium `aiVisualTest` / `yarn capture-visual-baselines:*` unless the user explicitly wants the repo AI visual path.
- Reuse a previous flow when this branch changed something else — Step 0's diff decides the screen.
- Wipe the simulator between Step 2 and Step 3.
- Commit Maestro YAML, baselines, or run artifacts unless the user asks.
- Skip Step 4 when `PR_NUMBER` is known. The point of the screenshots is the PR body.
- Put `main` shots under After, or candidate shots under Before.
