import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const BASE_DIR = './e2e/specs';
const CHANGED_FILES_DIR = 'changed-files';

function readEnv(name, defaultValue = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? defaultValue : value;
}

function isSpecFile(filePath) {
  return (filePath.endsWith('.spec.js') || filePath.endsWith('.spec.ts')) &&
    !filePath.split(path.sep).includes('quarantine');
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
  for (const filePath of walk(resolvedBase)) {
    if (!isSpecFile(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(tag)) {
      // Return relative paths similar to the bash script output
      results.push(path.relative(process.cwd(), filePath));
    }
  }
  results.sort((a, b) => a.localeCompare(b));
  return Array.from(new Set(results));
}

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

function getGroupKey(filePath) {
  // Normalize and strip -retry-N suffix before .spec.ext
  const normalized = normalizePathForCompare(filePath);
  const match = normalized.match(/^(.*?)(?:-retry-\d+)?\.spec\.(ts|js)$/);
  if (!match) return normalized;
  const base = match[1];
  const ext = match[2];
  return `${base}.spec.${ext}`;
}

function getRetryIndex(filePath) {
  const normalized = normalizePathForCompare(filePath);
  const m = normalized.match(/-retry-(\d+)\.spec\.(ts|js)$/);
  if (!m) return 0; // base file has index 0
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function groupFilesByBase(files) {
  const map = new Map();
  for (const f of files) {
    const key = getGroupKey(f);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  // Sort groups by key for stable order; within group, sort by filename
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

function readPrBodyText() {
  try {
    const txtPath = path.resolve(CHANGED_FILES_DIR, 'pr-body.txt');
    if (!fs.existsSync(txtPath)) return '';
    return fs.readFileSync(txtPath, 'utf8');
  } catch {
    return '';
  }
}

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

function computeRetryFilePath(originalPath, retryIndex) {
  // originalPath must end with .spec.ts or .spec.js
  const match = originalPath.match(/^(.*)\.spec\.(ts|js)$/);
  if (!match) return null;
  const base = match[1];
  const ext = match[2];
  return `${base}-retry-${retryIndex}.spec.${ext}`;
}

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

function normalizePathForCompare(p) {
  // Ensure relative to CWD, normalized separators
  const rel = path.isAbsolute(p) ? path.relative(process.cwd(), p) : p;
  return path.normalize(rel);
}

async function main() {
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

  let allMatches = findMatchingFiles(BASE_DIR, testSuiteTag);
  if (allMatches.length === 0) {
    console.error(`❌ No test files found containing pattern: ${testSuiteTag}`);
    process.exit(1);
  }

  console.log(`\n📋 Found ${allMatches.length} matching test files in total`);

  // Flaky test detector and duplication
  const prBodyText = readPrBodyText();
  const skipQualityGate = prBodyText.includes('skip-e2e-quality-gate');
  if (!skipQualityGate) {
    const nodes = readChangedFilesJson();
    const changedSpecs = getChangedSpecFiles(nodes);
    if (changedSpecs.size > 0) {
      const matchSet = new Set(allMatches.map(normalizePathForCompare));
      for (const changed of changedSpecs) {
        const normalized = normalizePathForCompare(changed);
        if (matchSet.has(normalized)) {
          duplicateSpecFile(normalized);
        }
      }
      // Recompute matches to include the duplicated files
      allMatches = findMatchingFiles(BASE_DIR, testSuiteTag);
      console.log(`\n🧪 After duplication, total matching files: ${allMatches.length}`);
    }
  } else {
    console.log('⏭️  skip-e2e-quality-gate detected; skipping flaky duplication');
  }

  const splitFiles = computeSplitFromGroups(allMatches, splitNumber, totalSplits);

  console.log(`\n🔍 Running ${splitFiles.length} tests for split ${splitNumber} of ${totalSplits}:`);
  for (const f of splitFiles) {
    console.log(`  - ${f}`);
  }

  if (splitFiles.length === 0) {
    console.log('⚠️ No test files for this split');
    process.exit(0);
  }

  console.log(`\n🚀 Running matching tests for split ${splitNumber}...`);

  const METAMASK_BUILD_TYPE = readEnv('METAMASK_BUILD_TYPE', 'main');
  const PLATFORM = (readEnv('PLATFORM', readEnv('platform', '')) || '').toLowerCase();
  const IS_IOS = PLATFORM === 'ios';

  const extraEnv = { IGNORE_BOXLOGS_DEVELOPMENT: 'true' };
  const args = [...splitFiles];

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


