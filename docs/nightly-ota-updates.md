## OTA Updates for Nightly Builds

This document explains how to use OTA (EAS Update) to update **nightly builds** without cutting a new native build.

For how Main nightly (`rc-nightly`) differs from official RC in Mixpanel / LaunchDarkly, see [rc-nightly.md](./rc-nightly.md).

### Expo receive channels

Nightly native binaries listen on existing Expo channels — there is **no** separate `rc-nightly` Expo channel:

| Nightly track | Native `METAMASK_ENVIRONMENT` | Expo receive channel | Push OTA Update `channel` input                                                                     |
| ------------- | ----------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Main nightly  | `rc-nightly`                  | **`rc`**             | `rc` or `rc-nightly` (both use the RC Expo signer; JS env `rc-nightly` still publishes to **`rc`**) |
| Exp nightly   | `exp`                         | **`exp`**            | `exp`                                                                                               |

Prefer `channel: rc` when publishing onto Main nightly devices. `rc-nightly` is accepted so CI can load `main-rc-nightly` from `builds.yml` without inventing a new Expo channel.

---

### Overview

- **Goal**: Deliver JS-only changes to a nightly Expo channel (`exp` or `rc`) without a new native build.
- **Baseline branch**: historically `chore/temp-nightly` (represents the code used for the current nightly native build). Confirm the fingerprint baseline matches the binary you intend to update.
- **Guardrail**: The **Expo fingerprint must match** between:
  - the OTA PR branch, and
  - the chosen `base_branch` (often `chore/temp-nightly` or `main`)
    or the workflow will fail and no update is published.

---

## Prerequisites

- A **nightly native build** already exists, built from `chore/temp-nightly`.
- You only intend to ship **OTA-safe changes** (JS / assets only; no native changes that impact the Expo fingerprint).
- You understand:
  - `app/constants/ota.ts` exposes `OTA_VERSION`, which:
    - **increments** for every OTA for the same native build (`v0 → v1 → v2 → …`), and
    - **resets to `v0`** when a new native build is released.

---

## Step-by-Step Flow

### 1. Create the OTA branch from `main`

1. From `main`, create a new branch for the OTA:

   ```bash
   git checkout main
   git pull
   git checkout -b chore/temp-ota-updates-nightly
   ```

2. On `chore/temp-ota-updates-nightly`:
   - Start from **current `main`**.
   - Add or cherry-pick all changes you want to send to nightly (the code you eventually want in `chore/temp-nightly`).

### 2. Align with the nightly native build

On `chore/temp-ota-updates-nightly`:

- **Match the nightly build number / native config**:
  - Update the **build number** and any relevant native version properties so they **match the already shipped nightly build** (built from `chore/temp-nightly`).
  - Avoid changing native files or config that would alter the **Expo fingerprint** compared to `chore/temp-nightly` (native code, runtime version, `ota.config.js`, etc.).

- **Bump the OTA version** in `app/constants/ota.ts`:
  - Increment `OTA_VERSION` (e.g. `v1 → v2`).
  - Keep the rule:
    - Increment for each new OTA targeting this native build.
    - Reset to `v0` when a new nightly native build is cut.

Commit these changes to `chore/temp-ota-updates-nightly`.

---

### 3. Open a PR targeting the nightly branch

1. Push your branch:

   ```bash
   git push -u origin chore/temp-ota-updates-nightly
   ```

2. Open a PR on GitHub with:
   - **Base branch**: `chore/temp-nightly`
   - **Head branch**: `chore/temp-ota-updates-nightly`

3. In the PR description, clearly state that this is an **OTA update for nightly**.

4. Request review from **mobile-platform** and get the PR approved (this is also enforced by the workflow).

---

### 4. Run the “Push OTA Update (Test)” workflow

Once the PR is ready:

1. Go to **GitHub → Actions**.
2. Select the workflow **`Push OTA Update (Test)`**.
3. Click **“Run workflow”**.
4. Under **“Use workflow from”**, select **`chore/temp-nightly`** (this ensures we use the nightly config and channel).
5. Fill in the inputs:
   - **`pr_number`**: The PR number for `chore/temp-ota-updates-nightly` → `chore/temp-nightly`.
   - **`base_branch`**: `chore/temp-nightly`
     (this is the baseline used for Expo fingerprint comparison).
   - **`channel`**: `exp` for Exp nightly, or `rc` / `rc-nightly` for Main nightly (see table above).

6. Click **“Run workflow”**.

---

## What the Workflow Does

- **Fingerprint comparison**:
  - Checks out the PR head (`refs/pull/<pr_number>/head`) and `base_branch` (`chore/temp-nightly`).
  - Runs `yarn fingerprint:generate` for both.
  - If fingerprints **differ**, the workflow **fails** with a fingerprint mismatch (native changes detected).
  - If fingerprints **match**, it continues.

- **Approval gates (two layers)**:
  - Uses `Require OTA Update Approval` to enforce **mobile-platform** approval on that PR.
  - Uses an additional secret-protected approval step requiring the **mobile-admin** group to approve before the OTA can be published.

- **Push EAS Update**:
  - Checks out the PR branch.
  - Runs `yarn setup:github-ci`.
  - Uses `EXPO_TOKEN`, `EXPO_PROJECT_ID`, and the Expo signer for the selected channel (`exp` / `rc` / production; `rc-nightly` → RC signer) to publish the OTA.
  - Main nightly binaries still **receive** on the **`rc`** channel (`scripts/update-expo-channel.js`).

On success, devices on that Expo receive channel get the update on next app launch.

---

## After the OTA is Published

- If the workflow **succeeds**:
  - Nightly users (built from `chore/temp-nightly`) now receive the OTA corresponding to `chore/temp-ota-updates-nightly`.
  - You can merge the PR into `chore/temp-nightly` to keep the branch in sync with what is actually running on devices.

- If the workflow **fails due to fingerprint mismatch**:
  - Inspect logs to see fingerprints for the PR vs `chore/temp-nightly`.
  - Fix by:
    - Removing native-impacting changes from the OTA branch, or
    - Correctly aligning build numbers and config to match `chore/temp-nightly`,
  - Then re-run the workflow when the fingerprints match.
