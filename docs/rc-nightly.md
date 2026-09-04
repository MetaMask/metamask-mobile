# Main nightly (`rc-nightly`) vs official RC

Mobile keeps a dual nightly from `main` (Main + Exp). After [MCRM-142](https://consensyssoftware.atlassian.net/browse/MCRM-142), **Main nightly is not an official release candidate**.

| Track        | When                            | Build / env                                           | Mixpanel `$app_version_string` | LaunchDarkly         | OTA receive channel                  |
| ------------ | ------------------------------- | ----------------------------------------------------- | ------------------------------ | -------------------- | ------------------------------------ |
| Main nightly | Nightly Build on `main`         | `main-rc-nightly` / `METAMASK_ENVIRONMENT=rc-nightly` | `{version}-rc-nightly`         | **ReleaseCandidate** | **`rc`** (same certs as official RC) |
| Official RC  | Runway / Auto RC on `release/*` | `main-rc` / `rc`                                      | `{version}-release-candidate`  | **ReleaseCandidate** | `rc`                                 |
| Exp nightly  | Nightly Build on `main`         | `main-exp` / `exp`                                    | `{version}-experimental`       | **Exp**              | `exp`                                |

Native `CFBundleShortVersionString` / Android `versionName` stay unsuffixed. Android Main nightly is signed with the **RC keystore** (`signingConfigs.mainRc`) so it can update over older RC-signed nightlies.

## Why `rc-nightly` exists

Mixpanel suffixes `app_version_string` by environment (MCRM-129). When Main nightly still used `METAMASK_ENVIRONMENT=rc`, nightlies collided with official Runway RCs under `*-release-candidate` and over-counted RC coverage boards.

`rc-nightly` keeps RC-like product behavior (LD ReleaseCandidate, Ramp/Card/Perps prod APIs, screenshot / Money error-alert parity) while giving Mixpanel a distinct suffix.

Do **not** invent a new LaunchDarkly environment for nightly Main. An unmapped env would fall through to Development.

## Where it is wired

- `builds.yml` → `main-rc-nightly` (`github_environment: build-rc`, `METAMASK_ENVIRONMENT: rc-nightly`)
- `.github/workflows/nightly-build.yml` → iOS `environment: rc-nightly`, Android `build_name: main-rc-nightly`
- Mixpanel: `app/util/metrics/getAnalyticsAppVersion.ts` (`'rc-nightly': 'rc-nightly'`)
- LaunchDarkly: `app/core/Engine/controllers/remote-feature-flag-controller/utils.ts` (`case 'rc-nightly'` → ReleaseCandidate)
- OTA certs / channel mapping: `app.config.js`, `scripts/update-expo-channel.js` (`rc-nightly` → RC certs + **`rc`** channel)

## Local convenience

```bash
yarn start:android:rc-nightly
yarn start:ios:rc-nightly
```

Both call `./scripts/build.sh … main rc-nightly --local`. About MetaMask should show **RC-NIGHTLY**; Metro IDENTIFY `applicationVersion` should be `{version}-rc-nightly`, not `*-release-candidate`. Local Segment usually uses the Dev write key, so Mixpanel Prod/QA staying empty is expected.

## CI / TestFlight

- Nightly Build always checks out `source_branch: main` and needs GitHub env `build-rc` (allowed on `main` / `release/*` only). Do not dispatch Nightly from a feature branch to “test” this change.
- After merge: Actions → **Nightly Build** → Run workflow from **`main`**, or wait for `0 4 * * *` UTC.
- iOS lands in TestFlight group `MetaMask BETA & Release Candidates`; Android artifact is `android-apk-main-rc-nightly`.

## Out-of-repo follow-up

`#nightly-builds` Slack copy is owned by Runway (bot **Mobile Nightly Build Automation**). Point that template at **Main RC Nightly**, not official RC. That change is not in this repository.

## Related

- OTA how-to: [nightly-ota-updates.md](./nightly-ota-updates.md)
- Ticket: [MCRM-142](https://consensyssoftware.atlassian.net/browse/MCRM-142)
