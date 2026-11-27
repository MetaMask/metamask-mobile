# OTA rollback runbook

Workflow: **Actions → OTA Rollback** (`.github/workflows/ota-rollback.yml`).

## 1. Decide

- Get the bad OTA's commit and the last good one (Runway OTA Production run summary, or `eas update:list --branch production`). No earlier OTA: the good commit is the store tag `vX.Y.Z`.
- Check for migrations: `git diff --stat <good>..<bad> -- app/store/migrations`.
- No migration changes: **roll back** (step 2).
- Migration changes, bad OTA not harmful: **don't roll back**, ship a down migration (step 3).
- Migration changes, bad OTA harmful (security, fund loss): roll back now (step 2), then ship a down migration (step 3).

## 2. Roll back

- **Run workflow** from `release/X.Y.Z` (or `-ota`) of the affected store version.
- `channel`: `production`. `mode`: `republish` + last good group ID, or `embedded` if there's no earlier OTA. `platform`: `all` unless only one is affected. `reason`: incident link. `drill`: off.
- Ask a second release-team member to approve `build-production` (appears after "Setup dependencies", a few minutes in).
- One run per affected store version. Wrong group: run again with the right one.
- Don't turn off `otaUpdatesEnabled`; it also blocks the rollback.

## 3. Ship a down migration

Use when the bad OTA added migrations. The app has no reverse migrations; older code skips newer migrations and runs on the newer data.

- On `release/X.Y.Z`, revert the bad change and bump `OTA_VERSION` (`app/constants/ota.ts`).
- Keep the bad OTA's migration files and numbers. Empty them if they're harmful (see `073.ts`).
- Add a new migration that undoes them, changing data only if it's still in the new shape (see `148.ts`).
- Write the new migration so it's safe to run twice and on data that was never migrated.
- Publish with Runway OTA Production.

## 4. Verify

- Store build on a test device, launch twice. **Settings → About MetaMask**, long-press the fox: check the update ID.
- iOS offers a reload; Android and `embedded` apply on the next cold start. Users unlock again.
- Sentry: events with the bad `expo-update-id` drop.

## 5. If the rollback can't reach devices

- Malicious bundle that skips update checks: store release with a new version.
- Leaked signing key: new certificate through a store release.

## Drill (quarterly, no users affected)

- Run from `main`: `production`, `embedded`, `drill` on. Approve.
- Run again: `republish` with the group from the summary, `drill` on.
- Delete both groups: `eas update:delete <group>`.
