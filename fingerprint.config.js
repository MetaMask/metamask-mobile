/* eslint-disable import-x/no-commonjs */
/** @type {import('@expo/fingerprint').Config} */

/**
 * This config is used when generating an EAS fingerprint for the project.
 * Docs - https://docs.expo.dev/versions/latest/sdk/fingerprint/#fingerprintconfigjs
 */

// This config runs in a Node build environment (not in the React Native
// bundle), so importing a Node.js builtin is safe here. `child_process` is
// required to invoke the `expo-modules-autolinking` CLI synchronously — the
// config is loaded via CommonJS `require` with no top-level `await`, so the
// CLI's async programmatic API can't be used in its place.
// eslint-disable-next-line import-x/no-nodejs-modules
const { execSync } = require('child_process');

/**
 * Returns the set of package names that have native code, as resolved by Expo
 * autolinking. Falls back to `null` if autolinking fails (e.g. in environments
 * where native tooling is unavailable), in which case callers should treat
 * every package as native to stay safe.
 *
 * @returns {Set<string> | null}
 */
function getNativePackageNames() {
  try {
    const ios = JSON.parse(
      execSync('yarn expo-modules-autolinking resolve -p ios --json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString(),
    );
    const android = JSON.parse(
      execSync('yarn expo-modules-autolinking resolve -p android --json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString(),
    );

    return new Set([
      ...ios.modules.map((m) => m.packageName),
      ...android.modules.map((m) => m.packageName),
    ]);
  } catch {
    // Safe fallback: treat everything as native so nothing is accidentally
    // excluded from the fingerprint.
    return null;
  }
}

const nativePackages = getNativePackageNames();

// Accumulates `package.json` content across streamed chunks (see fileHookTransform).
let packageJsonBuffer = '';

/**
 * Matches package.json script names whose command can affect the compiled
 * native binary: build commands (`build:ios:*`, `build:android:*`,
 * `build:repack:*`, ...), native dependency setup (`setup*`, `install:*`),
 * CocoaPods (`pod:install`, `gem:bundle:install`), lifecycle hooks
 * (`postinstall`), and native build cache cleanup (`clean*`, `gen-bundle:*`).
 *
 * Everything else (test runners, lint/format, e2e/appium/playwright helpers,
 * tooling) is excluded so editing those scripts doesn't invalidate every PR's
 * native fingerprint - see the incident where editing `test:api-specs` forced
 * a fleet-wide native rebuild because `@expo/fingerprint` hashes ALL of
 * package.json's `scripts` as a distinct `packageJson:scripts` source,
 * separate from (and not filtered by) the `package.json` file transform below.
 */
const NATIVE_BUILD_SCRIPT_NAME_PATTERN =
  /^(build|setup|pod|postinstall|install|clean|gen-bundle|gem)/;

/**
 * Filters a JSON-stringified package.json `scripts` object down to only the
 * entries matching `NATIVE_BUILD_SCRIPT_NAME_PATTERN`.
 *
 * @param {string} scriptsJson - JSON string of package.json `scripts`.
 * @returns {string} JSON string of the filtered scripts.
 */
function filterNativeBuildScripts(scriptsJson) {
  const scripts = JSON.parse(scriptsJson);
  const filtered = Object.fromEntries(
    Object.entries(scripts).filter(([name]) =>
      NATIVE_BUILD_SCRIPT_NAME_PATTERN.test(name),
    ),
  );
  return JSON.stringify(filtered);
}

const config = {
  /**
   * Track files and directories under `extraSources` if they affect native code changes.
   *
   * Note: `.yarn/patches` is intentionally omitted here and handled instead via
   * `fileHookTransform` below, where we filter it down to only patches that
   * target native packages. This prevents JS-only patches from invalidating
   * the fingerprint.
   *
   * Note: `.github/workflows` and `.github/scripts` are tracked as whole directories
   * (`type: 'dir'`) rather than as a hand-picked list of files. This is deliberate:
   * a denylist of "known native-affecting workflows" would silently fail to track any
   * *new* workflow that changes native compilation, which the OTA guardrail (see
   * `docs/nightly-ota-updates.md`) would then treat as fingerprint-unchanged — a false
   * negative that can ship OTA updates over builds with different native code, crashing
   * production. Tracking the whole directory means new workflows affect the fingerprint
   * by default; we only opt out (via `ignorePaths` below) automation we've verified can't
   * touch the compiled native binary (labelers, changelog/Crowdin/notification automation,
   * or test runners like `run-e2e-*.yml` that only execute against an already-built app).
   * This trades a few more false-positive fingerprint invalidations (safe, just forces an
   * occasional unnecessary native rebuild) for eliminating the false-negative risk.
   */
  extraSources: [
    {
      type: 'dir',
      filePath: '.github/workflows',
      reasons: [
        'Detect changes to CI/build/OTA workflows that could affect the native binary.',
      ],
    },
    {
      type: 'dir',
      filePath: '.github/scripts',
      reasons: ['Detect changes to scripts invoked by CI/build/OTA workflows.'],
    },
    {
      type: 'file',
      filePath: 'react-native.config.js',
      reasons: ['Detect react-native.config.js changes.'],
    },
    {
      type: 'file',
      filePath: './scripts/build.sh',
      reasons: ['Detect build configuration changes.'],
    },
    {
      type: 'dir',
      filePath: './scripts/inpage-bridge',
      reasons: ['Detect inpage provider changes bundled into native apps.'],
    },
    {
      type: 'file',
      filePath: './scripts/setup.mjs',
      reasons: ['Detect setup script changes.'],
    },
  ],

  /**
   * Paths excluded from the fingerprint entirely (on top of `@expo/fingerprint`'s own
   * defaults). Every entry below has been verified to only run GitHub metadata automation
   * (labels/comments/notifications), static lint/compliance checks, branch/release
   * bookkeeping, or test execution against an already-built app artifact — none of them
   * can change the compiled native binary or the OTA JS bundle.
   *
   * IMPORTANT: this is a denylist by design (see the comment on `extraSources` above).
   * When adding a new workflow/script, it is tracked by default; only add it here once
   * you've confirmed it can't affect the native binary. When in doubt, leave it tracked.
   */
  ignorePaths: [
    // .github/scripts own tooling/deps - irrelevant to any workflow's runtime behavior.
    '.github/scripts/node_modules/**',
    '.github/scripts/.yarn/**',
    '.github/scripts/package.json',
    '.github/scripts/tsconfig.json',
    '.github/scripts/yarn.lock',
    '.github/scripts/.gitignore',

    // Shared GitHub-automation helpers (PR templates, labels, issue/PR metadata) and
    // fitness-function lint rules - static checks/bookkeeping, no build logic.
    '.github/scripts/shared/**',
    '.github/scripts/fitness-functions/**',
    '.github/scripts/add-release-label-to-pr-and-linked-issues.ts',
    '.github/scripts/check-feature-flag-registry.ts',
    '.github/scripts/check-feature-flag-registry.test.ts',
    '.github/scripts/check-pr-has-required-labels.ts',
    '.github/scripts/check-template-and-add-labels.ts',
    '.github/scripts/check-template-and-add-labels.test.ts',
    '.github/scripts/close-release-bug-report-issue.ts',
    '.github/scripts/collect-qa-stats.mjs',
    '.github/scripts/create-bug-report-issue.ts',
    '.github/scripts/extract-semver.sh',
    '.github/scripts/generate-regression-slack-summary.mjs',
    '.github/scripts/get-next-semver-version.sh',
    '.github/scripts/get-stable-released-version.sh',
    '.github/scripts/known-feature-flag-constants.ts',
    '.github/scripts/resolve-previous-ref.sh',
    '.github/scripts/run-update-release-changelog-mobile.sh',
    '.github/scripts/scripts.types.ts',
    '.github/scripts/validate-pr-commit.sh',

    // Operate on already-built app artifacts/test reports, not native compilation.
    '.github/scripts/e2e-create-json-test-report.mjs',
    '.github/scripts/e2e-extract-test-results.mjs',
    '.github/scripts/e2e-freeze-timings.mjs',
    '.github/scripts/e2e-merge-detox-junit-reports.mjs',
    '.github/scripts/e2e-merge-test-results.mjs',
    '.github/scripts/e2e-report-fixture-validation.mjs',
    '.github/scripts/e2e-smart-selection.mjs',
    '.github/scripts/e2e-split-tags-shards.mjs',

    // Note: `.github/scripts/bump-ota-version-constants.sh` is intentionally NOT ignored,
    // since it writes OTA version metadata consumed by the release pipeline.

    // PR/issue label and metadata automation.
    '.github/workflows/add-release-label.yml',
    '.github/workflows/add-team-label.yml',
    '.github/workflows/auto-draft-prs.yml',
    '.github/workflows/auto-label-not-ready-for-e2e.yml',
    '.github/workflows/block-stable-main-to-main.yml',
    '.github/workflows/block-stable-sync-to-release.yml',
    '.github/workflows/check-pr-labels.yml',
    '.github/workflows/check-pr-max-lines.yml',
    '.github/workflows/check-template-and-add-labels.yml',
    '.github/workflows/pr-title-linter.yml',
    '.github/workflows/remove-labels-after-pr-closed.yml',
    '.github/workflows/stale-issue-pr.yml',

    // AI/RCA/flaky-test/QA reporting - reads CI history, doesn't build.
    '.github/workflows/ai-pr-risk-analysis.yml',
    '.github/workflows/automated-rca.yml',
    '.github/workflows/remove-rca-needed-label-sheets.yml',
    '.github/workflows/triage-forwarder.yml',
    '.github/workflows/flaky-test-report.yml',
    // Historical-failure-rate + AI analysis of modified test files, then posts a PR
    // comment. Every step is informational (continue-on-error / no required check).
    '.github/workflows/flaky-unit-test-detection.yml',
    '.github/workflows/qa-stats.yml',
    '.github/workflows/post-merge-validation.yml',

    // Release/branch bookkeeping (merges, syncs, changelog, PR creation, version-bump
    // commits) - no native or OTA build step.
    '.github/workflows/create-cherry-pick-pr.yml',
    '.github/workflows/create-release-draft.yml',
    // Both create a release PR (`resolve-bases`/`extract` + PR creation) with zero
    // build steps. `auto-create-release-pr.yml` is a `create`-event dispatcher that
    // just calls `create-release-pr.yml`.
    '.github/workflows/create-release-pr.yml',
    '.github/workflows/auto-create-release-pr.yml',
    '.github/workflows/merge-previous-release-branches.yml',
    '.github/workflows/merge-stable-sync-pr.yml',
    '.github/workflows/merge-stable-sync-release-pr.yml',
    '.github/workflows/merge-version-bump-pr.yml',
    '.github/workflows/nightly-temp-branch-sync.yml',
    '.github/workflows/release-branch-sync.yml',
    '.github/workflows/stable-branch-sync.yml',
    '.github/workflows/update-release-changelog.yml',
    '.github/workflows/changelog-check.yml',
    // `generate-build-version.yml` has no steps of its own - it only delegates to an
    // externally pinned reusable workflow (MetaMask/metamask-mobile-build-version) to
    // fetch the next build number. `commit-build-version.yml` commits that number into
    // version files and pushes - same bookkeeping category as `merge-version-bump-pr.yml`
    // above. Neither is invoked by the E2E build pipeline (build-ios-e2e.yml /
    // build-android-e2e.yml); both are only used by release/RC/nightly TestFlight builds.
    '.github/workflows/generate-build-version.yml',
    '.github/workflows/commit-build-version.yml',

    // Release bug-report issue bookkeeping.
    '.github/workflows/close-bug-report.yml',
    '.github/workflows/create-bug-report.yml',

    // Static lint/compliance checks - analyze diffs/metadata, don't compile anything.
    '.github/workflows/cla.yml',
    '.github/workflows/check-attributions.yml',
    '.github/workflows/update-attributions.yml',
    '.github/workflows/check-feature-flag-registry.yml',
    '.github/workflows/check-feature-flag-registry-drift.yml',
    '.github/workflows/fitness-functions.yml',
    '.github/workflows/security-code-scanner.yml',

    // Crowdin translation sync.
    '.github/workflows/crowdin_download_translations.yml',
    '.github/workflows/crowdin_upload_sources.yml',
    '.github/workflows/crowdin-rc-download-translations.yml',
    '.github/workflows/crowdin-rc-upload-sources.yml',

    // Fire-and-forget dispatchers/re-runners around `ci.yml` (which is itself tracked) -
    // these don't run any build steps of their own.
    '.github/workflows/ci-bitrise-shadow.yml',
    '.github/workflows/ci-namespace-shadow.yml',
    '.github/workflows/rerun-ci-on-skipped-e2e-labels.yml',

    // Notification-only.
    '.github/workflows/prod-build-env-notify.yml',
    '.github/workflows/publish-slack-release-testing-status.yml',
    '.github/workflows/slack-rc-notification.yml',

    // Builds a dev CI container image, not a shipped mobile binary.
    '.github/workflows/docker.yml',

    // Run or report on tests against an already-built app artifact - can't change the
    // compiled binary. (`detox build-framework-cache` only builds Detox's own test-runner
    // framework cache, not the app.)
    '.github/workflows/run-appium-e2e-workflow.yml',
    '.github/workflows/run-appium-smoke-tests-android.yml',
    '.github/workflows/run-appium-smoke-tests-ios.yml',
    '.github/workflows/run-e2e-api-specs.yml',
    '.github/workflows/run-e2e-smoke-tests-android.yml',
    '.github/workflows/run-e2e-smoke-tests-ios.yml',
    '.github/workflows/run-e2e-workflow.yml',
    '.github/workflows/performance-test-runner.yml',
    '.github/workflows/update-e2e-fixtures.yml',
    '.github/workflows/upload-to-testflight.yml',
    '.github/workflows/runway-ota-resolve-context.yml',
    // Compares BrowserStack app-profiling metrics for an already-completed run against
    // the last green baseline and posts a diff comment - reads results, doesn't build.
    '.github/workflows/app-profiling-check.yml',

    // Note: `.github/workflows/get-requirements.yml` is intentionally NOT ignored, since
    // it gates whether native build jobs run at all.
    //
    // Note: `.github/workflows/build-and-upload-to-testflight.yml` is intentionally NOT
    // ignored (and its sibling TestFlight/nightly/RC orchestrators - `nightly-build.yml`,
    // `build-rc-auto.yml`, `post-release-cut-testflight.yml`, `run-system-tests.yml`,
    // `run-performance-e2e*.yml` - were checked and are NOT denylisted either): each of
    // these calls `build.yml` (or `build-android-upload-to-browserstack.yml`, which itself
    // calls a real native build) with real build parameters, so a change to any of them
    // can change what gets compiled. `upload-to-testflight.yml` above IS safe to ignore
    // because it only uploads an artifact `build.yml` already produced - no build step.
  ],

  /**
   * Transform sources before hashing to exclude JS-only changes from the
   * fingerprint.
   *
   * - `package.json` (file source, dependencies/devDependencies): only the
   *   dependencies/devDependencies of native packages (as resolved by Expo
   *   autolinking) are included in the hash. JS-only package version bumps
   *   are excluded.
   *
   * - `package.json` (`packageJson:scripts` contents source, emitted
   *   separately by `@expo/fingerprint`): only scripts matching
   *   `NATIVE_BUILD_SCRIPT_NAME_PATTERN` are included. This is independent of
   *   native-package resolution, so it still applies even if
   *   `nativePackages` is `null`.
   *
   * - `.yarn/patches/**`: patch files for JS-only packages are excluded. Only
   *   patches whose filename starts with a known native package name contribute
   *   to the hash.
   *
   * If autolinking resolution failed at startup (`nativePackages === null`),
   * the dependency and patch transforms fall back to hashing everything
   * unchanged.
   *
   * The hook is called as a streaming transform for `file` sources: once per
   * file chunk (with `isEndOfFile === false`) and once more at end-of-file
   * (`chunk === null`, `isEndOfFile === true`). Content larger than a single
   * chunk (such as `package.json`) must therefore be buffered and parsed only
   * once complete. For `contents` sources (like `packageJson:scripts`), the
   * full content is passed in one call with `isEndOfFile === true`, so no
   * buffering is needed.
   *
   * @type {import('@expo/fingerprint').FileHookTransformFunction}
   */
  fileHookTransform: (source, chunk, isEndOfFile) => {
    // Filter package.json scripts before the native-packages fallback below,
    // since this filter is purely name-based and doesn't need autolinking data.
    if (source.type === 'contents' && source.id === 'packageJson:scripts') {
      return filterNativeBuildScripts(chunk);
    }

    // Fall back to hashing everything if we couldn't resolve native packages.
    if (!nativePackages) return chunk;

    // Filter package.json to only native-relevant dependency entries.
    if (source.type === 'file' && source.filePath === 'package.json') {
      // Buffer chunks until the full file has been read, then parse once.
      if (chunk) packageJsonBuffer += chunk.toString();
      if (!isEndOfFile) return '';

      const pkg = JSON.parse(packageJsonBuffer);
      packageJsonBuffer = '';

      const filterToNative = (deps = {}) =>
        Object.fromEntries(
          Object.entries(deps).filter(([name]) => nativePackages.has(name)),
        );

      return JSON.stringify({
        dependencies: filterToNative(pkg.dependencies),
        devDependencies: filterToNative(pkg.devDependencies),
        // Preserve autolinking config overrides (e.g. expo.autolinking).
        expo: pkg.expo,
      });
    }

    // Exclude patch files that only target JS-only packages.
    if (
      source.type === 'file' &&
      source.filePath.startsWith('.yarn/patches/')
    ) {
      const patchFilename = source.filePath.slice('.yarn/patches/'.length);
      // Yarn patch filenames are formatted as `<package-name>-npm-<version>-<hash>.patch`.
      // We extract the package name by finding the `-npm-` separator.
      const npmSeparatorIndex = patchFilename.indexOf('-npm-');
      const patchedPackage =
        npmSeparatorIndex !== -1
          ? // Scoped packages use `@scope-name` in the filename (the `/` is replaced with `-`),
            // so we restore it to match the package name from autolinking.
            patchFilename
              .slice(0, npmSeparatorIndex)
              .replace(/^(@[^-]+)-/, '$1/')
          : null;

      if (!patchedPackage || !nativePackages.has(patchedPackage)) {
        // Return empty string so this patch file contributes nothing to the hash.
        return '';
      }
    }

    return chunk;
  },
};

module.exports = config;
