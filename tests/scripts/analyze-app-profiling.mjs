#!/usr/bin/env node

/**
 * Ad-hoc per-scenario app-profiling analysis.
 *
 * Downloads (or reads) the per-scenario BrowserStack `app-profiling-*.json`
 * files from a performance E2E run, optionally attaches Hermes `.cpuprofile`
 * summaries, flags heuristic issues, and asks Claude to review each scenario.
 *
 * Usage:
 *   node tests/scripts/analyze-app-profiling.mjs
 *   node tests/scripts/analyze-app-profiling.mjs --run 123456789
 *   node tests/scripts/analyze-app-profiling.mjs --run 123 --scenario "Cold Start Login"
 *   node tests/scripts/analyze-app-profiling.mjs --current-dir ./aggregated-reports --skip-ai
 *
 * Requirements:
 *   - `gh` CLI with actions:read when downloading a run
 *   - E2E_CLAUDE_API_KEY for the agent pass (heuristics still run without it)
 *
 * Outputs (under --out-dir):
 *   - report.json
 *   - report.md
 *   - github-summary.md
 *   - slack.md
 *   - ai-briefing.md
 *   - scenarios/<safe-name>.json
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_REPO = 'MetaMask/metamask-mobile';
const DEFAULT_WORKFLOW = 'run-performance-e2e-manual.yml';
const DEFAULT_BRANCH = 'main';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_CPU_PROFILE_BYTES = 40 * 1024 * 1024;
const TOP_CPU_FUNCTIONS = 12;
const TOP_API_CALLS = 8;

const THRESHOLDS = {
  slowFramesHigh: 25,
  slowFramesMedium: 15,
  memMaxHighMb: 900,
  cpuAvgHigh: 40,
  cpuAvgMedium: 25,
  cpuMaxHigh: 80,
};

function parseArgs(argv) {
  const args = {
    run: null,
    scenario: null,
    repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    workflow: DEFAULT_WORKFLOW,
    branch: DEFAULT_BRANCH,
    currentDir: null,
    cpuProfilesDir: null,
    outDir: null,
    skipAi: false,
    skipDownload: false,
    scheduledOnly: true,
    baselineRun: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--run':
        args.run = next;
        i += 1;
        break;
      case '--scenario':
        args.scenario = next;
        i += 1;
        break;
      case '--repo':
        args.repo = next;
        i += 1;
        break;
      case '--workflow':
        args.workflow = next;
        i += 1;
        break;
      case '--branch':
        args.branch = next;
        i += 1;
        break;
      case '--current-dir':
        args.currentDir = next;
        i += 1;
        break;
      case '--cpu-profiles-dir':
        args.cpuProfilesDir = next;
        i += 1;
        break;
      case '--out-dir':
        args.outDir = next;
        i += 1;
        break;
      case '--baseline-run':
        args.baselineRun = next;
        i += 1;
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
  --run <id>                 Performance workflow run id
  --scenario <name>          Analyze only this scenario title
  --repo <owner/name>        GitHub repo (default: ${DEFAULT_REPO})
  --workflow <file>          Workflow that produced the run (default: ${DEFAULT_WORKFLOW})
  --branch <name>            Branch used to find the latest run (default: ${DEFAULT_BRANCH})
  --current-dir <path>       Local aggregated-reports directory (skip download)
  --cpu-profiles-dir <path>  Extra directory of Hermes .cpuprofile files
  --out-dir <path>           Output directory (default: tmp dir)
  --baseline-run <id>        Optional prior run to compare metrics against
  --skip-ai                  Heuristics only (do not call Claude)
  --skip-download            Require --current-dir
  --any-run                  When resolving latest run, include workflow_dispatch
  --dry-run                  Collect and write briefings, skip network AI call
`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGh(ghArgs, options = {}) {
  const env = {
    ...process.env,
    GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
  };
  const result = spawnSync('gh', ghArgs, {
    encoding: 'utf8',
    env,
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(stderr || stdout || `gh ${ghArgs.join(' ')} failed`);
  }
  return (result.stdout || '').trim();
}

function sanitizeFileSegment(value, maxLength = 80) {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, maxLength);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hermes artifacts are named:
 *   <project>-<title>.cpuprofile
 *   <project>-<title>.segment-2.cpuprofile
 *   <project>-<title>.retry-1.segment-3.cpuprofile
 * Segment 1 omits `.segment-1`. Extra `-N` before the extension is a
 * copy-collision suffix from aggregation, not a new scenario.
 */
function parseHermesProfileFileName(fileName) {
  let stem = String(fileName || '');
  if (stem.toLowerCase().endsWith('.cpuprofile')) {
    stem = stem.slice(0, -'.cpuprofile'.length);
  }

  let retry = 0;
  let segment = 1;
  let copyIndex = null;

  const segmentMatch = stem.match(/\.segment-(\d+)(?:-(\d+))?$/);
  if (segmentMatch) {
    segment = Number(segmentMatch[1]);
    if (segmentMatch[2]) {
      copyIndex = Number(segmentMatch[2]);
    }
    stem = stem.slice(0, -segmentMatch[0].length);
  }

  const retryMatch = stem.match(/\.retry-(\d+)$/);
  if (retryMatch) {
    retry = Number(retryMatch[1]);
    stem = stem.slice(0, -retryMatch[0].length);
  }

  return {
    fileName,
    stem,
    retry,
    segment,
    copyIndex,
  };
}

function expectedCpuProfileStem(testName, projectName) {
  const titleKey = sanitizeFileSegment(testName);
  if (!projectName) {
    return titleKey;
  }
  return `${sanitizeFileSegment(projectName)}-${titleKey}`;
}

function cpuProfileBelongsToScenario(fileName, testName, projectName) {
  const expected = expectedCpuProfileStem(testName, projectName);
  const pattern = new RegExp(
    `^${escapeRegex(expected)}(?:-\\d+)?(?:\\.retry-\\d+)?(?:\\.segment-\\d+)?(?:-\\d+)?\\.cpuprofile$`,
  );
  return pattern.test(String(fileName || ''));
}

function round(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
}

function listLatestPerformanceRuns({
  repo,
  workflow,
  branch,
  limit = 20,
  runGhFn = runGh,
}) {
  const raw = runGhFn([
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
    'databaseId,conclusion,createdAt,event,url,headSha,displayTitle,status',
  ]);
  return JSON.parse(raw || '[]');
}

function resolveLatestRun(runs, { scheduledOnly = true } = {}) {
  const eligible = runs.filter((run) => {
    if (run.status && run.status !== 'completed') return false;
    if (run.conclusion && run.conclusion !== 'success') {
      // Profiling files can still exist on a failed/cancelled suite.
      if (run.conclusion !== 'failure') return false;
    }
    if (scheduledOnly && run.event && run.event !== 'schedule') return false;
    return true;
  });
  const successFirst = eligible.find((run) => run.conclusion === 'success');
  return successFirst || eligible[0] || null;
}

function downloadArtifact(runId, artifactName, destDir, repo, { runGhFn = runGh } = {}) {
  fs.mkdirSync(destDir, { recursive: true });
  runGhFn([
    'run',
    'download',
    String(runId),
    '--repo',
    repo,
    '-n',
    artifactName,
    '-D',
    destDir,
  ]);
}

function tryDownloadArtifactPattern(
  runId,
  pattern,
  destDir,
  repo,
  { runGhFn = runGh } = {},
) {
  fs.mkdirSync(destDir, { recursive: true });
  try {
    runGhFn([
      'run',
      'download',
      String(runId),
      '--repo',
      repo,
      '--pattern',
      pattern,
      '-D',
      destDir,
    ]);
    return true;
  } catch (error) {
    console.log(
      `ℹ️ Could not download ${pattern} from run ${runId}: ${error.message}`,
    );
    return false;
  }
}

function findFilesBySuffix(dir, suffix, acc = []) {
  if (!dir || !fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFilesBySuffix(fullPath, suffix, acc);
    } else if (entry.endsWith(suffix)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function loadAppProfilingArtifacts(rootDir, scenarioFilter) {
  const files = findFilesBySuffix(rootDir, '.json').filter((filePath) =>
    path.basename(filePath).startsWith('app-profiling-'),
  );
  const artifacts = [];
  for (const filePath of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      console.log(`⚠️ Skipping unreadable app-profiling file: ${filePath}`);
      continue;
    }
    if (!data || typeof data.testName !== 'string') continue;
    if (scenarioFilter && data.testName !== scenarioFilter) continue;
    artifacts.push({ filePath, data });
  }
  return artifacts;
}

function extractDetectedIssues(profilingData) {
  const appData = profilingData?.data?.['io.metamask'];
  const issues = appData?.detected_issues;
  if (!Array.isArray(issues)) return [];
  return issues.map((issue) => ({
    type: issue.type ?? null,
    title: issue.title ?? null,
    subtitle: issue.subtitle ?? null,
    current: issue.current ?? null,
    recommended: issue.recommended ?? null,
    unit: issue.unit ?? null,
  }));
}

function summarizeApiCalls(apiCalls) {
  if (!Array.isArray(apiCalls) || apiCalls.length === 0) {
    return { count: 0, slowest: [], errorStatus: [] };
  }
  const withTime = apiCalls
    .map((call) => ({
      method: call.method ?? null,
      url: call.url ?? null,
      status: call.status ?? null,
      time: round(call.time, 0),
    }))
    .filter((call) => call.url);
  const slowest = [...withTime]
    .filter((call) => call.time != null)
    .sort((a, b) => b.time - a.time)
    .slice(0, TOP_API_CALLS);
  const errorStatus = withTime.filter(
    (call) => typeof call.status === 'number' && call.status >= 400,
  );
  return { count: withTime.length, slowest, errorStatus: errorStatus.slice(0, 10) };
}

function extractMetrics(summary) {
  const s = summary || {};
  return {
    status: s.status ?? null,
    error: s.error ?? null,
    cpuAvg: round(s.cpu?.avg),
    cpuMax: round(s.cpu?.max),
    memAvgMb: round(s.memory?.avg),
    memMaxMb: round(s.memory?.max),
    slowFramesPct: round(s.uiRendering?.slowFrames),
    frozenFramesPct: round(s.uiRendering?.frozenFrames),
    anrs: s.uiRendering?.anrs ?? null,
    issues: s.issues ?? null,
    criticalIssues: s.criticalIssues ?? null,
    appSizeMb: round(s.appSizeMb),
  };
}

function detectHeuristicIssues(metrics, detectedIssues) {
  const findings = [];
  const { slowFramesPct, memMaxMb, cpuAvg, cpuMax, anrs, frozenFramesPct, criticalIssues, issues, error } =
    metrics;

  if (error) {
    findings.push({
      severity: 'medium',
      theme: 'missing-data',
      summary: `Profiling summary error: ${error}`,
    });
  }
  if (slowFramesPct != null && slowFramesPct >= THRESHOLDS.slowFramesHigh) {
    findings.push({
      severity: 'high',
      theme: 'ui-jank',
      summary: `Slow frames ${slowFramesPct}% (>= ${THRESHOLDS.slowFramesHigh}%). Investigate list/render cost on the JS thread.`,
    });
  } else if (slowFramesPct != null && slowFramesPct >= THRESHOLDS.slowFramesMedium) {
    findings.push({
      severity: 'medium',
      theme: 'ui-jank',
      summary: `Elevated slow frames ${slowFramesPct}% (>= ${THRESHOLDS.slowFramesMedium}%).`,
    });
  }
  if (memMaxMb != null && memMaxMb >= THRESHOLDS.memMaxHighMb) {
    findings.push({
      severity: 'high',
      theme: 'memory',
      summary: `Memory max ${memMaxMb} MB (>= ${THRESHOLDS.memMaxHighMb} MB). Investigate retained objects / subscriptions.`,
    });
  }
  if (cpuAvg != null && cpuAvg >= THRESHOLDS.cpuAvgHigh) {
    findings.push({
      severity: 'high',
      theme: 'cpu',
      summary: `CPU average ${cpuAvg}% (>= ${THRESHOLDS.cpuAvgHigh}%).`,
    });
  } else if (cpuAvg != null && cpuAvg >= THRESHOLDS.cpuAvgMedium) {
    findings.push({
      severity: 'medium',
      theme: 'cpu',
      summary: `CPU average ${cpuAvg}% (>= ${THRESHOLDS.cpuAvgMedium}%).`,
    });
  }
  if (cpuMax != null && cpuMax >= THRESHOLDS.cpuMaxHigh) {
    findings.push({
      severity: 'medium',
      theme: 'cpu-peak',
      summary: `CPU max ${cpuMax}% (>= ${THRESHOLDS.cpuMaxHigh}%).`,
    });
  }
  if (anrs != null && anrs > 0) {
    findings.push({
      severity: 'high',
      theme: 'anr',
      summary: `${anrs} ANR(s) reported by BrowserStack app profiling.`,
    });
  }
  if (frozenFramesPct != null && frozenFramesPct > 0) {
    findings.push({
      severity: 'medium',
      theme: 'frozen-frames',
      summary: `Frozen frames ${frozenFramesPct}%.`,
    });
  }
  if (criticalIssues != null && criticalIssues > 0) {
    findings.push({
      severity: 'high',
      theme: 'browserstack-critical',
      summary: `${criticalIssues} critical BrowserStack profiling issue(s).`,
    });
  } else if (issues != null && issues > 0) {
    findings.push({
      severity: 'medium',
      theme: 'browserstack-issues',
      summary: `${issues} BrowserStack profiling issue(s).`,
    });
  }

  for (const issue of detectedIssues) {
    findings.push({
      severity: 'medium',
      theme: 'detected-issue',
      summary: [issue.title, issue.subtitle]
        .filter(Boolean)
        .join(' — ')
        .concat(
          issue.current != null
            ? ` (current ${issue.current}${issue.unit ? ` ${issue.unit}` : ''})`
            : '',
        ),
    });
  }

  return findings;
}

function summarizeCpuProfile(profile, { topN = TOP_CPU_FUNCTIONS } = {}) {
  const nodes = Array.isArray(profile?.nodes) ? profile.nodes : [];
  const totalHits = nodes.reduce((sum, node) => sum + (node.hitCount || 0), 0);
  const topFunctions = nodes
    .map((node) => {
      const frame = node.callFrame || {};
      return {
        name: frame.functionName || '(anonymous)',
        url: frame.url || '',
        line: Number.isFinite(frame.lineNumber) ? frame.lineNumber : null,
        hitCount: node.hitCount || 0,
        sharePct:
          totalHits > 0 ? round(((node.hitCount || 0) / totalHits) * 100) : null,
      };
    })
    .filter((row) => row.hitCount > 0)
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, topN);

  const startTime = Number(profile.startTime);
  const endTime = Number(profile.endTime);
  let durationMs = null;
  if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
    const delta = endTime - startTime;
    // Chrome CPU profiles use microseconds; Hermes traces may too.
    durationMs = round(delta > 10_000 ? delta / 1000 : delta);
  }

  return {
    nodeCount: nodes.length,
    sampleCount: Array.isArray(profile.samples) ? profile.samples.length : 0,
    totalHits,
    durationMs,
    topFunctions,
  };
}

function loadCpuProfileSummaries(filePaths) {
  const summaries = [];
  for (const filePath of filePaths) {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_CPU_PROFILE_BYTES) {
      summaries.push({
        fileName: path.basename(filePath),
        filePath,
        skipped: true,
        reason: `file too large (${round(stat.size / (1024 * 1024), 1)} MB)`,
        ...parseHermesProfileFileName(path.basename(filePath)),
      });
      continue;
    }
    try {
      const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      summaries.push({
        fileName: path.basename(filePath),
        filePath,
        skipped: false,
        ...parseHermesProfileFileName(path.basename(filePath)),
        ...summarizeCpuProfile(profile),
      });
    } catch (error) {
      summaries.push({
        fileName: path.basename(filePath),
        filePath,
        skipped: true,
        reason: `unreadable: ${error.message}`,
        ...parseHermesProfileFileName(path.basename(filePath)),
      });
    }
  }
  return summaries;
}

function sortCpuProfiles(profiles) {
  return [...profiles].sort((left, right) => {
    const retryDelta = (left.retry || 0) - (right.retry || 0);
    if (retryDelta !== 0) return retryDelta;
    const segmentDelta = (left.segment || 1) - (right.segment || 1);
    if (segmentDelta !== 0) return segmentDelta;
    return String(left.fileName).localeCompare(String(right.fileName));
  });
}

function matchCpuProfilesToScenario(testName, projectName, cpuSummaries) {
  const matched = cpuSummaries
    .filter((summary) =>
      cpuProfileBelongsToScenario(summary.fileName, testName, projectName),
    )
    .map((summary) => ({
      ...parseHermesProfileFileName(summary.fileName),
      ...summary,
    }));
  return sortCpuProfiles(matched);
}

function mergeCpuProfileSummaries(profiles) {
  const usable = (profiles || []).filter((profile) => !profile.skipped);
  const byFrame = new Map();
  let totalHits = 0;
  let durationMs = 0;

  for (const profile of usable) {
    totalHits += profile.totalHits || 0;
    durationMs += profile.durationMs || 0;
    for (const frame of profile.topFunctions || []) {
      const key = `${frame.name}|${frame.url}|${frame.line}`;
      const current = byFrame.get(key) || {
        name: frame.name,
        url: frame.url,
        line: frame.line,
        hitCount: 0,
        segments: [],
      };
      current.hitCount += frame.hitCount || 0;
      if (profile.segment != null) {
        current.segments.push(profile.segment);
      }
      byFrame.set(key, current);
    }
  }

  const topFunctions = [...byFrame.values()]
    .sort((left, right) => right.hitCount - left.hitCount)
    .slice(0, TOP_CPU_FUNCTIONS)
    .map((frame) => ({
      name: frame.name,
      url: frame.url,
      line: frame.line,
      hitCount: frame.hitCount,
      sharePct: totalHits > 0 ? round((frame.hitCount / totalHits) * 100) : null,
      segments: [...new Set(frame.segments)].sort((left, right) => left - right),
    }));

  return {
    segmentCount: (profiles || []).length,
    analyzedSegments: usable.length,
    totalHits,
    durationMs: round(durationMs),
    topFunctions,
  };
}

function compareMetrics(current, baseline) {
  if (!baseline) return null;
  const keys = [
    'cpuAvg',
    'cpuMax',
    'memAvgMb',
    'memMaxMb',
    'slowFramesPct',
    'frozenFramesPct',
    'anrs',
    'issues',
    'criticalIssues',
  ];
  const deltas = {};
  for (const key of keys) {
    if (current[key] == null || baseline[key] == null) continue;
    deltas[key] = {
      current: current[key],
      baseline: baseline[key],
      delta: round(current[key] - baseline[key]),
    };
  }
  return deltas;
}

function buildScenarioSnapshot({ artifact, cpuSummaries, baselineMetrics }) {
  const data = artifact.data;
  const metrics = extractMetrics(data.profilingSummary);
  const detectedIssues = extractDetectedIssues(data.profilingData);
  const apiCalls = summarizeApiCalls(data.apiCalls);
  const cpuProfiles = matchCpuProfilesToScenario(
    data.testName,
    data.projectName,
    cpuSummaries,
  );
  const combinedCpuProfile = mergeCpuProfileSummaries(cpuProfiles);
  const heuristicFindings = detectHeuristicIssues(metrics, detectedIssues);
  const baselineDelta = compareMetrics(metrics, baselineMetrics);

  if (cpuProfiles.length > 1) {
    heuristicFindings.push({
      severity: 'low',
      theme: 'cpu-segments',
      summary: `Hermes produced ${cpuProfiles.length} CPU-profile segments for this scenario; they are analyzed together as one journey.`,
    });
  }

  const hottest = combinedCpuProfile.topFunctions[0];
  if (hottest && hottest.sharePct != null && hottest.sharePct >= 15) {
    const segmentNote =
      hottest.segments?.length > 0
        ? ` across segment${hottest.segments.length > 1 ? 's' : ''} ${hottest.segments.join(', ')}`
        : '';
    heuristicFindings.push({
      severity: 'medium',
      theme: 'hot-frame',
      summary: `Hermes hot frame ${hottest.name} (${hottest.sharePct}% of samples${segmentNote})${hottest.url ? ` @ ${hottest.url}` : ''}`,
    });
  }

  return {
    testName: data.testName,
    projectName: data.projectName ?? null,
    device: data.device ?? null,
    sessionId: data.sessionId ?? null,
    videoURL: data.videoURL ?? null,
    timestamp: data.timestamp ?? null,
    sourceFile: path.basename(artifact.filePath),
    metrics,
    detectedIssues,
    apiCalls,
    cpuProfiles: cpuProfiles.map((profile) => ({
      fileName: profile.fileName,
      stem: profile.stem ?? null,
      retry: profile.retry ?? 0,
      segment: profile.segment ?? 1,
      skipped: profile.skipped || false,
      reason: profile.reason || null,
      nodeCount: profile.nodeCount ?? null,
      sampleCount: profile.sampleCount ?? null,
      totalHits: profile.totalHits ?? null,
      durationMs: profile.durationMs ?? null,
      topFunctions: profile.topFunctions || [],
    })),
    combinedCpuProfile,
    heuristicFindings,
    baselineDelta,
  };
}

function buildAiBriefing(report) {
  const lines = [];
  lines.push('# AI briefing — per-scenario app profiling');
  lines.push('');
  lines.push(
    'You are analyzing MetaMask Mobile BrowserStack app-profiling artifacts and Hermes CPU profiles from one performance E2E run.',
  );
  lines.push('Write findings **per scenario**. Point out only issues supported by the data.');
  lines.push('');
  lines.push('## Rules');
  lines.push('- Use CPU, memory, slow/frozen frames, ANRs, BrowserStack issues, hot JS frames, and slow API calls.');
  lines.push('- Multiple Hermes files named `<scenario>.segment-2.cpuprofile`, `.segment-3`, etc. belong to the **same scenario** (app restart or background dump). Analyze them as one journey; cite the segment number when a hot frame is isolated to one dump.');
  lines.push('- Prefer `combinedCpuProfile.topFunctions` for overall hot frames; use per-file `cpuProfiles` only to locate which segment.');
  lines.push('- Do not mention quality-gate failures, test errors, or flake unless they appear in the profiling payload.');
  lines.push('- If a scenario looks healthy, say so in one sentence. Do not invent regressions.');
  lines.push('- Cite numbers from the JSON. Mark hypotheses as UNVALIDATED when they are not measured facts.');
  lines.push('- Prefer actionable next steps (what to profile or which frame to inspect).');
  lines.push('');
  lines.push(`## Run`);
  lines.push(`- id: ${report.meta.runId}`);
  lines.push(`- url: ${report.meta.runUrl || 'n/a'}`);
  lines.push(`- created: ${report.meta.createdAt || 'n/a'}`);
  lines.push('');
  lines.push('## Scenarios (JSON)');
  lines.push('```json');
  lines.push(JSON.stringify(report.scenarios, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Output format');
  lines.push('### Executive summary');
  lines.push('- at most 5 bullets');
  lines.push('');
  lines.push('### Per scenario');
  lines.push('For every scenario:');
  lines.push('#### <scenario name>');
  lines.push('- Status: issue | watch | healthy');
  lines.push('- Findings: bullets with metrics');
  lines.push('- Hottest JS frames from combinedCpuProfile (cite segment numbers)');
  lines.push('- Recommended next step');
  lines.push('');
  lines.push('### Priority actions');
  lines.push('At most 5 numbered actions.');
  return `${lines.join('\n')}\n`;
}

function severityRank(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push(`# App profiling analysis`);
  lines.push('');
  lines.push(
    `Run \`${report.meta.runId || 'local'}\`${report.meta.runUrl ? ` — ${report.meta.runUrl}` : ''}`,
  );
  if (report.meta.createdAt) {
    lines.push(`Created: ${report.meta.createdAt}`);
  }
  lines.push(`Scenarios analyzed: ${report.scenarios.length}`);
  lines.push(`Agent: ${report.meta.ai ? 'Claude' : 'heuristics only'}`);
  lines.push('');

  const issueScenarios = report.scenarios.filter(
    (scenario) => scenario.heuristicFindings.length > 0,
  );
  lines.push('## Heuristic highlights');
  if (issueScenarios.length === 0) {
    lines.push('No heuristic thresholds were crossed.');
  } else {
    for (const scenario of issueScenarios) {
      lines.push(`### ${scenario.testName}`);
      for (const finding of [...scenario.heuristicFindings].sort(
        (a, b) => severityRank(b.severity) - severityRank(a.severity),
      )) {
        lines.push(`- **${finding.severity}** (${finding.theme}): ${finding.summary}`);
      }
      if (scenario.cpuProfiles?.length > 1) {
        const segments = scenario.cpuProfiles
          .map((profile) => profile.segment)
          .filter((value) => value != null)
          .join(', ');
        lines.push(`- Hermes segments: ${scenario.cpuProfiles.length} (${segments})`);
      }
      if (scenario.videoURL) {
        lines.push(`- Recording: ${scenario.videoURL}`);
      }
      lines.push('');
    }
  }

  if (report.aiAnalysis) {
    lines.push('## Agent analysis');
    lines.push('');
    lines.push(report.aiAnalysis.trim());
    lines.push('');
  }

  lines.push('## Scenario metrics');
  lines.push('');
  lines.push('| Scenario | CPU avg | Mem max | Slow frames | Issues | ANRs | CPU profiles |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const scenario of report.scenarios) {
    const m = scenario.metrics;
    lines.push(
      `| ${scenario.testName} | ${m.cpuAvg ?? '—'}% | ${m.memMaxMb ?? '—'} MB | ${m.slowFramesPct ?? '—'}% | ${m.issues ?? '—'} | ${m.anrs ?? '—'} | ${scenario.cpuProfiles.length} |`,
    );
  }
  lines.push('');
  lines.push('_This report is for testing. It is not a production alert._');
  return `${lines.join('\n')}\n`;
}

function buildGithubSummary(report) {
  return buildMarkdownReport(report);
}

function buildSlackMarkdown(report) {
  const lines = [];
  lines.push('*Ad-hoc app profiling analysis*');
  lines.push('');
  lines.push(`_Run:_ \`${report.meta.runId || 'local'}\``);
  lines.push(`_Scenarios:_ ${report.scenarios.length}`);
  lines.push('');
  const highlights = report.scenarios
    .flatMap((scenario) =>
      scenario.heuristicFindings
        .filter((finding) => finding.severity === 'high')
        .map((finding) => ({ scenario: scenario.testName, finding, videoURL: scenario.videoURL })),
    )
    .slice(0, 8);
  if (highlights.length === 0) {
    lines.push('No high-severity heuristic issues.');
  } else {
    lines.push('*High-severity findings*');
    for (const item of highlights) {
      const rec = item.videoURL ? ` <${item.videoURL}|Recording>` : '';
      lines.push(`- *${item.scenario}*: ${item.finding.summary}${rec}`);
    }
  }
  if (report.aiAnalysis) {
    lines.push('');
    lines.push('*Agent analysis*');
    lines.push('');
    lines.push(report.aiAnalysis.trim().slice(0, 3500));
  }
  lines.push('');
  lines.push('_Setup:_ Ad-hoc per-scenario app-profiling analysis');
  lines.push(
    '_Disclaimer:_ This report is for TESTING purposes only and should not be treated as a production alert.',
  );
  return `${lines.join('\n')}\n`;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function callClaude(briefing, { fetchFn = fetch } = {}) {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('E2E_CLAUDE_API_KEY is not set');
  }
  const model = process.env.APP_PROFILING_ANALYSIS_MODEL || DEFAULT_MODEL;
  const response = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system:
        'You are a MetaMask Mobile performance engineer. Analyze app-profiling data per scenario and report concrete issues. Be concise.',
      messages: [{ role: 'user', content: briefing }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API ${response.status}: ${text.slice(0, 500)}`);
  }
  const payload = await response.json();
  const text = (payload.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) {
    throw new Error('Claude API returned no text content');
  }
  return text;
}

async function runAgentAnalysis(report, { skipAi, dryRun, fetchFn = fetch } = {}) {
  if (skipAi || dryRun) {
    return null;
  }
  if (!process.env.E2E_CLAUDE_API_KEY) {
    console.log('ℹ️ E2E_CLAUDE_API_KEY not set — writing heuristic report only');
    return null;
  }

  const chunks = chunk(report.scenarios, 8);
  const parts = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const partial = {
      meta: { ...report.meta, chunk: `${i + 1}/${chunks.length}` },
      scenarios: chunks[i],
    };
    console.log(`🤖 Claude analysis chunk ${i + 1}/${chunks.length}`);
    parts.push(await callClaude(buildAiBriefing(partial), { fetchFn }));
  }
  return parts.join('\n\n');
}

function writeOutputs(outDir, report) {
  fs.mkdirSync(outDir, { recursive: true });
  const scenariosDir = path.join(outDir, 'scenarios');
  fs.mkdirSync(scenariosDir, { recursive: true });

  for (const scenario of report.scenarios) {
    const fileName = `${sanitizeFileSegment(scenario.testName)}-${sanitizeFileSegment(
      scenario.device?.name || 'device',
    )}.json`;
    fs.writeFileSync(
      path.join(scenariosDir, fileName),
      `${JSON.stringify(scenario, null, 2)}\n`,
    );
  }

  const reportPath = path.join(outDir, 'report.json');
  const markdownPath = path.join(outDir, 'report.md');
  const summaryPath = path.join(outDir, 'github-summary.md');
  const slackPath = path.join(outDir, 'slack.md');
  const briefingPath = path.join(outDir, 'ai-briefing.md');

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(report));
  fs.writeFileSync(summaryPath, buildGithubSummary(report));
  fs.writeFileSync(slackPath, buildSlackMarkdown(report));
  fs.writeFileSync(briefingPath, buildAiBriefing(report));

  return { reportPath, markdownPath, summaryPath, slackPath, briefingPath };
}

function indexBaselineByScenario(baselineDir) {
  if (!baselineDir) return new Map();
  const artifacts = loadAppProfilingArtifacts(baselineDir, null);
  const byName = new Map();
  for (const artifact of artifacts) {
    byName.set(artifact.data.testName, extractMetrics(artifact.data.profilingSummary));
  }
  return byName;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir =
    args.outDir ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-app-profiling-'));

  let runMeta = {
    runId: args.run,
    runUrl: null,
    createdAt: null,
    event: null,
    headSha: null,
  };

  let currentDir = args.currentDir;
  if (!currentDir && args.skipDownload) {
    fail('--current-dir is required with --skip-download');
  }

  if (!currentDir) {
    if (!args.run) {
      console.log(
        `🔎 Resolving latest ${args.scheduledOnly ? 'scheduled ' : ''}run of ${args.workflow} on ${args.branch}`,
      );
      const runs = listLatestPerformanceRuns({
        repo: args.repo,
        workflow: args.workflow,
        branch: args.branch,
      });
      const latest = resolveLatestRun(runs, { scheduledOnly: args.scheduledOnly });
      if (!latest) {
        fail('No matching performance workflow run found');
      }
      args.run = String(latest.databaseId);
      runMeta = {
        runId: args.run,
        runUrl: latest.url || null,
        createdAt: latest.createdAt || null,
        event: latest.event || null,
        headSha: latest.headSha || null,
      };
      console.log(`✅ Using run ${args.run} (${latest.event || 'unknown event'})`);
    }

    currentDir = path.join(outDir, 'aggregated-reports');
    console.log(`📥 Downloading aggregated-reports from run ${args.run}`);
    downloadArtifact(args.run, 'aggregated-reports', currentDir, args.repo);
  }

  const cpuDirs = [];
  const bundledProfiles = path.join(currentDir, 'hermes-cpuprofiles');
  if (fs.existsSync(bundledProfiles)) {
    cpuDirs.push(bundledProfiles);
  }
  if (args.cpuProfilesDir) {
    cpuDirs.push(args.cpuProfilesDir);
  } else if (args.run && !args.skipDownload) {
    const downloadedCpuDir = path.join(outDir, 'hermes-cpuprofiles');
    const downloaded = tryDownloadArtifactPattern(
      args.run,
      'hermes-cpuprofiles-*',
      downloadedCpuDir,
      args.repo,
    );
    if (downloaded) {
      cpuDirs.push(downloadedCpuDir);
    }
  }

  let baselineDir = null;
  if (args.baselineRun) {
    baselineDir = path.join(outDir, 'baseline-aggregated-reports');
    console.log(`📥 Downloading baseline aggregated-reports from run ${args.baselineRun}`);
    downloadArtifact(args.baselineRun, 'aggregated-reports', baselineDir, args.repo);
  }

  const artifacts = loadAppProfilingArtifacts(currentDir, args.scenario);
  if (artifacts.length === 0) {
    fail(
      args.scenario
        ? `No app-profiling files matched scenario "${args.scenario}"`
        : 'No app-profiling-*.json files found in the run artifacts',
    );
  }

  const cpuFiles = cpuDirs.flatMap((dir) => findFilesBySuffix(dir, '.cpuprofile'));
  console.log(`📄 App-profiling files: ${artifacts.length}`);
  console.log(`🧠 Hermes CPU profiles: ${cpuFiles.length}`);
  const cpuSummaries = loadCpuProfileSummaries(cpuFiles);
  const baselineByScenario = indexBaselineByScenario(baselineDir);

  const scenarios = artifacts.map((artifact) =>
    buildScenarioSnapshot({
      artifact,
      cpuSummaries,
      baselineMetrics: baselineByScenario.get(artifact.data.testName) || null,
    }),
  );

  const report = {
    meta: {
      ...runMeta,
      repo: args.repo,
      generatedAt: new Date().toISOString(),
      scenarioFilter: args.scenario,
      ai: false,
      thresholds: THRESHOLDS,
    },
    scenarios,
    aiAnalysis: null,
  };

  report.aiAnalysis = await runAgentAnalysis(report, {
    skipAi: args.skipAi,
    dryRun: args.dryRun,
  });
  report.meta.ai = Boolean(report.aiAnalysis);

  const outputs = writeOutputs(outDir, report);
  console.log('\n✅ Wrote:');
  for (const filePath of Object.values(outputs)) {
    console.log(`  ${filePath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

export {
  THRESHOLDS,
  parseArgs,
  resolveLatestRun,
  extractMetrics,
  extractDetectedIssues,
  summarizeApiCalls,
  detectHeuristicIssues,
  summarizeCpuProfile,
  parseHermesProfileFileName,
  cpuProfileBelongsToScenario,
  matchCpuProfilesToScenario,
  mergeCpuProfileSummaries,
  compareMetrics,
  buildScenarioSnapshot,
  buildMarkdownReport,
  buildSlackMarkdown,
  buildAiBriefing,
  loadAppProfilingArtifacts,
  loadCpuProfileSummaries,
};
