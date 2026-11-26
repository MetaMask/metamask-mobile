# OTA rollback

How to take a bad OTA (EAS Update) off users' devices with the **OTA Rollback** workflow (`.github/workflows/ota-rollback.yml`). It works for an ordinary bug and for a compromised or malicious update. It doesn't rebuild anything, so it publishes in minutes instead of going through "Runway OTA Production" again.

## Choose the rollback type

| Mode        | What devices get                                                | Use it when                                                                  |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `republish` | An earlier update group, served again as a new update           | An earlier good OTA exists for the same store version                        |
| `embedded`  | A directive to run the bundle that shipped in their store build | The bad OTA is the first one for that store version, or every OTA is suspect |

Prefer `republish` when you can. It applies faster on iOS, where users are offered a reload, and it rolls back less code, so there's less state risk (see [What happens to the user and their data](#what-happens-to-the-user-and-their-data)).

## Who can run it

The workflow runs its signing job in the same GitHub environment as the OTA it rolls back:

- **`production`** uses `build-production`. A member of **release-team** has to approve the run, and it can't be the person who started it. The environment only accepts runs from `main` or `release/*`.
- **`rc`** and **`exp`** use `build-rc` and `build-exp`, which need no approval.

Anyone with write access can start the workflow, but nothing is signed or published until the environment approves it. Before approving, check the run summary. It lists the channel, mode, update group, platform, runtime version, branch and reason.

## Run it

1. **Find the update group** (for `republish`). Use the group of the last good OTA for the affected store version:
   - The **Update group** line in the summary of that OTA's "Runway OTA Production" run.
   - Or, with the Expo CLI: `eas update:list --branch production`.
2. **Check the bad OTA's diff** against the list in [Before you roll back](#before-you-roll-back).
3. **Start the workflow.** Go to **Actions → OTA Rollback → Run workflow** and fill in:
   - **Use workflow from:** `release/X.Y.Z`, the release branch of the affected store version. The runtime version comes from that branch's `package.json`, so a run from another branch would target the wrong version. Production and RC runs fail fast unless the branch is `release/X.Y.Z` or `release/X.Y.Z-ota`.
   - **channel:** `production`.
   - **mode:** `republish` or `embedded`.
   - **group_id:** the group from step 1. Leave it empty for `embedded`.
   - **platform:** `all` unless only one platform is affected.
   - **reason:** a short description, for example the incident link. It goes into the update message.
   - **drill:** leave unchecked.
4. **Get it approved.** The approval request only appears after the "Setup dependencies" job finishes, which takes a few minutes, so ask a second release-team member as soon as you start the run. They review the summary and approve the `build-production` deployment.
5. **Check the result.** The run summary lists the new update IDs. Then:
   - Install the affected store build on a test device and launch it twice. To see which update is running, go to **Settings → About MetaMask** and long-press the fox.
   - Watch the share of Sentry events tagged with the bad `expo-update-id` fall.

If a bad OTA went out to more than one store version, run the workflow once per release branch. If you rolled back to the wrong group, run it again with the right one; each run publishes a new latest update.

### What the workflow checks before signing

- The inputs are consistent: `republish` needs a group ID, `embedded` must not have one, and a single-line reason is required.
- Production and RC runs come from a `release/X.Y.Z` or `release/X.Y.Z-ota` branch, the same pattern the OTA push enforces.
- The environment's channel matches the requested channel.
- The project resolves the expected runtime version.
- For `republish`: the group is on a branch the channel serves, targets the same runtime version, and has the requested platform.

`eas-cli` also refuses to republish a group signed with a different key than the channel's.

## What happens to the user and their data

### On the device

The app checks for updates once per launch, from JavaScript (`useOTAUpdates`), when the `otaUpdatesEnabled` remote flag is on. Production builds never check natively (`checkAutomatically: 'NEVER'`).

| Mode        | iOS                                                                                 | Android                                                                          |
| ----------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `republish` | Downloads on launch, then offers a reload. If dismissed, applies on next cold start | Downloads on launch, shows an acknowledge-only sheet, applies on next cold start |
| `embedded`  | Downloads on launch, no sheet, applies on next cold start                           | Same as iOS                                                                      |

Users who haven't finished onboarding get no sheet; the update applies on their next launch. Applying an update restarts the JavaScript app, so the wallet starts locked and the user unlocks with biometrics or their password, as after any cold start.

### Their data

Rolling back means an older bundle runs on data written by a newer one. Nothing in the app handles this case specially; this is how the existing persistence code behaves:

- **Settings and other Redux state (`persist:root`).** The stored migration version is higher than the older bundle knows, so redux-persist skips migrations and loads the data as it is. On the next save, the older bundle writes its own, lower version number. Data in a shape that a newer migration changed is now read by older code. This is the most likely cause of errors or crashes after a rollback.
- **Controller state (`persist:<Controller>` files).** The older bundle only loads the controllers it knows. Files for newer controllers stay on disk, unused. When a controller it knows saves, the whole file is rewritten with only the fields the older code marks as persistent, so fields added by the newer bundle are lost, with a Sentry error for each. If the bad OTA had a migration that removed a controller (`REMOVED_CONTROLLER_NAMES` in `app/store/migrations/index.ts`), its file was deleted, and the older bundle starts that controller empty. For example, migration 164 deletes `TokensController`.
- **The vault.** Decryption uses the key-derivation settings stored with the vault, so older code can unlock a vault that newer code re-encrypted. Keyrings of a type the older code doesn't know are kept as "unsupported" and written back unchanged: their accounts are hidden until a newer bundle runs, not deleted. A copy of the vault is backed up in the keychain. If the wallet fails to load, the app opens the restore-wallet screen. The worst case is restoring from the Secret Recovery Phrase. Keys never leave the device, so funds stay safe.
- **Other storage** (MMKV, keychain entries). The older bundle ignores keys it doesn't know; they stay as they are.
- **Going forward again.** The next newer bundle sees the lowered version and re-runs every migration above it, on data that may already be migrated. Migrations that check before changing anything are safe to re-run. Migrations 162 to 164 are, for example. One that isn't can corrupt data, and a migration that throws sends users with a vault backup to vault recovery.

### Before you roll back

Check the bad OTA's diff for:

- new migrations, especially ones that remove a controller or change the shape of existing data;
- new persisted fields in controllers;
- vault, keyring or keychain changes.

If it has any of these and isn't actively harmful, a forward fix through "Runway OTA Production" that keeps its migrations (emptied out if needed) is safer than a rollback. If it is actively harmful, roll back and accept the risk. Either way, make sure the forward fix's migrations are safe to re-run.

## What a rollback can't do

- **It only reaches devices that still check for updates.** A malicious bundle can skip the check, and then no OTA reaches the device again. Those devices need a store release with a new version, or a reinstall.
- **Nothing reloads a running app.** See [On the device](#on-the-device).
- **Don't turn off `otaUpdatesEnabled` while you roll back.** That stops devices from fetching the bad update, but it also stops them from fetching the rollback. Use it only if a rollback can't be published soon, for example when the signing key itself is compromised.
- **A compromised signing key is a different incident.** Anyone with the key and an Expo token can publish more valid updates after the rollback. The fix is a new certificate, which only reaches users through a store release.

## Rehearse without affecting users

Run these drills after any change to the workflow, the OTA pipeline or `useOTAUpdates`, and at least once a quarter.

### Production drill: no device can receive it

With **drill** checked, the workflow publishes on runtime version `0.0.0-rollback-drill`. No store build has that runtime version, so no device matches. It still goes through everything a real rollback does: release-team approval, the production signing key from AWS, signing and publishing to the production channel.

1. Run from `main` with channel `production`, mode `embedded` and drill checked. Have it approved.
2. Copy the update group from the run summary.
3. Run again with mode `republish`, that group ID and drill checked. This exercises republish signing.
4. Note how long each run took, from dispatch to published, and how long it waited for approval.
5. Delete the drill groups with `eas update:delete <group>`.

### Device drill on the exp channel

This checks what devices actually do. The exp channel only reaches internal nightly installs, so tell the nightly testers before you start.

1. Install the current nightly build on an iOS device and an Android device, and confirm both run the latest exp OTA.
2. **Republish:** run with channel `exp`, mode `republish` and the latest exp update group. That's the same bundle the testers already run, so their data isn't affected. Confirm that:
   - iOS shows the reload sheet and runs the new update ID after reloading;
   - Android shows the acknowledge sheet and runs the new update ID after the next cold start.
3. **Embedded:** run with mode `embedded`. Confirm no sheet appears and both devices run the embedded bundle on the cold start after the download. Unlock, and check that accounts, balances and settings look right.
4. **Restore:** republish the latest exp group again so testers go back to the current OTA.

Run these from `main`, which nightly builds are made from. If `main`'s `package.json` version changed since the installed nightly, the runtime check fails; install a fresh nightly first. The `build-exp` environment also has to allow `main`. Its branch list is empty today, so a repo admin needs to add it first.

### Checks that should fail

- Run `production` from `main` without drill. The "Validate rollback request" job should fail.
- Run `republish` with a group from another store version. The "Check update group" step should fail before the key is fetched.
- Approve your own production run. GitHub should refuse.

## Related tickets

- [MCRM-101](https://consensyssoftware.atlassian.net/browse/MCRM-101): routine rollback safety, including crash-loop recovery and flagging rollback-unsafe changes before publishing.
- [MCRM-198](https://consensyssoftware.atlassian.net/browse/MCRM-198): a kill switch for devices a rollback can't reach. To cover a hostile bundle it has to live in native code.
