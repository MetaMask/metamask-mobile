import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { extractTestResults } from './e2e-extract-test-results.mjs';

// 1) Find all specs files that include the given E2E tags
// 2) Compute sharding split using time-based bin-packing when
//    tests/e2e-test-timings.json is present (restored from Actions cache:
//    PR-specific first, then main). Otherwise equal-count alphabetical split.
// 3) On re-runs, skip passed tests and only run failed/not-executed tests
// 4) Flaky test detector mechanism in PRs (test retries)
// 5) Log and run the selected specs for the given shard split

const env = {
  TEST_SUITE_TAG: process.env.TEST_SUITE_TAG,
  BASE_DIR: process.env.BASE_DIR || './tests/',
  METAMASK_BUILD_TYPE: process.env.METAMASK_BUILD_TYPE || 'main',
  PLATFORM: process.env.PLATFORM || 'ios',
  SPLIT_NUMBER: Number(process.env.SPLIT_NUMBER || '1'),
  TOTAL_SPLITS: Number(process.env.TOTAL_SPLITS || '1'),
  PR_NUMBER: process.env.PR_NUMBER || '',
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  CHANGED_FILES: process.env.CHANGED_FILES || '',
  RUN_ATTEMPT: Number(process.env.RUN_ATTEMPT || '1'),
  PREVIOUS_RESULTS_PATH: process.env.PREVIOUS_RESULTS_PATH || '',
};
// Example of format of CHANGED_FILES: .github/scripts/e2e-check-build-needed.mjs .github/scripts/needs-e2e-builds.mjs

const TIMINGS_FILE = path.resolve('tests/e2e-test-timings.json');

/**
 * Match timing DB keys (always POSIX-style in JSON) to spec paths from any OS.
 * @param {string} filePath
 */
function timingLookupKey(filePath) {
  return filePath.split(path.sep).join('/');
}

if (!fs.existsSync(env.BASE_DIR)) throw new Error(`❌ Base directory not found: ${env.BASE_DIR}`);
if (!env.TEST_SUITE_TAG) throw new Error('❌ Missing TEST_SUITE_TAG env var');

/**
 * Minimal GitHub GraphQL helper
 * @param {*} query - The query to run
 * @param {*} variables - The variables to pass to the query
 * @returns The data from the query
 */
async function githubGraphql(query, variables = {}) {
  try {
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
      throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}\nResponse: ${errorText}`);
    }

    const data = await res.json();
    if (data.errors) {
      const msg = Array.isArray(data.errors) ? data.errors.map((e) => e.message).join('; ') : String(data.errors);
      throw new Error(`GraphQL errors: ${msg}`);
    }
    return data.data;
  } catch (err) {
    // Re-throw with more context
    if (err.message) throw err;
    throw new Error(`GraphQL request failed: ${String(err)}`);
  }
}

/**
 * Check if the flakiness detection (tests retries) should be skipped.
 * @returns True if the retries should be skipped, false otherwise
 */
async function shouldSkipFlakinessDetection() {
  if (!env.PR_NUMBER) {
    return true;
  }

  const OWNER = env.REPOSITORY.split('/')[0];
  const REPO = env.REPOSITORY.split('/')[1];
  const PR_NUM = Number(env.PR_NUMBER);

  try {
    const data = await githubGraphql(
      `query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            labels(first: 100) { nodes { name } }
          }
        }
      }`,
      { owner: OWNER, repo: REPO, number: PR_NUM },
    );

    const labels = data?.repository?.pullRequest?.labels?.nodes || [];
    const labelFound = labels.some((l) => String(l?.name).toLowerCase() === 'skip-e2e-quality-gate');
    if (labelFound) {
      console.log('⏭️  Found "skip-e2e-quality-gate" label → SKIPPING flakiness detection');
    }
    return labelFound;
  } catch (e) {
    console.error(`❌ GitHub API call failed:`);
    console.error(`Error: ${e?.message || String(e)}`);
    return true;
  }
}

/**
 * Check if a file is a spec file
 * @param {*} filePath - The path to the file
 * @returns True if the file is a spec file, false otherwise
 */
function isSpecFile(filePath) {
  return (filePath.endsWith('.spec.js') || filePath.endsWith('.spec.ts')) &&
    !filePath.split(path.sep).includes('quarantine');
}

/**
 * Synchronous generator to recursively walk a directory
 * @param {*} dir - The directory to walk
 * @returns A generator of the files in the directory, sorted alphabetically
 */
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

/**
 * Find all spec files that contain the provided tag string
 * @param {*} baseDir - The base directory to search
 * @param {*} tag - The tag to search for
 * @returns The matching files, sorted alphabetically
 */
function findMatchingFiles(baseDir, tag) {
  const resolvedBase = path.resolve(baseDir);
  const results = [];
  // Escape the tag for safe usage in RegExp
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match tag with word-boundary semantics similar to `grep -w -F`
  // We require a non-word (or start) before and after the tag to avoid substring matches
  const boundaryPattern = new RegExp(
    `(^|[^A-Za-z0-9_])${escapeRegExp(tag)}([^A-Za-z0-9_]|$)`,
    'm',
  );
  for (const filePath of walk(resolvedBase)) {
    if (!isSpecFile(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (boundaryPattern.test(content)) {
      // Return repo-relative paths similar to the bash script output
      results.push(path.relative(process.cwd(), filePath));
    }
  }
  results.sort((a, b) => a.localeCompare(b));
  return Array.from(new Set(results));
}

/**
 * Compute the ceiling of a division
 * @param {*} a - The dividend
 * @param {*} b - The divisor
 * @returns The ceiling of the division
 */
function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

/**
 * Split files evenly across runners by count (alphabetical slicing).
 * Fallback when no timings file is available.
 * @param {*} files - The files to split
 * @param {*} splitNumber - The number of the split (1-based index)
 * @param {*} totalSplits - The total number of splits
 * @returns The split files for this runner
 */
function computeShardingSplit(files, splitNumber, totalSplits) {
  const filesPerSplit = ceilDiv(files.length, totalSplits);
  const startIndex = (splitNumber - 1) * filesPerSplit;
  const endIndex = Math.min(startIndex + filesPerSplit, files.length);
  return files.slice(startIndex, endIndex);
}

/**
 * @returns {{ [filePath: string]: { ios?: number, android?: number } } | null}
 */
function loadTestTimings() {
  if (!fs.existsSync(TIMINGS_FILE)) {
    console.log(`ℹ️  No timings file at ${TIMINGS_FILE} — equal-count split.`);
    return null;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8'));
    return raw.timings ?? null;
  } catch (e) {
    console.warn(`⚠️  Could not parse timings file: ${e.message} — equal-count split.`);
    return null;
  }
}

/**
 * @param {number[]} values
 * @param {number} fallback
 */
function computeMedian(values, fallback = 60) {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * @param {string[]} files
 * @param {{ [filePath: string]: { ios?: number, android?: number } }} timings
 * @param {string} platform
 * @param {number} splitNumber
 * @param {number} totalSplits
 */
function binPackShards(files, timings, platform, splitNumber, totalSplits) {
  const platformKey = platform.toLowerCase() === 'ios' ? 'ios' : 'android';

  const knownDurations = files
    .map((f) => timings[timingLookupKey(f)]?.[platformKey])
    .filter((t) => typeof t === 'number' && t > 0);

  const medianDuration = computeMedian(knownDurations, 60);
  const unknownFiles = files.filter(
    (f) => typeof timings[timingLookupKey(f)]?.[platformKey] !== 'number',
  );

  if (unknownFiles.length > 0) {
    console.log(`ℹ️  ${unknownFiles.length} file(s) without recorded timing — median fallback ${medianDuration.toFixed(1)}s:`);
    unknownFiles.forEach((f) => console.log(`     - ${f}`));
  }

  const filesWithDuration = files.map((f) => ({
    file: f,
    duration: timings[timingLookupKey(f)]?.[platformKey] ?? medianDuration,
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
    console.log(`   Shard ${shard.index}: ~${mins}m${String(secs).padStart(2, '0')}s (${shard.files.length} files)${marker}`);
  }

  const thisShard = shards.find((s) => s.index === splitNumber);
  return thisShard ? thisShard.files : [];
}

/**
 * @param {string[]} files
 * @param {number} splitNumber
 * @param {number} totalSplits
 * @param {string} platform
 */
function selectShardFiles(files, splitNumber, totalSplits, platform) {
  const timings = loadTestTimings();

  if (timings && Object.keys(timings).length > 0) {
    console.log(`⏱️  Time-based sharding (from ${TIMINGS_FILE})`);
    return binPackShards(files, timings, platform, splitNumber, totalSplits);
  }

  console.log('📦 Equal-count sharding (no timings)');
  return computeShardingSplit(files, splitNumber, totalSplits);
}

/**
 * Spawn a yarn script with inherited stdio
 * @param {*} scriptName - The name of the script to run
 * @param {*} args - The arguments to pass to the script
 * @param {*} extraEnv - The extra environment variables to set
 * @returns A promise that resolves when the script exits
 */
function runYarn(scriptName, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('yarn', [scriptName, ...args], {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
    child.on('error', (err) => reject(err));
  });
}

/**
 * Derive the retry filename for a given spec: base -> base-retry-N
 * @param {*} originalPath - The original path to the spec file
 * @param {*} retryIndex - The retry index
 * @returns The retry filename, or null if the original path is not a spec file
 */
function computeRetryFilePath(originalPath, retryIndex) {
  // originalPath must end with .spec.ts or .spec.js
  const match = originalPath.match(/^(.*)\.spec\.(ts|js)$/);
  if (!match) return null;
  const base = match[1];
  const ext = match[2];
  return `${base}-retry-${retryIndex}.spec.${ext}`;
}

/**
 * Create retry copies of a given spec if not already present
 * @param {*} originalPath - The original path to the spec file
 */
function duplicateSpecFile(originalPath) {
  try {
    const srcPath = path.resolve(originalPath);
    if (!fs.existsSync(srcPath)) return;
    const content = fs.readFileSync(srcPath);
    for (let i = 1; i <= 1; i += 1) {
      const retryRel = computeRetryFilePath(originalPath, i);
      if (!retryRel) continue;
      const retryAbs = path.resolve(retryRel);
      if (!fs.existsSync(path.dirname(retryAbs))) {
        fs.mkdirSync(path.dirname(retryAbs), { recursive: true });
      }
      if (!fs.existsSync(retryAbs)) {
        fs.writeFileSync(retryAbs, content);
        console.log(`🧪 Duplicated for flakiness check: ${retryRel}`);
      }
    }
  } catch (e) {
    console.warn(`⚠️ Failed duplicating ${originalPath}: ${e?.message || e}`);
  }
}

/**
 * Normalize a path (repo-relative) for comparisons
 * @param {*} p - The path to normalize
 * @returns The normalized path, relative to the current working directory
 */
function normalizePathForCompare(p) {
  // Ensure relative to CWD, normalized separators
  const rel = path.isAbsolute(p) ? path.relative(process.cwd(), p) : p;
  return path.normalize(rel);
}

/**
 * Parse CHANGED_FILES env var to extract changed spec files
 * @returns Set of normalized spec file paths
 */
function getChangedSpecFiles() {
  const raw = (env.CHANGED_FILES || '').trim();
  if (!raw) return new Set();

  // Handle "changed_files=path1 path2" format
  let cleaned = raw;
  const eqIdx = raw.indexOf('=');
  if (eqIdx > -1 && /changed_files/i.test(raw.slice(0, eqIdx))) {
    cleaned = raw.slice(eqIdx + 1).trim();
  }

  const parts = cleaned.split(/\s+/g).map((p) => p.trim()).filter(Boolean);
  const specFiles = new Set();
  for (const p of parts) {
    if (p.endsWith('.spec.ts') || p.endsWith('.spec.js')) {
      specFiles.add(path.normalize(p));
    }
  }
  return specFiles;
}

/**
 * Apply flakiness detection: duplicate changed spec files assigned to this shard
 * @param {string[]} splitFiles - The test files assigned to this shard
 * @returns {string[]} Expanded list with base + retry files for changed tests
 */
function applyFlakinessDetection(splitFiles) {
  const changedSpecs = getChangedSpecFiles();
  if (changedSpecs.size === 0) {
    return splitFiles;
  }

  // Find which changed files are in this shard's split
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
    console.log('ℹ️  No changed spec files found for this shard split -> No test retries.');
    return splitFiles;
  }

  // Build expanded list: base + retry files for duplicated files
  const expanded = [];
  for (const file of splitFiles) {
    const normalized = normalizePathForCompare(file);
    if (duplicatedSet.has(normalized)) {
      // Add base file
      expanded.push(file);
      // Add retry files
      const retry1 = computeRetryFilePath(normalized, 1);
      if (retry1) expanded.push(retry1);
    } else {
      // Not changed, add as-is
      expanded.push(file);
    }
  }

  console.log(`ℹ️  Duplicated ${duplicatedSet.size} changed file(s) for flakiness detection.`);
  return expanded;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 Starting E2E tests...');
  console.log(`GitHub Actions: attempt ${env.RUN_ATTEMPT}`);

  // 1) Find all specs files that include the given E2E tags
  console.log(`Searching for E2E test files with tags: ${env.TEST_SUITE_TAG}`);
  const allMatches = findMatchingFiles(env.BASE_DIR, env.TEST_SUITE_TAG); // TODO - review this function (!).
  if (allMatches.length === 0) throw new Error(`❌ No test files found containing tags: ${env.TEST_SUITE_TAG}`);
  console.log(`Found ${allMatches.length} matching spec files to split across ${env.TOTAL_SPLITS} shards`);

  // 2) Shard by measured times when timings JSON exists, else by file count
  const splitFiles = selectShardFiles(allMatches, env.SPLIT_NUMBER, env.TOTAL_SPLITS, env.PLATFORM);
  let runFiles = [...splitFiles];

  if (runFiles.length === 0) {
    console.log(`⚠️  No test files for split ${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS} (only ${allMatches.length} test files found, but ${env.TOTAL_SPLITS} runners configured).`);
    console.log(`    💡 Tip: Reduce shard splits or add more tests to this tag ${env.TEST_SUITE_TAG}`);
    process.exit(0);
  }

  // 3) On re-runs, skip passed tests and only run failed/not-executed tests
  //    This avoids running all tests over and over again on re-runs
  if (env.RUN_ATTEMPT > 1 && env.PREVIOUS_RESULTS_PATH) {
    console.log(`\n🔄 Re-run detected (attempt ${env.RUN_ATTEMPT}), checking for failed tests to re-run...`);

    const { passed, failed, executed } = await extractTestResults(env.PREVIOUS_RESULTS_PATH);

    // If no tests were executed in previous run, something is wrong - run all tests
    if (executed.length === 0) {
      console.log('⚠️  No test results found from previous run, running all tests in chunk.');
    } else {
      // Re-run tests that failed OR were never executed in previous run
      // Only skip tests that explicitly passed - this ensures:
      // 1. Failed tests get re-run
      // 2. Tests that never executed (due to crash/cancel) also get run
      // 3. Only confirmed passing tests are skipped
      const passedSet = new Set(passed.map(normalizePathForCompare));
      const testsToRerun = splitFiles.filter(
        (testPath) => !passedSet.has(normalizePathForCompare(testPath))
      );

      const failedInChunk = testsToRerun.filter((t) =>
        failed.map(normalizePathForCompare).includes(normalizePathForCompare(t))
      ).length;
      const notExecutedInChunk = testsToRerun.length - failedInChunk;

      console.log(`Previous run results: ${passed.length} passed, ${failed.length} failed`);
      console.log(`This chunk: ${failedInChunk} failed, ${notExecutedInChunk} not executed`);

      if (testsToRerun.length > 0) {
        console.log(`\n🔁 Re-running ${testsToRerun.length} tests (${failedInChunk} failed, ${notExecutedInChunk} not executed):`);
        testsToRerun.forEach((t) => console.log(`  - ${t}`));
        runFiles = testsToRerun;
      } else {
        // No tests to re-run - all tests in this chunk passed
        console.log('✅ All tests in this chunk passed, skipping.');
        process.exit(0);
      }
    }
  }

  // 4) Flaky test detector mechanism in PRs (test retries)
  //    - Only duplicates changed files that are in this shard's split
  //    - Creates base + retry files for flakiness detection
  //    - Skip flakiness detection on re-runs since we're already re-running failed tests
  if (env.RUN_ATTEMPT === 1) {
    const shouldSkipFlakinessGate = await shouldSkipFlakinessDetection();
    if (!shouldSkipFlakinessGate) {
      runFiles = applyFlakinessDetection(runFiles);
    }
  }

  // 5) Log and run the selected specs for the given shard split
  console.log(`\n🧪 Running ${runFiles.length} spec files for this given shard split (${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS}):`);
  for (const f of runFiles) {
    console.log(`  - ${f}`);
  }

  const args = [...runFiles];
  try {
    if (env.PLATFORM.toLowerCase() === 'ios') {
      console.log('\n 🍎 Running iOS tests for build type: ', env.METAMASK_BUILD_TYPE);
      await runYarn(`test:e2e:ios:${env.METAMASK_BUILD_TYPE}:ci`, args);
    } else {
      console.log('\n 🤖 Running Android tests for build type: ', env.METAMASK_BUILD_TYPE);
      await runYarn(`test:e2e:android:${env.METAMASK_BUILD_TYPE}:ci`, args);
    }
    console.log('✅ Test execution completed');
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
