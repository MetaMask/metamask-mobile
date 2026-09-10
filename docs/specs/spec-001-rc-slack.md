# spec-001: Slim Slack release notifications

## Summary

Slim `.github/workflows/slack-rc-notification.yml` in place: shallow checkout, no Yarn cache, no `yarn install`. Callers, the Node script, metadata fallback, and the dormant Play Store download stay. Success is identical dry-run payloads and a ≥60% faster median setup-to-payload time across three paired GitHub Actions runs. Independent Slack or RC-comment dispatch is out of scope (`docs/specs/spec-002-rc-comment.md`).

## Copy Prompt for Implementation

```text
- Implement only docs/specs/spec-001-rc-slack.md.
- Change production YAML in .github/workflows/slack-rc-notification.yml only (fetch-depth 1, drop cache: yarn, drop yarn install).
- Add the temporary branch-scoped benchmark workflow, push, run it three times, paste run URLs and median timings, then delete the benchmark from the PR.
- Do not edit callers, post to Slack, cut an RC, or dispatch Slack or the RC comment as independent workflows.
- Ask any questions needed if anything ambiguous.
```

## Context

`.github/workflows/slack-rc-notification.yml` is a reusable GitHub Actions workflow that posts RC or production build notifications. It is called by:

- `.github/workflows/build-rc-auto.yml`
- `.github/workflows/runway-rc-builds.yml`
- `.github/workflows/runway-ota-rc.yml`
- `.github/workflows/runway-production-builds.yml`

The Auto RC Actions usage view attributes approximately 2 minutes 46 seconds to the Slack notification job. This duration is billed job time, not an equivalent addition to Auto RC wall-clock time: the Slack job runs in parallel with the longer RC comment job after the platform builds succeed. Reducing it still lowers runner usage and shortens the notification job itself.

The current setup includes a full-history checkout, Yarn cache restoration, and `yarn install --immutable` before executing `scripts/slack-rc-notification.mjs`.

Git history explains why these steps were introduced:

- `yarn install --immutable` was added in commit `4973b2f3d27` when the notification script imported `parseChangelog` from `@metamask/auto-changelog`.
- `fetch-depth: 0` was added in commit `96ee8a516af` so the script could derive RC notes using `git merge-base` and `git log`.
- Commit `d57c51141b1` removed the changelog dependency and all git-history processing when Slack was changed to link to the release PR comment. The install and full-history checkout remained.
- The optional Android Play Store report download was introduced in commit `b09b78f442d`. Its environment-variable handoff has been commented out since commit `f4808a7545`, but this spec deliberately preserves the dormant integration.

The current script imports only Node's `fs` module and uses the global `fetch` API. It does not import an installed package. The script remains necessary because it constructs Slack Block Kit payloads, selects RC or production behavior, validates URLs, derives the release channel, and calls Slack's API. `actions/setup-node` also remains necessary to honor the repository's Node 24.16.0 requirement from `.nvmrc`.

Checkout remains necessary because the workflow executes the checked-out script and because the Runway OTA RC caller supplies `semver` without iOS or Android build numbers. That path intentionally invokes `scripts/get-build-metadata.sh`, which reads `package.json`, `android/app/build.gradle`, and `ios/MetaMask.xcodeproj/project.pbxproj`.

This specification covers only the low-impact in-place optimization. Dispatching Slack and the RC comment as independent workflows is deferred.

## Hypothesis

If the reusable Slack workflow stops installing dependencies, stops restoring the Yarn cache, and performs a shallow checkout, then its median setup-to-payload duration will decrease by at least 60% without changing notification payloads for RC, OTA RC, or production callers.

The hypothesis is wrong if any tested payload differs, metadata fallback stops working, the candidate median improves by less than 60% across three paired GitHub-hosted runner executions, or an existing caller can no longer invoke the workflow successfully.

## Decisions

- Change `actions/checkout` from `fetch-depth: 0` to `fetch-depth: 1`.
- Keep checkout pinned to `inputs.source_branch`.
- Keep `actions/setup-node@v4` with `node-version-file: '.nvmrc'`.
- Remove `cache: yarn` from `actions/setup-node`; no package-manager operation remains to benefit from the restored cache.
- Remove the `Install dependencies` step and its `yarn install --immutable` command.
- Keep `scripts/slack-rc-notification.mjs`; replacing it with shell, `curl`, or another Slack action would increase behavioral and security risk without addressing the measured setup cost.
- Keep the conditional `scripts/get-build-metadata.sh --ci` fallback unchanged so the Runway OTA RC caller continues to obtain native build numbers.
- Keep the optional Android Play Store report download and the `actions: read` permission in this change. Its consumer is currently disabled, but removing the dormant integration is independent cleanup.
- Do not modify the four caller workflows.
- Do not add permanent benchmark or pull-request jobs.
- Validate on GitHub-hosted runners using a temporary, branch-scoped workflow that cannot build or publish.
- Require three paired baseline/candidate runs. Payloads must be byte-for-byte identical, and candidate median duration must be at least 60% lower than baseline.
- Defer independent Slack and RC-comment dispatch to a later change.

## Implementation Details

Modify `.github/workflows/slack-rc-notification.yml` only for the production change:

1. Set checkout `fetch-depth` to `1`.
2. Remove `cache: yarn` from the setup-node configuration.
3. Remove the dependency installation step.
4. Leave step ordering, inputs, fallback metadata logic, environment variables, permissions, failure-open behavior, and callers unchanged.

Do not remove setup-node. Although GitHub-hosted Ubuntu runners include Node, the repository explicitly requires Node 24.16.0, and the script relies on the global `fetch` API. Keeping setup-node avoids coupling the notification to changes in the runner image.

Do not remove checkout or the metadata fallback. Auto RC, Runway RC, and Runway production currently pass all build metadata. Runway OTA RC passes only `semver`, so its missing build numbers are read from the checked-out source tree.

For pre-merge performance validation, temporarily add `.github/workflows/slack-rc-notification-benchmark.yml` on a dedicated implementation branch. The temporary workflow must:

- Trigger only on pushes to that exact implementation branch.
- Request no write permissions.
- Receive or inherit no secrets.
- Never call another release, build, upload, deployment, comment, or notification workflow.
- Run a `baseline` and `candidate` job in parallel on the same GitHub-hosted runner class.
- Reproduce the current setup in the baseline: full checkout, setup-node with Yarn caching, optional artifact-download attempt, metadata fallback as applicable, and `yarn install --immutable`.
- Reproduce the proposed setup in the candidate: shallow checkout, setup-node without Yarn caching, the preserved optional artifact-download attempt, metadata fallback as applicable, and no dependency install.
- Set `SLACK_RC_NOTIFICATION_DRY_RUN=true` and omit `SLACK_BOT_TOKEN` in every script invocation.
- Use non-release fixture values for semantic versions, build numbers, PR number, URLs, and channel derivation.
- Exercise these cases after setup:
  - RC metadata supplied explicitly, including PR number.
  - OTA-style invocation with semantic version supplied and native build numbers obtained through `scripts/get-build-metadata.sh --ci`.
  - Production metadata supplied explicitly with `BUILD_KIND=production`.
- Capture each dry-run payload to a file, upload only those test outputs, and compare corresponding baseline and candidate outputs byte-for-byte.
- Record setup-to-payload elapsed time in the job summary or a benchmark artifact.

Run the paired benchmark three times. Use the median elapsed duration for each mode rather than the fastest run, because checkout, action download, and Yarn cache behavior vary between runners. Preserve the three run URLs and measured values as pull-request evidence.

Delete `.github/workflows/slack-rc-notification-benchmark.yml` from the implementation branch before the final change is merged. Its absence from the final diff is mandatory.

The benchmark compares behavior and runner setup cost; it does not contact Slack. A real release notification remains covered by existing release execution after merge.

## Open Questions

_None._

## Acceptance Criteria

- [ ] `.github/workflows/slack-rc-notification.yml` uses `fetch-depth: 1`.
- [ ] The workflow still configures Node from `.nvmrc`.
- [ ] The workflow no longer configures a Yarn cache.
- [ ] The workflow no longer runs `yarn install --immutable`.
- [ ] The metadata fallback condition and `scripts/get-build-metadata.sh --ci` invocation are unchanged.
- [ ] The optional Android Play Store report download and its required permission remain unchanged.
- [ ] All four existing caller workflows remain unchanged and valid.
- [ ] Three paired GitHub-hosted benchmark runs complete without access to release or Slack secrets.
- [ ] RC, OTA-style, and production dry-run payloads are byte-for-byte identical between baseline and candidate in every run.
- [ ] The candidate median setup-to-payload duration is at least 60% lower than the baseline median.
- [ ] No benchmark run builds binaries, publishes artifacts intended for users, uploads to TestFlight or Play Store, pushes an EAS update, comments on a PR, or contacts Slack.
- [ ] The temporary benchmark workflow is absent from the final merge diff.
- [ ] Repository GitHub Actions validation passes.

## How to Test

1. Confirm the notification script requires no installed dependency:

   ```bash
   rg "^import|from '" scripts/slack-rc-notification.mjs
   ```

   Only Node built-ins may be imported.

2. Run an explicit-metadata RC dry run without a Slack token:

   ```bash
   SEMVER=0.0.0-ci-dry-run \
   IOS_BUILD_NUMBER=100 \
   ANDROID_BUILD_NUMBER=100 \
   PR_NUMBER=1 \
   BUILD_PIPELINE_URL=https://github.com/MetaMask/metamask-mobile/actions \
   SLACK_RC_NOTIFICATION_DRY_RUN=true \
   node scripts/slack-rc-notification.mjs
   ```

3. Run the OTA-style metadata fallback in a temporary shell with `GITHUB_OUTPUT` set, then pass its outputs to the dry-run script. Verify semantic version and both native build numbers are populated from the repository tree.

4. Run a production dry run with explicit metadata and `BUILD_KIND=production`. Verify production copy is generated and no Slack request is made.

5. Push the temporary benchmark workflow to its exact branch and complete three paired runs. Verify payload equality for all three scenarios and calculate median baseline and candidate durations.

6. Remove the temporary benchmark workflow and verify it is absent from the final diff.

7. Run or await the repository's existing actionlint-based GitHub Actions validation on the pull request.

8. Review the final diff and verify only the intended production workflow and this specification remain changed for this work.
