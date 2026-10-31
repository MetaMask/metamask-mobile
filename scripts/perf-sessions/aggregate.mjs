#!/usr/bin/env node
/**
 * Merge perf-session recordings from many testers and surface shared
 * low-performance patterns per flow (POC).
 *
 *   node aggregate.mjs <dir-with-session-json> [--out report]
 *
 * Writes <out>.md (for humans) and <out>.json (for an LLM / bot to reason over).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' } },
});
const dir = positionals[0];
if (!dir) {
  console.error('Usage: node aggregate.mjs <session-dir> [--out <path-without-extension>]');
  process.exit(1);
}
const outBase = args.out ?? path.join(dir, 'report');

// Thresholds: Flashlight treats a thread ≥90% CPU as locked; a sample is
// "low FPS" when it renders under 75% of the device refresh rate.
const LOCKED_CPU = 90;
const LOW_FPS_RATIO = 0.75;
const JANK_WINDOW_MS = 2000;
// A flow is a shared hotspot when at least this share of its testers hit it.
const SHARED_TESTER_SHARE = 0.5;
const HOTSPOT_LOW_FPS = 0.2;
const HOTSPOT_JS_LOCKED = 0.1;

const sessions = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('report'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter((r) => r.perfSession);

if (!sessions.length) {
  console.error(`No perf-session recordings found in ${dir}`);
  process.exit(1);
}

const jsCpu = (m) => Math.max(m.cpu.perName.mqt_v_js ?? 0, m.cpu.perName.mqt_js ?? 0);
const uiCpu = (m) => m.cpu.perName['UI Thread'] ?? 0;
const flowAt = (flows, time) => flows.findLast((f) => f.time <= time)?.name ?? 'unlabelled';

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const percentile = (xs, p) => {
  if (!xs.length) return undefined;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const share = (xs, pred) => (xs.length ? xs.filter(pred).length / xs.length : 0);

// Flatten to samples tagged with tester, device and flow.
const samples = sessions.flatMap(({ iterations, perfSession: s }) =>
  iterations[0].measures.map((m) => ({
    tester: s.tester,
    device: s.device.model,
    flow: flowAt(s.flows, m.time),
    time: m.time,
    fpsRatio: m.fps === undefined ? undefined : m.fps / s.device.refreshRate,
    js: jsCpu(m),
    ui: uiCpu(m),
    ram: m.ram,
  })),
);

const summarize = (group) => {
  const fps = group.map((x) => x.fpsRatio).filter((x) => x !== undefined);
  return {
    samples: group.length,
    minutes: +((group.length * 0.5) / 60).toFixed(1),
    avgFpsPct: fps.length ? Math.round(mean(fps) * 100) : null,
    p10FpsPct: fps.length ? Math.round(percentile(fps, 10) * 100) : null,
    lowFpsShare: +share(fps, (r) => r < LOW_FPS_RATIO).toFixed(2),
    avgJsCpu: Math.round(mean(group.map((x) => x.js)) ?? 0),
    jsLockedShare: +share(group, (x) => x.js >= LOCKED_CPU).toFixed(2),
    uiLockedShare: +share(group, (x) => x.ui >= LOCKED_CPU).toFixed(2),
    peakRamMb: Math.round(Math.max(...group.map((x) => x.ram ?? 0))),
  };
};

const groupBy = (xs, key) =>
  xs.reduce((acc, x) => ((acc[key(x)] ??= []).push(x), acc), {});

const isBad = (s) => s.lowFpsShare >= HOTSPOT_LOW_FPS || s.jsLockedShare >= HOTSPOT_JS_LOCKED;

const jankMarkers = sessions.flatMap(({ iterations, perfSession: s }) =>
  s.jankMarkers.map((j) => {
    const around = iterations[0].measures.filter((m) => Math.abs(m.time - j.time) <= JANK_WINDOW_MS);
    return {
      tester: s.tester,
      device: s.device.model,
      flow: j.flow,
      note: j.note,
      minFpsPct: around.some((m) => m.fps !== undefined)
        ? Math.round((Math.min(...around.map((m) => m.fps ?? Infinity)) / s.device.refreshRate) * 100)
        : null,
      maxJsCpu: around.length ? Math.round(Math.max(...around.map(jsCpu))) : null,
    };
  }),
);

const flows = Object.entries(groupBy(samples, (x) => x.flow)).map(([flow, group]) => {
  const byTester = Object.entries(groupBy(group, (x) => x.tester)).map(([tester, g]) => ({
    tester,
    device: g[0].device,
    ...summarize(g),
  }));
  const affected = byTester.filter(isBad);
  const flags = jankMarkers.filter((j) => j.flow === flow);
  const overall = summarize(group);
  return {
    flow,
    ...overall,
    testers: byTester.length,
    testersAffected: affected.map((t) => t.tester),
    devicesAffected: [...new Set(affected.map((t) => t.device))],
    jankFlags: flags.length,
    // Hotspot = bad for a majority of the testers who exercised it (and >1 tester),
    // so it is a shared pattern rather than one person's device.
    sharedHotspot:
      byTester.length > 1 && affected.length / byTester.length >= SHARED_TESTER_SHARE,
    severity: Math.round(
      overall.lowFpsShare * 100 + overall.jsLockedShare * 150 + overall.uiLockedShare * 100 + flags.length * 5,
    ),
    byTester,
  };
});
flows.sort((a, b) => b.severity - a.severity);

const devices = Object.entries(groupBy(samples, (x) => x.device)).map(([device, g]) => ({
  device,
  testers: [...new Set(g.map((x) => x.tester))].length,
  ...summarize(g),
}));

const report = {
  generatedAt: new Date().toISOString(),
  thresholds: { LOCKED_CPU, LOW_FPS_RATIO, SHARED_TESTER_SHARE, HOTSPOT_LOW_FPS, HOTSPOT_JS_LOCKED },
  sessions: sessions.map(({ perfSession: s }) => ({
    tester: s.tester,
    session: s.session,
    device: s.device,
    durationMin: +(s.durationMs / 60000).toFixed(1),
    jankFlags: s.jankMarkers.length,
  })),
  flows,
  devices,
  jankMarkers,
};
fs.writeFileSync(`${outBase}.json`, JSON.stringify(report, null, 2));

const pct = (x) => (x === null || x === undefined ? '–' : `${Math.round(x * 100)}%`);
const row = (cells) => `| ${cells.join(' | ')} |`;
const md = [
  `# Perf session report`,
  ``,
  `${sessions.length} recordings · ${new Set(report.sessions.map((s) => s.tester)).size} testers · ${devices.length} devices · generated ${report.generatedAt}`,
  ``,
  `## Shared hotspots`,
  ``,
  ...(flows.some((f) => f.sharedHotspot)
    ? flows
        .filter((f) => f.sharedHotspot)
        .map(
          (f) =>
            `- **${f.flow}**: ${f.testersAffected.length}/${f.testers} testers affected (${f.devicesAffected.join(', ')}), ` +
            `low FPS ${pct(f.lowFpsShare)} of the time, JS thread locked ${pct(f.jsLockedShare)}, ${f.jankFlags} jank flags`,
        )
    : ['None: no flow was slow for a majority of the testers who used it.']),
  ``,
  `## Flows (worst first)`,
  ``,
  row(['Flow', 'Testers', 'Min', 'Avg FPS', 'P10 FPS', 'Low-FPS time', 'JS locked', 'UI locked', 'Avg JS CPU', 'Peak RAM', 'Jank flags']),
  row(Array(11).fill('---')),
  ...flows.map((f) =>
    row([
      f.sharedHotspot ? `**${f.flow}** ⚠️` : f.flow,
      f.testers,
      f.minutes,
      f.avgFpsPct === null ? '–' : `${f.avgFpsPct}%`,
      f.p10FpsPct === null ? '–' : `${f.p10FpsPct}%`,
      pct(f.lowFpsShare),
      pct(f.jsLockedShare),
      pct(f.uiLockedShare),
      `${f.avgJsCpu}%`,
      `${f.peakRamMb} MB`,
      f.jankFlags,
    ]),
  ),
  ``,
  `FPS is shown as % of each device's refresh rate. "Locked" = thread at ≥${LOCKED_CPU}% CPU.`,
  ``,
  `## Devices`,
  ``,
  row(['Device', 'Testers', 'Min', 'Avg FPS', 'Low-FPS time', 'JS locked', 'Peak RAM']),
  row(Array(7).fill('---')),
  ...devices.map((d) =>
    row([d.device, d.testers, d.minutes, d.avgFpsPct === null ? '–' : `${d.avgFpsPct}%`, pct(d.lowFpsShare), pct(d.jsLockedShare), `${d.peakRamMb} MB`]),
  ),
  ``,
  `## Jank flags`,
  ``,
  ...(jankMarkers.length
    ? jankMarkers.map(
        (j) =>
          `- ${j.flow} · ${j.tester} (${j.device}) · min FPS ${j.minFpsPct ?? '–'}% · max JS CPU ${j.maxJsCpu ?? '–'}%${j.note ? ` · "${j.note}"` : ''}`,
      )
    : ['None.']),
  ``,
].join('\n');
fs.writeFileSync(`${outBase}.md`, md);
console.log(`Wrote ${outBase}.md and ${outBase}.json`);
