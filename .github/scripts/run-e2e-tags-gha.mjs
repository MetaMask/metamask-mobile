import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Run E2E tests by tag, optionally split across runners.
// For every spec file if the bypass quality gate is not set, duplicate them
// (base + two retries) to detect flakiness. Duplication is done per split so
// runners do not interfere with each other.

const BASE_DIR = './e2e/specs';
/**
 * Get the event payload from the GitHub event path
 * @returns The event payload
 */
function getEventPayload() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs.existsSync(eventPath)) return {};
    const raw = fs.readFileSync(eventPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const EVENT = getEventPayload();
const REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const [OWNER, REPO] = REPOSITORY.split('/');
const PR_NUMBER = EVENT?.pull_request?.number || process.env.PR_NUMBER;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

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
 * Check PR labels for skip-e2e-quality-gate
 * @returns True if the PR has the skip-e2e-quality-gate label, false otherwise
 */
async function prHasSkipE2EQualityGateLabel() {
  if (!PR_NUMBER || !OWNER || !REPO) return false;
  try {
    const data = await githubGraphql(
      `query($owner:String!, $repo:String!, $number:Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            labels(first: 100) { nodes { name } }
          }
        }
      }`,
      { owner: OWNER, repo: REPO, number: Number(PR_NUMBER) },
    );
    const labels = data?.repository?.pullRequest?.labels?.nodes || [];
    return labels.some((l) => String(l?.name).toLowerCase() === 'skip-e2e-quality-gate');
  } catch {
    return false;
  }
}

/**
 * Read an environment variable
 * @param {*} name - The name of the environment variable
 * @param {*} defaultValue - The default value to return if the environment variable is not set
 * @returns The value of the environment variable, or the default value if the environment variable is not set
 */
function readEnv(name, defaultValue = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? defaultValue : value;
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
 * Get the group key for a spec, removing any -retry-N suffix so base and retries stay together
 * @param {*} filePath - The path to the spec file
 * @returns The group key, sorted alphabetically
 */
function getGroupKey(filePath) {
  // Normalize and strip -retry-N suffix before .spec.ext
  const normalized = normalizePathForCompare(filePath);
  const match = normalized.match(/^(.*?)(?:-retry-\d+)?\.spec\.(ts|js)$/);
  if (!match) return normalized;
  const base = match[1];
  const ext = match[2];
  return `${base}.spec.${ext}`;
}

/**
 * Extract retry index from a filename; base files are index 0
 * @param {*} filePath - The path to the spec file
 * @returns The retry index, 0 if the file is not a retry file
 */
function getRetryIndex(filePath) {
  const normalized = normalizePathForCompare(filePath);
  const m = normalized.match(/-retry-(\d+)\.spec\.(ts|js)$/);
  if (!m) return 0; // base file has index 0
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Group files by base spec and sort within group as base, retry-1, retry-2
 * @param {*} files - The files to group
 * @returns The grouped files, sorted alphabetically
 */
function groupFilesByBase(files) {
  const map = new Map();
  for (const f of files) {
    const key = getGroupKey(f);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  // Sort groups by key for stable order; within group, sort by base/reties order
  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  return keys.map((k) =>
    map
      .get(k)
      .sort((a, b) => {
        const ra = getRetryIndex(a);
        const rb = getRetryIndex(b);
        if (ra !== rb) return ra - rb; // base (0) first, then retry-1, retry-2...
        return a.localeCompare(b);
      }),
  );
}

/**
 * Split by groups so a base and its retries land on the same runner
 * @param {*} files - The files to split
 * @param {*} splitNumber - The number of the split
 * @param {*} totalSplits - The total number of splits
 * @returns The split files
 */
function computeSplitFromGroups(files, splitNumber, totalSplits) {
  const groups = groupFilesByBase(files);
  const totalGroups = groups.length;
  const groupsPerSplit = ceilDiv(totalGroups, totalSplits);
  const startIndex = (splitNumber - 1) * groupsPerSplit;
  let endIndex = startIndex + groupsPerSplit;
  if (endIndex > totalGroups) endIndex = totalGroups;
  const selectedGroups = groups.slice(startIndex, endIndex);
  return selectedGroups.flat();
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

/**
 * Main function
 * @returns A promise that resolves when the main function exits
 */
async function main() {
  // 1) Read inputs
  const testSuiteTag = readEnv('TEST_SUITE_TAG');
  if (!testSuiteTag) {
    console.error('❌ Error: TEST_SUITE_TAG is required');
    process.exit(1);
  }

  const splitNumber = Number(readEnv('SPLIT_NUMBER', '1'));
  const totalSplits = Number(readEnv('TOTAL_SPLITS', '1'));

  console.log(`Searching for tests with pattern: ${testSuiteTag}`);
  console.log(`Running split ${splitNumber} of ${totalSplits}`);

  if (!fs.existsSync(BASE_DIR)) {
    console.error(`❌ Base directory not found: ${BASE_DIR}`);
    process.exit(1);
  }

  // 2) Find all specs that include the tag
  let allMatches = findMatchingFiles(BASE_DIR, testSuiteTag);
  if (allMatches.length === 0) {
    console.error(`❌ No test files found containing pattern: ${testSuiteTag}`);
    process.exit(1);
  }

  console.log(`\n📋 Found ${allMatches.length} matching test files in total`);

  // 3) Compute split BEFORE duplication so each runner only duplicates its own files
  const splitFiles = computeSplitFromGroups(allMatches, splitNumber, totalSplits);

  // 4) Flaky test detector and duplication (per-split only)
  const skipQualityGate = await prHasSkipE2EQualityGateLabel();
  let runFiles = [...splitFiles];
  if (!skipQualityGate) {
    const changedSpecs = (() => {
      const candidates = [process.env.CHANGED_FILES, process.env.changed_files, process.env.FILES_CHANGED];
      let raw = candidates.find((v) => typeof v === 'string' && v.trim().length > 0) || '';
      raw = raw.trim();
      const eqIdx = raw.indexOf('=');
      if (eqIdx > -1 && /changed_files/i.test(raw.slice(0, eqIdx))) {
        raw = raw.slice(eqIdx + 1).trim();
      }
      if (!raw) return new Set();
      const parts = raw.split(/\s+/g).map((p) => p.trim()).filter(Boolean);
      const s = new Set();
      for (const p of parts) {
        if (p.endsWith('.spec.ts') || p.endsWith('.spec.js')) s.add(path.normalize(p));
      }
      return s;
    })();
    if (changedSpecs.size > 0) {
      const selectedSet = new Set(splitFiles.map(normalizePathForCompare));
      const duplicatedSet = new Set();
      for (const changed of changedSpecs) {
        const normalized = normalizePathForCompare(changed);
        if (selectedSet.has(normalized)) {
          duplicateSpecFile(normalized);
          duplicatedSet.add(normalized);
        }
      }
      if (duplicatedSet.size > 0) {
        // Build final ordered run list: base, retry-1, retry-2 for duplicated files
        const expanded = [];
        for (const f of splitFiles) {
          const nf = normalizePathForCompare(f);
          if (duplicatedSet.has(nf)) {
            expanded.push(f);
            const r1 = computeRetryFilePath(nf, 1);
            const r2 = computeRetryFilePath(nf, 2);
            if (r1) expanded.push(r1);
            if (r2) expanded.push(r2);
          } else {
            expanded.push(f);
          }
        }
        runFiles = expanded;
        console.log(`\n🧪 After duplication (per split), total selected files: ${runFiles.length}`);
      }
    }
  } else {
    console.log('⏭️  skip-e2e-quality-gate detected; skipping flaky duplication');
  }

  // 5) Log and run the selected specs for this split
  console.log(`\n🔍 Running ${runFiles.length} tests for split ${splitNumber} of ${totalSplits}:`);
  for (const f of runFiles) {
    console.log(`  - ${f}`);
  }

  if (runFiles.length === 0) {
    console.log('⚠️ No test files for this split');
    process.exit(0);
  }

  console.log(`\n🚀 Running matching tests for split ${splitNumber}...`);

  const METAMASK_BUILD_TYPE = readEnv('METAMASK_BUILD_TYPE', 'main');
  const PLATFORM = (readEnv('PLATFORM', readEnv('platform', '')) || '').toLowerCase();
  const IS_IOS = PLATFORM === 'ios';

  const extraEnv = { IGNORE_BOXLOGS_DEVELOPMENT: 'true' };
  const args = [...runFiles];

  try {
    if (IS_IOS) {
      console.log('🍎 Running iOS tests on GitHub Actions');
      await runYarn(`test:e2e:ios-gha:${METAMASK_BUILD_TYPE}:prod`, args, extraEnv);
    } else {
      console.log('🤖 Running Android tests on GitHub Actions');
      await runYarn('test:e2e:android:run:github:qa-release', args, extraEnv);
    }
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
}

// ESM entrypoint detection
const __filename = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPath === __filename) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

export { main };


