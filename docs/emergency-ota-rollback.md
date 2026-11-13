# Emergency OTA rollback

What to do when a production OTA (EAS Update) is compromised or malicious and has to come off users' devices fast, even at some risk to their local state. Use the routine rollback process ([MCRM-101](https://consensyssoftware.atlassian.net/browse/MCRM-101)) for ordinary bugs.

## What a rollback can and cannot do

The app checks for updates only from JavaScript. Production builds set `checkAutomatically: 'NEVER'` (`scripts/update-expo-channel.js`), and `useOTAUpdates` checks once per launch when the `otaUpdatesEnabled` remote flag is on.

- **A rollback stops the spread.** Devices that haven't downloaded the bad update get the rollback instead.
- **A rollback only reaches devices whose running bundle still checks for updates.** A malicious bundle can skip the check, and then no OTA reaches that device again. The recovery paths for those devices are:
  - a store release with a new `package.json` version, which changes the runtime version so the old OTA no longer applies;
  - the user reinstalling the app.
- **It only takes effect after a restart.** Nothing forces a running app to reload:
  - A **republished** update is new to the device, so after it downloads the user gets the "update available" sheet. The sheet can be dismissed. Otherwise it applies on the next cold start.
  - A **roll-back-to-embedded** directive comes back from `fetchUpdateAsync` with `isNew: false`, so `useOTAUpdates` shows no sheet. It applies on the cold start after it downloads, which means two cold starts in total.
- **It must be signed with the production key.** Production builds embed `certs/production.certificate.pem`, and devices ignore anything not signed with the matching key. An unsigned rollback fails silently and the device keeps running the bad bundle. The key is the `metamask-prod-expo-signer` AWS secret, which only `eas-update-platform.yml` can read through the `build-production` environment.
- **Don't switch off `otaUpdatesEnabled` while a rollback is planned.** Devices that haven't downloaded the bad update stop checking, but so do devices that need the rollback. Use it only when a signed rollback can't be published soon, for example when the signing key itself is compromised.
- **A compromised signing key is a different incident.** An attacker with the key and an Expo token can publish more valid updates after our rollback. The fix is a new certificate, which only reaches users in a store release. Rotate it, and treat [MCRM-198](https://consensyssoftware.atlassian.net/browse/MCRM-198) (kill switch) as the stopgap.

## Who decides and who approves

- **Declaring.** The security incident lead declares the emergency rollback. The Mobile release lead can declare it if security isn't reachable within 15 minutes, and informs security.
- **Executing.** A release engineer runs it.
- **Approving.** Two people from the release approvers team, same as any production release ([MCRM-199](https://consensyssoftware.atlassian.net/browse/MCRM-199)). Neither can be the person who started the run.
- **Break-glass.** If a second approver isn't reachable within 15 minutes, a repo admin sets `RELEASE_APPROVALS_REQUIRED=1` (see [Production release approvals](../.github/CONTRIBUTING.md#production-release-approvals)) and deletes it afterwards. One approval is still required. Record in the incident channel who did it and why. The variable change is in the organization audit log.

## How fast

| Step                                  | Target                       | Today            |
| ------------------------------------- | ---------------------------- | ---------------- |
| Decision to signed rollback published | 15 minutes                   | 30 to 70 minutes |
| Rollback on most active devices       | Within one day of publishing | Not measured yet |

**Why it takes 30 to 70 minutes today.** The only path is a forward fix through "Runway OTA Production". The last three production OTAs took 31 to 70 minutes: about 16 minutes of dependency setup and fingerprint checks, 6 to 21 minutes waiting for an approver, and about 10 minutes building and pushing both platforms.

**What it would take to hit 15 minutes.** A dedicated workflow that republishes an existing update group, or publishes a roll-back-to-embedded directive, without rebuilding. See [Follow-ups](#follow-ups).

**Measuring adoption.** Sentry tags every event with `expo-update-id` and `expo-ota-version`. Track how the share of events from the bad update ID falls. Note that a malicious bundle can fake its tags.

## Procedure

1. **Identify the update.**
   - Find the bad update group ID and the last good one. `eas channel:view production` shows the branch the production channel serves, and `eas update:list --branch <that branch>` lists its update groups.
   - Once [MCRM-188](https://consensyssoftware.atlassian.net/browse/MCRM-188) lands, the OTA run summary lists them too.
   - Note the runtime version (the store version it targets) and whether the bad update added migrations or touches the vault (see [State and migration risk](#state-and-migration-risk)).
2. **Choose the target.**
   - **Republish the last good update group.** This applies faster, because the device sees it as new and shows the reload sheet. It's only possible if an earlier good OTA exists for that runtime version.
   - **Roll back to embedded.** Use this if the bad update is the first OTA for that store version.
3. **Publish it, signed.**
   - **Today: forward fix.**
     - Open a PR on the release branch that reverts the bad change and bumps `OTA_VERSION`.
     - Keep any migrations the bad update added, emptied out if necessary (see the next section), so the state version doesn't go down.
     - Run "Runway OTA Production" for that branch, and have both approvers ready before it reaches the approval gate.
   - **With the follow-up workflow:** dispatch it with the update group ID, or `embedded`, plus the platform.
4. **Stop the spread while waiting, if it's needed.** Only if publishing will take long and the bad update is spreading, turn `otaUpdatesEnabled` off for the affected version. Turn it back on as soon as the rollback is published, otherwise the rollback can't reach anyone.
5. **Verify.**
   - Install the affected store build on a test device and launch it.
   - Confirm it downloads the rollback and, after a restart, runs the expected update ID. To see the ID, go to Settings > About MetaMask and long-press the fox.
   - Then watch the Sentry tags.
6. **Follow through.**
   - Plan a store release for devices the rollback can't reach.
   - Rotate the signing key if it may be exposed.
   - Write up the timeline.

## State and migration risk

Persisted Redux and controller state carries one migration version (`app/store/migrations`, `redux-persist` 6).

- **An older bundle keeps the newer state as it is.** It ships fewer migrations, so it sees a higher stored version. `createMigrate` logs that downgrading is unsupported and returns the state untouched. The older code then runs on state shaped for the newer code.
- **The older bundle also lowers the stored version.** It writes its own version on the next save. When a newer bundle ships again, it re-runs every migration above that version, on state that may already be migrated. Migrations that aren't idempotent can corrupt state at that point.
- **The vault and keychain are the worst case.** If the bad update changed how the vault or keychain is encrypted, the older code may not be able to unlock. The user would have to restore from their Secret Recovery Phrase. Funds stay safe, because keys never leave the device.

How to handle it:

- **Prefer a forward fix that keeps migrations.** Leave the bad update's migration entries in place, replacing harmful ones with no-ops, so the version only goes up. Republishing an older update or rolling back to embedded always downgrades the state version.
- **When you have to downgrade, accept the risk if the bad bundle is actively harmful.** Running it costs more than corrupted settings. Before choosing, check the bad update's diff for:
  - new migrations;
  - vault or keychain changes;
  - new persisted fields that older code would choke on.
- **Ship the store release with idempotent migrations.** Anything that may run twice after a downgrade must be safe to repeat.

## Relation to other tickets

- **[MCRM-101](https://consensyssoftware.atlassian.net/browse/MCRM-101)** (routine rollback safety) covers ordinary rollbacks: confirming `eas update:rollback`, the embedded-bundle floor, crash-loop auto-rollback, and flagging rollback-unsafe changes before publishing. This runbook reuses its commands and its rollback-unsafe tracking. The differences in an emergency:
  - it accepts state risk;
  - it may use break-glass;
  - it assumes the bad bundle may be hostile.
- **[MCRM-198](https://consensyssoftware.atlassian.net/browse/MCRM-198)** (kill switch) covers devices a rollback can't reach. A kill switch implemented in JavaScript has the same weakness as the update check: a malicious bundle can remove it. To cover a hostile bundle it has to live in native code or the store build.
- **[MCRM-199](https://consensyssoftware.atlassian.net/browse/MCRM-199)** sets the approval rules this runbook uses.

## Rehearsal plan

Rehearse on the `exp` channel against a nightly build. Never rehearse on production.

**Each quarter, and after any change to the OTA pipeline or `useOTAUpdates`:**

1. Install the current nightly build on an iOS device and an Android device.
2. Publish a harmless OTA to `exp` (for example, a visible version string change) and confirm both devices run it.
3. **Republish drill.** Republish the update group from before it, then time:
   - from the decision to the publish;
   - from the publish to each device running it, through the reload sheet;
   - from the publish to each device running it without the sheet (on the next cold start).
4. **Embedded drill.** Repeat with a roll-back-to-embedded directive, and confirm it needs two cold starts.
5. **Signature drill.** Publish an unsigned directive and confirm the devices reject it.
6. **Migration drill.** Twice a year, add a test migration in the "bad" OTA, roll back, push a forward fix, and confirm the app still unlocks and settings survive.
7. Record the times, and update [How fast](#how-fast) if the targets aren't realistic.

The production approval path (two approvers, break-glass) is exercised by every production OTA. Note the approval wait in each one.

## Follow-ups

These aren't done yet, and each is its own change:

- **A rollback workflow.** It would republish an update group, or publish a roll-back-to-embedded directive, behind the same `build-production` approvals, without rebuilding. This is what makes the 15-minute target reachable.
- **A "rollback-unsafe" check on OTA PRs.** It would flag new migrations and vault or keychain changes, so the risk is known before publishing ([MCRM-101](https://consensyssoftware.atlassian.net/browse/MCRM-101)).
- **A native-side update check or kill switch.** This would reach devices whose bundle is hostile ([MCRM-198](https://consensyssoftware.atlassian.net/browse/MCRM-198)).
- **A signing key rotation runbook.** It would cover generating the key pair, storing it in AWS, shipping the new certificate in a store release, and retiring the old key.
