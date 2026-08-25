---
name: maestro-visual-regression
description: >-
  Runs a local Maestro visual-regression compare of a candidate git branch
  against a base branch (default main), then embeds the PNGs into the open
  PR: main → Screenshots/Recordings Before, candidate branch → After. Installs
  Homebrew and the Maestro CLI on the machine if they are missing. Use when
  the user wants Maestro screenshot tests, visual regressions vs main, or PR
  before/after screenshots. Always collect the candidate branch name first.
---

# Maestro visual regression (branch vs base)

Local Maestro CLI compare. **Maestro Studio is not required** to run the test — only to debug selectors. Do not install Maestro into the repo; it stays on the machine. If this machine is missing Maestro or Homebrew, install them (see **Ensure Maestro CLI**).

This is **not** the Appium `aiVisualTest` path in `tests/framework/ai-visual/`.

## Step 0 — Branch name (mandatory, do this first)

Do **not** checkout, install the app, write YAML, or run `maestro test` until `CANDIDATE_BRANCH` is known. After it is known, install missing Maestro/Homebrew (next section) before any `maestro` command.

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

## Ensure Maestro CLI (after the branch is known)

Do this **after** `CANDIDATE_BRANCH` is confirmed and **before** `maestro list-devices` or `maestro test`. Do not add Maestro or Homebrew to the repo.

```bash
bash .cursor/skills/maestro-visual-regression/scripts/ensure_maestro.sh
```

The script exits immediately if `maestro` is already on `PATH` or at `~/.maestro/bin/maestro`. Otherwise it:

1. Installs **Homebrew** with the official installer if `brew` is missing (`PATH`, `/opt/homebrew/bin/brew`, `/usr/local/bin/brew`).
2. Installs Java 17+ via `brew install openjdk@17` if `java` is missing (Maestro requires it).
3. Installs Maestro with `brew install mobile-dev-inc/tap/maestro` — never `brew install maestro`, which can install a different app.

Tell the user before installing that they may need to enter their macOS password. After Homebrew lands, keep `brew` on `PATH` for the rest of the session:

```bash
# Apple Silicon
eval "$(/opt/homebrew/bin/brew shellenv)"
# Intel
eval "$(/usr/local/bin/brew shellenv)"
```

If the Homebrew installer stops because this shell cannot prompt for sudo, give the user this command for Terminal.app, then re-run `ensure_maestro.sh`:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

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

## Wallet password consent (mandatory, before unlock)

The app will lock. You will need the user's wallet password in order to unlock their wallet. Do **not** launch the app, type into the unlock field, or run `maestro test` until they have consented (or unlocked the wallet themselves).

Present a **Yes / No checklist** with the AskQuestion tool. Do not ask this as freeform chat. Use this exact prompt and these two options, then **wait** for their selection:

> I'll need your wallet password in order to unlock your wallet. Do you consent to providing it? The password will never be:
>
> - Written into YAML, git, the PR body, gist files, or screenshot names
> - Echoed, logged, or repeated in later messages
> - Captured on the login/unlock screen (those PNGs go to the gist)
> - Passed at runtime only as ${WALLET_PASSWORD} — never hardcoded

| Option | Label |
| ------ | ----- |
| `yes`  | Yes |
| `no`   | No |

- If they choose **No** or do not answer: stop. Ask them to unlock the wallet on the simulator themselves, then continue without ever collecting the password.
- If they choose **Yes**: ask for the password. Use it only to unlock the local simulator wallet.

Once you have the password, it must **not be uploaded anywhere**:

- Never write it into YAML, scripts, repo `.env` files, git commits, the PR body, gist files, screenshot filenames, or chat summaries.
- Never echo, print, or log it. Do not repeat it in later messages.
- Never screenshot the login/unlock screen (typed text can appear in the PNG; those PNGs are uploaded to the gist).
- In Maestro YAML, reference `${WALLET_PASSWORD}` only — never a literal password.
- Pass it at runtime only (`maestro test -e WALLET_PASSWORD=...`). Unset the env var after unlock.
- Before `embed_pr_screenshots.py`, confirm `maestro/before/` and `maestro/after/` contain no unlock-screen PNGs. The gist/PR upload is screenshots only.

## Unlock the wallet (every invocation)

The app locks on launch. **Always** unlock before any capture — do not skip this even if the wallet looked unlocked earlier. Run [templates/unlock.yaml](templates/unlock.yaml) after consent, and again after every `git checkout` / app relaunch (Step 2 and Step 3).

1. Copy [templates/unlock.yaml](templates/unlock.yaml) to `maestro/unlock.yaml` and set `appId`.
2. Run it (no screenshots; do not copy this run into `before/` or `after/`):

   ```bash
   maestro test maestro/unlock.yaml --device "<device>" --test-output-dir maestro/runs/unlock -e WALLET_PASSWORD="${WALLET_PASSWORD}"
   ```

3. Success is `wallet-screen` visible. If login never appears, stop and say so — do not type the password on another screen.
4. Capture/assert flows also unlock after their own `launchApp` (app restarts lock the wallet). Those copies still use `${WALLET_PASSWORD}` only.

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
# install/run the app on the chosen device; do not wipe the simulator

mkdir -p maestro/before maestro/after maestro/runs
# App locks on relaunch — unlock every time, then capture.
maestro test maestro/unlock.yaml --device "<device>" --test-output-dir maestro/runs/unlock-base -e WALLET_PASSWORD="${WALLET_PASSWORD}"
maestro test maestro/<flow>-capture.yaml --device "<device>" --test-output-dir maestro/runs/base -e WALLET_PASSWORD="${WALLET_PASSWORD}"
cp maestro/runs/base/**/takeScreenshot/*.png maestro/before/
python3 .cursor/skills/maestro-visual-regression/scripts/resize_screenshots.py maestro/before
```

Those files are **Before** (`main`), at 390px width.

## Step 3 — After PNGs on the candidate branch

```bash
git checkout "${CANDIDATE_BRANCH}"
# install/run this branch on the same device; do not wipe the simulator

maestro test maestro/unlock.yaml --device "<device>" --test-output-dir "maestro/runs/unlock-${CANDIDATE_BRANCH}" -e WALLET_PASSWORD="${WALLET_PASSWORD}"
maestro test maestro/<flow>-capture.yaml --device "<device>" --test-output-dir "maestro/runs/${CANDIDATE_BRANCH}" -e WALLET_PASSWORD="${WALLET_PASSWORD}"
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
- Skip installing Maestro when it is missing, or install it into the repo.
- Use `brew install maestro` (wrong package). Always use `mobile-dev-inc/tap/maestro`.
- Unlock the wallet without consent, or collect the password after they refuse.
- Skip the unlock flow. The app locks on every skill run and after each branch relaunch.
- Upload, commit, gist, log, echo, or screenshot the wallet password. It is local unlock only.
