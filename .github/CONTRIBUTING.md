# Welcome to MetaMask!

If you're submitting code to MetaMask, there are some simple things we'd appreciate you doing to help us stay organized!

### Finding the right project

Before taking the time to code and implement something, feel free to open an issue and discuss it! There may even be an issue already open, and together we may come up with a specific strategy before you take your precious time to write code.

There are also plenty of open issues we'd love help with. Search the [`good first issue`](https://github.com/MetaMask/metamask-mobile/contribute) label, or head to Gitcoin and earn ETH for completing projects we've posted bounties on.

If you're picking up a bounty or an existing issue, feel free to ask clarifying questions on the issue as you go about your work.

### Submitting a pull request

When you're done with your project / bugfix / feature and ready to submit a PR, there are a couple guidelines we ask you to follow:

- [ ] **Make sure you followed our [`coding guidelines`](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md)**: These guidelines aim to maintain consistency and readability across the codebase. They help ensure that the code is easy to understand, maintain, and modify, which is particularly important when working with multiple contributors.
- [ ] **Test it**: For any new programmatic functionality, we like unit tests when possible, so if you can keep your code cleanly isolated, please do add a test file to the `tests` folder.
- [ ] **Add to the CHANGELOG**: Help us keep track of all the moving pieces by adding an entry to the [`CHANGELOG.md`](https://github.com/MetaMask/metamask-mobile/blob/main/CHANGELOG.md) with a link to your PR.
- [ ] **Meet the spec**: Make sure the PR adds functionality that matches the issue you're closing. This is especially important for bounties: sometimes design or implementation details are included in the conversation, so read carefully!
- [ ] **Close the issue**: If this PR closes an open issue, add the line `fixes #$ISSUE_NUMBER`. Ex. For closing issue 418, include the line `fixes #418`. If it doesn't close the issue but addresses it partially, just include a reference to the issue number, like `#418`.
- [ ] **Keep it simple**: Try not to include multiple features in a single PR, and don't make extraneous changes outside the scope of your contribution. All those touched files make things harder to review ;)
- [ ] **PR against `main`**: Submit your PR against the `main` branch. This is where we merge new features to be included in forthcoming releases. When we initiate a new release, we create a branch named `release/x.y.z`, serving as a snapshot of the `main` branch. This particular branch is utilized to construct the builds, which are then tested during the release regression testing phase before they are submitted to the stores for production. In the event your PR is a hot-fix for a bug identified on the `release/x.y.z` branch, you should still submit your PR against the `main` branch. This PR will subsequently be cherry-picked into the `release/x.y.z` branch by our release engineers.
- [ ] **Get the PR reviewed by code owners**: At least two code owner approvals are mandatory before merging any PR.
- [ ] **Ensure the PR is correctly labeled.**: More detail about labels definitions can be found [here](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md).

### Runner provider switch

Which runner fleet a job lands on is controlled by four repository-level Actions variables. They exist so the fleet can be moved or rolled back by editing variables, with no code change, no revert and no redeploy.

- `NAMESPACE_RUNNER_PROVIDER` — fallback when the job's platform variable is unset. It does not override `NAMESPACE_RUNNER_LINUX` / `_ANDROID` / `_IOS`.
- `NAMESPACE_RUNNER_IOS` — iOS and macOS jobs only.
- `NAMESPACE_RUNNER_ANDROID` — Android build and e2e jobs only.
- `NAMESPACE_RUNNER_LINUX` — everything else (lint, unit, integration, upload and summary jobs).

Accepted values:

- `namespace` — Namespace runners (`namespace-profile-*`).
- `current` — the routing that predates the Namespace migration. This is not one label: it resolves per job to Cirrus for native builds and e2e, and to `ubuntu-latest` or `macos-latest` for the lighter jobs.

Resolution order, highest priority first:

1. The `runner_provider` workflow input, when it is set to something other than `inherit`. This is a per-run override.
2. The platform variable for the job (`NAMESPACE_RUNNER_IOS`, `_ANDROID` or `_LINUX`).
3. `NAMESPACE_RUNNER_PROVIDER`.
4. `current`.

Push-, schedule- and `merge_group`-triggered workflows have no dispatch inputs, so the variables are the only way to steer them. That is why the input default is empty rather than a concrete provider.

The production build chain (`build.yml`, `setup-node-modules.yml`, `upload-to-testflight.yml` and their callers) and PR CI (`ci.yml` plus the Android/iOS e2e build workflows) are on the switch. BrowserStack native builds go through `build.yml` and follow the fleet. OTA (`eas-update-platform.yml`) and iOS BrowserStack upload follow `NAMESPACE_RUNNER_LINUX` (`ci-linux` vs `ubuntu-latest`). Android BrowserStack upload/repack follows `NAMESPACE_RUNNER_ANDROID` (`metamask-android-build`, which has JDK and `/opt/android-sdk`) and keeps Cirrus / `ubuntu-latest` only for `current` rollback. Do not put that job on `ci-linux`.

The scheduled arm64 E2E APK build (`build-android-arm64-scheduled.yml`) previously stayed on Cirrus for artifact-store parity, but now uses `inherit`. When resolved to Namespace, it dual-uploads the release APK to both GitHub Actions and Namespace artifact stores; on a `current` rollback it uploads to GitHub only. That keeps the local-repro `gh run download` path working while the build itself runs on Namespace. Appium jobs and fixture validation already follow the same resolution chain as the PR build jobs (converted in #35002).

A few short GitHub-hosted jobs stay on `ubuntu-latest` on purpose and do not follow `NAMESPACE_RUNNER_LINUX`: `get-requirements.yml`, `native-build-fingerprint`, `prepare-e2e-timings`, `cleanup-ci-js-deps`, plus light CI gates that do not need Namespace cache volumes (`check-diff`, `dedupe`, `git-safe-dependencies`, `check-workflows`, `lint` aggregate, `report-fixture-validation`, `sonar-cloud-quality-gate-status`, `check-all-jobs-pass`, `log-merge-group-failure`, and the non-`lint:tsc` legs of the `scripts` matrix).

#### Namespace Linux capacity

The org Namespace Linux pool is capped (about 2,000 vCPUs). Android Appium and Gradle jobs are the heaviest consumers (`android-e2e` / `android-build`, typically 16 vCPU each). Mitigations already in workflows:

| Control                         | Where                                                                  | Value                                                        |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Appium Android shard cap        | `run-appium-smoke-tests-android.yml`                                   | `max-parallel: 8` (of up to 25 `ALL` shards)                 |
| Unit-test shards                | `ci.yml` `unit-tests`                                                  | `max-parallel: 5`                                            |
| Component-view shards           | `ci.yml` `component-view-tests`                                        | `max-parallel: 3`                                            |
| Lint shards                     | `ci.yml` `lint-shards`                                                 | `max-parallel: 2`                                            |
| Scripts matrix                  | `ci.yml` `scripts`                                                     | `max-parallel: 4`; light legs on `ubuntu-latest`             |
| Scheduled Android serialization | `run-performance-e2e-manual.yml` + `build-android-arm64-scheduled.yml` | shared concurrency group `namespace-linux-android-scheduled` |

**How to measure before/after a capacity change**

1. Namespace console: Linux vCPU utilization and queue wait for profiles `metamask-ci-linux*`, `metamask-android-e2e`, and `metamask-android-build`, especially weekdays 06:00–12:00 UTC.
2. GitHub Actions: for a representative PR with Android E2E enabled, compare wall-clock from `appium-android-smoke` matrix start to last shard finish, and count how many shards were `queued` vs `in_progress` at once (should not exceed `max-parallel`).
3. Workflow dispatch: run `run-appium-smoke-tests-android.yml` with `selected_tags: '["ALL"]'` and confirm at most eight Android e2e jobs are active concurrently.
4. Keep a one-week baseline and a one-week post-change window; raise or lower `max-parallel` only from that telemetry, not from a single quiet day.

Docs-only PRs still start `ci.yml` (required checks must report). Prefer the existing `get-requirements` / `skip_everything` path over workflow-level `paths-ignore`, which would leave required checks pending.

#### Rolling back

- Everything back to the pre-migration routing: set `NAMESPACE_RUNNER_LINUX`, `NAMESPACE_RUNNER_ANDROID`, and `NAMESPACE_RUNNER_IOS` to `current` (or clear them). `NAMESPACE_RUNNER_PROVIDER=current` alone does nothing while those platform vars stay `namespace`.
- Android only, leaving iOS and Linux on Namespace: set `NAMESPACE_RUNNER_ANDROID=current`.
- iOS only: set `NAMESPACE_RUNNER_IOS=current`.
- Generic Linux CI jobs back to `ubuntu-latest`: set `NAMESPACE_RUNNER_LINUX=current`.
- A single run, without touching any variable: dispatch the workflow with `runner_provider=current`.

In-flight runs are unaffected; the next run picks up the new value.

#### Adding a provider-aware job

Two rules:

- `runs-on:` must inline the full resolution chain. The `env` context is not available in `runs-on`, so it cannot be factored out.
- Every step condition must test the job's `RESOLVED_RUNNER_PROVIDER` env var, never `inputs.runner_provider` directly. Testing the raw input means a provider set through the variables is silently ignored, and the job would take the wrong `checkout` / `cache` branch on a Namespace runner.

And that's it! Thanks for helping out.
