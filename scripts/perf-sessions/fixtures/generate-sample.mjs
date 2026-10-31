#!/usr/bin/env node
// Writes synthetic recordings for 4 testers so aggregate.mjs can be tried
// without devices. "swap" is slow for most testers; "browser" only on one device.
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] ?? 'fixtures/demo';
fs.mkdirSync(outDir, { recursive: true });

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const testers = [
  { tester: 'ana', model: 'Samsung SM-A146B', refreshRate: 90 },
  { tester: 'bruno', model: 'Google Pixel 8', refreshRate: 120 },
  { tester: 'carla', model: 'Samsung SM-A146B', refreshRate: 90 },
  { tester: 'dev', model: 'Xiaomi Redmi Note 12', refreshRate: 60 },
];
const plan = [
  ['onboarding', 40, 0.95, 40],
  ['send', 60, 0.9, 45],
  ['swap', 80, 0.55, 92],
  ['browser', 60, 0.85, 60],
];

for (const t of testers) {
  const measures = [];
  const flows = [{ name: 'unlabelled', time: 0 }];
  const jankMarkers = [];
  let time = 0;
  for (const [flow, seconds, fpsRatio, js] of plan) {
    flows.push({ name: flow, time });
    const lowEnd = t.model.includes('Redmi') && flow === 'browser';
    const fast = t.tester === 'bruno';
    for (let i = 0; i < seconds * 2; i++, time += 500) {
      const ratio = Math.min(1, (lowEnd ? 0.5 : fpsRatio) * (fast ? 1.3 : 1) + (rand() - 0.5) * 0.2);
      const jsCpu = Math.min(100, (lowEnd ? 95 : js) * (fast ? 0.7 : 1) + (rand() - 0.5) * 20);
      measures.push({
        time,
        fps: Math.round(ratio * t.refreshRate),
        ram: 380 + time / 1000 + rand() * 30,
        cpu: { perName: { mqt_v_js: jsCpu, 'UI Thread': 30 + rand() * 30, RenderThread: 20 }, perCore: {} },
      });
    }
    if ((flow === 'swap' && !fast) || lowEnd) {
      jankMarkers.push({ time: time - 10000, flow, note: flow === 'swap' ? 'quote list stutters' : undefined });
    }
  }
  const result = {
    name: `${t.tester} · demo`,
    status: 'SUCCESS',
    iterations: [{ time, measures, status: 'SUCCESS' }],
    specs: { refreshRate: t.refreshRate },
    perfSession: {
      version: 1,
      tester: t.tester,
      session: 'demo',
      bundleId: 'io.metamask',
      startedAt: '2026-10-29T10:00:00.000Z',
      durationMs: time,
      device: { model: t.model, androidVersion: '14', appVersion: '7.99.0', refreshRate: t.refreshRate },
      flows,
      jankMarkers,
    },
  };
  fs.writeFileSync(path.join(outDir, `${t.tester}.json`), JSON.stringify(result));
}
console.log(`Wrote ${testers.length} synthetic recordings to ${outDir}`);
