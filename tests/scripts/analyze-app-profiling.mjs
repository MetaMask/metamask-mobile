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
 *   node tests/scripts/analyze-app-profiling.mjs
 *   node tests/scripts/analyze-app-profiling.mjs --run 123456789
 *   node tests/scripts/analyze-app-profiling.mjs --scenario "Cold Start"
 *   node tests/scripts/analyze-app-profiling.mjs \
 *     --current-dir ./downloaded-test-results --skip-ai
 *
 * Requirements:
 *   - `gh` with actions:read when downloading a run
 *   - E2E_CLAUDE_API_KEY for the optional agent pass
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_REPO = 'MetaMask/metamask-mobile';
const DEFAULT_WORKFLOW = 'run-performance-e2e-manual.yml';
const DEFAULT_BRANCH = 'main';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_PROFILE_BYTES = 50 * 1024 * 1024;
const TOP_FRAMES = 15;
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
      case '--any-run':
        args.scheduledOnly = false;
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
  return args;
}

function printHelp() {
  console.log(`Usage:
  node tests/scripts/analyze-app-profiling.mjs [options]

Options:
  --run <id>             Performance workflow run id
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

function listLatestRuns({ repo, workflow, branch }) {
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
      '20',
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

function convertProfile(profilePath, sourcemapPath, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = spawnSync(
    'yarn',
    [
      'react-native-release-profiler',
      '--local',
      path.resolve(profilePath),
      '--sourcemap-path',
      path.resolve(sourcemapPath),
    ],
    {
      cwd: outputDirectory,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      (result.stderr ||
        result.stdout ||
        `profile conversion failed for ${profilePath}`).trim(),
    );
  }
  const convertedPath = path.join(
    outputDirectory,
    `${path.basename(profilePath, '.cpuprofile')}-converted.json`,
  );
  if (!fs.existsSync(convertedPath)) {
    throw new Error(`profile converter did not create ${convertedPath}`);
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
      fullPath.split(path.sep).includes('hermes-cpuprofiles')
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
  const stat = fs.statSync(filePath);
  const metadata = parseProfileFileName(filePath);
  if (stat.size > MAX_PROFILE_BYTES) {
    return {
      ...metadata,
      skipped: true,
      reason: `file too large (${(stat.size / 1024 / 1024).toFixed(1)} MB)`,
    };
  }
  try {
    return {
      ...metadata,
      skipped: false,
      analysisPath,
      sourcemapPath,
      symbolicated: Boolean(sourcemapPath),
      skillAudit: runSkillAnalyzer(analysisPath, skillAnalyzerPath, {
        symbolicated: Boolean(sourcemapPath),
      }),
      ...summarizeHermesProfile(JSON.parse(fs.readFileSync(filePath, 'utf8'))),
    };
  } catch (error) {
    return {
      ...metadata,
      skipped: true,
      reason: `unreadable: ${error.message}`,
    };
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
  if (share < 5) {
    return `No single frame reached 5% of JS work; JS duty cycle ${(
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
    : '- HARD RULE: every profile lacks matching sourcemaps. Omit all probable-cause/fix tables. Do not recommend memoization, batching, workers, deferral, or any code change. Report timing and hot function names only, then add one factual caveat line.'
}
- Without resolved paths, never say that no swaps-owned work ran. Say swaps
  ownership is indeterminate because the trace is unsymbolicated.
- Do not provide causes, fixes, ownership conclusions, or implementation
  suggestions. The input contains timing evidence, not source-code review.

Output:
Maximum 3 bullets. Mention only timing outliers or repeated contributors that
are directly supported by the JSON. Omit a bullet if there is no useful
cross-scenario observation.

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
  lines.push(
    '_Hermes CPU sampling only. BrowserStack app-profiling metrics are excluded._',
    '',
  );
  return lines.join('\n');
}

function buildSlack(report) {
  const lines = [
    '*Hermes CPU-profile analysis*',
    '',
    `_Run:_ \`${report.meta.runId || 'local'}\``,
    `_Scenarios:_ ${report.scenarios.length} · _Profiles:_ ${report.meta.profileCount}`,
    `_Profiles with a matching sourcemap:_ ${report.meta.symbolicatedProfileCount}/${report.meta.profileCount}`,
    '',
    '*Highest-signal scenarios (skill timing)*',
  ];
  const scenarios = [...report.scenarios]
    .sort(
      (left, right) =>
        right.averageJsWorkMs * (right.jsDutyPct / 100) -
        left.averageJsWorkMs * (left.jsDutyPct / 100),
    )
    .slice(0, 12);
  for (const scenario of scenarios) {
    const highestSignalProfile = scenario.profiles
      .filter((profile) => profile.skillAudit)
      .sort(
        (left, right) =>
          (right.skillAudit?.jsWorkMs || 0) -
          (left.skillAudit?.jsWorkMs || 0),
      )[0];
    const attemptLabel =
      scenario.attempts.length > 1 ? `${attemptDescription(scenario)}, ` : '';
    lines.push(
      `• *${displayName(scenario.scenario)}* — ${attemptLabel}avg JS ${formatMs(scenario.averageJsWorkMs)}, duty ${scenario.jsDutyPct}%, sourcemaps ${scenario.symbolicatedProfiles}/${scenario.profileCount}`,
      `  ${highestSignalProfile ? profileOutcome(highestSignalProfile) : 'No readable skill timing data.'}`,
    );
  }
  if (report.scenarios.length > scenarios.length) {
    lines.push(
      `_+${report.scenarios.length - scenarios.length} lower-signal scenarios in the workflow artifact._`,
    );
  }
  if (report.aiAnalysis) {
    lines.push('', '*Optional context*', report.aiAnalysis.trim().slice(0, 2_000));
  }
  lines.push(
    '',
    '_Source:_ Hermes CPU sampling only; BrowserStack app-profiling data excluded.',
    '_Disclaimer:_ Testing only — not a production alert.',
  );
  return lines.join('\n');
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDirectory =
    args.outDir ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-profile-analysis-'));
  let sourceDirectory = args.currentDir;
  let sourcemapDirectory = args.currentDir;
  let run = null;

  if (!sourceDirectory && args.skipDownload) {
    fail('--current-dir is required with --skip-download');
  }

  if (!sourceDirectory) {
    if (!args.run) {
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
    sourceDirectory = path.join(outputDirectory, 'source-profiles');
    sourcemapDirectory = path.join(outputDirectory, 'source-sourcemaps');

    // New runs expose small dedicated artifacts. Existing 6-hour runs keep
    // the same named profiles inside their raw test-result artifacts.
    const dedicated = downloadArtifactPattern(
      args.run,
      'hermes-cpuprofiles-*',
      sourceDirectory,
      args.repo,
    );
    if (!dedicated || findHermesProfiles(sourceDirectory).length === 0) {
      console.log('📥 Falling back to raw *-test-results-* artifacts');
      downloadArtifactPattern(
        args.run,
        '*-test-results-*',
        sourceDirectory,
        args.repo,
      );
    }

    // Sourcemaps are accepted only from the same workflow run. Repacked APKs
    // publish the two variants together; fresh builds publish one artifact per
    // build profile. Missing or ambiguous variants remain unsymbolicated.
    downloadArtifactPattern(
      args.run,
      'performance-android-sourcemaps',
      sourcemapDirectory,
      args.repo,
    );
    downloadArtifactPattern(
      args.run,
      'android-sourcemaps-main-*-with-srp',
      path.join(sourcemapDirectory, 'with-srp'),
      args.repo,
    );
    downloadArtifactPattern(
      args.run,
      'android-sourcemaps-main-*-without-srp',
      path.join(sourcemapDirectory, 'without-srp'),
      args.repo,
    );
  }

  const files = [...new Set(findHermesProfiles(sourceDirectory))];
  if (files.length === 0) {
    fail('No named Hermes profiles found under hermes-cpuprofiles/');
  }
  console.log(`🧠 Hermes CPU profiles: ${files.length}`);
  const sourcemaps = findAndroidSourcemaps(sourcemapDirectory);
  console.log(`🗺️ Verified same-run Android sourcemaps: ${sourcemaps.length}`);

  const skillAnalyzerPath = findSkillAnalyzer();
  console.log(
    `🧭 Reasoning parser: ${path.relative(process.cwd(), skillAnalyzerPath)}`,
  );
  const convertedDirectory = path.join(outputDirectory, 'symbolicated');
  const profiles = files.map((filePath, index) => {
    const sourcemapPath = selectSourcemap(filePath, sourcemaps);
    if (!sourcemapPath) {
      return loadProfile(filePath, skillAnalyzerPath);
    }
    try {
      const profileOutputDirectory = path.join(
        convertedDirectory,
        `${String(index + 1).padStart(3, '0')}-${sanitize(
          path.basename(filePath, '.cpuprofile'),
        )}`,
      );
      const analysisPath = convertProfile(
        filePath,
        sourcemapPath,
        profileOutputDirectory,
      );
      return loadProfile(filePath, skillAnalyzerPath, {
        analysisPath,
        sourcemapPath,
      });
    } catch (error) {
      console.warn(
        `⚠️ Symbolication failed for ${path.basename(filePath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return loadProfile(filePath, skillAnalyzerPath);
    }
  });
  const scenarios = groupProfiles(profiles, args.scenario);
  if (scenarios.length === 0) {
    fail(
      args.scenario
        ? `No Hermes scenario matched "${args.scenario}"`
        : 'No Hermes scenarios found',
    );
  }

  const report = {
    meta: {
      runId: args.run,
      runUrl:
        run?.url ||
        (args.run
          ? `https://github.com/${args.repo}/actions/runs/${args.run}`
          : null),
      createdAt: run?.createdAt || null,
      generatedAt: new Date().toISOString(),
      source: 'Hermes CPU sampling profiles only',
      reasoningSkill: 'mms-swaps-cpu-profile-audit',
      reasoningParser: path.relative(process.cwd(), skillAnalyzerPath),
      profileCount: profiles.length,
      symbolicatedProfileCount: profiles.filter(
        (profile) => profile.symbolicated,
      ).length,
      ai: false,
    },
    scenarios,
    aiAnalysis: null,
  };

  if (!args.skipAi && !args.dryRun) {
    report.aiAnalysis = await callClaude(buildAiBriefing(report));
    report.meta.ai = Boolean(report.aiAnalysis);
  }
  writeOutputs(outputDirectory, report);
  console.log(
    `✅ Wrote Hermes-only analysis for ${scenarios.length} scenarios to ${outputDirectory}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) =>
    fail(error instanceof Error ? error.message : String(error)),
  );
}

export {
  parseArgs,
  resolveLatestRun,
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
};
