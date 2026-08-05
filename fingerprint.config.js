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
 * Native project files carrying the marketing version string, which the release
 * tooling rewrites on every version bump.
 *
 * A bump changes nothing but the human-readable version: `versionName` in the
 * Gradle config and `MARKETING_VERSION` in the Xcode project. Every release bump
 * on `main` has touched exactly those fields and nothing else, so hashing them
 * means a bump invalidates every cached native build repo-wide and forces a
 * rebuild across every open PR, despite the compiled behaviour being identical.
 *
 * Build numbers (`versionCode`, `CURRENT_PROJECT_VERSION`) are deliberately left
 * in the hash. They are not touched by version bumps on `main`, so excluding them
 * would widen this carve-out past the churn it is meant to remove.
 */
const VERSION_STAMPED_NATIVE_FILES = new Set([
  'android/app/build.gradle',
  'ios/MetaMask.xcodeproj/project.pbxproj',
]);

// Placeholder substituted for the marketing version before hashing. Any fixed
// string works; it only has to be stable across versions.
const NORMALIZED_VERSION = '0.0.0-fingerprint-normalized';

// Accumulates version-stamped native files across streamed chunks, keyed by path.
const versionStampedBuffers = new Map();

/**
 * Replaces the marketing version in a native project file with a fixed
 * placeholder so that version bumps hash identically.
 *
 * Applied to whole file contents rather than per chunk: `project.pbxproj` is far
 * larger than one chunk, and a declaration split across a chunk boundary would
 * otherwise escape substitution and reintroduce the churn intermittently.
 *
 * @param {string} contents
 * @returns {string}
 */
function normalizeMarketingVersion(contents) {
  return (
    contents
      // Gradle: versionName "8.7.0"
      .replace(/(versionName\s+")[^"\n]*(")/g, `$1${NORMALIZED_VERSION}$2`)
      // Xcode: MARKETING_VERSION = 8.7.0;
      .replace(
        /(MARKETING_VERSION\s*=\s*)[^;\n]*(;)/g,
        `$1${NORMALIZED_VERSION}$2`,
      )
  );
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
    '.github/workflows/qa-stats.yml',
    '.github/workflows/post-merge-validation.yml',

    // Release/branch bookkeeping (merges, syncs, changelog) - no native or OTA build step.
    '.github/workflows/create-cherry-pick-pr.yml',
    '.github/workflows/create-release-draft.yml',
    '.github/workflows/merge-previous-release-branches.yml',
    '.github/workflows/merge-stable-sync-pr.yml',
    '.github/workflows/merge-stable-sync-release-pr.yml',
    '.github/workflows/merge-version-bump-pr.yml',
    '.github/workflows/nightly-temp-branch-sync.yml',
    '.github/workflows/release-branch-sync.yml',
    '.github/workflows/stable-branch-sync.yml',
    '.github/workflows/update-release-changelog.yml',
    '.github/workflows/changelog-check.yml',

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

    // Note: `.github/workflows/get-requirements.yml` is intentionally NOT ignored, since
    // it gates whether native build jobs run at all.
  ],

  /**
   * Transform sources before hashing to exclude JS-only changes from the
   * fingerprint.
   *
   * - `package.json`: only the dependencies/devDependencies of native packages
   *   (as resolved by Expo autolinking) are included in the hash. Fields like
   *   `version`, `scripts`, and JS-only package version bumps are excluded.
   *
   * - `.yarn/patches/**`: patch files for JS-only packages are excluded. Only
   *   patches whose filename starts with a known native package name contribute
   *   to the hash.
   *
   * If autolinking resolution failed at startup (`nativePackages === null`),
   * both transforms fall back to hashing everything unchanged.
   *
   * The hook is called as a streaming transform: once per file chunk (with
   * `isEndOfFile === false`) and once more at end-of-file (`chunk === null`,
   * `isEndOfFile === true`). Content larger than a single chunk (such as
   * `package.json`) must therefore be buffered and parsed only once complete.
   *
   * @type {import('@expo/fingerprint').FileHookTransformFunction}
   */
  fileHookTransform: (source, chunk, isEndOfFile) => {
    // Normalize the marketing version out of the native project files. This runs
    // ahead of the autolinking guard below because it does not depend on
    // autolinking having resolved.
    if (
      source.type === 'file' &&
      VERSION_STAMPED_NATIVE_FILES.has(source.filePath)
    ) {
      if (chunk) {
        versionStampedBuffers.set(
          source.filePath,
          (versionStampedBuffers.get(source.filePath) ?? '') + chunk.toString(),
        );
      }
      if (!isEndOfFile) return '';

      const contents = versionStampedBuffers.get(source.filePath) ?? '';
      versionStampedBuffers.delete(source.filePath);
      return normalizeMarketingVersion(contents);
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
