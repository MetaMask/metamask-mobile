#!/usr/bin/env node
/**
 * Flashlight listener for manual tester sessions (POC).
 *
 * Runs on the tester's laptop with an Android device attached over adb and
 * records CPU (per thread), RAM and FPS of the installed app every 500ms while
 * the tester exercises it. Testers type a flow label to tag what they are doing
 * and press Enter on an empty line whenever something feels janky.
 *
 * Output (per run, in <out>/<session>/):
 *   <tester>-<timestamp>.ndjson  streamed measures, crash-safe
 *   <tester>-<timestamp>.json    Flashlight TestCaseResult + `perfSession` metadata
 *                                (open with `npx @perf-profiler/web-reporter <file>`)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    tester: { type: 'string' },
    session: { type: 'string', default: new Date().toISOString().slice(0, 10) },
    device: { type: 'string' },
    bundle: { type: 'string', default: 'io.metamask' },
    out: { type: 'string', default: path.resolve('perf-sessions-output') },
    help: { type: 'boolean', short: 'h' },
  },
});

if (args.help || !args.tester) {
  console.log(`Usage: node agent.mjs --tester <name> [--session <id>] [--device <adb serial>]
                     [--bundle io.metamask] [--out ./perf-sessions-output]

While recording:
  <text> + Enter   start a new flow label (e.g. "swap", "send", "browser")
  Enter            flag a jank moment at the current time
  ! <note>         flag a jank moment with a note
  q                stop and write the report`);
  process.exit(args.help ? 0 : 1);
}

// adb (and therefore Flashlight) targets this device when several are attached.
if (args.device) {
  process.env.ANDROID_SERIAL = args.device;
}

const adb = (cmd) => execSync(`adb ${cmd}`, { stdio: 'pipe' }).toString().trim();

const readDeviceInfo = () => {
  try {
    adb('get-state');
  } catch {
    console.error('No device reachable over adb. Plug it in (USB debugging on) or `adb connect <ip>`, then retry.');
    process.exit(1);
  }
  const prop = (key) => adb(`shell getprop ${key}`);
  const pkg = adb(`shell dumpsys package ${args.bundle}`);
  const versionName = pkg.match(/versionName=(\S+)/)?.[1];
  if (!versionName) {
    console.error(`${args.bundle} is not installed on the device. Install the main-rc build first.`);
    process.exit(1);
  }
  return {
    serial: adb('get-serialno'),
    model: `${prop('ro.product.manufacturer')} ${prop('ro.product.model')}`,
    androidVersion: prop('ro.build.version.release'),
    appVersion: versionName,
    appVersionCode: pkg.match(/versionCode=(\d+)/)?.[1],
  };
};

const device = readDeviceInfo();

// Imported after ANDROID_SERIAL is set so every adb call it spawns uses it.
const { profiler } = await import('@perf-profiler/profiler');

// Published @perf-profiler/profiler (0.10.x) has no refresh-rate detection;
// newer versions do. FPS is normalised by this, so 120Hz devices aren't penalised.
const detectRefreshRate = () => {
  if (typeof profiler.detectDeviceRefreshRate === 'function') {
    return profiler.detectDeviceRefreshRate();
  }
  const display = adb('shell dumpsys display');
  const rate = display.match(/(?:renderFrameRate|refreshRate)[\s=]+([\d.]+)/)?.[1];
  return rate ? Math.round(Number(rate)) : 60;
};
const refreshRate = detectRefreshRate();
const startedAt = Date.now();
const safeTester = args.tester.replace(/[^\w.-]+/g, '_');
const outDir = path.join(args.out, args.session.replace(/[^\w.-]+/g, '_'));
const baseName = `${safeTester}-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(outDir, { recursive: true });
const stream = fs.createWriteStream(path.join(outDir, `${baseName}.ndjson`));

const measures = [];
const flows = [{ name: 'unlabelled', time: 0 }];
const jankMarkers = [];
const now = () => Date.now() - startedAt;
const currentFlow = () => flows[flows.length - 1].name;

const jsCpu = (m) => Math.max(m.cpu.perName.mqt_v_js ?? 0, m.cpu.perName.mqt_js ?? 0);
const uiCpu = (m) => m.cpu.perName['UI Thread'] ?? 0;

const polling = profiler.pollPerformanceMeasures(args.bundle, {
  onStartMeasuring: () => console.log(`Measuring ${args.bundle} (pid attached). Start testing.`),
  onMeasure: (measure) => {
    // Flashlight resets `time` when the app restarts; keep one session clock.
    const m = { ...measure, time: now() };
    measures.push(m);
    stream.write(`${JSON.stringify({ ...m, flow: currentFlow() })}\n`);
  },
});

const statusTimer = setInterval(() => {
  const recent = measures.slice(-10);
  if (!recent.length) {
    console.log(`Waiting for ${args.bundle} to be in the foreground...`);
    return;
  }
  const avg = (fn) => recent.reduce((s, m) => s + (fn(m) ?? 0), 0) / recent.length;
  console.log(
    `[${currentFlow()}] fps ${avg((m) => m.fps).toFixed(0)}/${refreshRate}` +
      `  js ${avg(jsCpu).toFixed(0)}%  ui ${avg(uiCpu).toFixed(0)}%` +
      `  ram ${avg((m) => m.ram).toFixed(0)}MB  jank flags ${jankMarkers.length}`,
  );
}, 5000);

let stopped = false;
const stop = () => {
  if (stopped) return;
  stopped = true;
  clearInterval(statusTimer);
  polling.stop();
  profiler.cleanup();
  stream.end();

  const durationMs = now();
  // Shape matches Flashlight's TestCaseResult so its web reporter can open it;
  // `perfSession` carries what aggregate.mjs needs to correlate testers.
  const result = {
    name: `${args.tester} · ${args.session}`,
    status: 'SUCCESS',
    iterations: [{ time: durationMs, measures, status: 'SUCCESS' }],
    specs: { refreshRate },
    perfSession: {
      version: 1,
      tester: args.tester,
      session: args.session,
      bundleId: args.bundle,
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      device: { ...device, refreshRate },
      flows,
      jankMarkers,
    },
  };
  const file = path.join(outDir, `${baseName}.json`);
  fs.writeFileSync(file, JSON.stringify(result));
  console.log(`\nSaved ${measures.length} samples, ${jankMarkers.length} jank flags → ${path.relative(process.cwd(), file)}`);
  process.exit(0);
};

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (raw) => {
  const line = raw.trim();
  if (line === 'q') {
    stop();
  } else if (line === '' || line.startsWith('!')) {
    jankMarkers.push({ time: now(), flow: currentFlow(), note: line.slice(1).trim() || undefined });
    console.log(`  jank flagged in "${currentFlow()}"`);
  } else {
    flows.push({ name: line.toLowerCase(), time: now() });
    console.log(`  flow → "${line.toLowerCase()}"`);
  }
});
rl.on('close', stop);
// Flashlight's shell module exits on these signals at import time, which would
// skip writing the report. stop() runs its cleanup itself.
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((s) => process.removeAllListeners(s));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log(`Tester ${args.tester} · ${device.model} (Android ${device.androidVersion}, ${refreshRate}Hz) · app ${device.appVersion}`);
console.log('Type a flow name + Enter to label what you are testing, Enter alone to flag jank, q to stop.');
