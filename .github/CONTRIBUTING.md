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

The `build.yml` build job skips step 1 when the build uses a production or RC signer (`*-prod-signer*` or `*-rc-signer*` in `builds.yml`), so only the repo variables pick the runner for those builds. The Runway workflows (`runway-production-builds.yml`, `runway-rc-builds.yml`) have no `runner_provider` input.

Push-, schedule- and `merge_group`-triggered workflows have no dispatch inputs, so the variables are the only way to steer them. That is why the input default is empty rather than a concrete provider.

The production build chain (`build.yml`, `setup-node-modules.yml`, `upload-to-testflight.yml` and their callers) and PR CI (`ci.yml` plus the Android/iOS e2e build workflows) are on the switch. BrowserStack native builds go through `build.yml` and follow the fleet. OTA (`eas-update-platform.yml`) and iOS BrowserStack upload follow `NAMESPACE_RUNNER_LINUX` (`ci-linux` vs `ubuntu-latest`). On Namespace the OTA push label is `namespace-profile-metamask-ci-linux;job.priority=1`, so a queued update is scheduled ahead of other Namespace jobs that set no priority. That ordering applies only when the workspace is at its concurrency limit, and it does not preempt a job that is already running. The `ubuntu-latest` rollback has no priority. Android BrowserStack upload/repack follows `NAMESPACE_RUNNER_ANDROID` (`metamask-android-build`, which has JDK and `/opt/android-sdk`) and keeps Cirrus / `ubuntu-latest` only for `current` rollback. Do not put that job on `ci-linux`.

The scheduled arm64 E2E APK build (`build-android-arm64-scheduled.yml`) previously stayed on Cirrus for artifact-store parity, but now uses `inherit`. When resolved to Namespace, it dual-uploads the release APK to both GitHub Actions and Namespace artifact stores; on a `current` rollback it uploads to GitHub only. That keeps the local-repro `gh run download` path working while the build itself runs on Namespace. Appium jobs and fixture validation already follow the same resolution chain as the PR build jobs (converted in #35002).

A few short GitHub-hosted jobs stay on `ubuntu-latest` on purpose and do not follow `NAMESPACE_RUNNER_LINUX`: `get-requirements.yml`, `native-build-fingerprint`, `prepare-e2e-timings`, and `cleanup-ci-js-deps`.

#### Rolling back

- Everything back to the pre-migration routing: set `NAMESPACE_RUNNER_LINUX`, `NAMESPACE_RUNNER_ANDROID`, and `NAMESPACE_RUNNER_IOS` to `current` (or clear them). `NAMESPACE_RUNNER_PROVIDER=current` alone does nothing while those platform vars stay `namespace`.
- Android only, leaving iOS and Linux on Namespace: set `NAMESPACE_RUNNER_ANDROID=current`.
- iOS only: set `NAMESPACE_RUNNER_IOS=current`.
- Generic Linux CI jobs back to `ubuntu-latest`: set `NAMESPACE_RUNNER_LINUX=current`.
- A single run, without touching any variable: dispatch the workflow with `runner_provider=current`. This does not apply to production- or RC-signed builds, which only follow the variables.

In-flight runs are unaffected; the next run picks up the new value.

#### Adding a provider-aware job

Two rules:

- `runs-on:` must inline the full resolution chain. The `env` context is not available in `runs-on`, so it cannot be factored out.
- Every step condition must test the job's `RESOLVED_RUNNER_PROVIDER` env var, never `inputs.runner_provider` directly. Testing the raw input means a provider set through the variables is silently ignored, and the job would take the wrong `checkout` / `cache` branch on a Namespace runner.

### Production release approvals

Production builds (`build-production` and `build-flask-prod` environments in `builds.yml`) and production OTA updates need approval from two different release approvers. Neither can be the person who triggered the run.

GitHub environments let one reviewer approve each job, so these runs pause twice on the same environment:

1. **Release approval** — `release-approval` in `build.yml`, or in `push-eas-update.yml` for OTA.
2. **The signing job** — `build` in `build.yml`, or `push-update` in `eas-update-platform.yml`.

The signing job's first step, "Verify release approvals", reads the run's approval history and fails unless two different people approved, not counting whoever triggered the run. If one person approves both, re-run the failed job and have a second approver approve it.

Environment setup (repo admins): give `build-production` and `build-flask-prod` required reviewers from the release approvers team, and enable "Prevent self-review". Without required reviewers no approval is recorded, so the check fails closed.

Break-glass: a repo admin sets the `RELEASE_APPROVALS_REQUIRED` repository variable to `1`. The organization audit log records the variable change, and each affected run logs a "Break-glass" warning. It cannot go below one, because the environment's own reviewer rule still applies. Delete the variable afterwards.

And that's it! Thanks for helping out.
