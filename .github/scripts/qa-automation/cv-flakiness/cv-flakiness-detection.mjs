#!/usr/bin/env node
/**
 * Flakiness detection for component view tests on PRs targeting main. Mirrors
 * the Appium E2E mechanism (e2e-split-tags-shards.mjs), which duplicates each
 * changed spec as a `-retry-1` copy inside the Playwright run; Jest has no
 * per-file repeat on v29, so this job re-runs the changed `*.view.test.tsx`
 * files once per repetition with the file order shuffled and `--randomize`
 * shuffling order inside files.
 *
 * A repetition counts as clean only when Jest exits 0 with a readable JSON
 * report that contains results and no suite-level (testExecError /
 * numRuntimeErrorTestSuites) failure — a crash, hang, OOM, killed run, or
 * unparsable report fails the job with a named reason even without failing
 * test assertions. Only files that exist on the checkout are run (deleted
 * paths are reported and skipped), the list is capped at MAX_FILES, the
 * `skip-cv-flakiness-detection` label opts a PR out (fail-open: a GitHub API
 * error also skips, like the E2E mechanism), and TIME_BUDGET_MINUTES stops
 * further repetitions before they start with a warning instead of failing; a
 * Jest run killed by that budget mid-way is a warning-only budget stop too,
 * never a hang failure, so a healthy run cannot be failed by the budget
 * (Bugbot r4681021621).
 *
 * Env: CHANGED_CV_TEST_FILES space-separated changed paths; REPEAT_COUNT
 * repetitions per file (default 5); MAX_FILES cap (default 10);
 * TIME_BUDGET_MINUTES budget, 0 disables (default 60); JEST_BIN_PATH and
 * JEST_NODE_PATH override the Jest entry and Node runtime (test hooks);
 * CV_FLAKINESS_DEADLINE_MS test hook: absolute epoch-ms budget deadline;
 * GITHUB_TOKEN, REPOSITORY, PR_NUMBER label check inputs; GITHUB_OUTPUT,
 * GITHUB_STEP_SUMMARY GitHub Actions sinks.
 *
 * The repetition core (runRepetitions) is shared with the local entry point
 * cv-flakiness-local.mjs (`yarn test:view:repeat`), which repeats changed
 * component view tests with the same pattern, cap, budget, shuffling and
 * seeds — without the GitHub label check or Actions sinks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_JEST_BIN = 'node_modules/jest/bin/jest.js';
const SKIP_LABEL = 'skip-cv-flakiness-detection';
const CV_TEST_FILE_PATTERN = /\.view\.test\.(ts|tsx)$/u;
// CV_FLAKINESS_RESULTS_DIR keeps unit tests out of the repository working tree.
const RESULTS_DIR = process.env.CV_FLAKINESS_RESULTS_DIR || 'tests/results/cv-flakiness';

const env = {
  CHANGED_CV_TEST_FILES: process.env.CHANGED_CV_TEST_FILES || '',
  REPEAT_COUNT: Number(process.env.REPEAT_COUNT || 5),
  MAX_FILES: Number(process.env.MAX_FILES || 10),
  TIME_BUDGET_MINUTES: Number(process.env.TIME_BUDGET_MINUTES ?? 60),
  JEST_BIN_PATH: process.env.JEST_BIN_PATH || DEFAULT_JEST_BIN,
  TEST_OS: process.env.TEST_OS || 'ios',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
};

/** Repository-relative rendering of an absolute path for logs and summaries. */
export function displayPath(absolutePath) {
  const relative = path.relative(process.cwd(), absolutePath);
  return relative || absolutePath;
}

/** Parse the changed-file list into deduplicated, sorted absolute CV test paths. */
export function parseChangedCvTestFiles(raw) {
  const files = new Set();
  for (const entry of String(raw || '')
    .split(/\s+/g)
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)) {
    if (CV_TEST_FILE_PATTERN.test(entry)) {
      files.add(path.resolve(entry.replace(/\\/g, '/')));
    }
  }
  return [...files].sort();
}

/** Split parsed paths into files present on the checkout and missing (deleted) ones. */
export function filterExistingFiles(files, existsFn = (file) => fs.existsSync(file)) {
  const existing = [];
  const missing = [];
  for (const file of files) {
    if (existsFn(file)) existing.push(file);
    else missing.push(file);
  }
  return { existing, missing };
}

/** Parse a changed-file list, drop deleted paths and cap it; callers log what was dropped. */
export function selectFilesToRepeat(raw, maxFiles) {
  const { existing, missing } = filterExistingFiles(parseChangedCvTestFiles(raw));
  return { kept: existing.slice(0, maxFiles), missing, dropped: existing.slice(maxFiles) };
}

/** Deterministic seeded Fisher-Yates shuffle, so a failing repetition's order can be reproduced. */
export function shuffleWithSeed(items, seed) {
  const shuffled = [...items];
  // mulberry32 — small, deterministic, good enough for ordering.
  let state = seed >>> 0;
  const nextRandom = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + (Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Build the Jest invocation for one repetition (paths in run order). */
export function buildJestCommand(files, { seed, outputFile }) {
  return {
    // JEST_NODE_PATH overrides the Node runtime (test hook for spawn failures).
    command: process.env.JEST_NODE_PATH || process.execPath,
    args: [
      env.JEST_BIN_PATH,
      '--config',
      'jest.config.view.js',
      '--no-watchman',
      '--silent',
      '--coverage=false',
      '--forceExit',
      '--ci',
      '--runTestsByPath',
      '--json',
      '--outputFile',
      outputFile,
      '--randomize',
      '--seed',
      String(seed),
      ...files,
    ],
  };
}

/** Parsed Jest JSON report: assertions, suites that failed to run (testExecError), and the runtime-error count. */
export function parseJestReport(jsonPath) {
  const suites = [];
  const crashedSuites = [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (error) {
    return {
      suites,
      crashedSuites,
      runtimeErrorSuites: 0,
      suitesFound: 0,
      unreadable: String(error?.message || error),
    };
  }
  for (const result of parsed?.testResults || []) {
    const file = result?.name ? path.resolve(result.name) : '';
    const execError = result?.testExecError;
    if (execError) {
      crashedSuites.push({ file, message: String(execError?.message || execError) });
    }
    for (const assertion of result?.assertionResults || []) {
      suites.push({
        file,
        fullName: String(assertion?.fullName || assertion?.title || ''),
        status: String(assertion?.status || ''),
        failureMessages: (assertion?.failureMessages || []).map(String),
      });
    }
  }
  return {
    suites,
    crashedSuites,
    runtimeErrorSuites: Number(parsed?.numRuntimeErrorTestSuites || 0),
    suitesFound: (parsed?.testResults || []).length,
  };
}

/** Skip signal, mirroring e2e-split-tags-shards: non-PR runs, API errors, or the skip label (fail-open). */
async function shouldSkipFlakinessDetection() {
  if (!env.PR_NUMBER) return true;
  const [owner, repo] = env.REPOSITORY.split('/');
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'metamask-mobile-ci',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query($owner:String!, $repo:String!, $number:Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) { labels(first: 100) { nodes { name } } }
          }
        }`,
        variables: { owner, repo, number: Number(env.PR_NUMBER) },
      }),
    });
    if (!response.ok) {
      console.error(`❌ GitHub API call failed: ${response.status} ${response.statusText}`);
      return true;
    }
    const data = await response.json();
    if (data.errors) {
      console.error(`❌ GitHub GraphQL errors: ${data.errors.map((e) => e.message).join('; ')}`);
      return true;
    }
    const labels = data?.data?.repository?.pullRequest?.labels?.nodes || [];
    const labelFound = labels.some((label) => String(label?.name).toLowerCase() === SKIP_LABEL);
    if (labelFound) {
      console.log(`⏭️  Found "${SKIP_LABEL}" label → SKIPPING flakiness detection`);
    }
    return labelFound;
  } catch (error) {
    console.error(`❌ GitHub API call failed: ${error?.message || error}`);
    return true;
  }
}

function appendGithubOutput(key, value) {
  if (!env.GITHUB_OUTPUT) return;
  fs.appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

function appendSummary(lines) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

function markSkipped(summaryLine) {
  appendGithubOutput('completed_iterations', '0');
  appendGithubOutput('budget_exhausted', 'false');
  appendGithubOutput('status', 'skipped');
  appendSummary(['### Component view flakiness detection', '', summaryLine]);
}

/** Every failure in one repetition — assertions plus crashes, unreadable reports and suite-level errors. Pure: callers decide how to surface them. */
export function collectIterationFailures(iteration, run, report, { budgetKilled = false } = {}) {
  const found = [];
  for (const suite of report.suites) {
    if (suite.status !== 'failed') continue;
    found.push({ kind: 'assertion', file: suite.file, fullName: suite.fullName });
  }
  for (const crashed of report.crashedSuites) {
    const reason = `test suite failed to run (${summarizeMessage(crashed.message)})`;
    found.push({ kind: 'crash', file: crashed.file, reason });
  }
  const unnamedRuntimeErrors = report.runtimeErrorSuites - report.crashedSuites.length;
  if (unnamedRuntimeErrors > 0) {
    const reason = `${unnamedRuntimeErrors} test suite(s) hit a runtime error that the report does not name`;
    found.push({ kind: 'runtime-errors', reason });
  }

  // A kill at the spawn timeout with a finite deadline is the time budget
  // cutting a healthy repetition short, not a hang: it is handled as a budget
  // stop by the caller and must not become a failure (Bugbot r4681021621).
  const crashReason = budgetKilled ? '' : describeCleanRunGap(run, report);
  if (crashReason && found.length === 0) {
    found.push({ kind: 'clean-run', reason: crashReason });
  }
  return found;
}

/** Why a repetition did not end cleanly, independent of parsed assertions; empty when clean. */
function describeCleanRunGap(run, report) {
  if (run.error?.code === 'ETIMEDOUT' || run.signal === 'SIGTERM') {
    // spawnSync reports its own timeout as ETIMEDOUT + SIGTERM; SIGTERM has no other source here.
    return 'Jest was aborted (SIGTERM) after exceeding the remaining time budget';
  }
  if (run.signal) return `Jest was terminated by signal ${run.signal}`;
  if (run.error) return `Jest could not be started (${run.error.code || run.error.message})`;
  if (report.unreadable) {
    return `Jest exited with status ${run.status} and its JSON report is missing or unparsable (${report.unreadable})`;
  }
  if (report.suitesFound === 0) {
    return `Jest exited with status ${run.status} and its JSON report contains no test results`;
  }
  if (run.status !== 0) {
    return 'Jest exited with a non-zero status and no failing test assertion was parsed from its report';
  }
  return '';
}

/** First line of a Jest error message, for annotations and summaries. */
function summarizeMessage(message) {
  return String(message || 'unknown error').split('\n')[0].slice(0, 200);
}
/** Budget deadline: the CV_FLAKINESS_DEADLINE_MS test hook wins over now + minutes; Infinity disables. */
export function resolveDeadline(minutes) {
  const deadlineOverride = Number(process.env.CV_FLAKINESS_DEADLINE_MS || '');
  if (Number.isFinite(deadlineOverride) && deadlineOverride > 0) return deadlineOverride;
  if (!Number.isFinite(minutes) || minutes <= 0) return Number.POSITIVE_INFINITY;
  return Date.now() + minutes * 60000;
}

/**
 * Shared repetition core behind the CI job and the local `yarn test:view:repeat`
 * entry point: repeats `files` once per repetition with the file order shuffled
 * and Jest `--randomize`, honouring the time budget. A repetition killed at the
 * spawn timeout with a finite deadline is a warning-only budget stop — never a
 * failure, so a healthy run cannot be failed by the budget (Bugbot r4681021621).
 *
 * Reports each repetition through `onIteration` and returns everything the
 * callers need for their summaries. With `stopOnFirstFailure` (local mode) the
 * loop stops at the first failing repetition.
 *
 * @param {string[]} files Absolute component view test paths to repeat.
 * @param {{ repeatCount: number, deadlineMs: number, stopOnFirstFailure?: boolean,
 *           onIteration?: (result: {
 *             iteration: number, seed: number, files: string[],
 *             verdict: 'passed' | 'failed' | 'stopped', durationSeconds: number,
 *             failures: object[], run: object, report: object,
 *           }) => void }} options
 */
export function runRepetitions(
  files,
  { repeatCount, deadlineMs, stopOnFirstFailure = false, onIteration = () => {} } = {},
) {
  const iterations = [];
  const failures = [];
  const perFileRuns = new Map(files.map((file) => [file, { passed: 0, failed: 0 }]));
  let completedIterations = 0;
  let budgetExhausted = false;

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  for (let iteration = 1; iteration <= repeatCount; iteration += 1) {
    if (Date.now() > deadlineMs) {
      budgetExhausted = true;
      console.log(
        `⏱️  Time budget (${env.TIME_BUDGET_MINUTES} min) exhausted after ${completedIterations} iteration(s).`,
      );
      break;
    }

    const seed = Math.floor(Math.random() * 2 ** 31);
    const outputFile = path.join(RESULTS_DIR, `iteration-${iteration}.json`);
    // A killed Jest run leaves no report; clear any previous run's stale file
    // for this slot so a killed repetition is never judged from it.
    fs.rmSync(outputFile, { force: true });
    const orderedFiles = shuffleWithSeed(files, seed);
    const { command, args } = buildJestCommand(orderedFiles, { seed, outputFile });
    const iterationStartedAt = Date.now();

    console.log(`\n🔁 Iteration ${iteration}/${repeatCount} (seed ${seed})…`);
    // Safety net so a hung Jest run cannot outlive the budget on its own:
    // the remaining budget (at least 1s), or 30 minutes when it is disabled.
    const timeoutMs = Number.isFinite(deadlineMs)
      ? Math.max(deadlineMs - Date.now(), 1000)
      : 30 * 60000;
    const run = spawnSync(command, args, {
      env: { ...process.env, TEST_OS: env.TEST_OS },
      encoding: 'utf8',
      timeout: timeoutMs,
    });
    const durationSeconds = Math.round((Date.now() - iterationStartedAt) / 1000);

    const report = parseJestReport(outputFile);
    // A kill that lasted the full spawn timeout with a finite deadline is the
    // budget cutting the repetition short; anything earlier is not budget-driven.
    const budgetKilled =
      Number.isFinite(deadlineMs) &&
      (run.error?.code === 'ETIMEDOUT' || run.signal === 'SIGTERM') &&
      Date.now() - iterationStartedAt >= timeoutMs - 1000;
    const iterationFailures = collectIterationFailures(iteration, run, report, { budgetKilled });
    const stopped = budgetKilled && iterationFailures.length === 0;
    const iterationPassed = !stopped && iterationFailures.length === 0;

    if (!stopped) {
      completedIterations += 1;
      for (const file of orderedFiles) {
        const fileSuites = report.suites.filter((suite) => suite.file === file);
        const fileStat = perFileRuns.get(file);
        if (!fileStat) continue;
        if (fileSuites.length === 0) {
          // The suite never reported (crash, spawn timeout): count it as failed
          // so the per-file table cannot overstate confidence.
          fileStat.failed += 1;
        } else if (fileSuites.some((suite) => suite.status === 'failed')) {
          fileStat.failed += 1;
        } else {
          fileStat.passed += 1;
        }
      }
    }

    failures.push(...iterationFailures.map((failure) => ({ iteration, ...failure })));
    const verdict = stopped ? 'stopped' : iterationPassed ? 'passed' : 'failed';
    iterations.push({
      iteration,
      seed,
      fileCount: orderedFiles.length,
      verdict,
      durationSeconds,
      files: orderedFiles,
    });
    onIteration({
      iteration,
      seed,
      files: orderedFiles,
      verdict,
      durationSeconds,
      failures: iterationFailures,
      run,
      report,
    });

    if (stopped) {
      // The budget was spent killing this repetition; no further one can run.
      budgetExhausted = true;
      console.log(
        `⏱️  Repetition ${iteration} was stopped by the remaining time budget; treated as a budget stop, not a failure.`,
      );
      break;
    }
    if (!iterationPassed && stopOnFirstFailure) break;
  }

  return { iterations, failures, perFileRuns, completedIterations, budgetExhausted };
}

/** CI-side per-repetition reporting: ::error annotations and the console verdict lines. */
function reportCiIteration({ iteration, verdict, failures: iterationFailures, durationSeconds, run, report }) {
  for (const failure of iterationFailures) {
    if (failure.kind === 'assertion') {
      console.error(
        `::error file=${displayPath(failure.file)}::CV flakiness detected (iteration ${iteration}): ${displayPath(failure.file)} › ${failure.fullName}`,
      );
    } else if (failure.kind === 'crash') {
      console.error(
        `::error file=${displayPath(failure.file)}::Repetition ${iteration}: ${failure.reason}`,
      );
    } else if (failure.kind === 'runtime-errors') {
      console.error(`::error::Repetition ${iteration}: ${failure.reason}`);
    } else {
      console.error(
        `::error::Repetition ${iteration} failed without any failing test assertion: ${failure.reason}`,
      );
    }
  }
  if (verdict === 'failed') {
    console.error(
      `❌ Iteration ${iteration} failed (${iterationFailures.length} failure(s)); continuing with remaining repetitions.`,
    );
    if (!report.suitesFound && run.stderr) {
      console.error(`Jest output:\n${run.stderr.split('\n').slice(-40).join('\n')}`);
    }
  } else if (verdict === 'passed') {
    console.log(`✅ Iteration ${iteration} passed in ${durationSeconds}s.`);
  }
}

const ITERATION_VERDICT_LABELS = {
  passed: '✅ passed',
  failed: '❌ failed',
  stopped: '⏱️ stopped by budget',
};

async function main() {
  if (!Number.isInteger(env.REPEAT_COUNT) || env.REPEAT_COUNT < 1) {
    throw new Error(`Invalid REPEAT_COUNT: ${process.env.REPEAT_COUNT}`);
  }
  if (!Number.isInteger(env.MAX_FILES) || env.MAX_FILES < 1) {
    throw new Error(`Invalid MAX_FILES: ${process.env.MAX_FILES}`);
  }
  if (!fs.existsSync('jest.config.view.js')) {
    throw new Error('❌ jest.config.view.js not found — run from the repository root');
  }

  const startedAt = Date.now();
  const { kept, missing, dropped } = selectFilesToRepeat(env.CHANGED_CV_TEST_FILES, env.MAX_FILES);

  for (const file of missing) console.log(`ℹ️  Skipping deleted component view test file: ${displayPath(file)}`);
  for (const file of dropped) {
    console.log(
      `::warning::CV flakiness detection capped at ${env.MAX_FILES} files; not repeating: ${displayPath(file)}`,
    );
  }
  appendGithubOutput('cv_files_to_repeat', kept.map(displayPath).join(' '));
  appendGithubOutput('repeat_count', String(env.REPEAT_COUNT));

  if (kept.length === 0) {
    console.log('ℹ️  No component view test files changed — nothing to repeat.');
    markSkipped(
      `No component view test files changed — nothing repeated (${missing.length} deleted path(s) ignored).`,
    );
    return;
  }

  if (await shouldSkipFlakinessDetection()) {
    markSkipped(
      `Skipped (${SKIP_LABEL} label, non-PR run, or GitHub API unavailable). ` +
        `${kept.length} component view test file(s) would have been repeated ${env.REPEAT_COUNT}×:` +
        kept.map((file) => ` \`${displayPath(file)}\``).join(''),
    );
    return;
  }

  const deadlineMs = resolveDeadline(env.TIME_BUDGET_MINUTES);
  const summaryLines = [
    '### Component view flakiness detection',
    '',
    `Detected **${kept.length}** changed component view test file(s); repeating **${env.REPEAT_COUNT}×** each (cap ${env.MAX_FILES}), \`${env.TEST_OS}\` like the component view gate.`,
    '',
    ...kept.map((file) => `- \`${displayPath(file)}\``),
    '',
    '| Iteration | Seed | Files | Result | Duration |',
    '| --- | --- | --- | --- | --- |',
  ];

  const results = runRepetitions(kept, {
    repeatCount: env.REPEAT_COUNT,
    deadlineMs,
    onIteration: reportCiIteration,
  });

  appendGithubOutput('completed_iterations', String(results.completedIterations));
  appendGithubOutput('budget_exhausted', results.budgetExhausted ? 'true' : 'false');
  const status =
    results.failures.length > 0 ? 'failed' : results.budgetExhausted ? 'budget-limited' : 'passed';
  appendGithubOutput('status', status);

  for (const row of results.iterations) {
    summaryLines.push(
      `| ${row.iteration} | ${row.seed} | ${row.fileCount} | ${ITERATION_VERDICT_LABELS[row.verdict]} | ${row.durationSeconds}s |`,
    );
  }
  summaryLines.push(
    '',
    `**Total: ${results.completedIterations}/${env.REPEAT_COUNT} iterations in ${Math.round((Date.now() - startedAt) / 1000)}s.**`,
    '',
    '| File | Runs | Failing runs |',
    '| --- | --- | --- |',
    ...[...results.perFileRuns.entries()].map(
      ([file, stat]) =>
        `| \`${displayPath(file)}\` | ${stat.passed + stat.failed} | ${stat.failed} |`,
    ),
  );

  const notRepeated = [
    ...missing.map((file) => `- deleted: \`${displayPath(file)}\``),
    ...dropped.map((file) => `- capped at ${env.MAX_FILES} files: \`${displayPath(file)}\``),
  ];
  if (notRepeated.length > 0) {
    summaryLines.push('', '### Not repeated', '', ...notRepeated);
  }

  if (results.budgetExhausted) {
    const underRepetition = kept.filter(
      (file) =>
        (results.perFileRuns.get(file)?.passed || 0) +
          (results.perFileRuns.get(file)?.failed || 0) <
        env.REPEAT_COUNT,
    );
    summaryLines.push(
      '',
      `> ⚠️ Time budget (${env.TIME_BUDGET_MINUTES} min) hit before ${env.REPEAT_COUNT} repetitions; not repeated further:`,
      ...underRepetition.map((file) => `- \`${displayPath(file)}\``),
    );
    console.log(
      `::warning::CV flakiness detection stopped at the ${env.TIME_BUDGET_MINUTES}-minute budget; ${underRepetition.length} file(s) did not get all ${env.REPEAT_COUNT} repetitions.`,
    );
  }

  if (results.failures.length > 0) {
    summaryLines.push(
      '',
      '### Failures',
      '',
      ...results.failures.map((failure) =>
        failure.fullName
          ? `- \`${displayPath(failure.file)} › ${failure.fullName}\` — iteration ${failure.iteration}`
          : `- ${failure.reason} — iteration ${failure.iteration}`,
      ),
    );
  }

  appendSummary(summaryLines);

  if (results.failures.length > 0) {
    const failedFileCount = [...results.perFileRuns.values()].filter(
      (stat) => stat.failed > 0,
    ).length;
    throw new Error(
      `Component view flakiness detected: ${failedFileCount} file(s), ${results.failures.length} failing run(s) (failing test assertions and Jest crashes) across ${results.completedIterations} iterations.`,
    );
  }
}

if (process.argv[1]?.endsWith('cv-flakiness-detection.mjs')) {
  main().catch((error) => {
    console.error(`\n❌ ${error?.message || error}`);
    appendGithubOutput('status', 'failed');
    process.exit(1);
  });
}
