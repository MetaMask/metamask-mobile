#!/usr/bin/env node
/**
 * Local companion to cv-flakiness-detection.mjs: `yarn test:view:repeat`
 * repeats component view tests (`*.view.test.tsx` / `.ts`) the way the CI
 * flakiness job does — same file pattern, MAX_FILES cap, time budget,
 * per-repetition file-order shuffle and Jest `--randomize` — so a flake
 * surfaces before a PR is opened. No GitHub label check, no Actions sinks.
 *
 * Usage:
 *   yarn test:view:repeat [File.view.test.tsx ...]
 *
 * Files come from the arguments, or by default from the files changed vs
 * origin/main: the committed diff plus uncommitted and untracked changes, so
 * work-in-progress view tests are repeated before they are committed. The run
 * stops at the first failing repetition, prints its seed and failing tests,
 * and exits non-zero; the seed and file order reproduce the failing run
 * exactly.
 *
 * Env: REPEAT_COUNT repetitions (default 2); MAX_FILES cap (default 10);
 * TIME_BUDGET_MINUTES budget, 0 disables (default 60); HANG_TIMEOUT_MINUTES
 * per-repetition hang limit, 0 disables (default 20); BASE_REF git base
 * (default origin/main); TEST_OS platform passed to Jest (default ios).
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  displayPath,
  resolveDeadline,
  runRepetitions,
  selectFilesToRepeat,
} from './cv-flakiness-detection.mjs';

const LOCAL_DEFAULT_REPEAT_COUNT = 2;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_TIME_BUDGET_MINUTES = 60;
const DEFAULT_BASE_REF = 'origin/main';

/**
 * Raw changed-path list for the default (no-argument) mode: the committed diff
 * against the base ref, the uncommitted changes, and the untracked files
 * (`--exclude-standard` keeps ignored paths like tests/results out), so
 * work-in-progress view tests are repeated before they are committed.
 */
export function listChangedFiles({
  baseRef = process.env.BASE_REF || DEFAULT_BASE_REF,
  execFile = execFileSync,
} = {}) {
  const mergeBase = execFile('git', ['merge-base', baseRef, 'HEAD'], { encoding: 'utf8' }).trim();
  const committed = execFile('git', ['diff', '--name-only', mergeBase, 'HEAD'], {
    encoding: 'utf8',
  });
  const uncommitted = execFile('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
  const untracked = execFile('git', ['ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return `${committed}\n${uncommitted}\n${untracked}`;
}

function listChangedFilesOrThrow() {
  const baseRef = process.env.BASE_REF || DEFAULT_BASE_REF;
  try {
    return listChangedFiles({ baseRef });
  } catch (error) {
    throw new Error(
      `Could not list files changed vs ${baseRef} with git (${error?.message || error}). ` +
        'Fetch the base branch, or pass component view test files as arguments: ' +
        'yarn test:view:repeat path/to/File.view.test.tsx',
    );
  }
}

/** Local per-repetition reporting: verdict lines, the failing seed, and its failing tests. */
function reportLocalIteration({
  iteration,
  seed,
  files,
  verdict,
  durationSeconds,
  failures: iterationFailures,
}) {
  if (verdict === 'passed') {
    console.log(`✅ Iteration ${iteration} passed in ${durationSeconds}s (seed ${seed}).`);
    return;
  }
  if (verdict !== 'failed') return;
  console.error(
    `❌ Iteration ${iteration} (seed ${seed}) failed with ${iterationFailures.length} failure(s); ` +
      'stopping at the first failing repetition.',
  );
  for (const failure of iterationFailures) {
    if (failure.fullName) {
      console.error(`   - ${displayPath(failure.file)} › ${failure.fullName}`);
    } else if (failure.file) {
      console.error(`   - ${displayPath(failure.file)} — ${failure.reason}`);
    } else {
      console.error(`   - ${failure.reason}`);
    }
  }
  console.error(
    '   Re-run this exact repetition (same seed and file order) with:\n' +
      `     yarn jest -c jest.config.view.js --no-watchman --runTestsByPath --randomize --seed ${seed} ` +
      files.map((file) => displayPath(file)).join(' '),
  );
}

function localMain() {
  if (!fs.existsSync('jest.config.view.js')) {
    throw new Error('❌ jest.config.view.js not found — run from the repository root');
  }
  const repeatCount = Number(process.env.REPEAT_COUNT || LOCAL_DEFAULT_REPEAT_COUNT);
  if (!Number.isInteger(repeatCount) || repeatCount < 1) {
    throw new Error(`Invalid REPEAT_COUNT: ${process.env.REPEAT_COUNT}`);
  }
  const maxFiles = Number(process.env.MAX_FILES || DEFAULT_MAX_FILES);
  if (!Number.isInteger(maxFiles) || maxFiles < 1) {
    throw new Error(`Invalid MAX_FILES: ${process.env.MAX_FILES}`);
  }

  const fileArgs = process.argv.slice(2).join(' ');
  const { kept, missing, dropped } = selectFilesToRepeat(
    fileArgs.trim() ? fileArgs : listChangedFilesOrThrow(),
    maxFiles,
  );
  for (const file of missing) console.log(`ℹ️  Skipping deleted component view test file: ${displayPath(file)}`);
  for (const file of dropped) {
    console.log(`⚠️  Capped at ${maxFiles} files; not repeating: ${displayPath(file)}`);
  }

  if (kept.length === 0) {
    console.log(
      fileArgs.trim()
        ? 'ℹ️  No component view test files among the arguments — nothing to repeat.'
        : `ℹ️  No component view test files changed vs ${process.env.BASE_REF || DEFAULT_BASE_REF} — nothing to repeat.`,
    );
    return;
  }

  console.log(
    `🔁 Repeating ${kept.length} component view test file(s) ${repeatCount}× (cap ${maxFiles}):` +
      kept.map((file) => `\n   - ${displayPath(file)}`).join(''),
  );

  const startedAt = Date.now();
  const results = runRepetitions(kept, {
    repeatCount,
    deadlineMs: resolveDeadline(Number(process.env.TIME_BUDGET_MINUTES ?? DEFAULT_TIME_BUDGET_MINUTES)),
    stopOnFirstFailure: true,
    onIteration: reportLocalIteration,
  });

  if (results.failures.length > 0) {
    const failingRun = results.iterations.find((row) => row.verdict === 'failed');
    throw new Error(
      `Component view flakiness detected: ${results.failures.length} failure(s) in repetition ${failingRun.iteration} (seed ${failingRun.seed}).`,
    );
  }

  console.log(
    `\n${results.completedIterations}/${repeatCount} repetition(s) completed in ${Math.round((Date.now() - startedAt) / 1000)}s.`,
  );

  if (results.budgetExhausted) {
    const underRepetition = kept.filter(
      (file) =>
        (results.perFileRuns.get(file)?.passed || 0) +
          (results.perFileRuns.get(file)?.failed || 0) <
        repeatCount,
    );
    console.log(
      `⚠️  Time budget hit before ${repeatCount} repetitions; ${underRepetition.length} file(s) did not get all ${repeatCount} repetitions.`,
    );
  }
}

if (process.argv[1]?.endsWith('cv-flakiness-local.mjs')) {
  try {
    localMain();
  } catch (error) {
    console.error(`\n❌ ${error?.message || error}`);
    process.exit(1);
  }
}
