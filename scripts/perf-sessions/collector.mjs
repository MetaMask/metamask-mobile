#!/usr/bin/env node
/**
 * Receives always-on perf samples from main-rc-perf builds (POC).
 *
 *   PERF_COLLECTOR_TOKEN=<token> node collector.mjs [--port 4040] [--data ./collector-data]
 *
 * POST /ingest                         batches from the in-app sampler (Bearer token)
 * GET  /                               live dashboard
 * GET  /api/summary?hours=24           devices + report as JSON (dashboard data)
 * GET  /report.md?hours=24             shareable markdown report
 * GET  /api/report.json?hours=24       same report, structured for a bot / LLM
 * GET  /api/devices/<id>/flashlight.json   one device as a Flashlight result
 *                                      (npx @perf-profiler/web-reporter report <file>)
 *
 * Batches are appended to <data>/<deviceId>.ndjson, so restarts lose nothing.
 * Optional <data>/testers.json maps deviceId → tester name.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildReport, renderMarkdown } from './lib/report.mjs';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '4040' },
    data: { type: 'string', default: path.resolve('collector-data') },
  },
});
const TOKEN = process.env.PERF_COLLECTOR_TOKEN ?? '';
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const ONLINE_MS = 60_000;
fs.mkdirSync(args.data, { recursive: true });

/** deviceId → { meta, lastSeen, samples[], events[] } */
const devices = new Map();

const addBatch = (batch, receivedAt) => {
  const device = devices.get(batch.deviceId) ?? { meta: {}, lastSeen: 0, samples: [], events: [], launches: new Set() };
  device.meta = { ...device.meta, ...batch.meta };
  device.lastSeen = Math.max(device.lastSeen, receivedAt);
  device.launches.add(batch.launchId);
  device.samples.push(...batch.samples.map((s) => ({ ...s, cpu: s.cpu ?? {}, launchId: batch.launchId })));
  device.events.push(...batch.events);
  devices.set(batch.deviceId, device);
};

// Reload everything received before a restart.
for (const file of fs.readdirSync(args.data).filter((f) => f.endsWith('.ndjson'))) {
  for (const line of fs.readFileSync(path.join(args.data, file), 'utf8').split('\n').filter(Boolean)) {
    const { receivedAt, batch } = JSON.parse(line);
    addBatch(batch, receivedAt);
  }
}

const testerNames = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(args.data, 'testers.json'), 'utf8'));
  } catch {
    return {};
  }
};

const deviceLabel = (id, meta) => `${meta.manufacturer ?? ''} ${meta.model ?? 'unknown'}`.trim();

/** One device's samples as a Flashlight TestCaseResult with a perfSession block. */
const toSession = (id, device, since, names) => {
  const samples = device.samples.filter((s) => s.t >= since).sort((a, b) => a.t - b.t);
  if (!samples.length) return undefined;
  const t0 = samples[0].t;
  const tester = names[id] ?? `${deviceLabel(id, device.meta)} · ${id.slice(0, 6)}`;
  return {
    name: tester,
    status: 'SUCCESS',
    iterations: [
      {
        time: samples.at(-1).t - t0,
        status: 'SUCCESS',
        measures: samples.map((s) => ({
          time: s.t - t0,
          fps: s.fps ?? undefined,
          ram: s.ram,
          cpu: { perName: s.cpu, perCore: {} },
          flow: s.screen,
          frames: s.frames,
          janky: s.janky,
          frozen: s.frozen,
        })),
      },
    ],
    specs: { refreshRate: device.meta.refreshRate ?? 60 },
    perfSession: {
      version: 1,
      tester,
      session: 'live',
      deviceId: id,
      durationMs: samples.at(-1).t - t0,
      device: {
        model: deviceLabel(id, device.meta),
        androidSdk: device.meta.sdk,
        appVersion: device.meta.appVersion,
        refreshRate: device.meta.refreshRate ?? 60,
      },
      flows: [],
      // Frozen frames (>700 ms) are the in-app equivalent of a tester flagging jank.
      jankMarkers: samples
        .filter((s) => s.frozen > 0)
        .map((s) => ({ time: s.t - t0, at: new Date(s.t).toISOString(), flow: s.screen, note: `${s.frozen} frozen frame(s)` })),
    },
  };
};

const sinceFrom = (url) => Date.now() - Number(url.searchParams.get('hours') ?? 24) * 3_600_000;

const report = (url) => {
  const since = sinceFrom(url);
  const names = testerNames();
  const sessions = [...devices].map(([id, d]) => toSession(id, d, since, names)).filter(Boolean);
  return sessions.length ? buildReport(sessions) : undefined;
};

const summary = (url) => {
  const names = testerNames();
  const now = Date.now();
  return {
    now,
    devices: [...devices].map(([id, d]) => {
      const last = d.samples.at(-1);
      const lastLifecycle = d.events.filter((e) => e.type === 'foreground' || e.type === 'background').at(-1);
      return {
        id,
        name: names[id] ?? null,
        model: deviceLabel(id, d.meta),
        appVersion: d.meta.appVersion,
        refreshRate: d.meta.refreshRate,
        lastSeen: d.lastSeen,
        online: now - d.lastSeen < ONLINE_MS,
        inForeground: lastLifecycle?.type === 'foreground',
        screen: last?.screen ?? null,
        launches: d.launches.size,
        samples: d.samples.length,
        last: last ? { fps: last.fps, ram: last.ram, js: Math.max(last.cpu.mqt_v_js ?? 0, last.cpu.mqt_js ?? 0) } : null,
      };
    }),
    report: report(url) ?? null,
  };
};

const tokenOk = (req) => {
  if (!TOKEN) return true;
  const given = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${TOKEN}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const isBatch = (b) =>
  b && typeof b.deviceId === 'string' && /^[\w-]{8,64}$/.test(b.deviceId) && Array.isArray(b.samples) && Array.isArray(b.events);

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' && typeof body !== 'string' ? JSON.stringify(body) : body);
};

const dashboard = fs.readFileSync(new URL('./lib/dashboard.html', import.meta.url), 'utf8');

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'POST' && url.pathname === '/ingest') {
        if (!tokenOk(req)) return send(res, 401, { error: 'bad token' });
        const batch = JSON.parse(await readBody(req));
        if (!isBatch(batch)) return send(res, 400, { error: 'bad batch' });
        const receivedAt = Date.now();
        fs.appendFileSync(path.join(args.data, `${batch.deviceId}.ndjson`), `${JSON.stringify({ receivedAt, batch })}\n`);
        addBatch(batch, receivedAt);
        const screen = batch.samples.at(-1)?.screen ?? batch.events.at(-1)?.type;
        console.log(`${new Date(receivedAt).toLocaleTimeString()} ${batch.deviceId.slice(0, 6)} ${deviceLabel(batch.deviceId, batch.meta ?? {})}: ${batch.samples.length} samples · ${screen ?? ''}`);
        return send(res, 204, '');
      }
      if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
      if (url.pathname === '/') return send(res, 200, dashboard, 'text/html; charset=utf-8');
      if (url.pathname === '/api/summary') return send(res, 200, summary(url));
      if (url.pathname === '/api/report.json') return send(res, 200, report(url) ?? {});
      if (url.pathname === '/report.md') {
        const r = report(url);
        return send(res, 200, r ? renderMarkdown(r) : 'No data yet.\n', 'text/markdown; charset=utf-8');
      }
      const match = url.pathname.match(/^\/api\/devices\/([\w-]+)\/flashlight\.json$/);
      if (match && devices.has(match[1])) {
        return send(res, 200, toSession(match[1], devices.get(match[1]), sinceFrom(url), testerNames()) ?? {});
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      return send(res, 400, { error: String(e.message ?? e) });
    }
  })
  .listen(Number(args.port), () => {
    console.log(`Perf collector on http://localhost:${args.port} · data in ${args.data}`);
    if (!TOKEN) console.warn('PERF_COLLECTOR_TOKEN is not set: accepting batches from anyone who knows the URL.');
  });
