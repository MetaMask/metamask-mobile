#!/usr/bin/env node
/**
 * Flakiness detection for component view tests on PRs targeting main.
 *
 * Mirrors the Appium E2E mechanism (e2e-split-tags-shards.mjs): a PR that adds
 * or modifies test files gets them re-run several times so a flake surfaces
 * before merge. Where E2E duplicates each changed spec as a `-retry-1` copy
 * inside the existing Playwright run, Jest has no per-file repeat on v29, so
 * this job re-runs the changed `*.view.test.tsx` files as its own Jest
 * invocation once per repetition, with the file order shuffled per repetition
 * and `--randomize` shuffling test order inside each file.
 *
 * Behaviour: only files that exist on the checkout are run (deleted paths are
 * reported and skipped), the list is capped at MAX_FILES, the
 * `skip-cv-flakiness-detection` label opts a PR out (fail-open: a GitHub API
 * error also skips, like the E2E mechanism), a failure in any repetition fails
 * the job and names every failing test, and TIME_BUDGET_MINUTES stops further
 * repetitions with a warning instead of failing — a budget artifact must not
 * block a merge.
 *
 * Env:
 *   CHANGED_CV_TEST_FILES   Space-separated changed component view test paths.
 *   REPEAT_COUNT            Repetitions per file (default 5).
 *   MAX_FILES               Cap on detected files (default 10).
 *   TIME_BUDGET_MINUTES     Cap on total repetition time, 0 disables (default 60).
 *   JEST_BIN_PATH           Jest entry point override (test hook).
 *   CV_FLAKINESS_DEADLINE_MS  Test hook: absolute epoch-ms budget deadline.
 *   GITHUB_TOKEN, REPOSITORY, PR_NUMBER  Label check inputs.
 *   GITHUB_OUTPUT, GITHUB_STEP_SUMMARY   GitHub Actions sinks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_REPEAT_COUNT = 5;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_TIME_BUDGET_MINUTES = 60;
const DEFAULT_JEST_BIN = 'node_modules/jest/bin/jest.js';
const SKIP_LABEL = 'skip-cv-flakiness-detection';
const CV_TEST_FILE_PATTERN = /\.view\.test\.(ts|tsx)$/u;
const RESULTS_DIR = 'tests/results/cv-flakiness';

const env = {
  CHANGED_CV_TEST_FILES: process.env.CHANGED_CV_TEST_FILES || '',
  REPEAT_COUNT: Number(process.env.REPEAT_COUNT || DEFAULT_REPEAT_COUNT),
  MAX_FILES: Number(process.env.MAX_FILES || DEFAULT_MAX_FILES),
  TIME_BUDGET_MINUTES: Number(
    process.env.TIME_BUDGET_MINUTES ?? DEFAULT_TIME_BUDGET_MINUTES,
  ),
  JEST_BIN_PATH: process.env.JEST_BIN_PATH || DEFAULT_JEST_BIN,
  TEST_OS: process.env.TEST_OS || 'ios',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  REPOSITORY: process.env.REPOSITORY || 'MetaMask/metamask-mobile',
  PR_NUMBER: process.env.PR_NUMBER || '',
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  GITHUB_STEP_SUMMARY: process.env.GITHUB_STEP_SUMMARY || '',
};

/** Repository-relative rendering of an absolute path for logs and summaries. */
function displayPath(absolutePath) {
  const relative = path.relative(process.cwd(), absolutePath);
  return relative || absolutePath;
}

/**
 * Parse the changed-file list down to component view test paths, normalized
 * to absolute paths so Jest report paths (also absolute) compare equal.
 * @param {string} raw Space-separated file list, possibly shell-quoted.
 * @returns {string[]} Deduplicated, sorted absolute component view test paths.
 */
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

/**
 * Split the parsed list into files present on the checkout and missing ones
 * (deleted or renamed-away paths that the PR file list still reports).
 * @param {string[]} files Parsed component view test paths.
 * @param {(file: string) => boolean} existsFn Existence probe.
 * @returns {{existing: string[], missing: string[]}}
 */
export function filterExistingFiles(
  files,
  existsFn = (file) => fs.existsSync(file),
) {
  const existing = [];
  const missing = [];
  for (const file of files) {
    if (existsFn(file)) {
      existing.push(file);
    } else {
      missing.push(file);
    }
  }
  return { existing, missing };
}

/**
 * Cap the file list so a mega-PR cannot stretch the job unboundedly.
 * @param {string[]} files Existing component view test paths.
 * @param {number} maxFiles Maximum files to run.
 * @returns {{kept: string[], dropped: string[]}}
 */
export function capFileList(files, maxFiles) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1) {
    throw new Error(`Invalid MAX_FILES: ${process.env.MAX_FILES}`);
  }
  return { kept: files.slice(0, maxFiles), dropped: files.slice(maxFiles) };
}

/**
 * Deterministic shuffle (Fisher-Yates) driven by a seed, so a failing
 * repetition's file order can be reproduced.
 * @param {string[]} items Items to shuffle.
 * @param {number} seed PRNG seed.
 * @returns {string[]} Shuffled copy.
 */
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

/**
 * Build the Jest invocation for one repetition.
 * @param {string[]} files Component view test paths in run order.
 * @param {{seed: number, outputFile: string}} options Repetition options.
 * @returns {{command: string, args: string[]}}
 */
export function buildJestCommand(files, { seed, outputFile }) {
  return {
    command: process.execPath,
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

/**
 * One repetition outcome, parsed from the Jest JSON report.
 * @param {string} jsonPath Path to the Jest JSON report.
 * @returns {{suites: {file: string, fullName: string, status: string, failureMessages: string[]}[], suitesFound: number}}
 */
export function parseJestReport(jsonPath) {
  const suites = [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (error) {
    return {
      suites,
      suitesFound: 0,
      unreadable: String(error?.message || error),
    };
  }
  for (const result of parsed?.testResults || []) {
    const file = result?.name ? path.resolve(result.name) : '';
    for (const assertion of result?.assertionResults || []) {
      suites.push({
        file,
        fullName: String(assertion?.fullName || assertion?.title || ''),
        status: String(assertion?.status || ''),
        failureMessages: (assertion?.failureMessages || []).map(String),
      });
    }
  }
  return { suites, suitesFound: (parsed?.testResults || []).length };
}

/**
 * Skip signal, mirroring shouldSkipFlakinessDetection in e2e-split-tags-shards:
 * non-PR runs, API failures, or the skip label all skip detection (fail-open).
 * @returns {Promise<boolean>}
 */
async function shouldSkipFlakinessDetection() {
  if (!env.PR_NUMBER) {
    return true;
  }
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
            pullRequest(number: $number) {
              labels(first: 100) { nodes { name } }
            }
          }
        }`,
        variables: { owner, repo, number: Number(env.PR_NUMBER) },
      }),
    });
    if (!response.ok) {
      console.error(
        `❌ GitHub API call failed: ${response.status} ${response.statusText}`,
      );
      return true;
    }
    const data = await response.json();
    if (data.errors) {
      console.error(
        `❌ GitHub GraphQL errors: ${data.errors.map((e) => e.message).join('; ')}`,
      );
      return true;
    }
    const labels = data?.data?.repository?.pullRequest?.labels?.nodes || [];
    const labelFound = labels.some(
      (label) => String(label?.name).toLowerCase() === SKIP_LABEL,
    );
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

function printTestFailures(iteration, suites) {
  const failing = suites.filter((suite) => suite.status === 'failed');
  for (const suite of failing) {
    console.error(
      `::error file=${displayPath(suite.file)}::CV flakiness detected (iteration ${iteration}): ${displayPath(suite.file)} › ${suite.fullName}`,
    );
  }
  return failing;
}

/**
 * @param {number} minutes Budget in minutes, 0 disables the cap.
 * @returns {number} Deadline in epoch milliseconds, Infinity when disabled.
 */
function resolveDeadline(minutes) {
  // CV_FLAKINESS_DEADLINE_MS is a test hook: an absolute epoch deadline the
  // budget check honors instead of deriving one from now + minutes.
  const deadlineOverride = Number(process.env.CV_FLAKINESS_DEADLINE_MS || '');
  if (Number.isFinite(deadlineOverride) && deadlineOverride > 0) {
    return deadlineOverride;
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() + minutes * 60000;
}

async function main() {
  if (!Number.isInteger(env.REPEAT_COUNT) || env.REPEAT_COUNT < 1) {
    throw new Error(`Invalid REPEAT_COUNT: ${process.env.REPEAT_COUNT}`);
  }
  if (!fs.existsSync('jest.config.view.js')) {
    throw new Error(
      '❌ jest.config.view.js not found — run from the repository root',
    );
  }

  const startedAt = Date.now();
  const parsed = parseChangedCvTestFiles(env.CHANGED_CV_TEST_FILES);
  const { existing, missing } = filterExistingFiles(parsed);
  const { kept, dropped } = capFileList(existing, env.MAX_FILES);

  for (const file of missing) {
    console.log(`ℹ️  Skipping deleted component view test file: ${displayPath(file)}`);
  }
  for (const file of dropped) {
    console.log(
      `::warning::CV flakiness detection capped at ${env.MAX_FILES} files; not repeating: ${displayPath(file)}`,
    );
  }

  appendGithubOutput('cv_files_to_repeat', kept.map(displayPath).join(' '));
  appendGithubOutput('repeat_count', String(env.REPEAT_COUNT));

  if (kept.length === 0) {
    console.log('ℹ️  No component view test files changed — nothing to repeat.');
    appendGithubOutput('completed_iterations', '0');
    appendGithubOutput('budget_exhausted', 'false');
    appendGithubOutput('status', 'skipped');
    appendSummary([
      '### Component view flakiness detection',
      '',
      `No component view test files changed — nothing repeated (${missing.length} deleted path(s) ignored).`,
    ]);
    return;
  }

  if (await shouldSkipFlakinessDetection()) {
    appendGithubOutput('completed_iterations', '0');
    appendGithubOutput('budget_exhausted', 'false');
    appendGithubOutput('status', 'skipped');
    appendSummary([
      '### Component view flakiness detection',
      '',
      `Skipped (${SKIP_LABEL} label, non-PR run, or GitHub API unavailable). ${kept.length} component view test file(s) would have been repeated ${env.REPEAT_COUNT}×:`,
      '',
      ...kept.map((file) => `- \`${displayPath(file)}\``),
    ]);
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

  const perFileRuns = new Map(kept.map((file) => [file, { passed: 0, failed: 0 }]));
  const failures = [];
  let completedIterations = 0;
  let budgetExhausted = false;

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  for (let iteration = 1; iteration <= env.REPEAT_COUNT; iteration += 1) {
    if (Date.now() > deadlineMs) {
      budgetExhausted = true;
      console.log(
        `⏱️  Time budget (${env.TIME_BUDGET_MINUTES} min) exhausted after ${completedIterations} iteration(s).`,
      );
      break;
    }

    const seed = Math.floor(Math.random() * 2 ** 31);
    const outputFile = path.join(RESULTS_DIR, `iteration-${iteration}.json`);
    const orderedFiles = shuffleWithSeed(kept, seed);
    const { command, args } = buildJestCommand(orderedFiles, { seed, outputFile });
    const iterationStartedAt = Date.now();

    console.log(`\n🔁 Iteration ${iteration}/${env.REPEAT_COUNT} (seed ${seed})…`);
    const run = spawnSync(command, args, {
      env: { ...process.env, TEST_OS: env.TEST_OS },
      encoding: 'utf8',
      // Safety net so a hung Jest run cannot outlive the budget on its own.
      timeout: Math.max(
        Number.isFinite(deadlineMs) ? deadlineMs - Date.now() : 30 * 60000,
        60000,
      ),
    });
    const durationSeconds = Math.round((Date.now() - iterationStartedAt) / 1000);

    const report = parseJestReport(outputFile);
    const failingTests = printTestFailures(iteration, report.suites);
    const iterationPassed = run.status === 0;
    completedIterations += 1;

    for (const file of orderedFiles) {
      const fileSuites = report.suites.filter((suite) => suite.file === file);
      const fileStat = perFileRuns.get(file);
      if (!fileStat) continue;
      if (fileSuites.length === 0) {
        // The suite never reported (crash, spawn timeout): count it as failed
        // so the per-file table cannot overstate confidence.
        fileStat.failed += 1;
        continue;
      }
      if (fileSuites.some((suite) => suite.status === 'failed')) {
        fileStat.failed += 1;
      } else {
        fileStat.passed += 1;
      }
    }

    for (const suite of failingTests) {
      failures.push({ iteration, ...suite });
    }
    summaryLines.push(
      `| ${iteration} | ${seed} | ${orderedFiles.length} | ${iterationPassed ? '✅ passed' : '❌ failed'} | ${durationSeconds}s |`,
    );

    if (!iterationPassed) {
      console.error(
        `❌ Iteration ${iteration} failed (${failingTests.length} failing test(s)); continuing with remaining repetitions.`,
      );
      if (!report.suitesFound && run.stderr) {
        console.error(`Jest output:\n${run.stderr.split('\n').slice(-40).join('\n')}`);
      }
    } else {
      console.log(`✅ Iteration ${iteration} passed in ${durationSeconds}s.`);
    }
  }

  appendGithubOutput('completed_iterations', String(completedIterations));
  appendGithubOutput('budget_exhausted', budgetExhausted ? 'true' : 'false');

  const failedFiles = [...perFileRuns.entries()].filter(
    ([, stat]) => stat.failed > 0,
  );
  const status =
    failures.length > 0 ? 'failed' : budgetExhausted ? 'budget-limited' : 'passed';
  appendGithubOutput('status', status);

  summaryLines.push(
    '',
    `**Total: ${completedIterations}/${env.REPEAT_COUNT} iterations in ${Math.round((Date.now() - startedAt) / 1000)}s.**`,
    '',
    '| File | Runs | Failing runs |',
    '| --- | --- | --- |',
    ...[...perFileRuns.entries()].map(
      ([file, stat]) =>
        `| \`${displayPath(file)}\` | ${stat.passed + stat.failed} | ${stat.failed} |`,
    ),
  );

  if (missing.length > 0) {
    summaryLines.push(
      '',
      '### Deleted paths (not repeated)',
      '',
      ...missing.map((file) => `- \`${displayPath(file)}\``),
    );
  }

  if (dropped.length > 0) {
    summaryLines.push(
      '',
      `### Not repeated (capped at ${env.MAX_FILES} files)`,
      '',
      ...dropped.map((file) => `- \`${displayPath(file)}\``),
    );
  }

  if (budgetExhausted) {
    const underRepetition = kept.filter(
      (file) =>
        (perFileRuns.get(file)?.passed || 0) + (perFileRuns.get(file)?.failed || 0) <
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

  if (failures.length > 0) {
    summaryLines.push(
      '',
      '### Failing tests',
      '',
      ...failures.map(
        (failure) =>
          `- \`${displayPath(failure.file)} › ${failure.fullName}\` — iteration ${failure.iteration}`,
      ),
    );
  }

  appendSummary(summaryLines);

  if (failures.length > 0) {
    throw new Error(
      `Component view flakiness detected: ${failedFiles.length} file(s), ${failures.length} failing test run(s) across ${completedIterations} iterations.`,
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
