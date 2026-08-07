#!/usr/bin/env node

/**
 * Weekly App Profiling Report
 *
 * Collects BrowserStack app-profiling metrics from merged PRs that ran
 * performance tests in a recent window (default: last 7 days), aggregates
 * averages for the most-executed scenarios, correlates with failing / merged
 * PR themes, and writes JSON + Slack markdown suitable for an AI follow-up
 * insights pass.
 *
 * Usage:
 *   node tests/scripts/weekly-app-profiling-report.mjs
 *   node tests/scripts/weekly-app-profiling-report.mjs --days 7 --top 10
 *   node tests/scripts/weekly-app-profiling-report.mjs --days 7 --out-dir /tmp/weekly-profiling
 *
 * Requirements:
 *   - `gh` CLI authenticated with actions:read + pull-requests:read
 *   - Repo defaults to MetaMask/metamask-mobile (override with --repo)
 *
 * Outputs (under --out-dir):
 *   - report.json          Structured data (scenarios, PRs, leads)
 *   - slack.md             Slack-ready markdown (metrics + AI prompt seed)
 *   - ai-briefing.md       Briefing for an AI agent to produce investigation insights
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_REPO = 'MetaMask/metamask-mobile';
const DEFAULT_DAYS = 7;
const DEFAULT_TOP = 10;
const DEFAULT_MAX_PRS = 80;
const DEFAULT_MAX_ARTIFACT_DOWNLOADS = 35;

function parseArgs(argv) {
  const args = {
    days: DEFAULT_DAYS,
    top: DEFAULT_TOP,
    repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
    outDir: null,
    maxPrs: DEFAULT_MAX_PRS,
    maxArtifactDownloads: DEFAULT_MAX_ARTIFACT_DOWNLOADS,
    skipArtifacts: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--days':
        args.days = Number(next);
        i += 1;
        break;
      case '--top':
        args.top = Number(next);
        i += 1;
        break;
      case '--repo':
        args.repo = next;
        i += 1;
        break;
      case '--out-dir':
        args.outDir = next;
        i += 1;
        break;
      case '--max-prs':
        args.maxPrs = Number(next);
        i += 1;
        break;
      case '--max-artifact-downloads':
        args.maxArtifactDownloads = Number(next);
        i += 1;
        break;
      case '--skip-artifacts':
        args.skipArtifacts = true;
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

  if (!Number.isFinite(args.days) || args.days <= 0) {
    fail('--days must be a positive number');
  }
  if (!Number.isFinite(args.top) || args.top <= 0) {
    fail('--top must be a positive number');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node tests/scripts/weekly-app-profiling-report.mjs [options]

Options:
  --days <n>                   Lookback window in days (default: ${DEFAULT_DAYS})
  --top <n>                    Top N most-executed scenarios (default: ${DEFAULT_TOP})
  --repo <owner/name>          GitHub repo (default: ${DEFAULT_REPO})
  --out-dir <path>             Output directory (default: tmp dir)
  --max-prs <n>                Max merged PRs to scan (default: ${DEFAULT_MAX_PRS})
  --max-artifact-downloads <n> Max aggregated-reports downloads (default: ${DEFAULT_MAX_ARTIFACT_DOWNLOADS})
  --skip-artifacts             Only parse PR comments (no artifact download)
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

function stats(arr) {
  const a = (arr || []).filter((x) => x != null && Number.isFinite(x));
  if (!a.length) return null;
  const sorted = [...a].sort((x, y) => x - y);
  const sum = sorted.reduce((x, y) => x + y, 0);
  const avg = sum / sorted.length;
  const variance =
    sorted.reduce((s, x) => s + (x - avg) ** 2, 0) / sorted.length;
  return {
    n: sorted.length,
    min: +sorted[0].toFixed(2),
    max: +sorted[sorted.length - 1].toFixed(2),
    avg: +avg.toFixed(2),
    p50: +sorted[Math.floor((sorted.length - 1) * 0.5)].toFixed(2),
    p90: +sorted[
      Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.9))
    ].toFixed(2),
    stdev: +Math.sqrt(variance).toFixed(2),
  };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function classifyArea(title = '', failedTests = []) {
  // Prefer PR title for product-area clustering. Failed scenario names often
  // mention unrelated domains (e.g. a confirmations PR failing a Perps test).
  const titleText = String(title).toLowerCase();
  const scenarioText = (failedTests || []).join(' ').toLowerCase();

  const match = (text) => {
    if (/\bperps\b/.test(text)) return 'perps';
    if (/\bpredict\b/.test(text)) return 'predict';
    if (/\bonboard|seedless|import srp|account creation|cold start\b/.test(text)) {
      return 'onboarding';
    }
    if (/\basset|homepage|token selector\b/.test(text)) return 'assets';
    if (/\bswap|bridge|cross-chain\b/.test(text)) return 'swap-bridge';
    if (/\baccount.?selector|accounts\b/.test(text)) return 'accounts';
    if (/\bconfirm|mm pay\b/.test(text)) return 'confirmations';
    if (/\bperf\b|\bperformance\b|\bci\b/.test(text)) return 'perf-infra';
    return null;
  };

  return match(titleText) || match(scenarioText) || 'other';
}

function extractPerfComment(comments) {
  const perf = (comments || []).filter(
    (c) =>
      c.body?.includes('Performance Test Results') &&
      (c.body.includes('All tests passed') ||
        c.body.includes('failed') ||
        c.body.includes('Results incomplete')),
  );
  if (!perf.length) return null;
  return perf[perf.length - 1];
}

function parseFailedTests(body) {
  const failedSection =
    body.match(
      /### ❌ Failed Tests[\s\S]*?(?=<details>\n<summary>✅ Passed|\n---\n|$)/,
    )?.[0] || '';
  const failed = [];
  for (const hm of failedSection.matchAll(/#### ([^\n]+)/g)) {
    failed.push(hm[1].trim());
  }
  if (!failed.length) {
    for (const r of failedSection.matchAll(
      /^\| ([^|]+) \| (Android|iOS) \|/gm,
    )) {
      if (r[1].trim() !== 'Test') failed.push(r[1].trim());
    }
  }

  const qg = (failedSection.match(/Quality gates exceeded/g) || []).length;
  const te = (failedSection.match(/Test error/g) || []).length;
  const to = (failedSection.match(/Timed out/g) || []).length;

  return {
    failedTests: failed,
    reasons: {
      qualityGatesExceeded: qg,
      testError: te,
      timedOut: to,
    },
  };
}

function parsePassedTests(body) {
  const section =
    body.match(/<summary>✅ Passed Tests[\s\S]*?<\/details>/)?.[0] || '';
  const tests = [];
  for (const row of section.matchAll(
    /^\| ([^|]+) \| (Android|iOS) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/gm,
  )) {
    const name = row[1].trim();
    if (name === 'Test') continue;
    const durationStr = row[4].trim();
    const durationSec = durationStr.endsWith('s')
      ? parseFloat(durationStr)
      : null;
    tests.push({
      testName: name,
      platform: row[2].trim(),
      durationSec: Number.isFinite(durationSec) ? durationSec : null,
      team: row[5].trim(),
    });
  }
  return tests;
}

function listMergedPrCandidates({ repo, days, maxPrs }) {
  // Search recently merged PRs that mention Performance Test Results in discussion,
  // then tighten by closed/merged date client-side.
  const raw = runGh([
    'search',
    'prs',
    '--repo',
    repo,
    '--merged',
    '--limit',
    String(maxPrs),
    'Performance Test Results',
    '--json',
    'number,title,url,closedAt',
  ]);
  const items = JSON.parse(raw || '[]');
  const since = isoDaysAgo(days);
  return items
    .filter((p) => p.closedAt && p.closedAt >= since)
    .sort((a, b) => (a.closedAt < b.closedAt ? 1 : -1));
}

function loadPrComments(repo, number) {
  const raw = runGh([
    'api',
    '--paginate',
    `repos/${repo}/issues/${number}/comments?per_page=100`,
  ]);
  // paginate may concatenate arrays; normalize
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    // When --paginate returns multiple arrays, wrap carefully
    try {
      return JSON.parse(text);
    } catch {
      const joined = `[${text.replace(/\]\s*\[/g, ',')}]`;
      return JSON.parse(joined);
    }
  }
  return [];
}

function downloadAggregatedReports({ repo, runId, destDir }) {
  fs.mkdirSync(destDir, { recursive: true });
  const marker = path.join(destDir, 'done');
  if (fs.existsSync(marker)) return true;

  let artifactsRaw;
  try {
    artifactsRaw = runGh([
      'api',
      `repos/${repo}/actions/runs/${runId}/artifacts`,
    ]);
  } catch {
    return false;
  }

  const artifacts = JSON.parse(artifactsRaw || '{}').artifacts || [];
  const agg = artifacts.find(
    (a) => a.name === 'aggregated-reports' && a.expired === false,
  );
  if (!agg) {
    fs.writeFileSync(marker, 'missing\n');
    return false;
  }

  const zipPath = path.join(destDir, 'agg.zip');
  const zipResult = spawnSync(
    'gh',
    ['api', `repos/${repo}/actions/artifacts/${agg.id}/zip`],
    {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
      },
    },
  );
  if (zipResult.status !== 0) {
    fs.writeFileSync(marker, 'download-failed\n');
    return false;
  }
  fs.writeFileSync(zipPath, zipResult.stdout);

  const aggDir = path.join(destDir, 'agg');
  fs.mkdirSync(aggDir, { recursive: true });
  const unzip = spawnSync('unzip', ['-o', zipPath, '-d', aggDir], {
    encoding: 'utf8',
  });
  if (unzip.status !== 0) {
    fs.writeFileSync(marker, 'unzip-failed\n');
    return false;
  }
  fs.writeFileSync(marker, 'ok\n');
  return true;
}

function collectProfilingFromArtifacts(artifactsRoot, scenarioNames) {
  const byTest = Object.fromEntries(scenarioNames.map((n) => [n, []]));
  if (!fs.existsSync(artifactsRoot)) return byTest;

  for (const pr of fs.readdirSync(artifactsRoot)) {
    const dir = path.join(artifactsRoot, pr, 'agg', 'app-profiling');
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const name = data.testName;
      if (!scenarioNames.includes(name)) continue;
      const s = data.profilingSummary || {};
      if (s.error || s.status === 'error') continue;
      if (s.cpu?.avg == null && s.memory?.avg == null) continue;
      byTest[name].push({
        pr: Number(pr),
        cpuAvg: s.cpu?.avg ?? null,
        cpuMax: s.cpu?.max ?? null,
        memAvg: s.memory?.avg ?? null,
        memMax: s.memory?.max ?? null,
        slowFrames: s.uiRendering?.slowFrames ?? null,
        frozenFrames: s.uiRendering?.frozenFrames ?? null,
        anrs: s.uiRendering?.anrs ?? null,
        issues: s.issues ?? null,
        criticalIssues: s.criticalIssues ?? null,
        appSizeMb: s.appSizeMb ?? null,
      });
    }
  }
  return byTest;
}

function buildInvestigationLeads({ scenarioRows, prs }) {
  const leads = [];

  for (const s of scenarioRows) {
    const slow = s.profiling.slowFramesPct?.avg;
    const memMax = s.profiling.memMaxMb?.avg;
    const failRate = s.failRatePct;

    if (slow != null && slow >= 25) {
      leads.push({
        severity: 'high',
        theme: 'ui-jank',
        scenario: s.scenario,
        summary: `${s.scenario} averages ${slow}% slow frames (n=${s.profiling.samples}). Investigate list/render cost and recent merges touching this flow.`,
      });
    } else if (slow != null && slow >= 15) {
      leads.push({
        severity: 'medium',
        theme: 'ui-jank',
        scenario: s.scenario,
        summary: `${s.scenario} shows elevated slow frames (${slow}%). Worth a trend check next week.`,
      });
    }

    if (memMax != null && memMax >= 900) {
      leads.push({
        severity: 'high',
        theme: 'memory',
        scenario: s.scenario,
        summary: `${s.scenario} memory max avg is ${memMax} MB. Investigate retained objects / subscriptions in this flow.`,
      });
    }

    if (failRate >= 25 && (slow == null || slow < 15)) {
      leads.push({
        severity: 'medium',
        theme: 'test-stability',
        scenario: s.scenario,
        summary: `${s.scenario} fail rate is ${failRate}% while profiling looks relatively light — prioritize test/QG flake over product regression.`,
      });
    }
  }

  const areaFail = {};
  for (const p of prs.filter((x) => !x.allPassed)) {
    const area = classifyArea(p.title, p.failedTests);
    areaFail[area] ??= { area, failingPrs: 0, examples: [] };
    areaFail[area].failingPrs += 1;
    if (areaFail[area].examples.length < 3) {
      areaFail[area].examples.push({
        number: p.number,
        title: p.title,
        url: p.url,
      });
    }
  }

  for (const bucket of Object.values(areaFail).sort(
    (a, b) => b.failingPrs - a.failingPrs,
  )) {
    if (bucket.failingPrs < 2 || bucket.area === 'other') continue;
    leads.push({
      severity: bucket.failingPrs >= 4 ? 'high' : 'medium',
      theme: 'merged-pr-area',
      area: bucket.area,
      summary: `${bucket.failingPrs} merged PRs with performance failures clustered around **${bucket.area}**. Review whether recent merges in this area correlate with the hotspot scenarios.`,
      examples: bucket.examples,
    });
  }

  return leads;
}

function fmtAvg(stat, unit = '') {
  if (!stat) return '—';
  return `${stat.avg}${unit}`;
}

function slowFramesLabel(stat) {
  if (!stat) return '—';
  const avg = stat.avg;
  if (avg < 10) return `${avg}% (low)`;
  if (avg < 25) return `${avg}% (mid)`;
  return `${avg}% (high)`;
}

/**
 * Slack-friendly scenario block. Wide markdown tables wrap badly in Slack
 * (especially inside code fences), so we use compact per-scenario cards.
 */
function formatScenarioSlackCard(s) {
  const p = s.profiling;
  const lines = [];
  lines.push(`*${s.rank}. ${s.scenario}*`);
  lines.push(
    `Runs ${s.executions} · Fail ${s.failRatePct}% · samples n=${p.samples}`,
  );
  lines.push(
    `CPU avg ${fmtAvg(p.cpuAvg, '%')} · Mem avg ${fmtAvg(p.memAvgMb, ' MB')} · Mem max ${fmtAvg(p.memMaxMb, ' MB')}`,
  );
  lines.push(
    `Slow frames ${slowFramesLabel(p.slowFramesPct)} · Issues ${fmtAvg(p.issues)} · App size ${fmtAvg(p.appSizeMb, ' MB')}`,
  );
  return lines.join('\n');
}

function buildSlackMarkdown(report) {
  const lines = [];
  const { meta, scenarios, leads, prSummary } = report;

  lines.push(`*Weekly App Profiling Report*`);
  lines.push('');
  lines.push(
    `*Window:* ${meta.since.slice(0, 10)} → ${meta.until.slice(0, 10)} (${meta.days}d)`,
  );
  lines.push(`*Device:* ${meta.device}`);
  lines.push(
    `*PRs:* ${prSummary.withResults} with perf results · ${prSummary.allPassed} all passed · ${prSummary.withFailures} with failures`,
  );
  lines.push(
    `*Profiling samples:* ${meta.profilingSamplesMatched} across ${meta.artifactPrs} artifact downloads`,
  );
  lines.push('');
  lines.push(`*Top ${scenarios.length} scenarios — profiling averages*`);
  lines.push('');
  for (const s of scenarios) {
    lines.push(formatScenarioSlackCard(s));
    lines.push('');
  }

  lines.push(`*Investigation leads (data-driven)*`);
  lines.push('');
  if (!leads.length) {
    lines.push(`_No strong leads this week._`);
  } else {
    for (const lead of leads) {
      const icon =
        lead.severity === 'high'
          ? ':red_circle:'
          : lead.severity === 'medium'
            ? ':large_yellow_circle:'
            : ':large_green_circle:';
      lines.push(`${icon} *[${lead.theme}]* ${lead.summary}`);
      if (lead.examples?.length) {
        for (const ex of lead.examples) {
          lines.push(`  • <${ex.url}|#${ex.number}> ${ex.title}`);
        }
      }
      lines.push('');
    }
  }

  lines.push(`*AI insights*`);
  lines.push('');
  if (report.aiInsights) {
    lines.push(report.aiInsights.trim());
  } else {
    lines.push(
      `_Pending AI pass — see ai-briefing.md / Cursor Automation prompt._`,
    );
  }

  lines.push('');
  lines.push(`_Generated by tests/scripts/weekly-app-profiling-report.mjs_`);
  return `${lines.join('\n')}\n`;
}

function buildAiBriefing(report) {
  const failing = report.prs.filter((p) => !p.allPassed).slice(0, 25);
  const lines = [];
  lines.push(`# AI briefing — weekly app profiling insights`);
  lines.push('');
  lines.push(`You are analyzing MetaMask Mobile performance/app-profiling data.`);
  lines.push(`Produce **3–6 actionable investigation insights** for the QA/performance audience.`);
  lines.push('');
  lines.push(`## Rules`);
  lines.push(`- Focus on what is worth investigating next (not generic advice).`);
  lines.push(`- Prefer correlations between: hotspot scenarios, fail reasons, and merged PR themes/areas.`);
  lines.push(`- Explicitly separate likely **product regressions** vs **test/QG flake**.`);
  lines.push(`- Skip low-confidence scenarios (very low profiling n) unless they have extreme outliers.`);
  lines.push(`- Keep the final answer concise, in English, Slack-friendly markdown.`);
  lines.push(`- End with a short prioritized checklist (max 5 bullets).`);
  lines.push('');
  lines.push(`## Window`);
  lines.push(`- ${report.meta.since} → ${report.meta.until}`);
  lines.push(`- Device: ${report.meta.device}`);
  lines.push('');
  lines.push(`## Scenario averages (JSON)`);
  lines.push('```json');
  lines.push(
    JSON.stringify(
      report.scenarios.map((s) => ({
        rank: s.rank,
        scenario: s.scenario,
        executions: s.executions,
        failRatePct: s.failRatePct,
        profiling: s.profiling,
      })),
      null,
      2,
    ),
  );
  lines.push('```');
  lines.push('');
  lines.push(`## Data-driven leads`);
  lines.push('```json');
  lines.push(JSON.stringify(report.leads, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(`## Merged PRs with performance failures`);
  lines.push('```json');
  lines.push(
    JSON.stringify(
      failing.map((p) => ({
        number: p.number,
        title: p.title,
        url: p.url,
        closedAt: p.closedAt,
        uniqueFailed: p.uniqueFailed,
        failedTests: p.failedTests,
        reasons: p.reasons,
        area: classifyArea(p.title, p.failedTests),
      })),
      null,
      2,
    ),
  );
  lines.push('```');
  lines.push('');
  lines.push(`## Output format`);
  lines.push(`### AI insights to investigate`);
  lines.push(`1. ...`);
  lines.push(`2. ...`);
  lines.push(`### Priority checklist`);
  lines.push(`- [ ] ...`);
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const until = new Date().toISOString();
  const since = isoDaysAgo(args.days);
  const outDir =
    args.outDir ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-app-profiling-'));
  const artifactsRoot = path.join(outDir, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`📅 Window: ${since.slice(0, 10)} → ${until.slice(0, 10)}`);
  console.log(`📦 Repo: ${args.repo}`);
  console.log(`📁 Out: ${outDir}`);

  const candidates = listMergedPrCandidates({
    repo: args.repo,
    days: args.days,
    maxPrs: args.maxPrs,
  });
  console.log(`🔎 Candidate merged PRs in window: ${candidates.length}`);

  const prs = [];
  const testCounts = {};
  const failCounts = {};
  const passCounts = {};

  for (const c of candidates) {
    process.stdout.write(`  PR #${c.number}... `);
    let comments;
    try {
      comments = loadPrComments(args.repo, c.number);
    } catch (error) {
      console.log(`comment fetch failed (${error.message})`);
      continue;
    }
    const perfComment = extractPerfComment(comments);
    if (!perfComment) {
      console.log('no perf results');
      continue;
    }
    const body = perfComment.body;
    const allPassed = body.includes('All tests passed');
    const failedMatch = body.match(/(\d+) tests? failed/);
    const uniqueFailed = failedMatch
      ? Number(failedMatch[1])
      : allPassed
        ? 0
        : null;
    const { failedTests, reasons } = parseFailedTests(body);
    const passedTests = parsePassedTests(body);
    const runId = body.match(/actions\/runs\/(\d+)/)?.[1] || null;
    const totals = body.match(/·\s*(\d+) tests?\s*·\s*(\d+) device/);

    for (const t of failedTests) {
      testCounts[t] = (testCounts[t] || 0) + 1;
      failCounts[t] = (failCounts[t] || 0) + 1;
    }
    for (const t of passedTests) {
      testCounts[t.testName] = (testCounts[t.testName] || 0) + 1;
      passCounts[t.testName] = (passCounts[t.testName] || 0) + 1;
    }

    prs.push({
      number: c.number,
      title: c.title,
      url: c.url,
      closedAt: c.closedAt,
      allPassed: Boolean(allPassed && !(uniqueFailed > 0)),
      uniqueFailed: uniqueFailed ?? 0,
      totalTests: totals ? Number(totals[1]) : null,
      failedTests,
      passedTests,
      reasons,
      runId,
      area: classifyArea(c.title, failedTests),
    });
    console.log(
      allPassed && !(uniqueFailed > 0)
        ? '✅'
        : `❌ ${uniqueFailed ?? '?'} failed`,
    );
  }

  const top = Object.entries(testCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, args.top)
    .map(([test, count]) => ({
      test,
      count,
      pass: passCounts[test] || 0,
      fail: failCounts[test] || 0,
    }));

  console.log(`🏆 Top ${top.length} scenarios:`);
  for (const t of top) {
    console.log(`  ${t.count}× ${t.test}`);
  }

  if (!args.skipArtifacts) {
    const withRuns = prs.filter((p) => p.runId);
    let downloads = 0;
    for (const p of withRuns) {
      if (downloads >= args.maxArtifactDownloads) break;
      // Prefer PRs that executed at least one top scenario
      const mentionsTop = top.some(
        (t) =>
          p.failedTests.includes(t.test) ||
          p.passedTests.some((x) => x.testName === t.test),
      );
      if (!mentionsTop && downloads > 5) continue;

      const dest = path.join(artifactsRoot, String(p.number));
      process.stdout.write(`⬇ artifacts PR #${p.number} (run ${p.runId})... `);
      const ok = downloadAggregatedReports({
        repo: args.repo,
        runId: p.runId,
        destDir: dest,
      });
      console.log(ok ? 'ok' : 'skip');
      if (ok) downloads += 1;
    }
    console.log(`📥 Artifact downloads attempted/kept: ${downloads}`);
  }

  const scenarioNames = top.map((t) => t.test);
  const profilingByTest = collectProfilingFromArtifacts(
    artifactsRoot,
    scenarioNames,
  );

  const scenarios = top.map((t, idx) => {
    const samples = profilingByTest[t.test] || [];
    return {
      rank: idx + 1,
      scenario: t.test,
      executions: t.count,
      pass: t.pass,
      fail: t.fail,
      failRatePct: +((t.fail / t.count) * 100).toFixed(1),
      profiling: {
        samples: samples.length,
        prs: new Set(samples.map((s) => s.pr)).size,
        cpuAvg: stats(samples.map((s) => s.cpuAvg)),
        cpuMax: stats(samples.map((s) => s.cpuMax)),
        memAvgMb: stats(samples.map((s) => s.memAvg)),
        memMaxMb: stats(samples.map((s) => s.memMax)),
        slowFramesPct: stats(samples.map((s) => s.slowFrames)),
        frozenFramesPct: stats(samples.map((s) => s.frozenFrames)),
        anrs: stats(samples.map((s) => s.anrs)),
        issues: stats(samples.map((s) => s.issues)),
        criticalIssues: stats(samples.map((s) => s.criticalIssues)),
        appSizeMb: stats(samples.map((s) => s.appSizeMb)),
      },
    };
  });

  const report = {
    meta: {
      repo: args.repo,
      days: args.days,
      since,
      until,
      device: 'Google Pixel 8 Pro (Android 14)',
      generatedAt: new Date().toISOString(),
      artifactPrs: fs.existsSync(artifactsRoot)
        ? fs
            .readdirSync(artifactsRoot)
            .filter((d) =>
              fs.existsSync(
                path.join(artifactsRoot, d, 'agg', 'app-profiling'),
              ),
            ).length
        : 0,
      profilingSamplesMatched: scenarios.reduce(
        (a, s) => a + s.profiling.samples,
        0,
      ),
    },
    prSummary: {
      candidates: candidates.length,
      withResults: prs.length,
      allPassed: prs.filter((p) => p.allPassed).length,
      withFailures: prs.filter((p) => !p.allPassed).length,
    },
    scenarios,
    leads: [],
    prs,
    aiInsights: null,
  };

  report.leads = buildInvestigationLeads({ scenarioRows: scenarios, prs });

  const reportPath = path.join(outDir, 'report.json');
  const slackPath = path.join(outDir, 'slack.md');
  const briefingPath = path.join(outDir, 'ai-briefing.md');

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(briefingPath, buildAiBriefing(report));
  fs.writeFileSync(slackPath, buildSlackMarkdown(report));

  // Optional: if OPENAI-like env or AI_INSIGHTS_FILE provided, merge external AI text
  if (process.env.AI_INSIGHTS_FILE && fs.existsSync(process.env.AI_INSIGHTS_FILE)) {
    report.aiInsights = fs.readFileSync(process.env.AI_INSIGHTS_FILE, 'utf8');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(slackPath, buildSlackMarkdown(report));
  }

  console.log(`\n✅ Wrote:`);
  console.log(`  ${reportPath}`);
  console.log(`  ${slackPath}`);
  console.log(`  ${briefingPath}`);
  console.log(
    `\nNext: run an AI pass on ai-briefing.md, then send slack.md (or merged insights) to Slack.`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
