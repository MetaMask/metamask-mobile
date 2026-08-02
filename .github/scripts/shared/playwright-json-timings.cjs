/**
 * Parse Playwright JSON reports into per-spec wall-clock timings for Appium
 * duration-aware sharding (`appium_test_times` in qa-stats).
 *
 * Artifact names look like:
 *   playwright-json-report-appium-accounts-android-smoke-1
 *   playwright-json-report-appium-snaps-ios-smoke-3
 */

/**
 * @param {string} artifactName
 * @returns {'android' | 'ios' | null}
 */
function getAppiumPlatformFromArtifactName(artifactName) {
  const match = String(artifactName).match(
    /^playwright-json-report-appium-.+-(android|ios)-smoke(?:-\d+)?$/,
  );
  if (!match) return null;
  return match[1] === 'ios' ? 'ios' : 'android';
}

/**
 * Normalize a Playwright `file` field to a repo-relative `tests/...spec.ts` key.
 *
 * @param {string} filePath
 * @returns {string|null}
 */
function normalizeAppiumSpecPath(filePath) {
  if (!filePath) return null;
  const unified = String(filePath).replace(/\\/g, '/');
  const idx = unified.indexOf('tests/');
  if (idx === -1) return null;
  const rel = unified.slice(idx);
  if (!/\.spec\.(ts|tsx|js|jsx)$/.test(rel)) return null;
  return rel;
}

/**
 * Walk Playwright JSON suites and yield leaf specs with file + test results.
 *
 * @param {any} suite
 * @param {(spec: { file: string, tests: any[] }) => void} visit
 */
function walkPlaywrightSuites(suite, visit) {
  if (!suite || typeof suite !== 'object') return;

  for (const spec of suite.specs || []) {
    if (spec?.file && Array.isArray(spec.tests)) {
      visit({ file: spec.file, tests: spec.tests });
    }
  }

  for (const child of suite.suites || []) {
    walkPlaywrightSuites(child, visit);
  }
}

/**
 * Duration (seconds) for one Playwright test entry — last attempt only so
 * failed retries do not double-count into the bin-pack estimate.
 *
 * @param {any} test
 * @returns {number}
 */
function durationSecondsForTest(test) {
  const results = Array.isArray(test?.results) ? test.results : [];
  if (results.length === 0) return 0;
  const last = results[results.length - 1];
  const ms = Number(last?.duration);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 1000;
}

/**
 * Sum per-spec durations from a Playwright JSON report object.
 *
 * @param {any} report
 * @param {'android' | 'ios'} platform
 * @param {Record<string, Record<string, number>>} acc
 */
function aggregateTimingsFromPlaywrightJson(report, platform, acc) {
  const roots = Array.isArray(report?.suites) ? report.suites : [];
  for (const root of roots) {
    walkPlaywrightSuites(root, ({ file, tests }) => {
      const spec = normalizeAppiumSpecPath(file);
      if (!spec) return;

      let seconds = 0;
      for (const test of tests) {
        seconds += durationSecondsForTest(test);
      }
      if (seconds <= 0) return;

      const entry = acc[spec] ?? (acc[spec] = {});
      entry[platform] = (entry[platform] ?? 0) + seconds;
    });
  }
}

/**
 * Round platform durations to 3 decimals (matches e2e_test_times shape).
 *
 * @param {Record<string, Record<string, number>>} acc
 */
function roundTimingAcc(acc) {
  for (const spec of Object.keys(acc)) {
    for (const platform of Object.keys(acc[spec])) {
      acc[spec][platform] = Math.round(acc[spec][platform] * 1000) / 1000;
    }
  }
}

module.exports = {
  getAppiumPlatformFromArtifactName,
  normalizeAppiumSpecPath,
  durationSecondsForTest,
  aggregateTimingsFromPlaywrightJson,
  roundTimingAcc,
};
