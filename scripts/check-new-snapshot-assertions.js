/* eslint-disable no-console */
/* eslint-disable import/no-commonjs */

const { execFileSync } = require('node:child_process');

const SNAPSHOT_MATCHER_REGEX =
  /\.([Tt]oMatchSnapshot|toMatchInlineSnapshot|toThrowErrorMatchingSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(/g;
const TEST_FILE_REGEX = /\.test\.(js|jsx|ts|tsx)$/u;

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function fileExistsAtRevision(revision, filePath) {
  try {
    runGit(['cat-file', '-e', `${revision}:${filePath}`]);
    return true;
  } catch {
    return false;
  }
}

function readFileAtRevision(revision, filePath) {
  if (!fileExistsAtRevision(revision, filePath)) {
    return '';
  }

  return runGit(['show', `${revision}:${filePath}`]);
}

function countSnapshotMatchers(fileContents) {
  return [...fileContents.matchAll(SNAPSHOT_MATCHER_REGEX)].length;
}

function resolveBaseRevision() {
  const explicitBaseRef = process.env.SNAPSHOT_BASE_REF;
  if (explicitBaseRef) {
    return runGit(['merge-base', explicitBaseRef, 'HEAD']);
  }

  const githubBaseRef = process.env.GITHUB_BASE_REF;
  if (githubBaseRef) {
    const remoteBaseRef = `origin/${githubBaseRef}`;
    return runGit(['merge-base', remoteBaseRef, 'HEAD']);
  }

  try {
    return runGit(['merge-base', 'origin/main', 'HEAD']);
  } catch {
    return runGit(['rev-parse', 'HEAD^']);
  }
}

function getChangedTestFiles(baseRevision) {
  const changedFiles = runGit([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    `${baseRevision}...HEAD`,
  ]);

  return changedFiles
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter(Boolean)
    .filter((filePath) => TEST_FILE_REGEX.test(filePath));
}

function main() {
  const baseRevision = resolveBaseRevision();
  const changedTestFiles = getChangedTestFiles(baseRevision);
  const violations = [];

  for (const filePath of changedTestFiles) {
    const baseCount = countSnapshotMatchers(
      readFileAtRevision(baseRevision, filePath),
    );
    const headCount = countSnapshotMatchers(readFileAtRevision('HEAD', filePath));

    if (headCount > baseCount) {
      violations.push({
        addedCount: headCount - baseCount,
        baseCount,
        filePath,
        headCount,
      });
    }
  }

  if (violations.length === 0) {
    console.log('No new snapshot assertions detected in changed test files.');
    return;
  }

  console.error('New snapshot assertions detected in changed test files:');

  for (const violation of violations) {
    console.error(
      `- ${violation.filePath}: ${violation.baseCount} -> ${violation.headCount} (${violation.addedCount} new)`,
    );
  }

  console.error(
    '\nUse explicit behavioral assertions instead of adding new snapshot matchers.',
  );
  process.exit(1);
}

main();
