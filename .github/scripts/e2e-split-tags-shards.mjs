#!/usr/bin/env node
/**
 * Select Appium smoke specs for one fixed shard (timing redistribution).
 *
 * 1) Find smoke-appium specs matching TEST_SUITE_TAG
 * 2) Split across TOTAL_SPLITS via LPT bin-pack when e2e_test_times exist,
 *    otherwise equal-count alphabetical slicing
 * 3) On workflow re-runs, skip passed specs (Playwright JSON / shard-status)
 * 4) On PRs, duplicate changed specs (*-retry-1.spec.*) for flakiness detection
 * 5) Write SPEC_FILES to GITHUB_OUTPUT for Playwright
 *
 * Also: `node e2e-split-tags-shards.mjs --write-shard-status [prevDir] [report] [out]`
 * merges pass/fail across re-runs into shard-status.json.
 *
 * Env (select mode):
 *   PLATFORM, TEST_SUITE_TAG, SPLIT_NUMBER, TOTAL_SPLITS, BASE_DIR
 *   E2E_TIMINGS_PATH, GITHUB_TOKEN, REPOSITORY
 *   PR_NUMBER, CHANGED_SPEC_FILES, RUN_ATTEMPT, PREVIOUS_RESULTS_PATH
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  computeShardingSplit,
  binPackShards,
  planShards,
  baseSpecPath,
} from './shared/e2e-timing-shards.mjs';

const env = {
  TEST_SUITE_TAG: process.env.TEST_SUITE_TAG,
  BASE_DIR: process.env.BASE_DIR || 'tests/smoke-appium',
  PLATFORM: (process.env.PLATFORM || 'android').toLowerCase(),
  SPLIT_NUMBER: Number(process.env.SPLIT_NUMBER || '1'),
  TOTAL_SPLITS: Number(process.env.TOTAL_SPLITS || '1'),
  PR_NUMBER: process.env.PR_NUMBER || '',
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  CHANGED_SPEC_FILES: process.env.CHANGED_SPEC_FILES || '',
  RUN_ATTEMPT: Number(process.env.RUN_ATTEMPT || '1'),
  PREVIOUS_RESULTS_PATH: process.env.PREVIOUS_RESULTS_PATH || '',
  E2E_TIMINGS_PATH: process.env.E2E_TIMINGS_PATH || './e2e-timings.json',
};

const QA_STATS_WORKFLOW_FILE = 'qa-stats.yml';
const QA_STATS_ARTIFACT_NAME = 'qa-stats';
const QA_STATS_JSON_FILENAME = 'qa-stats.json';

/** Playwright JSON paths are relative to tests/smoke-appium; normalize to repo-relative. */
function normalizeAppiumSpecPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const marker = 'tests/smoke-appium/';
  const idx = normalized.indexOf(marker);
  if (idx !== -1) return normalized.slice(idx);
  if (normalized.endsWith('.spec.ts') || normalized.endsWith('.spec.js')) {
    return `${marker}${normalized}`;
  }
  return normalized;
}

function extractFromPlaywrightJson(report) {
  const byFile = new Map();
  const visit = (suites) => {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) {
        const raw = spec.file || suite.file;
        if (!raw || !String(raw).includes('.spec.')) continue;
        const filePath = normalizeAppiumSpecPath(raw);
        if (!byFile.has(filePath)) byFile.set(filePath, { failed: false });
        for (const test of spec.tests || []) {
          if (test.status === 'unexpected') byFile.get(filePath).failed = true;
        }
      }
      visit(suite.suites);
    }
  };
  visit(report?.suites);

  const executed = [...byFile.keys()];
  const failed = executed.filter((f) => byFile.get(f).failed);
  const passed = executed.filter((f) => !byFile.get(f).failed);
  return { passed, failed, executed };
}

/** Load shard-status.json or playwright-report.json from a file or directory. */
function loadShardResults(resultsPath) {
  const empty = { passed: [], failed: [], executed: [] };
  if (!resultsPath || !fs.existsSync(resultsPath)) return empty;

  const loadFile = (filePath) => {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(parsed?.passed) && Array.isArray(parsed?.failed) && Array.isArray(parsed?.executed)) {
      return {
        passed: parsed.passed.map(normalizeAppiumSpecPath),
        failed: parsed.failed.map(normalizeAppiumSpecPath),
        executed: parsed.executed.map(normalizeAppiumSpecPath),
      };
    }
    if (parsed?.suites) return extractFromPlaywrightJson(parsed);
    return null;
  };

  try {
    if (fs.statSync(resultsPath).isFile()) return loadFile(resultsPath) || empty;
    for (const name of ['shard-status.json', 'playwright-report.json']) {
      const candidate = path.join(resultsPath, name);
      if (fs.existsSync(candidate)) {
        const loaded = loadFile(candidate);
        if (loaded) return loaded;
      }
    }
  } catch (e) {
    console.warn(`Failed to load shard results from ${resultsPath}: ${e?.message || e}`);
  }
  return empty;
}

function mergeShardStatus(previous, current) {
  const passed = new Set((previous?.passed || []).map(normalizeAppiumSpecPath));
  const failed = new Set((previous?.failed || []).map(normalizeAppiumSpecPath));
  const executed = new Set((previous?.executed || []).map(normalizeAppiumSpecPath));

  for (const filePath of current?.executed || []) {
    const n = normalizeAppiumSpecPath(filePath);
    executed.add(n);
    passed.delete(n);
    failed.delete(n);
  }
  for (const filePath of current?.passed || []) passed.add(normalizeAppiumSpecPath(filePath));
  for (const filePath of current?.failed || []) failed.add(normalizeAppiumSpecPath(filePath));

  return {
    passed: [...passed].sort(),
    failed: [...failed].sort(),
    executed: [...executed].sort(),
  };
}

function writeShardStatus(previousPath, currentReportPath, outputPath) {
  const current = loadShardResults(currentReportPath);
  const merged =
    previousPath && fs.existsSync(previousPath)
      ? mergeShardStatus(loadShardResults(previousPath), current)
      : current;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ ...merged, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(
    `shard-status: ${merged.executed.length} executed, ${merged.failed.length} failed, ${merged.passed.length} passed`,
  );
}

/**
 * Appium smoke specs under tests/smoke-appium (excludes quarantine + runtime retry copies).
 * @param {string} filePath
 */
function isSpecFile(filePath) {
  const segments = filePath.split(path.sep);
  const base = path.basename(filePath);
  return (
    (filePath.endsWith('.spec.js') || filePath.endsWith('.spec.ts')) &&
    !segments.includes('quarantine') &&
    !/-retry-\d+\.spec\.(ts|js)$/.test(base)
  );
}

async function githubGraphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unable to read response');
    throw new Error(
      `GraphQL request failed: ${res.status} ${res.statusText}\nResponse: ${errorText}`,
    );
  }

  const data = await res.json();
  if (data.errors) {
    const msg = Array.isArray(data.errors)
      ? data.errors.map((e) => e.message).join('; ')
      : String(data.errors);
    throw new Error(`GraphQL errors: ${msg}`);
  }
  return data.data;
}

/**
 * Skip PR flakiness detection when unlabeled / non-PR / API failure / skip label.
 * @returns {Promise<boolean>}
 */
async function shouldSkipFlakinessDetection() {
  if (!env.PR_NUMBER) {
    return true;
  }

  const [owner, repo] = env.REPOSITORY.split('/');
  const prNumber = Number(env.PR_NUMBER);

  try {
    const data = await githubGraphql(
      `query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            labels(first: 100) { nodes { name } }
          }
        }
      }`,
      { owner, repo, number: prNumber },
    );

    const labels = data?.repository?.pullRequest?.labels?.nodes || [];
    const labelFound = labels.some(
      (l) => String(l?.name).toLowerCase() === 'skip-e2e-flakiness-detection',
    );
    if (labelFound) {
      console.log(
        '⏭️  Found "skip-e2e-flakiness-detection" label → SKIPPING flakiness detection',
      );
    }
    return labelFound;
  } catch (e) {
    console.error(`❌ GitHub API call failed: ${e?.message || String(e)}`);
    return true;
  }
}

function computeRetryFilePath(originalPath, retryIndex) {
  const match = originalPath.match(/^(.*)\.spec\.(ts|js)$/);
  if (!match) return null;
  return `${match[1]}-retry-${retryIndex}.spec.${match[2]}`;
}

function duplicateSpecFile(originalPath) {
  try {
    const srcPath = path.resolve(originalPath);
    let content;
    try {
      content = fs.readFileSync(srcPath);
    } catch (e) {
      if (e?.code === 'ENOENT') return;
      throw e;
    }
    const retryRel = computeRetryFilePath(originalPath, 1);
    if (!retryRel) return;
    const retryAbs = path.resolve(retryRel);
    fs.mkdirSync(path.dirname(retryAbs), { recursive: true });
    // Exclusive create avoids existsSync→writeFileSync TOCTOU (CodeQL js/file-system-race).
    try {
      fs.writeFileSync(retryAbs, content, { flag: 'wx' });
      console.log(`🧪 Duplicated for flakiness check: ${retryRel}`);
    } catch (e) {
      if (e?.code !== 'EEXIST') throw e;
    }
  } catch (e) {
    console.warn(`⚠️ Failed duplicating ${originalPath}: ${e?.message || e}`);
  }
}

function normalizePathForCompare(p) {
  return path.normalize(
    path.isAbsolute(p) ? path.relative(process.cwd(), p) : p,
  );
}

function getChangedSpecFiles() {
  const raw = (env.CHANGED_SPEC_FILES || '').trim();
  if (!raw) return new Set();

  let cleaned = raw;
  const eqIdx = raw.indexOf('=');
  if (eqIdx > -1 && /changed_spec_files/i.test(raw.slice(0, eqIdx))) {
    cleaned = raw.slice(eqIdx + 1).trim();
  }

  const specFiles = new Set();
  for (const part of cleaned.split(/\s+/g).map((p) => p.trim()).filter(Boolean)) {
    if (part.endsWith('.spec.ts') || part.endsWith('.spec.js')) {
      specFiles.add(path.normalize(part));
    }
  }
  return specFiles;
}

/**
 * Duplicate changed Appium specs assigned to this shard so Playwright runs them twice.
 * @param {string[]} splitFiles
 * @returns {string[]}
 */
function applyFlakinessDetection(splitFiles) {
  const changedSpecs = getChangedSpecFiles();
  if (changedSpecs.size === 0) {
    return splitFiles;
  }

  const selectedSet = new Set(splitFiles.map(normalizePathForCompare));
  const duplicatedSet = new Set();
  for (const changed of changedSpecs) {
    const normalized = normalizePathForCompare(changed);
    if (selectedSet.has(normalized)) {
      duplicateSpecFile(normalized);
      duplicatedSet.add(normalized);
    }
  }

  if (duplicatedSet.size === 0) {
    console.log(
      'ℹ️  No changed spec files found for this shard split -> No test retries.',
    );
    return splitFiles;
  }

  const expanded = [];
  for (const file of splitFiles) {
    const normalized = normalizePathForCompare(file);
    expanded.push(file);
    if (duplicatedSet.has(normalized)) {
      const retry1 = computeRetryFilePath(normalized, 1);
      if (retry1) expanded.push(retry1);
    }
  }

  console.log(
    `ℹ️  Duplicated ${duplicatedSet.size} changed file(s) for flakiness detection.`,
  );
  return expanded;
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

async function selectShardFiles(files, splitNumber, totalSplits, platform) {
  const timings = await fetchE2ETestTimes();

  if (timings && Object.keys(timings).length > 0) {
    console.log('⏱️  Time-based sharding (from qa-stats / frozen timings)');
    const shards = planShards(files, timings, platform, totalSplits);
    console.log(
      `\n📊 Estimated shard durations (${platform === 'ios' ? 'ios' : 'android'}, ${totalSplits} shards):`,
    );
    for (const shard of shards) {
      const totalSec = Math.round(shard.totalDuration);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const marker = shard.index === splitNumber ? ' ← this runner' : '';
      console.log(
        `   Shard ${shard.index}: ~${mins}m${String(secs).padStart(2, '0')}s (${shard.files.length} files)${marker}`,
      );
    }
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
  console.log(`GitHub Actions: attempt ${env.RUN_ATTEMPT}`);

  const allMatches = findMatchingFiles(env.BASE_DIR, env.TEST_SUITE_TAG);
  console.log(
    `Found ${allMatches.length} matching spec files to split across ${env.TOTAL_SPLITS} shards`,
  );

  if (allMatches.length === 0) {
    throw new Error(`❌ No Appium specs found containing tag: ${env.TEST_SUITE_TAG}`);
  }

  const splitFiles = await selectShardFiles(
    allMatches,
    env.SPLIT_NUMBER,
    env.TOTAL_SPLITS,
    env.PLATFORM,
  );
  let runFiles = [...splitFiles];

  if (runFiles.length === 0) {
    console.log(
      `⚠️  No specs for split ${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS} (only ${allMatches.length} file(s), ${env.TOTAL_SPLITS} runners).`,
    );
    appendGithubOutput('spec_files', '');
    appendGithubOutput('spec_count', '0');
    return;
  }

  // Re-runs: skip files that fully passed previously (Playwright JSON / shard-status).
  if (env.RUN_ATTEMPT > 1 && env.PREVIOUS_RESULTS_PATH) {
    console.log(
      `\n🔄 Re-run detected (attempt ${env.RUN_ATTEMPT}), filtering to failed/not-executed specs...`,
    );

    const { passed, failed, executed } = loadShardResults(env.PREVIOUS_RESULTS_PATH);

    if (executed.length === 0) {
      console.log(
        '⚠️  No previous Appium results found — running all specs in this shard.',
      );
    } else {
      // Treat flakiness copies as the original: a base is only "passed" if no
      // variant (original or *-retry-N) failed.
      const failedBases = new Set(failed.map((f) => baseSpecPath(f)));
      const passedBases = new Set(
        passed
          .map((f) => baseSpecPath(f))
          .filter((base) => !failedBases.has(base)),
      );
      const testsToRerun = splitFiles.filter(
        (testPath) => !passedBases.has(baseSpecPath(testPath)),
      );

      const failedInChunk = testsToRerun.filter((t) =>
        failedBases.has(baseSpecPath(t)),
      ).length;
      const notExecutedInChunk = testsToRerun.length - failedInChunk;

      console.log(
        `Previous run: ${passed.length} passed, ${failed.length} failed`,
      );
      console.log(
        `This chunk: ${failedInChunk} failed, ${notExecutedInChunk} not executed`,
      );

      if (testsToRerun.length > 0) {
        console.log(
          `\n🔁 Re-running ${testsToRerun.length} specs (${failedInChunk} failed, ${notExecutedInChunk} not executed):`,
        );
        testsToRerun.forEach((t) => console.log(`  - ${t}`));
        runFiles = testsToRerun;
      } else {
        console.log('✅ All specs in this shard passed previously — skipping.');
        appendGithubOutput('spec_files', '');
        appendGithubOutput('spec_count', '0');
        return;
      }
    }
  }

  // PR flakiness: run changed specs twice via *-retry-1.spec.* copies (attempt 1 only).
  if (env.RUN_ATTEMPT === 1) {
    const shouldSkipFlakinessGate = await shouldSkipFlakinessDetection();
    if (!shouldSkipFlakinessGate) {
      runFiles = applyFlakinessDetection(runFiles);
    }
  }

  console.log(
    `\n🧪 ${runFiles.length} spec file(s) for this shard (${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS}):`,
  );
  for (const file of runFiles) {
    console.log(`  - ${file}`);
  }

  appendGithubOutput('spec_files', runFiles.join(' '));
  appendGithubOutput('spec_count', String(runFiles.length));
}

if (process.argv[1]?.endsWith('e2e-split-tags-shards.mjs')) {
  if (process.argv[2] === '--write-shard-status') {
    try {
      writeShardStatus(
        process.argv[3] || '',
        process.argv[4] || 'tests/test-reports/playwright-json/playwright-report.json',
        process.argv[5] || 'tests/test-reports/playwright-json/shard-status.json',
      );
    } catch (error) {
      console.error('\n❌ Failed to write shard status:', error);
      process.exit(1);
    }
  } else {
    main().catch((error) => {
      console.error('\n❌ Unexpected error:', error);
      process.exit(1);
    });
  }
}
