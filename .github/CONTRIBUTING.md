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

Which runner fleet a job lands on is controlled by three repository-level Actions variables and, where supported, an explicit workflow input. Namespace is the default for migrated jobs.

- `NAMESPACE_RUNNER_IOS` — iOS and macOS jobs only.
- `NAMESPACE_RUNNER_ANDROID` — Android build and e2e jobs only.
- `NAMESPACE_RUNNER_LINUX` — everything else (lint, unit, integration, upload and summary jobs).

Accepted values:

- `namespace` — Namespace runners (`namespace-profile-*`).
- `bitrise` — Bitrise Build Hub runners, only for workflows that explicitly support the Bitrise provider.

Resolution order, highest priority first:

1. The `runner_provider` workflow input, when it is set to something other than `inherit`. This is a per-run override.
2. The platform variable for the job (`NAMESPACE_RUNNER_IOS`, `_ANDROID` or `_LINUX`).
3. `namespace` (the safe default when no supported provider is selected).

Push-, schedule- and `merge_group`-triggered workflows have no dispatch inputs, so the platform variables are the way to steer them. When a platform variable is unset, the workflow defaults to Namespace.

The production build chain (`build.yml`, `setup-node-modules.yml`, `upload-to-testflight.yml` and their callers) and PR CI (`ci.yml` plus the Android/iOS e2e build workflows) use Namespace. BrowserStack native builds go through `build.yml` and follow the platform fleet. OTA (`eas-update-platform.yml`) and iOS BrowserStack upload follow `NAMESPACE_RUNNER_LINUX` (`ci-linux` vs `ubuntu-latest`). Android BrowserStack upload/repack follows `NAMESPACE_RUNNER_ANDROID` (`metamask-android-build`, which has JDK and `/opt/android-sdk`). Bitrise routing remains explicit and separate. Do not put that job on `ci-linux`.

The scheduled arm64 E2E APK build (`build-android-arm64-scheduled.yml`) uses `inherit`. It dual-uploads the release APK to both GitHub Actions and Namespace artifact stores so the local-repro `gh run download` path continues to work while the build runs on Namespace. Appium jobs and fixture validation follow the same resolution chain as the PR build jobs (converted in #35002).

A few short GitHub-hosted jobs stay on `ubuntu-latest` on purpose and do not follow `NAMESPACE_RUNNER_LINUX`: `get-requirements.yml`, `native-build-fingerprint`, `prepare-e2e-timings`, `ios-tests-ready`, and `cleanup-ci-js-deps`.

#### Provider overrides

The legacy runner rollback path has been retired. Namespace is the supported provider for migrated jobs. Bitrise may be selected explicitly only in workflows that document Bitrise support.

In-flight runs are unaffected; the next run picks up the new value.

#### Adding a provider-aware job

Two rules:

- `runs-on:` must inline the full resolution chain. The `env` context is not available in `runs-on`, so it cannot be factored out.
- Every step condition must test the job's `RESOLVED_RUNNER_PROVIDER` env var, never `inputs.runner_provider` directly. Testing the raw input means a provider set through the variables is silently ignored, and the job would take the wrong `checkout` / `cache` branch on a Namespace runner.

And that's it! Thanks for helping out.
