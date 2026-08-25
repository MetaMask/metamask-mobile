#!/usr/bin/env node
/**
 * Select Appium smoke specs for one fixed shard (phase 1 timing redistribition).
 *
 * Reuses the same algorithms as e2e-split-tags-shards.mjs:
 *   - LPT bin-pack across TOTAL_SPLITS when e2e_test_times are available
 *   - equal-count alphabetical slicing otherwise
 *
 * Does not choose shard count — that stays in the smoke workflow matrix.
 *
 * Env:
 *   PLATFORM=android|ios
 *   TEST_SUITE_TAG=SmokeAccounts
 *   SPLIT_NUMBER=1
 *   TOTAL_SPLITS=2
 *   BASE_DIR=tests/smoke-appium
 *   E2E_TIMINGS_PATH=./e2e-timings.json
 *
 * Writes SPEC_FILES (space-separated) to GITHUB_OUTPUT when set.
 */

import fs from 'node:fs';
import path from 'node:path';

const PLATFORM = (process.env.PLATFORM || 'android').toLowerCase();
const TEST_SUITE_TAG = process.env.TEST_SUITE_TAG || '';
const SPLIT_NUMBER = Number(process.env.SPLIT_NUMBER || '1');
const TOTAL_SPLITS = Number(process.env.TOTAL_SPLITS || '1');
const BASE_DIR = process.env.BASE_DIR || 'tests/smoke-appium';
const E2E_TIMINGS_PATH = process.env.E2E_TIMINGS_PATH || './e2e-timings.json';

function timingLookupKey(filePath) {
  return filePath.split(path.sep).join('/');
}

function computeMedian(values, fallback = 60) {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

/** Equal-count alphabetical slicing — same as e2e-split-tags-shards.mjs */
function computeShardingSplit(files, splitNumber, totalSplits) {
  const filesPerSplit = ceilDiv(files.length, totalSplits);
  const startIndex = (splitNumber - 1) * filesPerSplit;
  const endIndex = Math.min(startIndex + filesPerSplit, files.length);
  return files.slice(startIndex, endIndex);
}

/** LPT bin-pack — same as e2e-split-tags-shards.mjs */
function binPackShards(files, timings, platform, splitNumber, totalSplits) {
  const platformKey = platform === 'ios' ? 'ios' : 'android';

  const getValidDuration = (file) => {
    const value = timings[timingLookupKey(file)]?.[platformKey];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  };

  const knownDurations = files
    .map(getValidDuration)
    .filter((t) => t !== undefined);

  const medianDuration = computeMedian(knownDurations, 60);
  const unknownFiles = files.filter((f) => getValidDuration(f) === undefined);

  if (unknownFiles.length > 0) {
    console.log(
      `ℹ️  ${unknownFiles.length} file(s) without recorded timing — median fallback ${medianDuration.toFixed(1)}s`,
    );
  }

  const filesWithDuration = files.map((f) => ({
    file: f,
    duration: getValidDuration(f) ?? medianDuration,
  }));

  filesWithDuration.sort((a, b) => b.duration - a.duration);

  const shards = Array.from({ length: totalSplits }, (_, i) => ({
    index: i + 1,
    files: [],
    totalDuration: 0,
  }));

  for (const { file, duration } of filesWithDuration) {
    const lightest = shards.reduce(
      (min, s) => (s.totalDuration < min.totalDuration ? s : min),
      shards[0],
    );
    lightest.files.push(file);
    lightest.totalDuration += duration;
  }

  console.log(`\n📊 Estimated shard durations (${platformKey}, ${totalSplits} shards):`);
  for (const shard of shards) {
    const totalSec = Math.round(shard.totalDuration);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const marker = shard.index === splitNumber ? ' ← this runner' : '';
    console.log(
      `   Shard ${shard.index}: ~${mins}m${String(secs).padStart(2, '0')}s (${shard.files.length} files)${marker}`,
    );
  }

  const thisShard = shards.find((s) => s.index === splitNumber);
  return thisShard ? thisShard.files : [];
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function isAppiumSpecFile(filePath) {
  const key = timingLookupKey(filePath);
  return (
    (key.endsWith('.spec.js') || key.endsWith('.spec.ts')) &&
    !key.split('/').includes('quarantine')
  );
}

function findMatchingFiles(baseDir, tag) {
  const resolvedBase = path.resolve(baseDir);
  const results = [];
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryPattern = new RegExp(
    `(^|[^A-Za-z0-9_])${escapeRegExp(tag)}([^A-Za-z0-9_]|$)`,
    'm',
  );

  for (const filePath of walk(resolvedBase)) {
    if (!isAppiumSpecFile(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (boundaryPattern.test(content)) {
      results.push(path.relative(process.cwd(), filePath));
    }
  }

  results.sort((a, b) => a.localeCompare(b));
  return Array.from(new Set(results));
}

function loadTimings(timingsPath) {
  if (!timingsPath || !fs.existsSync(timingsPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    const times = parsed?.e2e_test_times;
    if (times && typeof times === 'object' && Object.keys(times).length > 0) {
      return times;
    }
  } catch (e) {
    console.log(`ℹ️  Failed to read timings (${e?.message || e})`);
  }
  return null;
}

function appendGithubOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`);
}

function main() {
  if (PLATFORM !== 'android' && PLATFORM !== 'ios') {
    throw new Error(`Invalid PLATFORM "${PLATFORM}" — expected android or ios`);
  }
  if (!TEST_SUITE_TAG) {
    throw new Error('Missing TEST_SUITE_TAG');
  }
  if (!Number.isFinite(SPLIT_NUMBER) || SPLIT_NUMBER < 1) {
    throw new Error(`Invalid SPLIT_NUMBER: ${process.env.SPLIT_NUMBER}`);
  }
  if (!Number.isFinite(TOTAL_SPLITS) || TOTAL_SPLITS < 1) {
    throw new Error(`Invalid TOTAL_SPLITS: ${process.env.TOTAL_SPLITS}`);
  }
  if (!fs.existsSync(BASE_DIR)) {
    throw new Error(`Base directory not found: ${BASE_DIR}`);
  }

  console.log(
    `Selecting Appium specs for ${TEST_SUITE_TAG} shard ${SPLIT_NUMBER}/${TOTAL_SPLITS} (${PLATFORM})`,
  );

  const allMatches = findMatchingFiles(BASE_DIR, TEST_SUITE_TAG);
  console.log(`Found ${allMatches.length} matching spec file(s)`);

  const timings = loadTimings(E2E_TIMINGS_PATH);
  let splitFiles;
  if (timings) {
    console.log(
      `⏱️  Time-based sharding (${Object.keys(timings).length} timing entries from ${E2E_TIMINGS_PATH})`,
    );
    splitFiles = binPackShards(
      allMatches,
      timings,
      PLATFORM,
      SPLIT_NUMBER,
      TOTAL_SPLITS,
    );
  } else {
    console.log('📦 Equal-count sharding (no timings)');
    splitFiles = computeShardingSplit(allMatches, SPLIT_NUMBER, TOTAL_SPLITS);
  }

  console.log(
    `\n🧪 ${splitFiles.length} spec file(s) for this shard (${SPLIT_NUMBER}/${TOTAL_SPLITS}):`,
  );
  for (const file of splitFiles) {
    console.log(`  - ${file}`);
  }

  appendGithubOutput('spec_files', splitFiles.join(' '));
  appendGithubOutput('spec_count', String(splitFiles.length));
}

if (process.argv[1]?.endsWith('e2e-appium-select-shard-specs.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export {
  binPackShards,
  computeShardingSplit,
  findMatchingFiles,
  loadTimings,
};
