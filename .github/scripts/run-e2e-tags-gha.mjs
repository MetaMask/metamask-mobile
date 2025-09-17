import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Run E2E tests by tag, optionally split across runners.
// If certain spec files were ADDED or MODIFIED in the PR, duplicate them per split
// (base + two retries) to detect flakiness. Duplication is done per split so
// runners do not interfere with each other.

const BASE_DIR = './e2e/specs';
const CHANGED_FILES_DIR = 'changed-files';

function readEnv(name, defaultValue = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? defaultValue : value;
}

// True for Detox test specs that are not quarantined
function isSpecFile(filePath) {
  return (filePath.endsWith('.spec.js') || filePath.endsWith('.spec.ts')) &&
    !filePath.split(path.sep).includes('quarantine');
}

// Synchronous generator to recursively walk a directory
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

// Find all spec files that contain the provided tag string
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
 * @returns 
 */
function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

// Group key for a spec, removing any -retry-N suffix so base and retries stay together
/**
 * Get the group key for a spec, removing any -retry-N suffix so base and retries stay together
 * @param {*} filePath - The path to the spec file
 * @returns The group key
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

// Extract retry index from a filename; base files are index 0
/**
 * Extract retry index from a filename; base files are index 0
 * @param {*} filePath - The path to the spec file
 * @returns The retry index
 */
function getRetryIndex(filePath) {
  const normalized = normalizePathForCompare(filePath);
  const m = normalized.match(/-retry-(\d+)\.spec\.(ts|js)$/);
  if (!m) return 0; // base file has index 0
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

// Group files by base spec and sort within group as base, retry-1, retry-2
/**
 * Group files by base spec and sort within group as base, retry-1, retry-2
 * @param {*} files - The files to group
 * @returns The grouped files
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

// Split by groups so a base and its retries land on the same runner
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

// Spawn a yarn script with inherited stdio
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

// Read the PR changed files JSON written by git-diff-default-branch.mjs
/**
 * Read the PR changed files JSON written by git-diff-default-branch.mjs
 * @returns The changed files
 */
function readChangedFilesJson() {
  try {
    const jsonPath = path.resolve(CHANGED_FILES_DIR, 'changed-files.json');
    if (!fs.existsSync(jsonPath)) return [];
    const raw = fs.readFileSync(jsonPath, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Read the PR body/labels text (used to detect skip-e2e-quality-gate)
/**
 * Read the PR body/labels text (used to detect skip-e2e-quality-gate)
 * @returns The PR body/labels text
 */
function readPrBodyText() {
  try {
    const txtPath = path.resolve(CHANGED_FILES_DIR, 'pr-body.txt');
    if (!fs.existsSync(txtPath)) return '';
    return fs.readFileSync(txtPath, 'utf8');
  } catch {
    return '';
  }
}

// Filter only ADDED/MODIFIED spec files from the PR changed files list
/**
 * Filter only ADDED/MODIFIED spec files from the PR changed files list
 * @param {*} nodes - The nodes to filter
 * @returns The changed spec files
 */
function getChangedSpecFiles(nodes) {
  const results = new Set();
  for (const node of nodes || []) {
    const filePath = node?.path;
    const changeType = node?.changeType;
    if (!filePath || !changeType) continue;
    if (changeType !== 'ADDED' && changeType !== 'MODIFIED') continue;
    if (!filePath.endsWith('.spec.ts') && !filePath.endsWith('.spec.js')) continue;
    // Normalize to repo-relative path from CWD
    results.add(path.normalize(filePath));
  }
  return results;
}

// Derive the retry filename for a given spec: base -> base-retry-N
/**
 * Derive the retry filename for a given spec: base -> base-retry-N
 * @param {*} originalPath - The original path to the spec file
 * @param {*} retryIndex - The retry index
 * @returns The retry filename
 */
function computeRetryFilePath(originalPath, retryIndex) {
  // originalPath must end with .spec.ts or .spec.js
  const match = originalPath.match(/^(.*)\.spec\.(ts|js)$/);
  if (!match) return null;
  const base = match[1];
  const ext = match[2];
  return `${base}-retry-${retryIndex}.spec.${ext}`;
}

// Create two retry copies of a given spec if not already present
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

// Normalize a path (repo-relative) for comparisons
/**
 * Normalize a path (repo-relative) for comparisons
 * @param {*} p - The path to normalize
 * @returns The normalized path
 */
function normalizePathForCompare(p) {
  // Ensure relative to CWD, normalized separators
  const rel = path.isAbsolute(p) ? path.relative(process.cwd(), p) : p;
  return path.normalize(rel);
}

/**
 * Main function
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
  const prBodyText = readPrBodyText();
  const skipQualityGate = prBodyText.includes('skip-e2e-quality-gate');
  let runFiles = [...splitFiles];
  if (!skipQualityGate) {
    const nodes = readChangedFilesJson();
    const changedSpecs = getChangedSpecFiles(nodes);
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


