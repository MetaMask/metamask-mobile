#!/usr/bin/env node
/**
 * e2e-update-test-timings.mjs
 *
 * Extracts per-file execution durations from the merged JUnit XML produced
 * after an E2E run and updates tests/e2e-test-timings.json.
 *
 * The timings file is the source of truth used by e2e-split-tags-shards.mjs
 * to do time-based bin-packing instead of blind alphabetical slicing.
 *
 * Usage (called automatically from run-e2e-workflow.yml):
 *   node .github/scripts/e2e-update-test-timings.mjs
 *
 * Required env vars:
 *   PLATFORM          ios | android
 *
 * Optional env vars:
 *   JUNIT_REPORT_PATH path to merged JUnit XML (default: tests/reports/junit.xml)
 *   TIMINGS_FILE      path to timings JSON     (default: tests/e2e-test-timings.json)
 *   EMA_ALPHA         smoothing factor 0-1     (default: 0.3)
 *                     Lower = more stable / slower to adapt.
 *                     Higher = reacts faster to real changes.
 */

import fs from 'node:fs';
import path from 'node:path';
import xml2js from 'xml2js';

const PLATFORM      = (process.env.PLATFORM      || 'ios').toLowerCase();
const JUNIT_PATH    =  process.env.JUNIT_REPORT_PATH || 'tests/reports/junit.xml';
const TIMINGS_FILE  =  process.env.TIMINGS_FILE      || 'tests/e2e-test-timings.json';

function resolveEmaAlpha() {
  const raw = Number(process.env.EMA_ALPHA ?? 0.3);
  if (!Number.isFinite(raw)) {
    return 0.3;
  }
  return Math.min(1, Math.max(0, raw));
}

const EMA_ALPHA = resolveEmaAlpha();

if (!['ios', 'android'].includes(PLATFORM)) {
  console.error(`❌ PLATFORM must be 'ios' or 'android', got: "${PLATFORM}"`);
  process.exit(1);
}

/**
 * xml2js often returns a single element or an array — normalise to an array.
 * @param {unknown} value
 * @returns {object[]}
 */
function xmlArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// XML parsing
// ---------------------------------------------------------------------------

/**
 * Parse a JUnit XML file and return per-spec-file total durations (seconds).
 *
 * JUnit structure produced by jest-junit:
 *   <testsuites>
 *     <testsuite ...>
 *       <testcase classname="tests/smoke/path/file.spec.ts" time="12.34" .../>
 *     </testsuite>
 *   </testsuites>
 *
 * @param {string} xmlPath
 * @returns {Promise<Map<string, number>>} filePath → total seconds
 */
async function parseJUnitTimings(xmlPath) {
  if (!fs.existsSync(xmlPath)) {
    console.warn(`⚠️  JUnit file not found: ${xmlPath}`);
    return new Map();
  }

  const content = fs.readFileSync(xmlPath, 'utf8');
  const parser  = new xml2js.Parser();
  const result  = await parser.parseStringPromise(content);

  // Normalise to always have a testsuites wrapper
  let testsuites = [];
  if (result.testsuites?.testsuite) {
    testsuites = xmlArray(result.testsuites.testsuite);
  } else if (result.testsuite) {
    testsuites = xmlArray(result.testsuite);
  }

  // Accumulate durations per file
  /** @type {Map<string, number>} */
  const fileTimings = new Map();

  for (const suite of testsuites) {
    const testcases = collectTestCasesFromSuite(suite);

    for (const tc of testcases) {
      const classname = tc.$?.classname ?? '';
      const timeStr   = tc.$?.time       ?? '0';

      if (!classname.includes('.spec.')) continue;

      // Normalise to repo-relative path (tests/smoke/…)
      const normalised = normalisePath(classname);
      const duration   = Number.parseFloat(timeStr) || 0;

      fileTimings.set(normalised, (fileTimings.get(normalised) ?? 0) + duration);
    }
  }

  return fileTimings;
}

/**
 * Flatten nested JUnit `<testsuite>` nodes (xml2js) into testcase entries.
 * @param {object} suite
 * @returns {object[]}
 */
function collectTestCasesFromSuite(suite) {
  const direct = suite.testcase ? xmlArray(suite.testcase) : [];
  const nested = suite.testsuite ? xmlArray(suite.testsuite) : [];
  const fromNested = nested.flatMap((s) => collectTestCasesFromSuite(s));
  return [...direct, ...fromNested];
}

/**
 * Normalise an absolute or classname path to a repo-relative path.
 * e.g. "/home/runner/work/…/tests/smoke/foo.spec.ts" → "tests/smoke/foo.spec.ts"
 */
function normalisePath(p) {
  const normalised = p.replace(/\\/g, '/');
  const idx = normalised.indexOf('tests/');
  if (idx === -1) {
    return normalised;
  }
  return normalised.slice(idx);
}

// ---------------------------------------------------------------------------
// Timings database I/O
// ---------------------------------------------------------------------------

/**
 * @typedef {{ version: number, timings: Record<string, { ios?: number, android?: number }> }} TimingsDB
 */

/** @returns {TimingsDB} */
function loadTimingsDB() {
  if (!fs.existsSync(TIMINGS_FILE)) {
    return { version: 1, timings: {} };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8'));
    return { version: 1, timings: {}, ...raw };
  } catch (e) {
    console.warn(`⚠️  Could not parse ${TIMINGS_FILE}: ${e.message} — starting fresh.`);
    return { version: 1, timings: {} };
  }
}

/** @param {TimingsDB} db */
function saveTimingsDB(db) {
  // Sort keys for deterministic diffs in PRs
  const sorted = Object.fromEntries(
    Object.entries(db.timings).sort(([a], [b]) => a.localeCompare(b))
  );
  const output = JSON.stringify({ version: db.version, timings: sorted }, null, 2) + '\n';
  fs.mkdirSync(path.dirname(TIMINGS_FILE), { recursive: true });
  fs.writeFileSync(TIMINGS_FILE, output, 'utf8');
}

// ---------------------------------------------------------------------------
// Merge: exponential moving average
// ---------------------------------------------------------------------------

/**
 * Merge newly observed file timings into the existing database using an
 * Exponential Moving Average (EMA).
 *
 *   updated = alpha * observed + (1 - alpha) * existing
 *
 * A lower alpha (e.g. 0.3) means the estimate is more stable and takes
 * several runs before it shifts significantly — good for tests that
 * occasionally run slowly due to infrastructure noise.
 *
 * @param {TimingsDB} db
 * @param {Map<string, number>} observed   filePath → seconds from this run
 * @param {string}              platform   'ios' | 'android'
 * @param {number}              alpha
 */
function mergeTimings(db, observed, platform, alpha) {
  let added   = 0;
  let updated = 0;

  for (const [file, newDuration] of observed) {
    if (newDuration <= 0) continue; // ignore zero-time records (skipped tests)

    const existing = db.timings[file]?.[platform];

    if (typeof existing === 'number') {
      // Blend with existing estimate
      const blended = alpha * newDuration + (1 - alpha) * existing;
      db.timings[file] = { ...db.timings[file], [platform]: Math.round(blended * 10) / 10 };
      updated++;
    } else {
      // First observation for this file — record as-is
      db.timings[file] = { ...db.timings[file], [platform]: newDuration };
      added++;
    }
  }

  console.log(`📝 Timings merged — ${added} new, ${updated} updated (platform: ${platform}, alpha: ${alpha})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n⏱️  Updating E2E test timings`);
  console.log(`   Platform:    ${PLATFORM}`);
  console.log(`   JUnit XML:   ${JUNIT_PATH}`);
  console.log(`   Timings DB:  ${TIMINGS_FILE}`);
  console.log(`   EMA alpha:   ${EMA_ALPHA}\n`);

  // 1) Parse observed timings from this run's JUnit XML
  const observed = await parseJUnitTimings(JUNIT_PATH);

  if (observed.size === 0) {
    console.log('ℹ️  No test timing data found in JUnit XML — nothing to update.');
    process.exit(0);
  }

  console.log(`📊 Observed timings for ${observed.size} spec file(s):`);
  for (const [file, secs] of [...observed.entries()].sort(([, a], [, b]) => b - a)) {
    const totalSec = Math.round(secs);
    const mins = Math.floor(totalSec / 60);
    const rem = totalSec % 60;
    console.log(`   ${String(mins).padStart(2)}m${String(rem).padStart(2, '0')}s  ${file}`);
  }

  // 2) Load existing DB, merge, save
  const db = loadTimingsDB();
  mergeTimings(db, observed, PLATFORM, EMA_ALPHA);
  saveTimingsDB(db);

  console.log(`\n✅ Timings saved to ${TIMINGS_FILE}`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
