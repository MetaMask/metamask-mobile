#!/usr/bin/env node

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
    const visited = new Set();

    while (frameId && !visited.has(frameId)) {
      visited.add(frameId);
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
      const inclusive = inclusiveCounts.get(key) || { ...base, samples: 0 };
      inclusive.samples += weight;
      inclusiveCounts.set(key, inclusive);
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

function loadProfile(filePath) {
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
      const usable = group.profiles.filter((profile) => !profile.skipped);
      return {
        projectName: group.projectName,
        scenario: group.scenario,
        profileCount: group.profiles.length,
        segmentCount: new Set(
          group.profiles.map(
            (profile) => `${profile.retry}:${profile.segment}`,
          ),
        ).size,
        attempts: [...new Set(group.profiles.map((profile) => profile.retry))],
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
        topSelfFrames: mergeFrameLists(usable, 'topSelfFrames'),
        topInclusiveFrames: mergeFrameLists(usable, 'topInclusiveFrames'),
        profiles: group.profiles,
      };
    })
    .sort((left, right) => left.scenario.localeCompare(right.scenario));
}

function displayName(scenario) {
  return scenario.replace(/__/g, ': ').replace(/_/g, ' ');
}

function buildAiBriefing(report) {
  return `# Hermes CPU-profile analysis

Analyze the sampled Hermes JavaScript stacks below **per scenario**.

Rules:
- Use only this Hermes CPU-profile data. Do not discuss BrowserStack CPU,
  memory, slow frames, app profiling, network calls, or quality gates.
- Logical segment 1 is the plain \`.cpuprofile\`; \`.segment-2\`,
  \`.segment-3\`, etc. continue the same scenario.
- Retries are additional attempts of the same scenario. Separate retry-specific
  observations from patterns that repeat across attempts.
- \`topSelfFrames\` identifies leaf frames where samples landed.
- \`topInclusiveFrames\` identifies stacks containing a frame.
- Cite sample percentages and the retry/segment locations.
- Runtime names may be unsymbolicated. Do not invent source files.
- Mark causal interpretations as UNVALIDATED.
- If no suspicious concentration exists, say the scenario looks healthy.

Output:
1. Executive summary (maximum 5 bullets)
2. One subsection per scenario: status, evidence, hottest frames, next step
3. Priority actions (maximum 5)

Run: ${report.meta.runId || 'local'}

\`\`\`json
${JSON.stringify(report.scenarios, null, 2)}
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
    `Agent: ${report.meta.ai ? 'Claude' : 'summary only'}`,
    '',
  ];
  if (report.aiAnalysis) {
    lines.push('## Agent analysis', '', report.aiAnalysis.trim(), '');
  }
  lines.push('## Per-scenario Hermes summary', '');
  for (const scenario of report.scenarios) {
    lines.push(`### ${displayName(scenario.scenario)}`);
    lines.push(
      `Profiles: ${scenario.profileCount} · Logical segments/attempts: ${scenario.segmentCount} · Samples: ${scenario.sampleCount} · Root/idle samples: ${scenario.rootSharePct}% · Duration: ${scenario.durationMs} ms`,
    );
    if (scenario.topSelfFrames.length === 0) {
      lines.push('- No readable Hermes samples.');
    } else {
      lines.push('- Top self frames:');
      for (const frame of scenario.topSelfFrames.slice(0, 5)) {
        const locations = frame.locations
          .map(
            (location) =>
              `retry ${location.retry}, segment ${location.segment}`,
          )
          .join('; ');
        lines.push(
          `  - \`${frame.name}\`: ${frame.sharePct}% (${locations})`,
        );
      }
    }
    lines.push('');
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
    '',
  ];
  if (report.aiAnalysis) {
    lines.push(report.aiAnalysis.trim().slice(0, 35_000));
  } else {
    lines.push('*Top sampled frames by scenario*');
    for (const scenario of report.scenarios.slice(0, 12)) {
      const top = scenario.topSelfFrames[0];
      lines.push(
        `- *${displayName(scenario.scenario)}*: ${
          top ? `\`${top.name}\` ${top.sharePct}%` : 'no readable samples'
        } (${scenario.profileCount} profile${scenario.profileCount === 1 ? '' : 's'})`,
      );
    }
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
      max_tokens: 8000,
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
  }

  const files = [...new Set(findHermesProfiles(sourceDirectory))];
  if (files.length === 0) {
    fail('No named Hermes profiles found under hermes-cpuprofiles/');
  }
  console.log(`🧠 Hermes CPU profiles: ${files.length}`);

  const profiles = files.map(loadProfile);
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
      profileCount: profiles.length,
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
  parseProfileFileName,
  summarizeHermesProfile,
  mergeFrameLists,
  groupProfiles,
  buildAiBriefing,
  buildMarkdown,
  buildSlack,
};
