/**
 * Appium E2E metric extraction helpers for collect-qa-stats.mjs
 * (CI Health dashboard).
 *
 * Executed-test counts come from Playwright JSON artifacts named
 * `playwright-json-report-appium-*-smoke-*`. Defined/skip counts scan
 * `tests/smoke-appium` and include the `appiumTest` Playwright alias.
 */

'use strict';

const TEST_CALL_SOURCE = String.raw`\b(?:it|test|appiumTest)(?:\.skip)?\s*\(`;
const TEST_SKIP_SOURCE = String.raw`\b(?:it|test|appiumTest)\.skip\s*\(`;
const DESCRIBE_SKIP_SOURCE =
  String.raw`\b(?:(?:it|test|appiumTest)\.describe|describe)\.skip\s*\(`;

/**
 * Parses an Appium Playwright JSON artifact name into E2E dimensions.
 *
 * @param {string} artifactName
 * @returns {{
 *   platform: 'android'|'ios',
 *   suiteTag: string,
 * } | null}
 */
function getE2EArtifactDimensions(artifactName) {
  const match = artifactName.match(
    /^playwright-json-report-appium-(.+)-(android|ios)-smoke-\d+$/,
  );
  if (!match) return null;

  return {
    platform: match[2],
    suiteTag: match[1].replace(/-/g, '_'),
  };
}

/**
 * Flattens Playwright JSON reporter suites into leaf test objects.
 *
 * @param {object} node
 * @param {object[]} [acc]
 * @returns {object[]}
 */
function collectPlaywrightTests(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node.suites)) {
    for (const suite of node.suites) {
      collectPlaywrightTests(suite, acc);
    }
  }
  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      if (Array.isArray(spec.tests)) {
        acc.push(...spec.tests);
      }
    }
  }
  return acc;
}

/**
 * Counts tests that ran (passed, failed, or flaky). Skipped tests are excluded.
 *
 * @param {object} report Playwright JSON reporter payload
 * @returns {number}
 */
function countExecutedTestsFromPlaywrightJson(report) {
  return collectPlaywrightTests(report).filter(
    (test) => test.status !== 'skipped' && test.expectedStatus !== 'skipped',
  ).length;
}

/**
 * Maps a Playwright `file` path to a repo-relative Appium spec path.
 *
 * Playwright JSON reports `file` relative to `testDir` (`tests/smoke-appium`),
 * e.g. `accounts/foo.spec.ts`. Absolute paths that already contain
 * `tests/smoke-appium/` are also accepted.
 *
 * @param {string} filePath
 * @returns {string|null}
 */
function normalizeSpecPath(filePath) {
  if (!filePath) return null;
  const unified = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!/\.spec\.(ts|tsx|js|jsx)$/.test(unified)) return null;

  let rel;
  const testsIdx = unified.indexOf('tests/');
  if (testsIdx !== -1) {
    rel = unified.slice(testsIdx);
  } else if (unified.includes('smoke-appium/')) {
    rel = `tests/${unified.slice(unified.indexOf('smoke-appium/'))}`;
  } else {
    rel = `tests/smoke-appium/${unified.replace(/^\/+/, '')}`;
  }

  if (!rel.startsWith('tests/smoke-appium/') || rel.includes('/api-specs/')) {
    return null;
  }
  return rel;
}

/**
 * Folds Playwright JSON test durations (ms) into `{ spec: { android, ios } }`
 * with times in seconds.
 *
 * @param {object} report
 * @param {'android' | 'ios'} platform
 * @param {Record<string, Record<string, number>>} acc
 */
function aggregateTimingsFromPlaywrightJson(report, platform, acc) {
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      const specPath = normalizeSpecPath(spec.file || suite.file || '');
      if (!specPath) continue;
      for (const test of spec.tests ?? []) {
        if (test.status === 'skipped' || test.expectedStatus === 'skipped') {
          continue;
        }
        const results = test.results ?? [];
        const last = results[results.length - 1];
        const durationMs = last?.duration;
        if (!Number.isFinite(durationMs) || durationMs <= 0) continue;
        const timeSec = durationMs / 1000;
        const entry = acc[specPath] ?? (acc[specPath] = {});
        entry[platform] = (entry[platform] ?? 0) + timeSec;
      }
    }
    for (const child of suite.suites ?? []) {
      visit(child);
    }
  };

  for (const suite of report.suites ?? []) {
    visit(suite);
  }
}

/**
 * Counts skipped tests, including Playwright `appiumTest.skip` /
 * `appiumTest.describe.skip`.
 *
 * @param {string} source
 * @returns {number}
 */
function countSkips(source) {
  const describeBlocks = [];
  const re = new RegExp(DESCRIBE_SKIP_SOURCE, 'g');
  let m;
  while ((m = re.exec(source)) !== null) {
    const braceStart = source.indexOf('{', m.index + m[0].length);
    if (braceStart === -1) continue;
    let depth = 1;
    let pos = braceStart + 1;
    while (pos < source.length && depth > 0) {
      if (source[pos] === '{') depth += 1;
      else if (source[pos] === '}') depth -= 1;
      pos += 1;
    }
    describeBlocks.push({
      start: m.index,
      end: pos,
      content: source.slice(braceStart + 1, pos - 1),
    });
  }

  let outside = source;
  for (let i = describeBlocks.length - 1; i >= 0; i -= 1) {
    outside =
      outside.slice(0, describeBlocks[i].start) +
      outside.slice(describeBlocks[i].end);
  }

  const explicitSkips = (outside.match(new RegExp(TEST_SKIP_SOURCE, 'g')) ?? [])
    .length;
  const implicitSkips = describeBlocks.reduce(
    (sum, { content }) =>
      sum + (content.match(new RegExp(TEST_CALL_SOURCE, 'g')) ?? []).length,
    0,
  );

  return explicitSkips + implicitSkips;
}

/**
 * Counts `it` / `test` / `appiumTest` definitions (including `.skip`).
 *
 * @param {string} source
 * @returns {number}
 */
function countDefinedTests(source) {
  return (source.match(new RegExp(TEST_CALL_SOURCE, 'g')) ?? []).length;
}

export {
  getE2EArtifactDimensions,
  countExecutedTestsFromPlaywrightJson,
  normalizeSpecPath,
  aggregateTimingsFromPlaywrightJson,
  countSkips,
  countDefinedTests,
};
