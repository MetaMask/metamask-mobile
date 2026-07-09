/**
 * Core Detox test infrastructure whose changes affect virtually all E2E specs.
 *
 * Files are split into two categories:
 * - Exact files: specific high-impact files imported by nearly every spec
 * - Directory prefixes: subdirectories whose entire contents are high-impact
 *
 * Excluded from the hard rule:
 * - Playwright*.ts — separate framework (system/visual tests, not Detox)
 * - logger.ts, types.ts, TimerHelper.ts, TimerStore.ts — low/no runtime impact on test outcomes
 * - DappServer.ts, DeepLink.ts, PortManager.ts — targeted impact on specific test subsets
 * - *.test.ts files — test files themselves, handled by the spec-tag-extraction rule
 */
const FRAMEWORK_INFRA_EXACT_FILES = new Set([
  'tests/framework/Assertions.ts',
  'tests/framework/EncapsulatedElement.ts',
  'tests/framework/encapsulatedAction.ts',
  'tests/framework/Gestures.ts',
  'tests/framework/GestureStrategy.ts',
  'tests/framework/UnifiedGestures.ts',
  'tests/framework/Matchers.ts',
  'tests/framework/Utilities.ts',
  'tests/framework/index.ts',
  'tests/framework/SoftAssert.ts',
  'tests/framework/PlatformLocator.ts',
  'tests/framework/FrameworkDetector.ts',
]);

/**
 * Subdirectories where all non-test files are high-impact.
 * fixtures/ is used by nearly every spec via FixtureBuilder/FixtureHelper.
 * config/ contains global Detox setup that runs before all tests.
 */
const FRAMEWORK_INFRA_DIR_PREFIXES = [
  'tests/framework/fixtures/',
  'tests/framework/config/',
] as const;

const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js|jsx)$/;

function normalizeChangedFilePath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isFrameworkInfraFile(file: string): boolean {
  if (TEST_FILE_PATTERN.test(file)) {
    return false;
  }
  if (FRAMEWORK_INFRA_EXACT_FILES.has(file)) {
    return true;
  }
  return FRAMEWORK_INFRA_DIR_PREFIXES.some((prefix) => file.startsWith(prefix));
}

/**
 * Returns changed files that are core Detox infrastructure, or an empty array if none match.
 */
export function getFrameworkInfraChanges(changedFiles: string[]): string[] {
  return changedFiles
    .map(normalizeChangedFilePath)
    .filter(isFrameworkInfraFile);
}

/**
 * Spec file path prefixes for E2E smoke tests (Detox and Appium).
 * Smart E2E selection covers smoke tags only — not regression (separate CI).
 * Both smoke frameworks share tests/tags.js — changes here map to the same CI tags.
 */
export const SPEC_PATH_PREFIXES = [
  'tests/smoke/',
  'tests/smoke-appium/',
] as const;

const SPEC_FILE_PATTERN = /\.spec\./;

/**
 * Returns changed files that are E2E smoke spec files (Detox or Appium).
 */
export function getChangedSpecFiles(changedFiles: string[]): string[] {
  return changedFiles
    .map(normalizeChangedFilePath)
    .filter(
      (f) =>
        SPEC_PATH_PREFIXES.some((prefix) => f.startsWith(prefix)) &&
        SPEC_FILE_PATTERN.test(f),
    );
}

/**
 * Shared test infrastructure whose changes can affect any smoke spec
 * that imports them — directly or through one intermediate utility file.
 *
 * Unlike tests/framework/ (hard "run all"), these files have targeted impact:
 * only specs that actually import the changed file need to run.
 */
const SHARED_TEST_INFRA_PREFIXES = [
  'tests/flows/',
  'tests/page-objects/',
  'tests/selectors/',
  'tests/locators/',
] as const;

/**
 * Returns changed files that are shared test infrastructure (flows, page objects,
 * selectors, locators) — but not spec files themselves.
 */
export function getChangedSharedInfraFiles(changedFiles: string[]): string[] {
  return changedFiles
    .map(normalizeChangedFilePath)
    .filter(
      (f) =>
        SHARED_TEST_INFRA_PREFIXES.some((prefix) => f.startsWith(prefix)) &&
        !SPEC_FILE_PATTERN.test(f),
    );
}

/**
 * Returns true if the file is an E2E smoke spec file (Detox or Appium).
 */
export function isSpecFile(file: string): boolean {
  return (
    SPEC_PATH_PREFIXES.some((prefix) => file.startsWith(prefix)) &&
    SPEC_FILE_PATTERN.test(file)
  );
}
