#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Ad-hoc per-scenario Hermes CPU-profile analysis.
 *
 * Only Hermes `.cpuprofile` files are analyzed. BrowserStack app-profiling
 * JSON (CPU %, memory, slow frames, and detected issues) is intentionally
 * excluded.
 *
 * Hermes device segments start at `segment-1`. The reporter saves logical
 * segment 1 as `<project>-<scenario>.cpuprofile`; later segments retain
 * `.segment-2`, `.segment-3`, and so on. All segments and retries sharing the
 * same project + scenario base name are grouped into one scenario report.
 *
 * Usage:
 *   node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs
 *   … --run 123456789
 *   … --lookback-hours 24
 *   … --weekly
 *   … --collect-only --run 123456789
 *   … --scenario "Cold Start"
 *   … --current-dir ./downloaded-test-results --skip-ai
 *
 * A single run samples each scenario once, so one capture cannot tell a
 * reproducible hotspot from a one-off spike. `--lookback-hours` analyzes every
 * scheduled run in the window and reports per-run medians plus how often each
 * frame stayed hot.
 *
 * Requirements:
 *   - `gh` with actions:read when downloading a run
 *   - E2E_CLAUDE_API_KEY for the optional agent pass
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import transformerModule from '@margelo/hermes-profile-transformer';
import {
  buildWeeklyMarkdown,
  buildWeeklyParentSlack,
  buildWeeklyReport,
  formatDurationsAlike,
  inHalfOpenRange,
  lastWeekRunsMatchingThisWeekDays,
  runsOnUtcDates,
  utcDateKey,
  weekBounds,
  weeklySlackCards,
} from './weekly-hermes-conclusions.mjs';

const transformHermesProfile =
  transformerModule.default || transformerModule;

const DEFAULT_REPO = 'MetaMask/metamask-mobile';
const DEFAULT_WORKFLOW = 'run-performance-e2e-manual.yml';
const DEFAULT_BRANCH = 'main';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_PROFILE_BYTES = 50 * 1024 * 1024;
const TOP_FRAMES = 15;
// The skill treats a frame below this share of JS work as unactionable, so the
// window digest ignores it too.
const MIN_CONTRIBUTOR_SHARE_PCT = 5;
// Frames ranked per run before they are matched across runs. Wider than the
// reported list so a frame that slips a few places still counts as repeated.
const WINDOW_FRAMES_PER_RUN = 10;
const WINDOW_SCENARIOS_IN_CHAT = 8;
// A run whose JS work exceeds this multiple of the scenario median is called
// out separately instead of being averaged into the headline number.
const SPIKE_RATIO = 1.5;
// Newest runs of a scenario, used to tell a spike that is still happening
// from one the scenario has already run clean past.
const TAIL_RUNS = 2;
// Every run in the week is considered. Reusing a collected report is free, so
// once collection has been running the whole week is analyzed. Rebuilding a
// run from raw profiles costs ~60-75 s (symbolication, not download), so that
// part is bounded by wall clock instead of a run count: newest days first,
// stop when the budget is gone. `--max-runs-per-week` can still cap it.
const DEFAULT_ANALYSIS_BUDGET_MINUTES = 25;
const BUDGET_EXHAUSTED = 'analysis time budget exhausted';
const KNOWN_PROJECTS = [
  'android-onboarding-seedless',
  'browserstack-android',
  'android-onboarding',
];
const SKILL_ANALYZER_CANDIDATES = [
  '.claude/skills/mms-swaps-cpu-profile-audit/scripts/analyze-cpuprofile.cjs',
  '.cursor/rules/mms-swaps-cpu-profile-audit/scripts/analyze-cpuprofile.cjs',
  '.agents/skills/mms-swaps-cpu-profile-audit/scripts/analyze-cpuprofile.cjs',
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    run: null,
    scenario: null,
    repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    workflow: DEFAULT_WORKFLOW,
    branch: DEFAULT_BRANCH,
    currentDir: null,
    outDir: null,
    skipAi: false,
    skipDownload: false,
    scheduledOnly: true,
    dryRun: false,
    lookbackHours: null,
    weekly: false,
    collectOnly: false,
    skipScenarioArtifacts: false,
    now: null,
    maxRunsPerWeek: null,
    maxAnalysisMinutes: DEFAULT_ANALYSIS_BUDGET_MINUTES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--run':
        args.run = next;
        index += 1;
        break;
      case '--scenario':
        args.scenario = next;
        index += 1;
        break;
      case '--repo':
        args.repo = next;
        index += 1;
        break;
      case '--workflow':
        args.workflow = next;
        index += 1;
        break;
      case '--branch':
        args.branch = next;
        index += 1;
        break;
      case '--current-dir':
      case '--cpu-profiles-dir':
        args.currentDir = next;
        index += 1;
        break;
      case '--out-dir':
        args.outDir = next;
        index += 1;
        break;
      case '--skip-ai':
        args.skipAi = true;
        break;
      case '--skip-download':
        args.skipDownload = true;
        break;
      case '--lookback-hours':
        args.lookbackHours = Number(next);
        index += 1;
        break;
      case '--days':
        args.lookbackHours = Number(next) * 24;
        index += 1;
        break;
      case '--any-run':
        args.scheduledOnly = false;
        break;
      case '--weekly':
        args.weekly = true;
        args.skipAi = true;
        args.skipScenarioArtifacts = true;
        break;
      case '--collect-only':
        args.collectOnly = true;
        args.skipAi = true;
        args.skipScenarioArtifacts = true;
        break;
      case '--skip-scenario-artifacts':
        args.skipScenarioArtifacts = true;
        break;
      case '--now':
        args.now = next;
        index += 1;
        break;
      case '--max-runs-per-week':
        args.maxRunsPerWeek = Number(next);
        index += 1;
        break;
      case '--max-analysis-minutes':
        args.maxAnalysisMinutes = Number(next);
        index += 1;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        break;
    }
  }
  if (
    args.lookbackHours != null &&
    (!Number.isFinite(args.lookbackHours) || args.lookbackHours <= 0)
  ) {
    fail('--lookback-hours and --days must be positive numbers');
  }
  if (
    args.maxRunsPerWeek !== null &&
    (!Number.isFinite(args.maxRunsPerWeek) || args.maxRunsPerWeek <= 0)
  ) {
    fail('--max-runs-per-week must be a positive number');
  }
  if (
    !Number.isFinite(args.maxAnalysisMinutes) ||
    args.maxAnalysisMinutes <= 0
  ) {
    fail('--max-analysis-minutes must be a positive number');
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs [options]

Options:
  --run <id>             Performance workflow run id
  --lookback-hours <n>   Analyze every run in the window and report medians
  --days <n>             Same window expressed in days
  --weekly               Week-over-week exception report (scheduled main runs)
  --max-runs-per-week <n>  Cap uncollected runs re-analyzed per week (default: every run)
  --max-analysis-minutes <n>  Wall clock spent rebuilding uncollected runs (default: ${DEFAULT_ANALYSIS_BUDGET_MINUTES})
  --collect-only         Analyze one run without Slack-sized scenario zips
  --skip-scenario-artifacts  Skip per-scenario profile bundles
  --now <iso>            Clock used by --weekly week bounds (tests)
  --scenario <text>      Analyze matching scenario names only
  --repo <owner/name>    GitHub repo (default: ${DEFAULT_REPO})
  --workflow <file>      Source workflow (default: ${DEFAULT_WORKFLOW})
  --branch <name>        Branch used to find latest run (default: ${DEFAULT_BRANCH})
  --current-dir <path>   Local directory containing Hermes profiles
  --out-dir <path>       Output directory
  --skip-ai              Write Hermes summaries without calling Claude
  --skip-download        Require --current-dir
  --any-run              Include workflow_dispatch when resolving latest run
  --dry-run              Write briefing without calling Claude
`);
}

function runGh(args) {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || `gh ${args.join(' ')} failed`).trim(),
    );
  }
  return (result.stdout || '').trim();
}

function listLatestRuns({ repo, workflow, branch, limit = 20 }) {
  return JSON.parse(
    runGh([
      'run',
      'list',
      '--repo',
      repo,
      '--workflow',
      workflow,
      '--branch',
      branch,
      '--limit',
      String(limit),
      '--json',
      'databaseId,conclusion,createdAt,event,url,headSha,status',
    ]) || '[]',
  );
}

function resolveLatestRun(runs, { scheduledOnly = true } = {}) {
  const eligible = runs.filter(
    (run) =>
      run.status === 'completed' &&
      ['success', 'failure'].includes(run.conclusion) &&
      (!scheduledOnly || run.event === 'schedule'),
  );
  return (
    eligible.find((run) => run.conclusion === 'success') || eligible[0] || null
  );
}

/**
 * Every finished run started inside the lookback window, newest first. A
 * failed run still captured profiles for the scenarios it reached, so it is
 * kept as one more sample of the same scenarios.
 */
function resolveRunsInWindow(
  runs,
  { lookbackHours, now = Date.now(), scheduledOnly = true } = {},
) {
  const cutoff = now - lookbackHours * 60 * 60 * 1000;
  return runs
    .filter(
      (run) =>
        run.status === 'completed' &&
        ['success', 'failure'].includes(run.conclusion) &&
        (!scheduledOnly || run.event === 'schedule') &&
        Date.parse(run.createdAt) >= cutoff,
    )
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function resolveRunsInRange(
  runs,
  { sinceIso, untilIso, scheduledOnly = true } = {},
) {
  return runs
    .filter(
      (run) =>
        run.status === 'completed' &&
        ['success', 'failure'].includes(run.conclusion) &&
        (!scheduledOnly || run.event === 'schedule') &&
        inHalfOpenRange(run.createdAt, sinceIso, untilIso),
    )
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function getRunMetadata(repo, runId) {
  return JSON.parse(
    runGh([
      'run',
      'view',
      String(runId),
      '--repo',
      repo,
      '--json',
      'databaseId,url,createdAt,event,headSha,conclusion,status',
    ]) || '{}',
  );
}

function analysisArtifactsUrl(repo, analysisRunId) {
  if (!repo || !analysisRunId) {
    return null;
  }
  return `https://github.com/${repo}/actions/runs/${analysisRunId}#artifacts`;
}

function downloadArtifactPattern(runId, pattern, destination, repo) {
  fs.mkdirSync(destination, { recursive: true });
  try {
    runGh([
      'run',
      'download',
      String(runId),
      '--repo',
      repo,
      '--pattern',
      pattern,
      '-D',
      destination,
    ]);
    return true;
  } catch (error) {
    console.log(`ℹ️ ${pattern} unavailable: ${error.message}`);
    return false;
  }
}

function findNamedFile(directory, fileName) {
  if (!directory || !fs.existsSync(directory)) {
    return null;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const nested = findNamedFile(fullPath, fileName);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

/**
 * A collected report is only reusable when it carries everything the window
 * aggregation reads. Reports written by earlier versions of this analyzer are
 * missing fields such as per-scenario `attempts`, and reusing one of those
 * used to abort the whole weekly report.
 */
function isReusableCollectedReport(report) {
  const mode = report?.meta?.mode;
  if (mode === 'lookback-window' || mode === 'weekly-conclusions') {
    return false;
  }
  if (!report?.meta?.runId || !Array.isArray(report.scenarios)) {
    return false;
  }
  if (report.scenarios.length === 0) {
    return false;
  }
  return report.scenarios.every(
    (scenario) =>
      typeof scenario?.scenario === 'string' &&
      Array.isArray(scenario.attempts) &&
      Array.isArray(scenario.profiles) &&
      Number.isFinite(scenario.jsWorkMs) &&
      Number.isFinite(scenario.jsDutyPct),
  );
}

function tryReadCollectedReport(repo, analysisRunId) {
  const destination = fs.mkdtempSync(
    path.join(os.tmpdir(), `app-profiling-collected-${analysisRunId}-`),
  );
  try {
    const downloaded = downloadArtifactPattern(
      analysisRunId,
      'app-profiling-analysis',
      destination,
      repo,
    );
    if (!downloaded) {
      return null;
    }
    const reportPath = findNamedFile(destination, 'report.json');
    if (!reportPath) {
      return null;
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (!isReusableCollectedReport(report)) {
      console.log(
        `ℹ️ Ignoring analysis ${analysisRunId}: report does not match the current schema`,
      );
      return null;
    }
    return report;
  } catch (error) {
    console.log(
      `ℹ️ Could not reuse analysis ${analysisRunId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
}

function listCompletedAnalysisRuns(repo) {
  return JSON.parse(
    runGh([
      'run',
      'list',
      '--repo',
      repo,
      '--workflow',
      'analyze-app-profiling.yml',
      '--limit',
      '80',
      '--json',
      'databaseId,conclusion,createdAt,status',
    ]) || '[]',
  );
}

function loadCollectedReports(
  repo,
  sinceIso,
  untilIso,
  { listAnalysisRuns = listCompletedAnalysisRuns, readReport = tryReadCollectedReport } = {},
) {
  const analysisRuns = listAnalysisRuns(repo);
  const sinceMs = Date.parse(sinceIso) - 6 * 60 * 60 * 1000;
  const untilMs = Date.parse(untilIso) + 24 * 60 * 60 * 1000;
  const byPerformanceRunId = new Map();
  for (const analysisRun of analysisRuns) {
    if (
      analysisRun.status !== 'completed' ||
      analysisRun.conclusion !== 'success'
    ) {
      continue;
    }
    const created = Date.parse(analysisRun.createdAt);
    if (created < sinceMs || created > untilMs) {
      continue;
    }
    const report = readReport(repo, analysisRun.databaseId);
    if (!report) {
      continue;
    }
    // `gh run list` is newest first, so the first report found for a run is
    // the freshest analysis of it. A later, older one must not replace it.
    const performanceRunId = String(report.meta.runId);
    if (byPerformanceRunId.has(performanceRunId)) {
      continue;
    }
    byPerformanceRunId.set(performanceRunId, report);
  }
  return byPerformanceRunId;
}

function findAndroidSourcemaps(directory, output = []) {
  if (!directory || !fs.existsSync(directory)) {
    return output;
  }
  for (const entry of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAndroidSourcemaps(fullPath, output);
    } else if (
      entry.endsWith('.map') &&
      fullPath.toLowerCase().includes('android')
    ) {
      output.push(fullPath);
    }
  }
  return output.sort();
}

function sourcemapVariant(filePath) {
  const normalized = filePath.toLowerCase();
  if (normalized.includes('without-srp')) {
    return 'without-srp';
  }
  if (normalized.includes('with-srp')) {
    return 'with-srp';
  }
  return null;
}

function profileSourcemapVariant(profilePath) {
  const { project } = parseProfileFileName(profilePath);
  if (project.startsWith('android-onboarding')) {
    return 'without-srp';
  }
  if (project === 'browserstack-android') {
    return 'with-srp';
  }
  return null;
}

function selectSourcemap(profilePath, sourcemaps) {
  const requiredVariant = profileSourcemapVariant(profilePath);
  if (!requiredVariant) {
    return null;
  }
  const matches = sourcemaps.filter(
    (filePath) => sourcemapVariant(filePath) === requiredVariant,
  );
  return matches.length === 1 ? matches[0] : null;
}

async function convertProfile(profilePath, sourcemapPath, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const convertedPath = path.join(
    outputDirectory,
    `${path.basename(profilePath, '.cpuprofile')}-converted.json`,
  );
  const preparedProfilePath = path.join(
    outputDirectory,
    `${path.basename(profilePath, '.cpuprofile')}-prepared.cpuprofile`,
  );

  // react-native-release-profiler's CLI always invokes `react-native config`,
  // even for --local with an explicit map. The analysis runner does not need a
  // React Native project lookup, so use the same transformer directly.
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  for (const frame of Object.values(profile.stackFrames || {})) {
    if (frame.funcVirtAddr != null && frame.offset != null) {
      frame.line = '1';
      frame.column = String(
        Number.parseInt(frame.funcVirtAddr, 10) +
          Number.parseInt(frame.offset, 10) +
          1,
      );
      delete frame.funcVirtAddr;
      delete frame.offset;
    }
  }
  fs.writeFileSync(preparedProfilePath, JSON.stringify(profile));

  try {
    const events = await transformHermesProfile(
      preparedProfilePath,
      path.resolve(sourcemapPath),
      'index.bundle',
    );
    // Avoid one giant JSON.stringify call for long captures.
    const serialized = events
      .map((event) => JSON.stringify(event, undefined, 4))
      .join(',');
    fs.writeFileSync(convertedPath, `[${serialized}]`, 'utf8');
  } finally {
    fs.rmSync(preparedProfilePath, { force: true });
  }
  return convertedPath;
}

function findSkillAnalyzer(repoRoot = process.cwd()) {
  for (const candidate of SKILL_ANALYZER_CANDIDATES) {
    const fullPath = path.join(repoRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  throw new Error(
    'mms-swaps-cpu-profile-audit analyzer not found; run `yarn skills` first',
  );
}

function microsToMs(value) {
  return Number(((value || 0) / 1000).toFixed(2));
}

function compactSkillFrame(frame) {
  return {
    name: frame.name,
    url: frame.url || null,
    line: frame.line ?? null,
    category: frame.category || null,
    selfMs: microsToMs(frame.selfMicros),
    inclusiveMs: microsToMs(frame.totalMicros),
    calls: frame.calls || 0,
    relation: frame.relation,
    area: frame.area,
    ownedBySwaps: Boolean(frame.ownedBySwaps),
  };
}

/**
 * Runs the parser bundled by the installed mms-swaps-cpu-profile-audit skill.
 * Its timing model (sample deltas, runtime/idle exclusion, self vs inclusive)
 * is the canonical evidence used by the AI reasoning pass.
 */
function runSkillAnalyzer(profilePath, analyzerPath, { symbolicated = false } = {}) {
  const result = spawnSync(
    process.execPath,
    [analyzerPath, '--profile', profilePath, '--json', '--top', '20'],
    {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      (result.stderr ||
        result.stdout ||
        `skill analyzer failed for ${profilePath}`).trim(),
    );
  }
  const audit = JSON.parse(result.stdout);
  return {
    analyzer: 'mms-swaps-cpu-profile-audit',
    format: audit.format,
    captureLengthMs: Number((audit.durationMs || 0).toFixed(2)),
    distinctFrames: audit.totalFrames || 0,
    jsWorkMs: microsToMs(audit.attributableSelfMicros),
    runtimeAndIdleMs: microsToMs(audit.runtimeSelfMicros),
    swapsOwnedSelfMs: microsToMs(audit.swapsSelfMicros),
    swapsWidestInclusiveMs: microsToMs(audit.swapsInclusiveMicros),
    swapsOwnedAreas: (audit.areas || []).map((area) => ({
      area: area.area,
      selfMs: microsToMs(area.selfMicros),
      inclusiveMs: microsToMs(area.totalMicros),
    })),
    nonSwapsOnPathAreas: (audit.contextPathAreas || []).map((area) => ({
      area: area.area,
      relation: area.relation,
      selfMs: microsToMs(area.selfMicros),
    })),
    nonSwapsConcurrentAreas: (audit.contextConcurrentAreas || [])
      .slice(0, 8)
      .map((area) => ({
        area: area.area,
        selfMs: microsToMs(area.selfMicros),
      })),
    runtimeAreas: (audit.runtimeAreas || []).map((area) => ({
      area: area.area,
      selfMs: microsToMs(area.selfMicros),
    })),
    topSwapsFrames: (audit.topInScope || [])
      .slice(0, 10)
      .map(compactSkillFrame),
    topNonSwapsFrames: (audit.topContext || [])
      .slice(0, 15)
      .map(compactSkillFrame),
    caveat: symbolicated
      ? null
      : 'No verified matching source map was available; ownership and file/line attribution are unreliable.',
  };
}

function findHermesProfiles(directory, output = []) {
  if (!directory || !fs.existsSync(directory)) {
    return output;
  }
  for (const entry of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findHermesProfiles(fullPath, output);
    } else if (
      entry.endsWith('.cpuprofile') &&
      fullPath
        .split(path.sep)
        .some((segment) => segment.startsWith('hermes-cpuprofiles'))
    ) {
      output.push(fullPath);
    }
  }
  return output;
}

function sanitize(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseProfileFileName(fileName) {
  let stem = path.basename(fileName, '.cpuprofile');
  let retry = 0;
  let segment = 1;
  let copyIndex = null;

  const segmentMatch = stem.match(/\.segment-(\d+)(?:-(\d+))?$/);
  if (segmentMatch) {
    segment = Number(segmentMatch[1]);
    copyIndex = segmentMatch[2] ? Number(segmentMatch[2]) : null;
    stem = stem.slice(0, -segmentMatch[0].length);
  }
  const retryMatch = stem.match(/\.retry-(\d+)$/);
  if (retryMatch) {
    retry = Number(retryMatch[1]);
    stem = stem.slice(0, -retryMatch[0].length);
  }

  const project =
    KNOWN_PROJECTS.find((candidate) => stem.startsWith(`${candidate}-`)) ||
    'unknown-project';
  const scenario =
    project === 'unknown-project'
      ? stem
      : stem.slice(`${project}-`.length);

  return {
    fileName: path.basename(fileName),
    project,
    scenario,
    retry,
    segment,
    copyIndex,
  };
}

function frameKey(frame) {
  return [
    frame.name || '(anonymous)',
    frame.category || '',
    frame.funcVirtAddr || '',
    frame.offset || '',
  ].join('|');
}

function summarizeHermesProfile(profile) {
  const samples = Array.isArray(profile?.samples) ? profile.samples : [];
  const frames = profile?.stackFrames || {};
  const selfCounts = new Map();
  const inclusiveCounts = new Map();
  let totalWeight = 0;

  for (const sample of samples) {
    const weight = Number(sample.weight) || 1;
    totalWeight += weight;
    let frameId = String(sample.sf);
    let isLeaf = true;
    const visitedFrameIds = new Set();
    const inclusiveKeysInSample = new Set();

    while (frameId && !visitedFrameIds.has(frameId)) {
      visitedFrameIds.add(frameId);
      const frame = frames[frameId];
      if (!frame) {
        break;
      }
      const key = frameKey(frame);
      const base = {
        name: frame.name || '(anonymous)',
        category: frame.category || null,
        funcVirtAddr: frame.funcVirtAddr || null,
        offset: frame.offset || null,
      };
      if (isLeaf) {
        const current = selfCounts.get(key) || { ...base, samples: 0 };
        current.samples += weight;
        selfCounts.set(key, current);
        isLeaf = false;
      }
      // Recursion can put the same function at several frame ids in one
      // sampled stack. Count its inclusive presence once per sample so a
      // percentage can never exceed 100%.
      if (!inclusiveKeysInSample.has(key)) {
        inclusiveKeysInSample.add(key);
        const inclusive = inclusiveCounts.get(key) || { ...base, samples: 0 };
        inclusive.samples += weight;
        inclusiveCounts.set(key, inclusive);
      }
      frameId = frame.parent == null ? null : String(frame.parent);
    }
  }

  const rootSamples = [...selfCounts.values()]
    .filter((frame) => frame.category === 'root')
    .reduce((total, frame) => total + frame.samples, 0);
  const rank = (counts) =>
    [...counts.values()]
      .filter((frame) => frame.category !== 'root')
      .sort((left, right) => right.samples - left.samples)
      .slice(0, TOP_FRAMES)
      .map((frame) => ({
        ...frame,
        sharePct:
          totalWeight > 0
            ? Number(((frame.samples / totalWeight) * 100).toFixed(2))
            : null,
      }));

  const timestamps = samples
    .map((sample) => Number(sample.ts))
    .filter(Number.isFinite);
  const durationMs =
    timestamps.length > 1
      ? Number(
          (
            (Math.max(...timestamps) - Math.min(...timestamps)) /
            1000
          ).toFixed(2),
        )
      : null;

  return {
    format: 'hermes-sampling-profile',
    sampleCount: samples.length,
    totalWeight,
    rootSamples,
    rootSharePct:
      totalWeight > 0
        ? Number(((rootSamples / totalWeight) * 100).toFixed(2))
        : null,
    stackFrameCount: Object.keys(frames).length,
    durationMs,
    topSelfFrames: rank(selfCounts),
    topInclusiveFrames: rank(inclusiveCounts),
  };
}

function loadProfile(
  filePath,
  skillAnalyzerPath,
  { analysisPath = filePath, sourcemapPath = null } = {},
) {
  const metadata = parseProfileFileName(filePath);
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, 'r');
  } catch (error) {
    return {
      ...metadata,
      skipped: true,
      reason: `unreadable: ${error.message}`,
    };
  }
  try {
    // Sizing and reading go through the same descriptor, so the guard cannot
    // measure one file and the read then consume another.
    const { size } = fs.fstatSync(descriptor);
    if (size > MAX_PROFILE_BYTES) {
      return {
        ...metadata,
        skipped: true,
        reason: `file too large (${(size / 1024 / 1024).toFixed(1)} MB)`,
      };
    }
    const contents = fs.readFileSync(descriptor, 'utf8');
    return {
      ...metadata,
      skipped: false,
      sourcePath: filePath,
      analysisPath,
      sourcemapPath,
      symbolicated: Boolean(sourcemapPath),
      skillAudit: runSkillAnalyzer(analysisPath, skillAnalyzerPath, {
        symbolicated: Boolean(sourcemapPath),
      }),
      ...summarizeHermesProfile(JSON.parse(contents)),
    };
  } catch (error) {
    return {
      ...metadata,
      skipped: true,
      reason: `unreadable: ${error.message}`,
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function mergeFrameLists(profiles, property) {
  const totals = new Map();
  let totalWeight = 0;
  for (const profile of profiles) {
    totalWeight += profile.totalWeight || 0;
    for (const frame of profile[property] || []) {
      const key = frameKey(frame);
      const current = totals.get(key) || {
        name: frame.name,
        category: frame.category,
        funcVirtAddr: frame.funcVirtAddr,
        offset: frame.offset,
        samples: 0,
        locations: [],
      };
      current.samples += frame.samples;
      current.locations.push({
        retry: profile.retry,
        segment: profile.segment,
        samples: frame.samples,
      });
      totals.set(key, current);
    }
  }
  return [...totals.values()]
    .sort((left, right) => right.samples - left.samples)
    .slice(0, TOP_FRAMES)
    .map((frame) => ({
      ...frame,
      sharePct:
        totalWeight > 0
          ? Number(((frame.samples / totalWeight) * 100).toFixed(2))
          : null,
    }));
}

function groupProfiles(profiles, scenarioFilter = null) {
  const groups = new Map();
  const filter = sanitize(scenarioFilter).toLowerCase();

  for (const profile of profiles) {
    if (filter && !profile.scenario.toLowerCase().includes(filter)) {
      continue;
    }
    const key = `${profile.project}|${profile.scenario}`;
    const group = groups.get(key) || {
      projectName: profile.project,
      scenario: profile.scenario,
      profiles: [],
    };
    group.profiles.push(profile);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      group.profiles.sort(
        (left, right) =>
          left.retry - right.retry ||
          left.segment - right.segment ||
          left.fileName.localeCompare(right.fileName),
      );
      const allUsable = group.profiles.filter((profile) => !profile.skipped);
      const attemptJsWork = new Map();
      for (const profile of allUsable) {
        attemptJsWork.set(
          profile.retry,
          (attemptJsWork.get(profile.retry) || 0) +
            (profile.skillAudit?.jsWorkMs || 0),
        );
      }
      const selectedAttempt =
        [...attemptJsWork.entries()].sort(
          ([leftAttempt, leftJsWork], [rightAttempt, rightJsWork]) =>
            rightJsWork - leftJsWork || leftAttempt - rightAttempt,
        )[0]?.[0] ?? group.profiles[0]?.retry;
      const usable = allUsable.filter(
        (profile) => profile.retry === selectedAttempt,
      );
      const selectedProfiles = group.profiles.filter(
        (profile) => profile.retry === selectedAttempt,
      );
      const captureLengthMs = usable.reduce(
        (total, profile) =>
          total + (profile.skillAudit?.captureLengthMs || 0),
        0,
      );
      const jsWorkMs = usable.reduce(
        (total, profile) => total + (profile.skillAudit?.jsWorkMs || 0),
        0,
      );
      const runtimeAndIdleMs = usable.reduce(
        (total, profile) =>
          total + (profile.skillAudit?.runtimeAndIdleMs || 0),
        0,
      );
      const sampledMs = jsWorkMs + runtimeAndIdleMs;
      return {
        projectName: group.projectName,
        scenario: group.scenario,
        profileCount: selectedProfiles.length,
        totalProfileCount: group.profiles.length,
        segmentCount: new Set(
          selectedProfiles.map(
            (profile) => `${profile.retry}:${profile.segment}`,
          ),
        ).size,
        attempts: [...new Set(group.profiles.map((profile) => profile.retry))],
        selectedAttempt,
        excludedAttempts: [
          ...new Set(
            group.profiles
              .filter((profile) => profile.retry !== selectedAttempt)
              .map((profile) => profile.retry),
          ),
        ],
        sampleCount: usable.reduce(
          (total, profile) => total + profile.sampleCount,
          0,
        ),
        rootSharePct:
          usable.reduce(
            (total, profile) => total + (profile.rootSamples || 0),
            0,
          ) > 0
            ? Number(
                (
                  (usable.reduce(
                    (total, profile) => total + (profile.rootSamples || 0),
                    0,
                  ) /
                    usable.reduce(
                      (total, profile) => total + profile.totalWeight,
                      0,
                    )) *
                  100
                ).toFixed(2),
              )
            : 0,
        durationMs: Number(
          usable
            .reduce((total, profile) => total + (profile.durationMs || 0), 0)
            .toFixed(2),
        ),
        captureLengthMs: Number(captureLengthMs.toFixed(2)),
        jsWorkMs: Number(jsWorkMs.toFixed(2)),
        averageJsWorkMs:
          usable.length > 0
            ? Number((jsWorkMs / usable.length).toFixed(2))
            : 0,
        runtimeAndIdleMs: Number(runtimeAndIdleMs.toFixed(2)),
        jsDutyPct:
          sampledMs > 0
            ? Number(((jsWorkMs / sampledMs) * 100).toFixed(1))
            : 0,
        symbolicatedProfiles: usable.filter(
          (profile) => profile.symbolicated,
        ).length,
        topSelfFrames: mergeFrameLists(usable, 'topSelfFrames'),
        topInclusiveFrames: mergeFrameLists(usable, 'topInclusiveFrames'),
        profiles: selectedProfiles,
      };
    })
    .sort((left, right) => left.scenario.localeCompare(right.scenario));
}

function displayName(scenario) {
  return scenario.replace(/__/g, ': ').replace(/_/g, ' ');
}

function formatMs(value) {
  return `${Number(value || 0).toFixed(1)} ms`;
}

/**
 * Describes which attempt was kept for a scenario that ran several times.
 * The first attempt carries no retry suffix on disk, so it is named by
 * position instead of as `retry 0`.
 */
function attemptDescription(scenario) {
  const total = scenario.attempts.length;
  return scenario.selectedAttempt > 0
    ? `worst of ${total} attempts: retry ${scenario.selectedAttempt}`
    : `worst of ${total} attempts: first attempt`;
}

function topSkillFrame(profile) {
  const audit = profile.skillAudit;
  if (!audit || audit.jsWorkMs <= 0) {
    return null;
  }
  return [...audit.topSwapsFrames, ...audit.topNonSwapsFrames]
    .filter((frame) => frame.selfMs > 0)
    .sort((left, right) => right.selfMs - left.selfMs)[0] || null;
}

function profileOutcome(profile) {
  const audit = profile.skillAudit;
  if (!audit) {
    return 'No skill timing data.';
  }
  const top = topSkillFrame(profile);
  if (!top) {
    return `No attributable hot frame; JS duty cycle ${(
      (audit.jsWorkMs /
        Math.max(audit.jsWorkMs + audit.runtimeAndIdleMs, 1)) *
      100
    ).toFixed(1)}%.`;
  }
  const share = (top.selfMs / Math.max(audit.jsWorkMs, 1)) * 100;
  if (share < MIN_CONTRIBUTOR_SHARE_PCT) {
    return `No single frame reached ${MIN_CONTRIBUTOR_SHARE_PCT}% of JS work; JS duty cycle ${(
      (audit.jsWorkMs /
        Math.max(audit.jsWorkMs + audit.runtimeAndIdleMs, 1)) *
      100
    ).toFixed(1)}%.`;
  }
  const location =
    profile.symbolicated && top.url
      ? ` (${top.url}${top.line ? `:${top.line}` : ''})`
      : '';
  return `Top JS contributor: \`${top.name}\` ${formatMs(top.selfMs)} (${share.toFixed(1)}% of JS work)${location}.`;
}

function frameIdentity(frame) {
  if (!frame?.name) {
    return null;
  }
  return `${frame.name}|${frame.url || ''}|${frame.line || ''}`;
}

function formatFrameLabel(frame, { symbolicated } = {}) {
  const location =
    symbolicated && frame.url
      ? ` (${frame.url}${frame.line ? `:${frame.line}` : ''})`
      : '';
  return `\`${frame.name}\`${location}`;
}

function hottestProfile(scenario) {
  return [...(scenario.profiles || [])]
    .filter((profile) => profile.skillAudit)
    .sort(
      (left, right) =>
        (right.skillAudit?.jsWorkMs || 0) - (left.skillAudit?.jsWorkMs || 0),
    )[0];
}

function scenarioTopHotFrame(scenario) {
  const profile = hottestProfile(scenario);
  if (!profile) {
    return null;
  }
  const frame = topSkillFrame(profile);
  if (!frame || !(profile.skillAudit.jsWorkMs > 0)) {
    return null;
  }
  const share = (frame.selfMs / profile.skillAudit.jsWorkMs) * 100;
  if (share < MIN_CONTRIBUTOR_SHARE_PCT) {
    return null;
  }
  return { frame, share, selfMs: frame.selfMs, profile };
}

function scoredScenarios(report) {
  return [...report.scenarios].sort(
    (left, right) =>
      right.averageJsWorkMs * (right.jsDutyPct / 100) -
      left.averageJsWorkMs * (left.jsDutyPct / 100),
  );
}

/**
 * Cross-scenario facts the Slack and markdown digests lead with. One repeated
 * top frame is stated once instead of under every scenario.
 */
function buildConclusions(report) {
  const scenarios = report.scenarios.filter(
    (scenario) => scenario.profiles?.some((profile) => profile.skillAudit),
  );
  if (scenarios.length === 0) {
    return [];
  }

  const jsWorks = scenarios.map((scenario) => scenario.jsWorkMs);
  const medianJs = median(jsWorks);
  const groups = new Map();
  const flatHighCost = [];
  const cheap = scenarios.filter(
    (scenario) => scenario.jsDutyPct < 15 && scenario.jsWorkMs < medianJs,
  );

  for (const scenario of scenarios) {
    const hot = scenarioTopHotFrame(scenario);
    if (hot) {
      const key = frameIdentity(hot.frame);
      const group = groups.get(key) || {
        frame: hot.frame,
        symbolicated: Boolean(hot.profile.symbolicated && hot.frame.url),
        scenarios: [],
        selfMs: [],
      };
      group.scenarios.push(scenario);
      group.selfMs.push(hot.selfMs);
      groups.set(key, group);
      continue;
    }
    if (scenario.jsWorkMs >= medianJs && medianJs > 0) {
      flatHighCost.push(scenario);
    }
  }

  const conclusions = [];
  const rankedGroups = [...groups.values()].sort(
    (left, right) => right.scenarios.length - left.scenarios.length,
  );
  const dominant = rankedGroups[0];
  const dominantThreshold = Math.min(3, scenarios.length);
  const namedDominant =
    Boolean(dominant) && dominant.scenarios.length >= dominantThreshold;
  if (namedDominant) {
    const minSelf = Math.min(...dominant.selfMs);
    const maxSelf = Math.max(...dominant.selfMs);
    const maxScenario = dominant.scenarios.reduce((best, scenario) =>
      scenario.jsWorkMs > best.jsWorkMs ? scenario : best,
    );
    conclusions.push(
      `${formatFrameLabel(dominant.frame, { symbolicated: dominant.symbolicated })} is the top JS contributor in ${dominant.scenarios.length}/${scenarios.length} scenarios (${formatMs(minSelf)}–${formatMs(maxSelf)} self). Highest JS work with this frame: *${displayName(maxScenario.scenario)}* (${formatMs(maxScenario.jsWorkMs)}, duty ${maxScenario.jsDutyPct}%).`,
    );
  }

  // If the leading group was not named as dominant, still consider it as a
  // secondary hotspot. Skipping it dropped the most common frame whenever it
  // appeared in fewer than min(3, n) scenarios.
  for (const group of namedDominant ? rankedGroups.slice(1) : rankedGroups) {
    const maxSelf = Math.max(...group.selfMs);
    if (group.scenarios.length < 2 && maxSelf < 500) {
      continue;
    }
    const names = group.scenarios
      .map((scenario) => `*${displayName(scenario.scenario)}*`)
      .join(', ');
    conclusions.push(
      `${formatFrameLabel(group.frame, { symbolicated: group.symbolicated })} leads ${group.scenarios.length === 1 ? names : `${group.scenarios.length} scenarios (${names})`} — up to ${formatMs(maxSelf)} self.`,
    );
    if (conclusions.length >= 4) {
      break;
    }
  }

  if (flatHighCost.length > 0) {
    const names = flatHighCost
      .sort((left, right) => right.jsWorkMs - left.jsWorkMs)
      .slice(0, 3)
      .map(
        (scenario) =>
          `*${displayName(scenario.scenario)}* (${formatMs(scenario.jsWorkMs)} JS, duty ${scenario.jsDutyPct}%)`,
      )
      .join('; ');
    conclusions.push(
      `Cost is spread (no frame ≥ ${MIN_CONTRIBUTOR_SHARE_PCT}% of JS work) in ${names}.`,
    );
  }

  if (cheap.length > 0) {
    const names = cheap
      .map((scenario) => displayName(scenario.scenario))
      .slice(0, 4)
      .join('; ');
    conclusions.push(
      `Low JS duty (<15%): ${names}.`,
    );
  }

  return conclusions.slice(0, 4);
}

function outlierScenarios(report) {
  const ranked = scoredScenarios(report);
  const jsWorks = report.scenarios.map((scenario) => scenario.jsWorkMs);
  const medianJs = median(jsWorks);
  const dominantKey = (() => {
    const counts = new Map();
    for (const scenario of report.scenarios) {
      const hot = scenarioTopHotFrame(scenario);
      if (!hot) {
        continue;
      }
      const key = frameIdentity(hot.frame);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let best = null;
    let bestCount = 0;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return bestCount >= 3 ? best : null;
  })();

  const picked = [];
  for (const scenario of ranked) {
    const hot = scenarioTopHotFrame(scenario);
    const key = hot ? frameIdentity(hot.frame) : null;
    const isSpike = medianJs > 0 && scenario.jsWorkMs >= medianJs * SPIKE_RATIO;
    const isDifferentFrame = key && key !== dominantKey;
    const isFlatExpensive = !hot && scenario.jsWorkMs >= medianJs;
    if (isSpike || isDifferentFrame || isFlatExpensive || picked.length === 0) {
      picked.push(scenario);
    }
    if (picked.length === 5) {
      break;
    }
  }
  // If conclusions already named the dominant frame, skip repeating it on
  // every leftover bullet that is not a spike.
  return { picked, dominantKey };
}

function buildAiBriefing(report) {
  const skillEvidence = report.scenarios.map((scenario) => ({
    scenario: scenario.scenario,
    projectName: scenario.projectName,
    profileCount: scenario.profileCount,
    attempts: scenario.attempts,
    selectedAttempt: scenario.selectedAttempt,
    excludedAttempts: scenario.excludedAttempts,
    profiles: scenario.profiles.map((profile) => ({
      retry: profile.retry,
      segment: profile.segment,
      skillAudit: profile.skillAudit,
    })),
  }));
  const hasResolvedSourcePaths = skillEvidence.some((scenario) =>
    scenario.profiles.some(
      (profile) =>
        profile.skillAudit != null && profile.skillAudit.caveat == null,
    ),
  );
  return `# Optional Hermes CPU-profile context

The deterministic report is already generated from the installed
\`mms-swaps-cpu-profile-audit\` parser. Add optional context only.

Rules:
- Use the skill-generated timing evidence only. Do not discuss BrowserStack
  CPU, memory, slow frames, app profiling, network calls, or quality gates.
- Logical segment 1 is the plain \`.cpuprofile\`; \`.segment-2\`,
  \`.segment-3\`, etc. continue the same scenario.
- Retries are additional attempts of the same scenario. Separate retry-specific
  observations from patterns that repeat across attempts.
- Exclude Runtime / idle and GC from JS-work percentages and never make either
  a probable-cause/fix row.
- Read self and inclusive time separately. Cite milliseconds, calls, retry,
  and segment.
- Apply swaps ownership/relation conclusions only to swaps/bridge scenarios.
  For every other scenario, reuse the skill's timing protocol but do not call
  it swaps-owned, called by swaps, or hosted by swaps.
- The profiles are unsymbolicated unless \`topSwapsFrames\` has resolved paths.
  Do not invent source files or detailed fixes without file/line evidence.
- Source paths resolved in this run: ${hasResolvedSourcePaths ? 'yes' : 'no'}.
${
  hasResolvedSourcePaths
    ? '- Ownership conclusions are allowed only where a resolved source path supports them.'
    : '- HARD RULE: every profile lacks matching sourcemaps. Omit all probable-cause/fix tables. Do not recommend memoization, batching, workers, deferral, or any code change. Report timing and hot function names only.'
}
- Without resolved paths, never say that no swaps-owned work ran. Say swaps
  ownership is indeterminate because the trace is unsymbolicated.
- Do not provide causes, fixes, ownership conclusions, or implementation
  suggestions. The input contains timing evidence, not source-code review.
- Do not explain what a frame does or what code path it implies. Naming a
  frame and its timing is allowed; inferring the work behind it is not.
- Do not add a caveat, disclaimer, or source-map note. The surrounding report
  already states sourcemap coverage from parsed data.
- Do not state totals such as how many scenarios or profiles exist. The
  surrounding report already counts them.

Output:
Maximum 3 bullets, at most two sentences each. Lead with cross-scenario
patterns (a frame that leads many scenarios, one outlier, cheap vs expensive
flows). Mention a frame only when its self time is at least 500 ms or at least
5% of that scenario's JS work. Never mention a frame whose self time is under
100 ms. Package names from a resolved path are allowed; do not invent causes,
fixes, or what the function is doing beyond the path.

Do not restate the deterministic conclusions if they already cover the same
frame. Add only what those conclusions missed.

Deterministic conclusions already in the digest:
${buildConclusions(report).length > 0 ? buildConclusions(report).map((line) => `- ${line}`).join('\n') : '- none'}

Metric definitions (do not rename or derive a second overlapping metric):
- \`captureLengthMs\`: wall-clock capture length.
- \`jsWorkMs\`: attributable JS work after Runtime / idle and GC exclusion.
- \`runtimeAndIdleMs\`: runtime, idle, and GC excluded from JS work.
- Area lists are classifications of portions of \`jsWorkMs\`; do not call
  their partial sum "attributable JS" or compare it as a separate total.

Run: ${report.meta.runId || 'local'}

\`\`\`json
${JSON.stringify(skillEvidence, null, 2)}
\`\`\`
`;
}

function buildMarkdown(report) {
  const lines = [
    '# Hermes CPU-profile analysis',
    '',
    `Run \`${report.meta.runId || 'local'}\`${report.meta.runUrl ? ` — ${report.meta.runUrl}` : ''}`,
    `Scenarios: ${report.scenarios.length}`,
    `Hermes profiles: ${report.meta.profileCount}`,
    `Profiles with a matching sourcemap: ${report.meta.symbolicatedProfileCount}/${report.meta.profileCount}`,
    `Optional agent context: ${report.meta.ai ? 'included' : 'not included'}`,
    '',
  ];
  const conclusions = buildConclusions(report);
  if (conclusions.length > 0) {
    lines.push('## Conclusions', '');
    for (const line of conclusions) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }
  lines.push('## Per-scenario skill analysis', '');
  for (const scenario of report.scenarios) {
    const hasRetries = scenario.attempts.length > 1;
    lines.push(`### ${displayName(scenario.scenario)}`);
    lines.push('| Metric | Value |', '|---|---:|');
    if (hasRetries) {
      lines.push(
        `| Selected attempt | ${attemptDescription(scenario)} |`,
        `| Profiles (selected / total) | ${scenario.profileCount} / ${scenario.totalProfileCount} |`,
      );
    } else {
      lines.push(`| Profiles | ${scenario.profileCount} |`);
    }
    lines.push(
      `| Logical segments | ${scenario.segmentCount} |`,
      `| Capture length | ${formatMs(scenario.captureLengthMs)} |`,
      `| JS work sampled | ${formatMs(scenario.jsWorkMs)} |`,
      `| Runtime / idle / GC | ${formatMs(scenario.runtimeAndIdleMs)} |`,
      `| JS duty cycle | ${scenario.jsDutyPct}% |`,
      `| Profiles with a matching sourcemap | ${scenario.symbolicatedProfiles}/${scenario.profileCount} |`,
      '',
      hasRetries
        ? '| Attempt | Segment | JS work | Runtime / idle / GC | JS duty | Top contributor |'
        : '| Segment | JS work | Runtime / idle / GC | JS duty | Top contributor |',
      hasRetries
        ? '|---:|---:|---:|---:|---:|---|'
        : '|---:|---:|---:|---:|---|',
    );
    const attemptCell = (profile) => (hasRetries ? `${profile.retry} | ` : '');
    for (const profile of scenario.profiles) {
      const audit = profile.skillAudit;
      if (!audit) {
        lines.push(
          `| ${attemptCell(profile)}${profile.segment} | — | — | — | ${profile.reason || 'Unreadable'} |`,
        );
        continue;
      }
      const sampled = audit.jsWorkMs + audit.runtimeAndIdleMs;
      const duty =
        sampled > 0 ? ((audit.jsWorkMs / sampled) * 100).toFixed(1) : '0.0';
      const top = topSkillFrame(profile);
      const contributor = top
        ? `\`${top.name}\` (${formatMs(top.selfMs)})`
        : 'None';
      lines.push(
        `| ${attemptCell(profile)}${profile.segment} | ${formatMs(audit.jsWorkMs)} | ${formatMs(audit.runtimeAndIdleMs)} | ${duty}% | ${contributor} |`,
      );
    }
    const highestSignalProfile = scenario.profiles
      .filter((profile) => profile.skillAudit)
      .sort(
        (left, right) =>
          (right.skillAudit?.jsWorkMs || 0) -
          (left.skillAudit?.jsWorkMs || 0),
      )[0];
    lines.push(
      '',
      highestSignalProfile
        ? `**Outcome:** ${profileOutcome(highestSignalProfile)}`
        : '**Outcome:** No readable skill timing data.',
    );
    if (scenario.symbolicatedProfiles < scenario.profileCount) {
      lines.push(
        '',
        '_Caveat: no verified matching sourcemap was available for one or more profiles; file/line attribution and ownership are indeterminate._',
      );
    }
    lines.push('');
  }
  if (report.aiAnalysis) {
    lines.push(
      '## Optional agent context',
      '',
      report.aiAnalysis.trim(),
      '',
    );
  }
  const downloadLines = markdownDownloadLines(report.meta);
  if (downloadLines.length > 0) {
    lines.push('## Downloads', '', ...downloadLines, '');
  }
  lines.push(
    '_Hermes CPU sampling only. BrowserStack app-profiling metrics are excluded._',
    '',
  );
  return lines.join('\n');
}

function markdownDownloadLines(meta = {}) {
  const lines = [];
  if (meta.analysisArtifactsUrl) {
    lines.push(
      `- [app-profiling-analysis](${meta.analysisArtifactsUrl}) — \`report.json\`, \`report.md\`, \`ai-briefing.md\`, per-scenario JSON (7-day retention).`,
    );
  }
  return lines;
}

function slackDownloadLines(meta = {}) {
  const lines = [];
  if (meta.analysisArtifactsUrl) {
    lines.push(
      `• <${meta.analysisArtifactsUrl}|app-profiling-analysis> — report files. Scenario names above download that scenario's profiles.`,
    );
  }
  return lines;
}

function buildSlack(report) {
  const maps =
    `${report.meta.symbolicatedProfileCount}/${report.meta.profileCount}`;
  const lines = [
    `*Hermes CPU-profile analysis*`,
    '',
    `_Run:_ \`${report.meta.runId || 'local'}\` · _Scenarios:_ ${report.scenarios.length} · _Profiles:_ ${report.meta.profileCount} · _Maps:_ ${maps}`,
  ];
  const conclusions = buildConclusions(report);
  if (conclusions.length > 0) {
    lines.push('', '*Conclusions*');
    for (const line of conclusions) {
      lines.push(`• ${line}`);
    }
  }
  const { picked } = outlierScenarios(report);
  if (picked.length > 0) {
    lines.push('', '*Outliers*');
    for (const scenario of picked) {
      const profile = hottestProfile(scenario);
      const attemptLabel =
        scenario.attempts.length > 1 ? `${attemptDescription(scenario)}, ` : '';
      lines.push(
        `• *${displayName(scenario.scenario)}* — ${attemptLabel}JS ${formatMs(scenario.averageJsWorkMs)}, duty ${scenario.jsDutyPct}%`,
        `  ${profile ? profileOutcome(profile) : 'No readable skill timing data.'}`,
      );
    }
  }
  if (report.aiAnalysis) {
    lines.push('', '*Notes*', report.aiAnalysis.trim());
  }
  const downloadLines = slackDownloadLines(report.meta);
  if (downloadLines.length > 0) {
    lines.push('', '*Downloads*', ...downloadLines);
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; BrowserStack app-profiling excluded.',
  );
  if (report.meta.symbolicatedProfileCount < report.meta.profileCount) {
    lines.push(
      `_Caveat:_ ${report.meta.profileCount - report.meta.symbolicatedProfileCount}/${report.meta.profileCount} profiles had no matching sourcemap, so frame names cannot be traced to files or owners.`,
    );
  }
  return lines.join('\n');
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) {
    return 0;
  }
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return Number(value.toFixed(2));
}

/**
 * Self time per frame across the profiles a single run kept for a scenario.
 * One frame can appear in several segments, so its self time is summed before
 * the frames are ranked.
 */
function scenarioFrameTotals(scenario) {
  const totals = new Map();
  for (const profile of scenario.profiles || []) {
    const audit = profile.skillAudit;
    if (!audit) {
      continue;
    }
    for (const frame of [
      ...(audit.topSwapsFrames || []),
      ...(audit.topNonSwapsFrames || []),
    ]) {
      if (!(frame.selfMs > 0)) {
        continue;
      }
      const current = totals.get(frame.name) || {
        name: frame.name,
        url: null,
        line: null,
        selfMs: 0,
        calls: 0,
      };
      current.selfMs += frame.selfMs;
      current.calls += frame.calls || 0;
      if (!current.url && profile.symbolicated && frame.url) {
        current.url = frame.url;
        current.line = frame.line ?? null;
      }
      totals.set(frame.name, current);
    }
  }
  return [...totals.values()]
    .map((frame) => ({ ...frame, selfMs: Number(frame.selfMs.toFixed(2)) }))
    .sort((left, right) => right.selfMs - left.selfMs);
}

/**
 * Scenario captures run for minutes, so their millisecond totals are easier to
 * compare when the large ones are expressed in seconds.
 */
function formatDuration(value) {
  const ms = Number(value || 0);
  return ms >= 10_000 ? `${(ms / 1000).toFixed(1)} s` : formatMs(ms);
}

function windowSignal(scenario) {
  return scenario.medianJsWorkMs * (scenario.medianJsDutyPct / 100);
}

/**
 * Collapses one report per run into per-scenario medians. A scenario is
 * sampled once per run, so the median across runs is what separates a
 * reproducible hotspot from a single noisy capture.
 */
function aggregateWindow(runReports, meta = {}) {
  const runs = runReports.map((report) => ({
    runId: report.meta.runId,
    runUrl: report.meta.runUrl,
    createdAt: report.meta.createdAt,
    profileCount: report.meta.profileCount,
    symbolicatedProfileCount: report.meta.symbolicatedProfileCount,
    scenarioCount: report.scenarios.length,
  }));

  const grouped = new Map();
  for (const report of runReports) {
    for (const scenario of report.scenarios) {
      const key = `${scenario.projectName}|${scenario.scenario}`;
      const entry = grouped.get(key) || {
        projectName: scenario.projectName,
        scenario: scenario.scenario,
        observations: [],
      };
      // Frame self times are summed over the profiles kept for the scenario,
      // so the JS-work denominator has to be the same sum, not a per-profile
      // average, or every share would be multiplied by the segment count.
      entry.observations.push({
        runId: report.meta.runId,
        runUrl: report.meta.runUrl,
        createdAt: report.meta.createdAt || null,
        jsWorkMs: scenario.jsWorkMs,
        jsDutyPct: scenario.jsDutyPct,
        profileCount: scenario.profileCount,
        attempts: scenario.attempts?.length ?? 0,
        frames: scenarioFrameTotals(scenario).slice(0, WINDOW_FRAMES_PER_RUN),
      });
      grouped.set(key, entry);
    }
  }

  const scenarios = [...grouped.values()]
    .map((entry) => {
      const jsWork = entry.observations.map(
        (observation) => observation.jsWorkMs,
      );
      const medianJsWorkMs = median(jsWork);
      const maxJsWorkMs = Math.max(...jsWork);
      const peak = entry.observations.find(
        (observation) => observation.jsWorkMs === maxJsWorkMs,
      );
      // Runs are not processed in order (collected reports and retries are
      // interleaved), so recency has to come from the run timestamps.
      const chronological = [...entry.observations].sort(
        (left, right) =>
          Date.parse(left.createdAt || 0) - Date.parse(right.createdAt || 0),
      );
      const tail = chronological.slice(-TAIL_RUNS);
      const earlier = chronological.slice(0, -TAIL_RUNS);
      const latest = chronological.at(-1);
      const peakIndex = chronological.findIndex(
        (observation) => observation.jsWorkMs === maxJsWorkMs,
      );

      const frameStats = new Map();
      for (const observation of entry.observations) {
        for (const frame of observation.frames) {
          const stat = frameStats.get(frame.name) || {
            name: frame.name,
            url: frame.url,
            line: frame.line,
            selfMs: [],
            sharePct: [],
          };
          stat.selfMs.push(frame.selfMs);
          stat.sharePct.push(
            observation.jsWorkMs > 0
              ? Number(((frame.selfMs / observation.jsWorkMs) * 100).toFixed(1))
              : 0,
          );
          if (!stat.url && frame.url) {
            stat.url = frame.url;
            stat.line = frame.line;
          }
          frameStats.set(frame.name, stat);
        }
      }

      // A frame that ranks high in a single run is noise; the window exists to
      // keep the ones that stay hot in at least half of the runs that reached
      // this scenario.
      const minRunsHot = Math.max(1, Math.ceil(entry.observations.length / 2));
      const contributors = [...frameStats.values()]
        .map((stat) => ({
          name: stat.name,
          url: stat.url || null,
          line: stat.line ?? null,
          runsHot: stat.selfMs.length,
          medianSelfMs: median(stat.selfMs),
          medianSharePct: median(stat.sharePct),
        }))
        .filter((contributor) => contributor.runsHot >= minRunsHot)
        .sort((left, right) => right.medianSelfMs - left.medianSelfMs)
        .slice(0, 5);

      return {
        projectName: entry.projectName,
        scenario: entry.scenario,
        runsObserved: entry.observations.length,
        runsTotal: runs.length,
        medianJsWorkMs,
        minJsWorkMs: Math.min(...jsWork),
        maxJsWorkMs,
        medianJsDutyPct: median(
          entry.observations.map((observation) => observation.jsDutyPct),
        ),
        spikeRatio:
          medianJsWorkMs > 0
            ? Number((maxJsWorkMs / medianJsWorkMs).toFixed(2))
            : 0,
        peakRunId: peak?.runId || null,
        peakRunUrl: peak?.runUrl || null,
        peakRunCreatedAt: peak?.createdAt || null,
        // A spike the scenario has already run clean past is a different
        // finding from one sitting in the newest runs.
        runsAfterPeak: peakIndex < 0 ? 0 : chronological.length - 1 - peakIndex,
        tailRuns: tail.length,
        tailMedianJsWorkMs: median(tail.map((item) => item.jsWorkMs)),
        earlierMedianJsWorkMs: earlier.length
          ? median(earlier.map((item) => item.jsWorkMs))
          : 0,
        latestRunId: latest?.runId || null,
        latestRunUrl: latest?.runUrl || null,
        latestJsWorkMs: latest?.jsWorkMs ?? 0,
        // Long scenario captures spread JS work over thousands of frames, so
        // the skill's 5% actionability bar is usually missed. Say so instead
        // of dropping the repeated frames.
        hasDominantFrame: contributors.some(
          (contributor) =>
            contributor.medianSharePct >= MIN_CONTRIBUTOR_SHARE_PCT,
        ),
        contributors,
        observations: entry.observations.map(
          ({ frames, ...observation }) => observation,
        ),
      };
    })
    .sort((left, right) => windowSignal(right) - windowSignal(left));

  const profileCount = runs.reduce((total, run) => total + run.profileCount, 0);
  return {
    meta: {
      mode: 'lookback-window',
      lookbackHours: meta.lookbackHours || null,
      since: meta.since || null,
      until: meta.until || null,
      repo: meta.repo || null,
      generatedAt: new Date().toISOString(),
      source: 'Hermes CPU sampling profiles only',
      reasoningSkill: 'mms-swaps-cpu-profile-audit',
      reasoningParser: meta.reasoningParser || null,
      runCount: runs.length,
      profileCount,
      symbolicatedProfileCount: runs.reduce(
        (total, run) => total + run.symbolicatedProfileCount,
        0,
      ),
    },
    runs,
    scenarios,
  };
}

function contributorLine(contributor, scenario) {
  const location =
    contributor.url
      ? ` (${contributor.url}${contributor.line ? `:${contributor.line}` : ''})`
      : '';
  return `\`${contributor.name}\` ${formatMs(contributor.medianSelfMs)} median self, ${contributor.medianSharePct.toFixed(1)}% of JS work, hot in ${contributor.runsHot}/${scenario.runsObserved} runs${location}`;
}

function windowCoverageNote(scenario) {
  return scenario.runsObserved < scenario.runsTotal
    ? ` · ran in ${scenario.runsObserved}/${scenario.runsTotal} runs`
    : '';
}

function buildWindowMarkdown(window) {
  const { meta } = window;
  const lines = [
    `# Hermes CPU-profile analysis — last ${meta.lookbackHours}h`,
    '',
    `Window: ${meta.since} → ${meta.until}`,
    `Runs: ${meta.runCount} · Scenarios: ${window.scenarios.length} · Hermes profiles: ${meta.profileCount}`,
    `Profiles with a matching sourcemap: ${meta.symbolicatedProfileCount}/${meta.profileCount}`,
    '',
    '## Runs analyzed',
    '',
    '| Run | Started | Profiles | Scenarios |',
    '|---|---|---:|---:|',
  ];
  for (const run of window.runs) {
    lines.push(
      `| [${run.runId}](${run.runUrl}) | ${run.createdAt || '—'} | ${run.profileCount} | ${run.scenarioCount} |`,
    );
  }
  lines.push(
    '',
    '## Per-scenario medians across runs',
    '',
    'Each run samples a scenario once, so the median is the headline number and',
    'the maximum is reported separately instead of being averaged into it.',
    '',
  );
  for (const scenario of window.scenarios) {
    lines.push(`### ${displayName(scenario.scenario)}`);
    lines.push('| Metric | Value |', '|---|---:|');
    lines.push(
      `| Runs observed | ${scenario.runsObserved}/${scenario.runsTotal} |`,
      `| Median JS work per run | ${formatDuration(scenario.medianJsWorkMs)} |`,
      `| Range across runs | ${formatDurationsAlike([scenario.minJsWorkMs, scenario.maxJsWorkMs]).join(' – ')} |`,
      `| Median JS duty cycle | ${scenario.medianJsDutyPct.toFixed(1)}% |`,
      `| Peak run | ${
        scenario.peakRunId
          ? `[${scenario.peakRunId}](${scenario.peakRunUrl}) (${scenario.spikeRatio}× the median)`
          : '—'
      } |`,
      '',
    );
    if (scenario.contributors.length === 0) {
      lines.push(
        '**Outcome:** no frame stayed hot in half of the runs that reached this scenario.',
        '',
      );
    } else {
      lines.push(
        scenario.hasDominantFrame
          ? `**Outcome:** repeated frames, at least one above ${MIN_CONTRIBUTOR_SHARE_PCT}% of JS work.`
          : `**Outcome:** flat profile — every repeated frame stays below ${MIN_CONTRIBUTOR_SHARE_PCT}% of JS work, so cost is spread rather than concentrated.`,
        '',
        '| Frame | Median self | Median share | Runs hot |',
        '|---|---:|---:|---:|',
      );
      for (const contributor of scenario.contributors) {
        lines.push(
          `| \`${contributor.name}\`${contributor.url ? ` (${contributor.url}${contributor.line ? `:${contributor.line}` : ''})` : ''} | ${formatMs(contributor.medianSelfMs)} | ${contributor.medianSharePct.toFixed(1)}% | ${contributor.runsHot}/${scenario.runsObserved} |`,
        );
      }
      lines.push('');
    }
    lines.push('| Run | JS work | JS duty | Profiles |', '|---|---:|---:|---:|');
    for (const observation of scenario.observations) {
      lines.push(
        `| [${observation.runId}](${observation.runUrl}) | ${formatDuration(observation.jsWorkMs)} | ${observation.jsDutyPct}% | ${observation.profileCount} |`,
      );
    }
    lines.push('');
  }
  if (meta.symbolicatedProfileCount < meta.profileCount) {
    lines.push(
      `_Caveat: ${meta.profileCount - meta.symbolicatedProfileCount}/${meta.profileCount} profiles had no matching sourcemap, so frame names cannot be traced to files or owners._`,
      '',
    );
  }
  lines.push(
    '_Hermes CPU sampling only. BrowserStack app-profiling metrics are excluded._',
    '',
  );
  return lines.join('\n');
}

function buildWindowSlack(window) {
  const { meta } = window;
  const lines = [
    `*Hermes CPU-profile analysis — last ${meta.lookbackHours}h*`,
    '',
    `_Window:_ ${meta.since?.slice(0, 16)}Z → ${meta.until?.slice(0, 16)}Z`,
    `_Runs:_ ${meta.runCount} · _Scenarios:_ ${window.scenarios.length} · _Profiles:_ ${meta.profileCount}`,
    '',
    `*Highest-signal scenarios (median of ${meta.runCount} runs)*`,
  ];
  const scenarios = window.scenarios.slice(0, WINDOW_SCENARIOS_IN_CHAT);
  // Repeating the same flat-profile sentence under every bullet buries the
  // numbers, so it is stated once when it holds for the whole digest.
  const allFlat = scenarios.every((scenario) => !scenario.hasDominantFrame);
  if (allFlat) {
    lines.push(
      `_No scenario concentrated ${MIN_CONTRIBUTOR_SHARE_PCT}% of its JS work in one frame; the frames below are the widest ones that repeat across runs._`,
    );
  }
  for (const scenario of scenarios) {
    const [median, min, max] = formatDurationsAlike([
      scenario.medianJsWorkMs,
      scenario.minJsWorkMs,
      scenario.maxJsWorkMs,
    ]);
    lines.push(
      `• *${displayName(scenario.scenario)}* — median JS work ${median} (range ${min} – ${max}), JS duty ${scenario.medianJsDutyPct.toFixed(1)}%${windowCoverageNote(scenario)}`,
    );
    if (scenario.contributors.length === 0) {
      lines.push(
        '  No frame stayed hot in half of the runs that reached this scenario.',
      );
    } else {
      if (!allFlat && !scenario.hasDominantFrame) {
        lines.push(
          `  Flat profile — no repeated frame reaches ${MIN_CONTRIBUTOR_SHARE_PCT}% of JS work; the widest ones are:`,
        );
      }
      for (const contributor of scenario.contributors.slice(0, 3)) {
        lines.push(`  ${contributorLine(contributor, scenario)}`);
      }
    }
    if (scenario.spikeRatio >= SPIKE_RATIO && scenario.peakRunUrl) {
      const [peak] = formatDurationsAlike([
        scenario.maxJsWorkMs,
        scenario.medianJsWorkMs,
      ]);
      lines.push(
        `  Spikiest run <${scenario.peakRunUrl}|${scenario.peakRunId}> at JS work ${peak} (${scenario.spikeRatio}× the median).`,
      );
    }
  }
  if (window.scenarios.length > scenarios.length) {
    lines.push(
      `_+${window.scenarios.length - scenarios.length} lower-signal scenarios in the workflow artifact._`,
    );
  }
  // Stability is a result too: it says the medians above are not an artefact
  // of one unlucky capture.
  if (
    scenarios.length > 0 &&
    scenarios.every((scenario) => scenario.spikeRatio < SPIKE_RATIO)
  ) {
    lines.push(
      '',
      `_Run-to-run spread:_ every scenario above stayed under ${SPIKE_RATIO}× its median, so no single capture skews these numbers.`,
    );
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; BrowserStack app-profiling data excluded.',
  );
  if (meta.symbolicatedProfileCount < meta.profileCount) {
    lines.push(
      `_Caveat:_ ${meta.profileCount - meta.symbolicatedProfileCount}/${meta.profileCount} profiles had no matching sourcemap, so frame names cannot be traced to files or owners.`,
    );
  }
  return lines.join('\n');
}

function writeWindowOutputs(outputDirectory, window) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const scenariosDirectory = path.join(outputDirectory, 'scenarios');
  fs.mkdirSync(scenariosDirectory, { recursive: true });
  for (const scenario of window.scenarios) {
    fs.writeFileSync(
      path.join(scenariosDirectory, `${sanitize(scenario.scenario)}.json`),
      `${JSON.stringify(scenario, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(outputDirectory, 'report.json'),
    `${JSON.stringify(window, null, 2)}\n`,
  );
  const markdown = `${buildWindowMarkdown(window)}\n`;
  fs.writeFileSync(path.join(outputDirectory, 'report.md'), markdown);
  fs.writeFileSync(path.join(outputDirectory, 'github-summary.md'), markdown);
  fs.writeFileSync(
    path.join(outputDirectory, 'slack.md'),
    `${buildWindowSlack(window)}\n`,
  );
}

function writeWeeklyOutputs(outputDirectory, weekly) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  writeEmptyScenarioManifest(outputDirectory);
  fs.writeFileSync(
    path.join(outputDirectory, 'report.json'),
    `${JSON.stringify(weekly, null, 2)}\n`,
  );
  const markdown = `${buildWeeklyMarkdown(weekly)}\n`;
  fs.writeFileSync(path.join(outputDirectory, 'report.md'), markdown);
  fs.writeFileSync(path.join(outputDirectory, 'github-summary.md'), markdown);
  fs.writeFileSync(
    path.join(outputDirectory, 'slack.md'),
    `${buildWeeklyParentSlack(weekly)}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, 'slack-cards.json'),
    `${JSON.stringify(weeklySlackCards(weekly), null, 2)}\n`,
  );
}

async function callClaude(briefing) {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;
  if (!apiKey) {
    return null;
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.APP_PROFILING_ANALYSIS_MODEL || DEFAULT_MODEL,
      max_tokens: 800,
      system:
        'You are a MetaMask Mobile performance engineer analyzing Hermes CPU sampling profiles.',
      messages: [{ role: 'user', content: briefing }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return (payload.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function writeOutputs(outputDirectory, report) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const scenariosDirectory = path.join(outputDirectory, 'scenarios');
  fs.mkdirSync(scenariosDirectory, { recursive: true });
  for (const scenario of report.scenarios) {
    fs.writeFileSync(
      path.join(scenariosDirectory, `${sanitize(scenario.scenario)}.json`),
      `${JSON.stringify(scenario, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(outputDirectory, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  const markdown = `${buildMarkdown(report)}\n`;
  fs.writeFileSync(path.join(outputDirectory, 'report.md'), markdown);
  fs.writeFileSync(
    path.join(outputDirectory, 'github-summary.md'),
    markdown,
  );
  fs.writeFileSync(
    path.join(outputDirectory, 'slack.md'),
    `${buildSlack(report)}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, 'ai-briefing.md'),
    buildAiBriefing(report),
  );
}

function writeScenarioArtifacts(
  outputDirectory,
  profiles,
  scenarios,
  performanceRunId = null,
) {
  const artifactsDirectory = path.join(outputDirectory, 'scenario-artifacts');
  fs.mkdirSync(artifactsDirectory, { recursive: true });

  const artifacts = scenarios.map((scenario, index) => {
    const artifactName = `hermes-profile-${String(index + 1).padStart(2, '0')}-${sanitize(scenario.scenario).slice(0, 100)}`;
    const scenarioDirectory = path.join(artifactsDirectory, artifactName);
    const rawDirectory = path.join(scenarioDirectory, 'raw');
    const symbolicatedDirectory = path.join(scenarioDirectory, 'symbolicated');
    fs.mkdirSync(rawDirectory, { recursive: true });

    const matchingProfiles = profiles.filter(
      (profile) =>
        profile.project === scenario.projectName &&
        profile.scenario === scenario.scenario,
    );
    for (const profile of matchingProfiles) {
      if (profile.sourcePath && fs.existsSync(profile.sourcePath)) {
        fs.copyFileSync(
          profile.sourcePath,
          path.join(rawDirectory, path.basename(profile.sourcePath)),
        );
      }
      if (
        profile.symbolicated &&
        profile.analysisPath &&
        fs.existsSync(profile.analysisPath)
      ) {
        fs.mkdirSync(symbolicatedDirectory, { recursive: true });
        fs.copyFileSync(
          profile.analysisPath,
          path.join(symbolicatedDirectory, path.basename(profile.analysisPath)),
        );
      }
    }
    fs.writeFileSync(
      path.join(scenarioDirectory, 'README.md'),
      `# ${displayName(scenario.scenario)}\n\n` +
        `Performance run: ${performanceRunId || 'local analysis'}\n\n` +
        '- `raw/` contains every Hermes `.cpuprofile` segment and retry captured for this scenario.\n' +
        '- `symbolicated/` contains converted profiles with resolved source locations when a matching sourcemap was available.\n',
    );
    return {
      artifactName,
      path: scenarioDirectory,
      scenario: displayName(scenario.scenario),
    };
  });

  fs.writeFileSync(
    path.join(outputDirectory, 'scenario-artifacts.json'),
    `${JSON.stringify({ include: artifacts }, null, 2)}\n`,
  );
  return artifacts;
}

function writeEmptyScenarioManifest(outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, 'scenario-artifacts.json'),
    `${JSON.stringify({ include: [] }, null, 2)}\n`,
  );
}

function writeWindowScenarioArtifacts(outputDirectory, runReports) {
  const byScenario = new Map();
  for (const report of runReports) {
    const manifestPath = path.join(
      outputDirectory,
      'runs',
      String(report.meta.runId),
      'scenario-artifacts.json',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const artifact of manifest.include || []) {
      const entries = byScenario.get(artifact.scenario) || [];
      entries.push({ ...artifact, runId: report.meta.runId });
      byScenario.set(artifact.scenario, entries);
    }
  }

  const root = path.join(outputDirectory, 'scenario-artifacts');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const artifacts = [...byScenario.entries()].map(
    ([scenario, runArtifacts], index) => {
      const artifactName = `hermes-profile-${String(index + 1).padStart(2, '0')}-${sanitize(scenario).slice(0, 100)}`;
      const target = path.join(root, artifactName);
      for (const artifact of runArtifacts) {
        fs.cpSync(
          artifact.path,
          path.join(target, `run-${artifact.runId}`),
          { recursive: true },
        );
      }
      return { artifactName, path: target, scenario };
    },
  );
  fs.writeFileSync(
    path.join(outputDirectory, 'scenario-artifacts.json'),
    `${JSON.stringify({ include: artifacts }, null, 2)}\n`,
  );
  return artifacts;
}

function downloadRunInputs({ runId, repo, workingDirectory }) {
  const sourceDirectory = path.join(workingDirectory, 'source-profiles');
  const sourcemapDirectory = path.join(workingDirectory, 'source-sourcemaps');

  // New runs expose small dedicated artifacts. Existing 6-hour runs keep
  // the same named profiles inside their raw test-result artifacts.
  const dedicated = downloadArtifactPattern(
    runId,
    'hermes-cpuprofiles-*',
    sourceDirectory,
    repo,
  );
  if (!dedicated || findHermesProfiles(sourceDirectory).length === 0) {
    console.log('📥 Falling back to raw *-test-results-* artifacts');
    downloadArtifactPattern(runId, '*-test-results-*', sourceDirectory, repo);
  }

  // Sourcemaps are accepted only from the same workflow run. Repacked APKs
  // publish the two variants together; fresh builds publish one artifact per
  // build profile. Missing or ambiguous variants remain unsymbolicated.
  downloadArtifactPattern(
    runId,
    'performance-android-sourcemaps',
    sourcemapDirectory,
    repo,
  );
  downloadArtifactPattern(
    runId,
    'android-sourcemaps-main-*-with-srp',
    path.join(sourcemapDirectory, 'with-srp'),
    repo,
  );
  downloadArtifactPattern(
    runId,
    'android-sourcemaps-main-*-without-srp',
    path.join(sourcemapDirectory, 'without-srp'),
    repo,
  );

  return { sourceDirectory, sourcemapDirectory };
}

async function analyzeProfileDirectory({
  sourceDirectory,
  sourcemapDirectory,
  workingDirectory,
  scenarioFilter,
  skillAnalyzerPath,
}) {
  const files = [...new Set(findHermesProfiles(sourceDirectory))];
  if (files.length === 0) {
    // Thrown, not exited: a week-long window keeps going when one run's
    // artifacts have expired. `main` turns this into the same fatal error.
    throw new Error('No named Hermes profiles found under hermes-cpuprofiles/');
  }
  console.log(`🧠 Hermes CPU profiles: ${files.length}`);
  const sourcemaps = findAndroidSourcemaps(sourcemapDirectory);
  console.log(`🗺️ Verified same-run Android sourcemaps: ${sourcemaps.length}`);

  const convertedDirectory = path.join(workingDirectory, 'symbolicated');
  const profiles = [];
  for (const [index, filePath] of files.entries()) {
    const sourcemapPath = selectSourcemap(filePath, sourcemaps);
    if (!sourcemapPath) {
      profiles.push(loadProfile(filePath, skillAnalyzerPath));
      continue;
    }
    try {
      const profileOutputDirectory = path.join(
        convertedDirectory,
        `${String(index + 1).padStart(3, '0')}-${sanitize(
          path.basename(filePath, '.cpuprofile'),
        )}`,
      );
      const analysisPath = await convertProfile(
        filePath,
        sourcemapPath,
        profileOutputDirectory,
      );
      profiles.push(
        loadProfile(filePath, skillAnalyzerPath, {
          analysisPath,
          sourcemapPath,
        }),
      );
    } catch (error) {
      console.warn(
        `⚠️ Symbolication failed for ${path.basename(filePath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      profiles.push(loadProfile(filePath, skillAnalyzerPath));
    }
  }

  const scenarios = groupProfiles(profiles, scenarioFilter);
  if (scenarios.length === 0) {
    throw new Error(
      scenarioFilter
        ? `No Hermes scenario matched "${scenarioFilter}"`
        : 'No Hermes scenarios found',
    );
  }
  return { profiles, scenarios };
}

async function analyzeRun({
  args,
  run = null,
  runId = null,
  workingDirectory,
  skillAnalyzerPath,
  localDirectory = null,
}) {
  let resolvedRun = run;
  if (!resolvedRun && runId && !localDirectory) {
    try {
      resolvedRun = getRunMetadata(args.repo, runId);
    } catch (error) {
      console.log(
        `ℹ️ Could not load run metadata for ${runId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const { sourceDirectory, sourcemapDirectory } = localDirectory
    ? { sourceDirectory: localDirectory, sourcemapDirectory: localDirectory }
    : downloadRunInputs({
        runId,
        repo: args.repo,
        workingDirectory,
      });

  const { profiles, scenarios } = await analyzeProfileDirectory({
    sourceDirectory,
    sourcemapDirectory,
    workingDirectory,
    scenarioFilter: args.scenario,
    skillAnalyzerPath,
  });
  if (args.skipScenarioArtifacts) {
    writeEmptyScenarioManifest(workingDirectory);
  } else {
    writeScenarioArtifacts(workingDirectory, profiles, scenarios, runId);
  }

  return {
    meta: {
      mode: args.collectOnly ? 'collect' : 'single-run',
      runId,
      runUrl:
        resolvedRun?.url ||
        (runId ? `https://github.com/${args.repo}/actions/runs/${runId}` : null),
      createdAt: resolvedRun?.createdAt || null,
      generatedAt: new Date().toISOString(),
      source: 'Hermes CPU sampling profiles only',
      reasoningSkill: 'mms-swaps-cpu-profile-audit',
      reasoningParser: path.relative(process.cwd(), skillAnalyzerPath),
      profileCount: profiles.length,
      symbolicatedProfileCount: profiles.filter(
        (profile) => profile.symbolicated,
      ).length,
      analysisArtifactsUrl: analysisArtifactsUrl(
        args.repo,
        process.env.GITHUB_RUN_ID,
      ),
      ai: false,
    },
    scenarios,
    aiAnalysis: null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDirectory =
    args.outDir ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-profile-analysis-'));

  if (!args.currentDir && args.skipDownload) {
    fail('--current-dir is required with --skip-download');
  }

  const skillAnalyzerPath = findSkillAnalyzer();
  console.log(
    `🧭 Reasoning parser: ${path.relative(process.cwd(), skillAnalyzerPath)}`,
  );

  if (args.weekly) {
    await runWeeklyAnalysis({ args, outputDirectory, skillAnalyzerPath });
    return;
  }

  if (args.lookbackHours && !args.currentDir) {
    await runWindowAnalysis({ args, outputDirectory, skillAnalyzerPath });
    return;
  }

  let run = null;
  if (!args.currentDir && !args.run) {
    run = resolveLatestRun(
      listLatestRuns({
        repo: args.repo,
        workflow: args.workflow,
        branch: args.branch,
      }),
      { scheduledOnly: args.scheduledOnly },
    );
    if (!run) {
      fail('No matching performance run found');
    }
    args.run = String(run.databaseId);
  }

  const report = await analyzeRun({
    args,
    run,
    runId: args.run,
    workingDirectory: outputDirectory,
    skillAnalyzerPath,
    localDirectory: args.currentDir,
  });

  if (!args.skipAi && !args.dryRun) {
    report.aiAnalysis = await callClaude(buildAiBriefing(report));
    report.meta.ai = Boolean(report.aiAnalysis);
  }
  writeOutputs(outputDirectory, report);
  console.log(
    `✅ Wrote Hermes-only analysis for ${report.scenarios.length} scenarios to ${outputDirectory}`,
  );
}

async function runWindowAnalysis({ args, outputDirectory, skillAnalyzerPath }) {
  const now = Date.now();
  const runs = resolveRunsInWindow(
    listLatestRuns({
      repo: args.repo,
      workflow: args.workflow,
      branch: args.branch,
      limit: Math.max(20, Math.ceil(args.lookbackHours / 6) * 2),
    }),
    { lookbackHours: args.lookbackHours, now, scheduledOnly: args.scheduledOnly },
  );
  if (runs.length === 0) {
    fail(`No performance run finished in the last ${args.lookbackHours}h`);
  }
  console.log(
    `🗓️ Runs in the last ${args.lookbackHours}h: ${runs
      .map((run) => run.databaseId)
      .join(', ')}`,
  );

  const runReports = [];
  for (const run of runs) {
    const runId = String(run.databaseId);
    console.log(`\n▶️ Run ${runId} (${run.createdAt})`);
    const runDirectory = path.join(outputDirectory, 'runs', runId);
    const report = await analyzeRun({
      args,
      run,
      runId,
      workingDirectory: runDirectory,
      skillAnalyzerPath,
    });
    writeOutputs(runDirectory, report);
    runReports.push(report);
  }
  writeWindowScenarioArtifacts(outputDirectory, runReports);

  const window = aggregateWindow(runReports, {
    lookbackHours: args.lookbackHours,
    since: new Date(now - args.lookbackHours * 60 * 60 * 1000).toISOString(),
    until: new Date(now).toISOString(),
    repo: args.repo,
    reasoningParser: path.relative(process.cwd(), skillAnalyzerPath),
  });
  writeWindowOutputs(outputDirectory, window);
  console.log(
    `\n✅ Wrote a ${args.lookbackHours}h window analysis for ${window.scenarios.length} scenarios across ${runReports.length} runs to ${outputDirectory}`,
  );
}

/**
 * Picks `limit` uncollected runs across the newest UTC days that still have
 * runs, instead of spreading into expired early-week artifacts. One run is
 * taken from each newest day before a second run is taken from any day.
 */
function sampleRunsAcrossNewestDays(runs, limit) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return [];
  }
  if (runs.length <= limit) {
    return [...runs];
  }
  const byDay = new Map();
  for (const run of runs) {
    const day = utcDateKey(run.createdAt) || 'unknown';
    if (!byDay.has(day)) {
      byDay.set(day, []);
    }
    byDay.get(day).push(run);
  }
  const days = [...byDay.keys()].sort((left, right) => {
    if (left === 'unknown') {
      return 1;
    }
    if (right === 'unknown') {
      return -1;
    }
    return right.localeCompare(left);
  });
  const selected = [];
  while (selected.length < limit) {
    let added = false;
    for (const day of days) {
      const bucket = byDay.get(day);
      if (!bucket?.length) {
        continue;
      }
      selected.push(bucket.shift());
      added = true;
      if (selected.length >= limit) {
        break;
      }
    }
    if (!added) {
      break;
    }
  }
  const selectedIds = new Set(selected.map((run) => String(run.databaseId)));
  return runs.filter((run) => selectedIds.has(String(run.databaseId)));
}

function planWeeklyRuns(runs, collectedByRunId, maxRunsPerWeek = null) {
  const collected = runs.filter((run) =>
    collectedByRunId.has(String(run.databaseId)),
  );
  const uncollected = runs.filter(
    (run) => !collectedByRunId.has(String(run.databaseId)),
  );
  const sampled =
    maxRunsPerWeek === null
      ? uncollected
      : sampleRunsAcrossNewestDays(uncollected, maxRunsPerWeek);
  const selectedIds = new Set(
    [...collected, ...sampled].map((run) => String(run.databaseId)),
  );
  return {
    selected: runs.filter((run) => selectedIds.has(String(run.databaseId))),
    skipped: uncollected.length - sampled.length,
  };
}

/**
 * Runs the previous week left unspent go back to this week. Only days that
 * already have data are retried, so recovering a run cannot move the day set
 * the previous week was matched against.
 */
function runsToRetryWithLeftoverBudget(runs, skipped, dayKeys) {
  const outOfBudget = new Set(
    skipped
      .filter((entry) => entry.reason === BUDGET_EXHAUSTED)
      .map((entry) => entry.runId),
  );
  if (outOfBudget.size === 0) {
    return [];
  }
  return runsOnUtcDates(
    runs.filter((run) => outOfBudget.has(String(run.databaseId))),
    dayKeys,
  );
}

async function reportsForRuns({
  args,
  runs,
  collectedByRunId,
  outputDirectory,
  skillAnalyzerPath,
  label,
  deadlineMs = Infinity,
  clock = Date.now,
  analyze = analyzeRun,
}) {
  const reports = [];
  const skipped = [];
  for (const run of runs) {
    const runId = String(run.databaseId);
    const collected = collectedByRunId.get(runId);
    if (collected) {
      console.log(`📦 Reusing collected report for ${runId}`);
      reports.push({
        ...collected,
        meta: {
          ...collected.meta,
          runId,
          runUrl: collected.meta.runUrl || run.url,
          createdAt: collected.meta.createdAt || run.createdAt,
        },
      });
      continue;
    }
    // Runs arrive newest first, so an exhausted budget drops the oldest runs,
    // which are also the ones whose artifacts are closest to expiring.
    if (clock() >= deadlineMs) {
      console.warn(`⚠️ Skipping ${label} run ${runId}: ${BUDGET_EXHAUSTED}`);
      skipped.push({ runId, reason: BUDGET_EXHAUSTED });
      continue;
    }
    console.log(`\n▶️ ${label} run ${runId} (${run.createdAt})`);
    const runDirectory = path.join(outputDirectory, 'runs', runId);
    try {
      const report = await analyze({
        args: { ...args, skipScenarioArtifacts: true, collectOnly: true },
        run,
        runId,
        workingDirectory: runDirectory,
        skillAnalyzerPath,
      });
      writeOutputs(runDirectory, report);
      reports.push(report);
    } catch (error) {
      // Artifacts expire before the two-week comparison window closes, so a
      // run with nothing left to read is one fewer sample, not a failed week.
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Skipping ${label} run ${runId}: ${reason}`);
      skipped.push({ runId, reason });
    }
    // A whole week of downloads and converted profiles does not fit on the
    // runner; the report itself is all the window needs.
    for (const directory of [
      'source-profiles',
      'source-sourcemaps',
      'symbolicated',
    ]) {
      fs.rmSync(path.join(runDirectory, directory), {
        recursive: true,
        force: true,
      });
    }
  }
  return { reports, skipped };
}

async function runWeeklyAnalysis({ args, outputDirectory, skillAnalyzerPath }) {
  const now = args.now ? new Date(args.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    fail('--now must be a valid date');
  }
  const bounds = weekBounds(now);
  const listedRuns = listLatestRuns({
    repo: args.repo,
    workflow: args.workflow,
    branch: args.branch,
    limit: 80,
  });
  const thisWeekRuns = resolveRunsInRange(listedRuns, {
    sinceIso: bounds.thisWeek.since,
    untilIso: bounds.thisWeek.until,
    scheduledOnly: true,
  });
  const lastWeekRuns = resolveRunsInRange(listedRuns, {
    sinceIso: bounds.lastWeek.since,
    untilIso: bounds.lastWeek.until,
    scheduledOnly: true,
  });
  if (thisWeekRuns.length === 0 && lastWeekRuns.length === 0) {
    fail('No scheduled performance runs finished in the last two UTC weeks');
  }
  console.log(
    `🗓️ This week ${bounds.thisWeek.since} → ${bounds.thisWeek.until}: ${thisWeekRuns.map((run) => run.databaseId).join(', ') || 'none'}`,
  );
  console.log(
    `🗓️ Previous week ${bounds.lastWeek.since} → ${bounds.lastWeek.until}: ${lastWeekRuns.map((run) => run.databaseId).join(', ') || 'none'}`,
  );

  const collectedByRunId = loadCollectedReports(
    args.repo,
    bounds.lastWeek.since,
    bounds.thisWeek.until,
  );
  const thisWeekPlan = planWeeklyRuns(
    thisWeekRuns,
    collectedByRunId,
    args.maxRunsPerWeek,
  );
  if (thisWeekPlan.skipped > 0) {
    console.log(
      `ℹ️ Capping uncollected this-week runs: ${thisWeekPlan.selected.length}/${thisWeekRuns.length}`,
    );
  }
  // Half the budget is reserved for the previous week, or a week with plenty
  // of raw runs would leave nothing to compare against.
  const budgetMs = args.maxAnalysisMinutes * 60 * 1000;
  const startedAtMs = Date.now();
  console.log(
    `⏱️ Rebuilding uncollected runs within ${args.maxAnalysisMinutes} min (half reserved for the previous week)`,
  );
  const thisWeek = await reportsForRuns({
    args,
    runs: thisWeekPlan.selected,
    collectedByRunId,
    outputDirectory,
    skillAnalyzerPath,
    label: 'this-week',
    deadlineMs: startedAtMs + budgetMs / 2,
  });
  const thisWeekReports = thisWeek.reports;
  if (thisWeekReports.length === 0) {
    fail(
      'No scheduled run in the last completed week still has Hermes profiles to analyze',
    );
  }

  const lastWeekComparable = lastWeekRunsMatchingThisWeekDays(
    thisWeekReports,
    lastWeekRuns,
  );
  console.log(
    `🗓️ Days with data this week: ${lastWeekComparable.thisWeekDays.join(', ') || 'unknown'}`,
  );
  console.log(
    `🗓️ Matching weekdays last week: ${lastWeekComparable.lastWeekDays.join(', ') || 'none'} → ${lastWeekComparable.runs.map((run) => run.databaseId).join(', ') || 'none'}`,
  );
  const lastWeekPlan = planWeeklyRuns(
    lastWeekComparable.runs,
    collectedByRunId,
    args.maxRunsPerWeek,
  );
  if (lastWeekPlan.skipped > 0) {
    console.log(
      `ℹ️ Capping uncollected last-week runs: ${lastWeekPlan.selected.length}/${lastWeekComparable.runs.length}`,
    );
  }
  const lastWeek = await reportsForRuns({
    args,
    runs: lastWeekPlan.selected,
    collectedByRunId,
    outputDirectory,
    skillAnalyzerPath,
    label: 'last-week',
    deadlineMs: startedAtMs + budgetMs,
  });
  const lastWeekReports = lastWeek.reports;

  // The previous week is mostly expired or already collected, so it usually
  // returns its half of the budget in seconds. Spend what is left on the
  // this-week runs that were dropped.
  const retryRuns = runsToRetryWithLeftoverBudget(
    thisWeekPlan.selected,
    thisWeek.skipped,
    lastWeekComparable.thisWeekDays,
  );
  if (retryRuns.length > 0 && Date.now() < startedAtMs + budgetMs) {
    console.log(
      `⏱️ Unused previous-week budget: retrying ${retryRuns.length} this-week runs`,
    );
    const retried = await reportsForRuns({
      args,
      runs: retryRuns,
      collectedByRunId,
      outputDirectory,
      skillAnalyzerPath,
      label: 'this-week retry',
      deadlineMs: startedAtMs + budgetMs,
    });
    thisWeekReports.push(...retried.reports);
  }

  const thisWindow = aggregateWindow(thisWeekReports, {
    lookbackHours: 168,
    since: bounds.thisWeek.since,
    until: bounds.thisWeek.until,
    repo: args.repo,
    reasoningParser: path.relative(process.cwd(), skillAnalyzerPath),
  });
  const lastWindow = aggregateWindow(lastWeekReports, {
    lookbackHours: 168,
    since: bounds.lastWeek.since,
    until: bounds.lastWeek.until,
    repo: args.repo,
    reasoningParser: path.relative(process.cwd(), skillAnalyzerPath),
  });
  const thisWeekRunsAvailable = lastWeekComparable.thisWeekDays.length
    ? runsOnUtcDates(thisWeekRuns, lastWeekComparable.thisWeekDays).length
    : thisWeekRuns.length;
  const weekly = buildWeeklyReport({
    thisWindow,
    lastWindow,
    bounds,
    thisWeekRunCount: thisWeekReports.length,
    lastWeekRunCount: lastWeekReports.length,
    thisWeekRunsAvailable,
    lastWeekRunsAvailable: lastWeekComparable.runs.length,
    thisWeekDays: lastWeekComparable.thisWeekDays,
    lastWeekDays: lastWeekComparable.lastWeekDays,
  });
  writeWeeklyOutputs(outputDirectory, weekly);
  console.log(
    `\n✅ Wrote weekly conclusions for ${weekly.cards.length} flagged scenarios (${thisWeekReports.length}/${thisWeekRunsAvailable} this-week reports, ${lastWeekReports.length}/${lastWeekComparable.runs.length} last-week reports) to ${outputDirectory}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    fail(error instanceof Error ? error.message : String(error));
  });
}

export {
  parseArgs,
  resolveLatestRun,
  resolveRunsInWindow,
  resolveRunsInRange,
  sampleRunsAcrossNewestDays,
  planWeeklyRuns,
  loadCollectedReports,
  runsToRetryWithLeftoverBudget,
  reportsForRuns,
  isReusableCollectedReport,
  writeEmptyScenarioManifest,
  findHermesProfiles,
  findAndroidSourcemaps,
  sourcemapVariant,
  profileSourcemapVariant,
  selectSourcemap,
  convertProfile,
  findSkillAnalyzer,
  runSkillAnalyzer,
  parseProfileFileName,
  summarizeHermesProfile,
  mergeFrameLists,
  groupProfiles,
  buildAiBriefing,
  buildMarkdown,
  buildSlack,
  buildConclusions,
  writeScenarioArtifacts,
  writeWindowScenarioArtifacts,
  markdownDownloadLines,
  slackDownloadLines,
  median,
  scenarioFrameTotals,
  aggregateWindow,
  buildWindowMarkdown,
  buildWindowSlack,
};
