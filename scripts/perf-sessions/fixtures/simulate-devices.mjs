#!/usr/bin/env node
// Posts batches in the in-app sampler's format (PerfSession.kt) for 4 fake
// devices, so collector.mjs can be tried without a build. Each device launches,
// moves through screens, gets killed and relaunches. "BridgeView" is slow on
// most devices; "BrowserView" only on the low-end one.
//
//   node fixtures/simulate-devices.mjs [http://localhost:4040] [token]
import crypto from 'node:crypto';

const url = `${(process.argv[2] ?? 'http://localhost:4040').replace(/\/$/, '')}/ingest`;
const token = process.argv[3] ?? process.env.PERF_COLLECTOR_TOKEN ?? '';

let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const devices = [
  { manufacturer: 'samsung', model: 'SM-A146B', refreshRate: 90, slow: 1 },
  { manufacturer: 'Google', model: 'Pixel 8', refreshRate: 120, slow: 0.6 },
  { manufacturer: 'samsung', model: 'SM-A546B', refreshRate: 120, slow: 0.9 },
  { manufacturer: 'Xiaomi', model: 'Redmi Note 12', refreshRate: 60, slow: 1.3, lowEnd: true },
];
// [screen, seconds, baseline JS CPU, share of frames that are janky]
const journey = [
  ['Login', 6, 55, 0.05],
  ['WalletView', 20, 35, 0.04],
  ['BridgeView', 25, 88, 0.35],
  ['WalletView', 10, 30, 0.04],
  ['BrowserView', 20, 50, 0.08],
];

const post = async (batch) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(batch),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
};

const start = Date.now() - 30 * 60_000;
for (const [i, d] of devices.entries()) {
  const deviceId = crypto.randomUUID();
  const meta = { manufacturer: d.manufacturer, model: d.model, sdk: 34, cores: 8, appVersion: '7.99.0', refreshRate: d.refreshRate };
  let t = start + i * 45_000;
  // Two launches per device: the second one simulates the PM killing and reopening the app.
  for (let launch = 0; launch < 2; launch++) {
    const launchId = crypto.randomUUID();
    let samples = [];
    let events = [{ t, type: 'launch', value: null }, { t, type: 'foreground', value: null }];
    const flush = async () => {
      await post({ v: 1, deviceId, launchId, meta, samples, events });
      samples = [];
      events = [];
    };
    for (const [screen, seconds, js, jankShare] of journey) {
      events.push({ t, type: 'screen', value: screen });
      const bad = (screen === 'BrowserView' && d.lowEnd) || screen === 'BridgeView';
      for (let k = 0; k < seconds * 2; k++, t += 500) {
        const frames = rand() < 0.3 ? 0 : Math.round(d.refreshRate / 2 * (0.4 + rand() * 0.6));
        const janky = Math.round(frames * Math.min(0.9, (bad ? jankShare : 0.04) * d.slow * (0.6 + rand() * 0.8)));
        const dropped = janky * 2;
        const jsCpu = Math.min(100, (bad && d.lowEnd ? 95 : js) * d.slow * (0.8 + rand() * 0.3));
        samples.push({
          t,
          screen,
          fps: frames ? Math.round((d.refreshRate * frames) / (frames + dropped)) : null,
          frames,
          janky,
          frozen: bad && rand() < 0.04 * d.slow ? 1 : 0,
          ram: Math.round(420 + (t - start) / 20_000 + rand() * 40),
          cpu: { 'UI Thread': +(15 + rand() * 25).toFixed(1), mqt_v_js: +jsCpu.toFixed(1), RenderThread: +(10 + rand() * 15).toFixed(1) },
        });
        if (samples.length >= 20) await flush();
      }
    }
    events.push({ t, type: 'background', value: null });
    await flush();
    t += 60_000;
  }
  console.log(`${d.manufacturer} ${d.model}: posted 2 launches (${deviceId.slice(0, 6)})`);
}
