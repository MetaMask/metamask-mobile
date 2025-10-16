import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// 1) Find all specs files that include the given E2E tags
// 2) Compute sharding split (evenly across runners)
// 3) Flaky test detector mechanism in PRs (test retries)
// 4) Log and run the selected specs for the given shard split

const env = {
  TEST_SUITE_TAG: process.env.TEST_SUITE_TAG,
  BASE_DIR: process.env.BASE_DIR || './e2e/specs',
  METAMASK_BUILD_TYPE: process.env.METAMASK_BUILD_TYPE || 'main',
  PLATFORM: process.env.PLATFORM || 'ios',
  SPLIT_NUMBER: process.env.SPLIT_NUMBER || '1',
  TOTAL_SPLITS: process.env.TOTAL_SPLITS || '1',
  PR_NUMBER: process.env.PR_NUMBER || '',
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};

if (!fs.existsSync(env.BASE_DIR)) throw new Error(`❌ Base directory not found: ${env.BASE_DIR}`);
if (!env.TEST_SUITE_TAG) throw new Error('❌ Missing TEST_SUITE_TAG env var');

/**
 * Minimal GitHub GraphQL helper
 * @param {*} query - The query to run
 * @param {*} variables - The variables to pass to the query
 * @returns The data from the query
 */
async function githubGraphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors) {
    const msg = Array.isArray(data.errors) ? data.errors.map((e) => e.message).join('; ') : String(data.errors);
    throw new Error(`GraphQL errors: ${msg}`);
  }
  return data.data;
}

/**
 * Check if the flakiness detection (tests retries) should be skipped.
 * @returns True if the retries should be skipped, false otherwise
 */
async function flakinessDetectionShouldRun() {
  if (!env.PR_NUMBER) return false;
  const OWNER = env.REPOSITORY.split('/')[0];
  const REPO = env.REPOSITORY.split('/')[1];
  try {
    const data = await githubGraphql(
      `query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            labels(first: 100) { nodes { name } }
          }
        }
      }`,
      { owner: OWNER, repo: REPO, number: Number(env.PR_NUMBER) },
    );
    const labels = data?.repository?.pullRequest?.labels?.nodes || [];
    return labels.some((l) => String(l?.name).toLowerCase() === 'skip-e2e-quality-gate');
  } catch {
    console.warn(`⚠️ Failed to check if flakiness detection should run: ${e?.message || e}`);
    return false;
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
 * Split files evenly across runners
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
 * Create two retry copies of a given spec if not already present
 * @param {*} originalPath - The original path to the spec file
 */
function duplicateSpecFile(originalPath) {
  try {
    const srcPath = path.resolve(originalPath);
    if (!fs.existsSync(srcPath)) return;
    const content = fs.readFileSync(srcPath);
    for (let i = 1; i <= 2; i += 1) {
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
    console.warn(`Failed duplicating ${originalPath}: ${e?.message || e}`);
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

async function main() {

  console.log("🚀 Starting E2E tests...");

  // 1) Find all specs files that include the given E2E tags
  console.log(`Searching for E2E test files with tags: ${env.TEST_SUITE_TAG}`);
  let allMatches = findMatchingFiles(env.BASE_DIR, env.TEST_SUITE_TAG); // TODO - review this function (!).
  if (allMatches.length === 0) throw new Error(`❌ No test files found containing tags: ${env.TEST_SUITE_TAG}`);
  console.log(`\n 📋 found ${allMatches.length} matching spec files to split across ${env.TOTAL_SPLITS} shards`);


  // 2) Compute sharding split (evenly across runners)
  const splitFiles = computeShardingSplit(allMatches, env.SPLIT_NUMBER, env.TOTAL_SPLITS);
  let runFiles = [...splitFiles];
  if (runFiles.length === 0) {
    console.log(`⚠️  No test files for split ${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS} (only ${allMatches.length} test files found, but ${env.TOTAL_SPLITS} runners configured).`);
    console.log(`    💡 Tip: Reduce shard splits or add more tests to this tag ${env.TEST_SUITE_TAG}`);
    process.exit(0);
  }


  // 3) Flaky test detector mechanism in PRs (test retries)
  // const skipFlakynessDetection = await flakinessDetectionShouldRun();
  // if (!skipFlakynessDetection) {
  //   const changedSpecs = (() => {
  //     const candidates = [process.env.CHANGED_FILES];
  //     let raw = candidates.find((v) => typeof v === 'string' && v.trim().length > 0) || '';
  //     raw = raw.trim();
  //     const eqIdx = raw.indexOf('=');
  //     if (eqIdx > -1 && /changed_files/i.test(raw.slice(0, eqIdx))) {
  //       raw = raw.slice(eqIdx + 1).trim();
  //     }
  //     if (!raw) return new Set();
  //     const parts = raw.split(/\s+/g).map((p) => p.trim()).filter(Boolean);
  //     const s = new Set();
  //     for (const p of parts) {
  //       if (p.endsWith('.spec.ts') || p.endsWith('.spec.js')) s.add(path.normalize(p));
  //     }
  //     return s;
  //   })();
  //   if (changedSpecs.size > 0) {
  //     const selectedSet = new Set(splitFiles.map(normalizePathForCompare));
  //     const duplicatedSet = new Set();
  //     for (const changed of changedSpecs) {
  //       const normalized = normalizePathForCompare(changed);
  //       if (selectedSet.has(normalized)) {
  //         duplicateSpecFile(normalized);
  //         duplicatedSet.add(normalized);
  //       }
  //     }
  //     if (duplicatedSet.size > 0) {
  //       // Build final ordered run list: base, retry-1, retry-2 for duplicated files
  //       const expanded = [];
  //       for (const f of splitFiles) {
  //         const nf = normalizePathForCompare(f);
  //         if (duplicatedSet.has(nf)) {
  //           expanded.push(f);
  //           const r1 = computeRetryFilePath(nf, 1);
  //           const r2 = computeRetryFilePath(nf, 2);
  //           if (r1) expanded.push(r1);
  //           if (r2) expanded.push(r2);
  //         } else {
  //           expanded.push(f);
  //         }
  //       }
  //       runFiles = expanded;
  //       console.log(`\n🧪 After duplication (per split), total selected files: ${runFiles.length}`);
  //     }
  //   }
  // } else {
  //   console.log(`⏭️  skip-e2e-quality-gate label present in PR: ${env.PR_NUMBER}; -> skipping flakiness detection (test retries)`);
  // }

  

  // 4) Log and run the selected specs for the given shard split
  console.log(`\n🧪 Running ${runFiles.length} spec files for this given shard split (${env.SPLIT_NUMBER}/${env.TOTAL_SPLITS}):`);
  for (const f of runFiles) {
    console.log(`  - ${f}`);
  }

  const args = [...runFiles];
  try {
    if (env.PLATFORM.toLowerCase() === 'ios') {
      console.log('🍎 Running iOS tests for build type: ', env.METAMASK_BUILD_TYPE);
      await runYarn(`test:e2e:ios:${env.METAMASK_BUILD_TYPE}:ci`, args);
    } else {
      console.log('🤖 Running Android tests for build type: ', env.METAMASK_BUILD_TYPE);
      await runYarn(`test:e2e:android:${env.METAMASK_BUILD_TYPE}:ci`, args);
    }
    console.log("✅ Test execution completed");
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
