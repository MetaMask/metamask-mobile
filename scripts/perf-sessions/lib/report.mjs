/**
 * Report builder for lab-agent recordings on disk (aggregate.mjs).
 *
 * Input: Flashlight TestCaseResult objects with a `perfSession` block (see
 * agent.mjs). Measures may also carry `flow` (screen name, set by the in-app
 * sampler) and `frames` / `janky` / `frozen` frame counts.
 */

// Thresholds: Flashlight treats a thread ≥90% CPU as locked; a sample is
// "low FPS" when it renders under 75% of the device refresh rate.
const LOCKED_CPU = 90;
const LOW_FPS_RATIO = 0.75;
const JANK_WINDOW_MS = 2000;
// A flow is a shared hotspot when at least this share of its testers hit it.
const SHARED_TESTER_SHARE = 0.5;
const HOTSPOT_LOW_FPS = 0.2;
const HOTSPOT_JS_LOCKED = 0.1;
const HOTSPOT_JANKY_FRAMES = 0.25;

const jsCpu = (m) => Math.max(m.cpu.perName.mqt_v_js ?? 0, m.cpu.perName.mqt_js ?? 0);
const uiCpu = (m) => m.cpu.perName['UI Thread'] ?? 0;
const flowAt = (flows, time) => flows.findLast((f) => f.time <= time)?.name ?? 'unlabelled';

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const percentile = (xs, p) => {
  if (!xs.length) return undefined;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const share = (xs, pred) => (xs.length ? xs.filter(pred).length / xs.length : 0);
const groupBy = (xs, key) => xs.reduce((acc, x) => ((acc[key(x)] ??= []).push(x), acc), {});
// fps is null/undefined when no frame was drawn (idle screen); that isn't slow.
const hasFps = (m) => m.fps !== undefined && m.fps !== null;

const summarize = (group) => {
  const fps = group.map((x) => x.fpsRatio).filter((x) => x !== undefined);
  const frames = sum(group.map((x) => x.frames ?? 0));
  return {
    samples: group.length,
    minutes: +((group.length * 0.5) / 60).toFixed(1),
    avgFpsPct: fps.length ? Math.round(mean(fps) * 100) : null,
    p10FpsPct: fps.length ? Math.round(percentile(fps, 10) * 100) : null,
    lowFpsShare: +share(fps, (r) => r < LOW_FPS_RATIO).toFixed(2),
    jankyFrameShare: frames ? +(sum(group.map((x) => x.janky ?? 0)) / frames).toFixed(2) : null,
    frozenFrames: sum(group.map((x) => x.frozen ?? 0)),
    avgJsCpu: Math.round(mean(group.map((x) => x.js)) ?? 0),
    jsLockedShare: +share(group, (x) => x.js >= LOCKED_CPU).toFixed(2),
    uiLockedShare: +share(group, (x) => x.ui >= LOCKED_CPU).toFixed(2),
    peakRamMb: Math.round(Math.max(...group.map((x) => x.ram ?? 0))),
  };
};

const isBad = (s) =>
  s.lowFpsShare >= HOTSPOT_LOW_FPS ||
  s.jsLockedShare >= HOTSPOT_JS_LOCKED ||
  (s.jankyFrameShare ?? 0) >= HOTSPOT_JANKY_FRAMES;

export const buildReport = (sessions) => {
  // Flatten to samples tagged with tester, device and flow.
  const samples = sessions.flatMap(({ iterations, perfSession: s }) =>
    iterations[0].measures.map((m) => ({
      tester: s.tester,
      device: s.device.model,
      flow: m.flow ?? flowAt(s.flows, m.time),
      time: m.time,
      fpsRatio: hasFps(m) ? m.fps / s.device.refreshRate : undefined,
      frames: m.frames,
      janky: m.janky,
      frozen: m.frozen,
      js: jsCpu(m),
      ui: uiCpu(m),
      ram: m.ram,
    })),
  );

  const jankMarkers = sessions.flatMap(({ iterations, perfSession: s }) =>
    s.jankMarkers.map((j) => {
      const around = iterations[0].measures.filter((m) => Math.abs(m.time - j.time) <= JANK_WINDOW_MS);
      const fps = around.filter(hasFps).map((m) => m.fps);
      return {
        tester: s.tester,
        device: s.device.model,
        flow: j.flow,
        note: j.note,
        at: j.at,
        minFpsPct: fps.length ? Math.round((Math.min(...fps) / s.device.refreshRate) * 100) : null,
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
      sharedHotspot: byTester.length > 1 && affected.length / byTester.length >= SHARED_TESTER_SHARE,
      severity: Math.round(
        overall.lowFpsShare * 100 +
          (overall.jankyFrameShare ?? 0) * 100 +
          overall.jsLockedShare * 150 +
          overall.uiLockedShare * 100 +
          flags.length * 5,
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

  return {
    generatedAt: new Date().toISOString(),
    thresholds: { LOCKED_CPU, LOW_FPS_RATIO, SHARED_TESTER_SHARE, HOTSPOT_LOW_FPS, HOTSPOT_JS_LOCKED, HOTSPOT_JANKY_FRAMES },
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
};

export const renderMarkdown = (report) => {
  const { flows, devices, jankMarkers } = report;
  const pct = (x) => (x === null || x === undefined ? '–' : `${Math.round(x * 100)}%`);
  const fpsPct = (x) => (x === null ? '–' : `${x}%`);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [
    `# Perf session report`,
    ``,
    `${report.sessions.length} recordings · ${new Set(report.sessions.map((s) => s.tester)).size} testers · ${devices.length} devices · generated ${report.generatedAt}`,
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
    `## Flows / screens (worst first)`,
    ``,
    row(['Flow', 'Testers', 'Min', 'Avg FPS', 'P10 FPS', 'Low-FPS time', 'Janky frames', 'Frozen', 'JS locked', 'UI locked', 'Avg JS CPU', 'Peak RAM', 'Jank flags']),
    row(Array(13).fill('---')),
    ...flows.map((f) =>
      row([
        f.sharedHotspot ? `**${f.flow}** ⚠️` : f.flow,
        f.testers,
        f.minutes,
        fpsPct(f.avgFpsPct),
        fpsPct(f.p10FpsPct),
        pct(f.lowFpsShare),
        pct(f.jankyFrameShare),
        f.frozenFrames,
        pct(f.jsLockedShare),
        pct(f.uiLockedShare),
        `${f.avgJsCpu}%`,
        `${f.peakRamMb} MB`,
        f.jankFlags,
      ]),
    ),
    ``,
    `FPS is shown as % of each device's refresh rate. "Locked" = thread at ≥${LOCKED_CPU}% CPU. "Frozen" = frames over 700 ms.`,
    ``,
    `## Devices`,
    ``,
    row(['Device', 'Testers', 'Min', 'Avg FPS', 'Low-FPS time', 'Janky frames', 'JS locked', 'Peak RAM']),
    row(Array(8).fill('---')),
    ...devices.map((d) =>
      row([d.device, d.testers, d.minutes, fpsPct(d.avgFpsPct), pct(d.lowFpsShare), pct(d.jankyFrameShare), pct(d.jsLockedShare), `${d.peakRamMb} MB`]),
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
};
