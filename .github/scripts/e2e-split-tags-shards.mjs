#!/usr/bin/env node
/**
 * Select Appium smoke specs for one fixed shard (timing redistribution).
 *
 * 1) Find smoke-appium specs matching TEST_SUITE_TAG
 * 2) Split across TOTAL_SPLITS via LPT bin-pack when e2e_test_times exist,
 *    otherwise equal-count alphabetical slicing
 * 3) Write SPEC_FILES (space-separated) to GITHUB_OUTPUT for Playwright
 *
 * Shard *count* stays in the smoke workflow matrix (split / total_splits).
 * Playwright execution stays in run-appium-e2e-workflow.yml.
 *
 * Env:
 *   PLATFORM, TEST_SUITE_TAG, SPLIT_NUMBER, TOTAL_SPLITS
 *   BASE_DIR (default: tests/smoke-appium)
 *   E2E_TIMINGS_PATH (frozen timings preferred)
 *   GITHUB_TOKEN / REPOSITORY (live qa-stats fallback)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const env = {
  TEST_SUITE_TAG: process.env.TEST_SUITE_TAG,
  BASE_DIR: process.env.BASE_DIR || 'tests/smoke-appium',
  PLATFORM: (process.env.PLATFORM || 'android').toLowerCase(),
  SPLIT_NUMBER: Number(process.env.SPLIT_NUMBER || '1'),
  TOTAL_SPLITS: Number(process.env.TOTAL_SPLITS || '1'),
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  E2E_TIMINGS_PATH: process.env.E2E_TIMINGS_PATH || './e2e-timings.json',
};

const QA_STATS_WORKFLOW_FILE = 'qa-stats.yml';
const QA_STATS_ARTIFACT_NAME = 'qa-stats';
const QA_STATS_JSON_FILENAME = 'qa-stats.json';

function timingLookupKey(filePath) {
  return filePath.split(path.sep).join('/');
}

/**
 * Appium smoke specs under tests/smoke-appium (excludes quarantine).
 * @param {string} filePath
 */
function isSpecFile(filePath) {
  const segments = filePath.split(path.sep);
  return (
    (filePath.endsWith('.spec.js') || filePath.endsWith('.spec.ts')) &&
    !segments.includes('quarantine')
  );
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

function findMatchingFiles(baseDir, tag) {
  const resolvedBase = path.resolve(baseDir);
  const results = [];
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryPattern = new RegExp(
    `(^|[^A-Za-z0-9_])${escapeRegExp(tag)}([^A-Za-z0-9_]|$)`,
    'm',
  );

  for (const filePath of walk(resolvedBase)) {
    if (!isSpecFile(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (boundaryPattern.test(content)) {
      results.push(path.relative(process.cwd(), filePath));
    }
  }

  results.sort((a, b) => a.localeCompare(b));
  return Array.from(new Set(results));
}

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

function computeShardingSplit(files, splitNumber, totalSplits) {
  const filesPerSplit = ceilDiv(files.length, totalSplits);
  const startIndex = (splitNumber - 1) * filesPerSplit;
  const endIndex = Math.min(startIndex + filesPerSplit, files.length);
  return files.slice(startIndex, endIndex);
}

async function githubRest(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const suffix = body ? `: ${body.slice(0, 200)}` : '';
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}${suffix}`);
  }
  return res.json();
}

/**
 * Prefer frozen E2E_TIMINGS_PATH; else latest main qa-stats artifact.
 * @returns {Promise<object|null>}
 */
async function fetchE2ETestTimes() {
  if (env.E2E_TIMINGS_PATH && fs.existsSync(env.E2E_TIMINGS_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(env.E2E_TIMINGS_PATH, 'utf8'));
      const times = parsed?.e2e_test_times;
      if (times && typeof times === 'object' && Object.keys(times).length > 0) {
        console.log(
          `⏱️  Using frozen timings from ${env.E2E_TIMINGS_PATH} (${Object.keys(times).length} entries)`,
        );
        return times;
      }
    } catch (e) {
      console.log(
        `ℹ️  Failed to read frozen timings (${e?.message || e}) — falling back to live fetch`,
      );
    }
  }

  if (!env.GITHUB_TOKEN) {
    console.log(
      'ℹ️  qa-stats artifact unavailable (no GITHUB_TOKEN) — falling back to alphabetical split',
    );
    return null;
  }

  const apiBase = `https://api.github.com/repos/${env.REPOSITORY}`;

  try {
    const runsUrl = `${apiBase}/actions/workflows/${QA_STATS_WORKFLOW_FILE}/runs?branch=main&status=success&per_page=1`;
    const runsData = await githubRest(runsUrl);
    const run = runsData?.workflow_runs?.[0];
    if (!run?.id) {
      console.log(
        'ℹ️  qa-stats artifact unavailable (no successful main run found) — falling back to alphabetical split',
      );
      return null;
    }

    const artifactsData = await githubRest(
      `${apiBase}/actions/runs/${run.id}/artifacts`,
    );
    const artifact = (artifactsData?.artifacts || []).find(
      (a) => a?.name === QA_STATS_ARTIFACT_NAME && !a?.expired,
    );
    if (!artifact?.archive_download_url) {
      console.log(
        `ℹ️  qa-stats artifact unavailable (not found on run #${run.id}) — falling back to alphabetical split`,
      );
      return null;
    }

    console.log(
      `📥 Fetching qa-stats artifact from latest successful main run #${run.id}`,
    );

    const redirectRes = await fetch(artifact.archive_download_url, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'metamask-mobile-ci',
      },
      redirect: 'manual',
    });

    const downloadUrl = redirectRes.headers.get('location');
    if (!downloadUrl) {
      throw new Error(
        `no redirect URL returned for qa-stats artifact (status ${redirectRes.status})`,
      );
    }

    const zipRes = await fetch(downloadUrl);
    if (!zipRes.ok) {
      throw new Error(`download zip → ${zipRes.status} ${zipRes.statusText}`);
    }

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `qa-stats-${run.id}-`));
    const zipPath = path.join(tmpRoot, 'qa-stats.zip');
    fs.writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()));

    const unzipResult = spawnSync('unzip', ['-o', zipPath, '-d', tmpRoot], {
      stdio: 'pipe',
    });
    if (unzipResult.status !== 0) {
      throw new Error(
        `unzip exited with code ${unzipResult.status}: ${unzipResult.stderr?.toString() || ''}`,
      );
    }

    const jsonPath = path.join(tmpRoot, QA_STATS_JSON_FILENAME);
    if (!fs.existsSync(jsonPath)) {
      console.log(
        `ℹ️  qa-stats artifact unavailable (${QA_STATS_JSON_FILENAME} missing) — falling back to alphabetical split`,
      );
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const times = parsed?.e2e_test_times;
    if (!times || typeof times !== 'object' || Object.keys(times).length === 0) {
      console.log(
        'ℹ️  qa-stats artifact has no e2e_test_times — falling back to alphabetical split',
      );
      return null;
    }

    return times;
  } catch (e) {
    console.log(
      `ℹ️  qa-stats artifact unavailable (${e?.message || String(e)}) — falling back to alphabetical split`,
    );
    return null;
  }
}

function computeMedian(values, fallback = 60) {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

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
      `ℹ️  ${unknownFiles.length} file(s) without recorded timing — median fallback ${medianDuration.toFixed(1)}s:`,
    );
    unknownFiles.forEach((f) => console.log(`     - ${f}`));
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

async function selectShardFiles(files, splitNumber, totalSplits, platform) {
  const timings = await fetchE2ETestTimes();

  if (timings && Object.keys(timings).length > 0) {
    console.log('⏱️  Time-based sharding (from qa-stats / frozen timings)');
    return binPackShards(files, timings, platform, splitNumber, totalSplits);
  }

  console.log('📦 Equal-count sharding (no timings)');
  return computeShardingSplit(files, splitNumber, totalSplits);
}

function appendGithubOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`);
}

async function main() {
  if (!fs.existsSync(env.BASE_DIR)) {
    throw new Error(`❌ Base directory not found: ${env.BASE_DIR}`);
  }
  if (!env.TEST_SUITE_TAG) {
    throw new Error('❌ Missing TEST_SUITE_TAG env var');
  }
  if (env.PLATFORM !== 'android' && env.PLATFORM !== 'ios') {
    throw new Error(`❌ Invalid PLATFORM "${env.PLATFORM}" — expected android or ios`);
  }
  if (!Number.isFinite(env.SPLIT_NUMBER) || env.SPLIT_NUMBER < 1) {
    throw new Error(`❌ Invalid SPLIT_NUMBER: ${process.env.SPLIT_NUMBER}`);
  }
  if (!Number.isFinite(env.TOTAL_SPLITS) || env.TOTAL_SPLITS < 1) {
    throw new Error(`❌ Invalid TOTAL_SPLITS: ${process.env.TOTAL_SPLITS}`);
  }

  console.log(
    `Selecting Appium specs for ${env.TEST_SUITE_TAG} shard ${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS} (${env.PLATFORM})`,
  );

  const allMatches = findMatchingFiles(env.BASE_DIR, env.TEST_SUITE_TAG);
  console.log(
    `Found ${allMatches.length} matching spec files to split across ${env.TOTAL_SPLITS} shards`,
  );

  const splitFiles = await selectShardFiles(
    allMatches,
    env.SPLIT_NUMBER,
    env.TOTAL_SPLITS,
    env.PLATFORM,
  );

  console.log(
    `\n🧪 ${splitFiles.length} spec file(s) for this shard (${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS}):`,
  );
  for (const file of splitFiles) {
    console.log(`  - ${file}`);
  }

  appendGithubOutput('spec_files', splitFiles.join(' '));
  appendGithubOutput('spec_count', String(splitFiles.length));
}

if (process.argv[1]?.endsWith('e2e-split-tags-shards.mjs')) {
  main().catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
}
