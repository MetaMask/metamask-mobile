// Foxy server: receives every fetch/XHR (with initiator stack) from the
// app over WebSocket, symbolicates stacks through Metro, and exposes a live
// dashboard + REST API (also used by mcp.mjs).
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { loadCodeowners, resolveFrameOwners } from './codeowners.mjs';
import { createViewIndexer } from './views.mjs';
import { createPackageLinker, createTagIndex } from './packages.mjs';
import {
  parseUrl,
  parseFrame,
  summarizeInitiator,
  groupEndpoints,
  toMarkdown,
  exportCapture,
  exportPhase,
  fileSlug,
  describeFrames,
  bodyFingerprint,
  slim,
} from './lib.mjs';

const PORT = Number(process.env.FOXY_PORT || 8098);
const METRO = process.env.FOXY_METRO || 'http://localhost:8081';
const __dirname = dirname(fileURLToPath(import.meta.url));
// CODEOWNERS: the app repo (app/... frames) and the core monorepo (@metamask/<pkg> frames).
const REPO = process.env.FOXY_REPO || join(__dirname, '..', '..');
// Core's CODEOWNERS: a sibling checkout wins, otherwise the copy setup.mjs keeps in .cache/core.
const CORE = process.env.FOXY_CORE
  || (existsSync(join(REPO, '..', 'core', '.github', 'CODEOWNERS')) ? join(REPO, '..', 'core') : join(__dirname, '.cache', 'core'));
const repoRules = loadCodeowners(join(REPO, '.github', 'CODEOWNERS'));
const coreRules = loadCodeowners(join(CORE, '.github', 'CODEOWNERS'));
/**
 * Where call-site links point on GitHub. The ref is a commit that exists upstream so the line numbers match the
 * code the app is running: HEAD when it is already on a remote branch, otherwise its merge-base with origin/main.
 * Override with FOXY_GITHUB_REPO=owner/name and FOXY_GITHUB_REF=<branch|sha> (for example after pushing your branch).
 */
function githubInfo() {
  const git = (...args) => {
    try { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
  };
  let repo = process.env.FOXY_GITHUB_REPO;
  if (!repo) {
    const m = git('remote', 'get-url', 'origin').match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    repo = m ? m[1] : 'MetaMask/metamask-mobile';
  }
  let ref = process.env.FOXY_GITHUB_REF;
  if (!ref) {
    const head = git('rev-parse', 'HEAD');
    ref = head && git('branch', '-r', '--contains', 'HEAD') ? head : git('merge-base', 'HEAD', 'origin/main') || 'main';
  }
  return { repo, ref };
}
const GITHUB = githubInfo();
/** What is running: Foxy's version, and the branch and commit of the checkout it runs from, so a capture can be matched to the code that made it. */
function buildInfo() {
  const git = (...args) => {
    try { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
  };
  let version = null;
  try { version = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version || null; } catch { /* no package.json: the version is left out */ }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  return {
    version,
    branch: branch && branch !== 'HEAD' ? branch : null, // HEAD on its own means a detached checkout
    commit: git('rev-parse', '--short', 'HEAD') || null,
    dirty: git('status', '--porcelain') !== '', // uncommitted changes anywhere in the checkout
  };
}
/** Screen name -> where it is defined in the app source (see views.mjs). */
const VIEWS = createViewIndexer(REPO);
/** A frame inside node_modules -> its package's source on GitHub (see packages.mjs). */
const PACKAGE_LINK = createPackageLinker(REPO, createTagIndex());
const LOG_FILE =
  process.env.FOXY_LOG_FILE || join(__dirname, 'logs', 'foxy.jsonl');

/** @type {Map<string, {id:string,startedAt:number,platform:string,connectedAt:number}>} */
const sessions = new Map();
/** @type {Map<string, any>} key = `${session}:${id}` */
const records = new Map();
/** @type {Array<{ts:number,label:string,session:string|null,relMs:number}>} */
const markers = [];
let markerSeq = 0;
let latestSession = null;

const uiClients = new Set();
const broadcast = (message) => {
  const raw = JSON.stringify(message);
  for (const c of uiClients) if (c.readyState === 1) c.send(raw);
};

const log = async (entry) => {
  try {
    await mkdir(dirname(LOG_FILE), { recursive: true });
    await appendFile(LOG_FILE, `${JSON.stringify({ at: Date.now(), ...entry })}\n`);
  } catch {
    // logging must never break capture
  }
};

// ---- symbolication (Metro) ---------------------------------------------------
const symCache = new Map();
let symChain = Promise.resolve();

const metroCandidates = (frames) => {
  const origins = new Set();
  for (const f of frames) {
    try {
      if (/^https?:/.test(f.file)) origins.add(new URL(f.file).origin);
    } catch {
      // ignore
    }
  }
  origins.add(METRO);
  return [...origins];
};

async function symbolicate(frames) {
  // Only bundle-URL frames can be symbolicated; native / InternalBytecode frames are skipped.
  const todo = frames.filter((f) => /^https?:/.test(f.file) && f.lineNumber && !symCache.has(f.raw));
  if (todo.length > 0) {
    for (const base of metroCandidates(todo)) {
      try {
        const res = await fetch(`${base}/symbolicate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            stack: todo.map((f) => ({
              file: f.file,
              lineNumber: f.lineNumber,
              column: f.column,
              methodName: f.methodName,
            })),
          }),
        });
        if (!res.ok) continue;
        const { stack } = await res.json();
        stack.forEach((s, i) => {
          if (s && s.file && !/^https?:/.test(s.file)) {
            symCache.set(todo[i].raw, {
              raw: todo[i].raw,
              methodName: s.methodName || todo[i].methodName,
              file: s.file,
              lineNumber: s.lineNumber,
              column: s.column,
            });
          }
        });
        break;
      } catch {
        // this Metro is not reachable: try the next candidate
      }
    }
  }
  return frames.map((f) => symCache.get(f.raw) || f);
}

function enqueueSymbolication(rec) {
  symChain = symChain
    .then(async () => {
      rec.frames = await symbolicate(rec.frames);
      applySummary(rec);
      broadcast({ type: 'request', request: slim(rec) });
    })
    .catch(() => {});
}

function applySummary(rec) {
  const s = summarizeInitiator(rec.frames);
  rec.initiatorText = s.text;
  rec.callSite = s.callSite;
  rec.owner = s.owner;
  rec.symbolicated = s.symbolicated;
  const ctx = { repoRules, coreRules };
  const own = s.callSiteRef ? resolveFrameOwners(s.callSiteRef, ctx) : null;
  const via = s.ownerRef ? resolveFrameOwners(s.ownerRef, ctx) : null;
  rec.codeOwners = own?.owners ?? null;
  rec.ownerSource = own?.source ?? null; // repo | core | third-party | unknown
  rec.ownerCodeOwners = via?.owners ?? null;
  rec.callSiteInfo = s.callSiteInfo;
  rec.ownerInfo = s.ownerInfo;
}

const ownersOfInfo = (info) =>
  resolveFrameOwners({ kind: info.kind, shortPath: info.file }, { repoRules, coreRules }).owners;

// ---- ingest ------------------------------------------------------------------
function ingest(msg) {
  if (msg.type === 'hello') {
    // The app re-sends `hello` on every WebSocket reconnect; only a new session id
    // is a new app launch (and resets the dashboard).
    const isNew = !sessions.has(msg.s);
    const previous = sessions.get(msg.s); // a reconnect must keep what Clear reset (time zero and the id offset)
    sessions.set(msg.s, {
      ...previous,
      id: msg.s,
      startedAt: previous?.startedAt ?? msg.startedAt,
      platform: msg.platform,
      connectedAt: Date.now(),
    });
    latestSession = msg.s;
    console.log(
      `[foxy] app ${isNew ? 'connected' : 'reconnected'} (${msg.platform}) session ${msg.s}`,
    );
    if (isNew) {
      broadcast({ type: 'session', session: sessions.get(msg.s) });
      // A marker dropped while no app was connected has no session, and the dashboard only lists the latest session's markers, so it would
      // vanish. The first session to connect adopts it; it came before the app did, so its phase starts at time zero.
      const orphans = markers.filter((m) => m.session == null);
      if (orphans.length) {
        for (const m of orphans) { m.session = msg.s; m.relMs = Math.max(0, m.ts - (sessions.get(msg.s).startedAt ?? m.ts)); }
        broadcast({ type: 'markers', markers: sessionMarkers(latestSession) });
      }
    }
    return;
  }
  const session = sessions.get(msg.s);
  const key = `${msg.s}:${msg.id}`;
  if (msg.type === 'request') {
    const started = session?.startedAt ?? msg.ts;
    if (session) {
      // remembered so Clear can start the numbering and the clock over (see /api/clear)
      session.lastId = Math.max(session.lastId || 0, Number(msg.id) || 0);
      // this machine's clock minus the app's (about 0 on a simulator). The smallest value seen is the best
      // estimate: a message that was held up on the way only ever makes the difference look bigger.
      session.skew = Math.min(session.skew ?? Infinity, Date.now() - msg.ts);
    }
    const { host, path, query } = parseUrl(msg.url);
    const rec = {
      key,
      session: msg.s,
      id: Number.isFinite(Number(msg.id)) ? Number(msg.id) - (session?.idBase || 0) : msg.id, // the request number: starts again at 1 after Clear
      ts: msg.ts,
      relMs: msg.ts - started,
      transport: msg.transport,
      method: msg.method,
      url: msg.url,
      host,
      path,
      query,
      bodyKey: bodyFingerprint(msg.bodyBytes, msg.bodyPreview),
      frames: (msg.initiator || []).map(parseFrame),
      view: msg.view ?? null, // the screen the app was showing (older app builds do not send it)
      detail: {
        request: {
          headers: msg.headers || null,
          bodyBytes: msg.bodyBytes ?? null,
          bodyPreview: msg.bodyPreview ?? null,
        },
        response: null,
      },
    };
    applySummary(rec);
    records.set(key, rec);
    broadcast({ type: 'request', request: slim(rec) });
    enqueueSymbolication(rec);
  } else if (msg.type === 'response') {
    const rec = records.get(key);
    if (!rec) return;
    Object.assign(rec, {
      status: msg.status,
      ok: msg.ok,
      durationMs: msg.durationMs,
      sizeBytes: msg.sizeBytes,
      error: msg.error,
    });
    rec.detail.response = {
      statusText: msg.statusText ?? null,
      headers: msg.headers || null,
      bodyPreview: msg.bodyPreview ?? null,
    };
    broadcast({ type: 'request', request: slim(rec) });
  }
}

// ---- queries -----------------------------------------------------------------
function select(params) {
  const sessionParam = params.get('session') || 'latest';
  const sid = sessionParam === 'latest' ? latestSession : sessionParam;
  const q = (params.get('q') || '').toLowerCase();
  const host = (params.get('host') || '').toLowerCase();
  const path = (params.get('path') || '').toLowerCase();
  const status = params.get('status');
  return [...records.values()]
    .filter((r) => sessionParam === 'all' || r.session === sid)
    .filter((r) => !q || r.url.toLowerCase().includes(q))
    .filter((r) => !host || r.host.toLowerCase().includes(host))
    .filter((r) => !path || r.path.toLowerCase().includes(path))
    .filter((r) => !status || String(r.status ?? (r.error ? 'error' : 'pending')) === status)
    .sort((a, b) => a.ts - b.ts);
}

const sessionMarkers = (sid) =>
  markers.filter((m) => m.session === sid).map((m) => ({ ...m }));

// ---- http ----------------------------------------------------------------------
const json = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const VENDOR_FILES = { 'rive.js': 'text/javascript; charset=utf-8', 'rive.wasm': 'application/wasm', 'foxy-loading.riv': 'application/octet-stream' };
// Installable as an app (PWA): the manifest, the service worker that keeps the shell usable when the server is down, and the icons.
const PWA_FILES = Object.fromEntries(['icon-192.png', 'icon-512.png', 'maskable-192.png', 'maskable-512.png', 'apple-touch-icon.png'].map((name) => [name, 'image/png']));
const MANIFEST = JSON.stringify({
  name: 'Foxy',
  short_name: 'Foxy',
  description: 'Every network request the MetaMask app makes, and which team owns the code behind it.',
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    // the maskable artwork is the same fox pulled inside the safe zone, so a circular or squircle mask never crops it
    { src: '/pwa/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
});
const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(await readFile(join(__dirname, 'dashboard.html'), 'utf-8'));
    } else if (p === '/font/grotzec-cond-bold.otf') {
      // the wordmark face, read from the app's font folder (not copied) so there is one source of truth
      res.writeHead(200, { 'content-type': 'font/otf', 'cache-control': 'public, max-age=3600' });
      res.end(await readFile(join(REPO, 'app', 'fonts', 'GrotzecCond', 'GrotzecCond-Bold.otf')));
    } else if (p.startsWith('/vendor/')) {
      // the Rive runtime and the animated logo, served from disk so the dashboard works offline
      const name = p.slice('/vendor/'.length);
      const type = VENDOR_FILES[name];
      if (!type) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=3600' });
      res.end(await readFile(join(__dirname, 'vendor', name)));
    } else if (p === '/manifest.webmanifest') {
      res.writeHead(200, { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(MANIFEST);
    } else if (p === '/sw.js') {
      // served from the root so the service worker controls the whole dashboard; never cached, so an update is picked up on the next load
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(await readFile(join(__dirname, 'pwa', 'sw.js'), 'utf-8'));
    } else if (p.startsWith('/pwa/')) {
      const name = p.slice('/pwa/'.length);
      const type = PWA_FILES[name];
      if (!type) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=3600' });
      res.end(await readFile(join(__dirname, 'pwa', name)));
    } else if (p === '/api/status') {
      json(res, {
        latestSession,
        sessions: [...sessions.values()],
        requests: records.size,
        metro: METRO,
        logFile: LOG_FILE,
        codeowners: { repo: Boolean(repoRules), core: Boolean(coreRules) },
        github: GITHUB,
        build: buildInfo(),
      });
    } else if (p === '/api/view') {
      json(res, { route: url.searchParams.get('route'), source: VIEWS.get(url.searchParams.get('route') || '') });
    } else if (p === '/api/requests') {
      const limit = Number(url.searchParams.get('limit') || 100);
      const offset = Number(url.searchParams.get('offset') || 0);
      const all = select(url.searchParams);
      json(res, {
        total: all.length,
        offset,
        requests: all.slice(offset, offset + limit).map(slim),
      });
    } else if (p.startsWith('/api/requests/')) {
      const id = decodeURIComponent(p.slice('/api/requests/'.length));
      const rec = [...records.values()].find(
        (r) => r.key === id || (r.session === latestSession && String(r.id) === id),
      );
      rec
        ? json(res, { ...rec, frames: describeFrames(rec.frames, ownersOfInfo).map((f) => ({ ...f, link: PACKAGE_LINK(f) })) })
        : json(res, { error: 'not found' }, 404);
    } else if (p === '/api/summary') {
      json(res, { endpoints: groupEndpoints(select(url.searchParams).map(slim)) });
    } else if (p === '/api/export') {
      const all = select(url.searchParams).map(slim);
      const sid = url.searchParams.get('session') || latestSession;
      const body = toMarkdown(all, {
        sessionId: sid === 'latest' ? latestSession : sid,
        markers: sessionMarkers(latestSession),
      });
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
      res.end(body);
    } else if (p === '/api/export/phase') {
      // Everything one marker's phase holds, as a file: ?marker=<id> (or `pre` for before the first marker), &format=json (default) or md.
      // The last marker's phase is still collecting, so it exports what has arrived so far and says so (`phase.open`).
      const id = url.searchParams.get('marker') || '';
      const sid = markers.find((m) => m.id === id)?.session ?? (url.searchParams.get('session') || latestSession);
      const sessionRecords = [...records.values()].filter((r) => r.session === sid);
      const found = exportPhase(sessionRecords, sessionMarkers(sid), id);
      if (!found) { json(res, { error: 'unknown marker' }, 404); return; }
      const { phase, records: inPhase } = found;
      const md = url.searchParams.get('format') === 'md';
      const name = `foxy-${fileSlug(phase.label)}${phase.open ? '-so-far' : ''}.${md ? 'md' : 'json'}`;
      res.writeHead(200, {
        'content-type': md ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${name}"`,
        'cache-control': 'no-store',
        'access-control-expose-headers': 'content-disposition',
      });
      if (md) {
        res.end(toMarkdown(inPhase.map(slim), { sessionId: sid, markers: [] }));
      } else {
        res.end(JSON.stringify({
          foxy: { exportedAt: new Date().toISOString(), session: sid, build: buildInfo() },
          phase,
          // the full records: request and response headers and bodies, and the call chain with owners and GitHub links
          requests: inPhase.map((r) => ({ ...r, frames: describeFrames(r.frames, ownersOfInfo).map((f) => ({ ...f, link: PACKAGE_LINK(f) })) })),
        }, null, 2));
      }
    } else if (p === '/api/export/capture') {
      // The whole session as one file: every request in full, the markers and the phases they make. ?session=<id> picks another session.
      const sid = url.searchParams.get('session') || latestSession;
      if (url.searchParams.get('session') && !sessions.has(sid)) { json(res, { error: 'unknown session' }, 404); return; }
      const sessionRecords = [...records.values()].filter((r) => r.session === sid);
      const sessionMarks = sessionMarkers(sid);
      const { phases, records: all } = exportCapture(sessionRecords, sessionMarks);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="foxy-capture-${stamp}.json"`,
        'cache-control': 'no-store',
        'access-control-expose-headers': 'content-disposition',
      });
      res.end(JSON.stringify({
        foxy: { exportedAt: new Date().toISOString(), session: sid, platform: sessions.get(sid)?.platform ?? null, build: buildInfo() },
        summary: { requests: all.length, markers: sessionMarks.length, phases: phases.length },
        markers: sessionMarks,
        phases,
        // the full records: request and response headers and bodies, and the call chain with owners and GitHub links
        requests: all.map((r) => ({ ...r, frames: describeFrames(r.frames, ownersOfInfo).map((f) => ({ ...f, link: PACKAGE_LINK(f) })) })),
      }, null, 2));
    } else if (p === '/api/markers' && req.method === 'GET') {
      json(res, { markers: sessionMarkers(latestSession) });
    } else if (p === '/api/marker' && req.method === 'POST') {
      // `agoMs` backdates the marker ("this happened 5 s ago") for when you only notice afterwards
      const { label, agoMs } = await readBody(req);
      const latest = sessions.get(latestSession);
      const started = latest?.startedAt ?? Date.now();
      const ago = Math.max(0, Number(agoMs) || 0);
      const ts = Date.now() - ago;
      const m = {
        id: `m${Date.now().toString(36)}${(markerSeq++).toString(36)}`,
        ts,
        label: String(label || 'marker').slice(0, 120),
        session: latestSession,
        relMs: Math.max(0, ts - (latest?.skew || 0) - started),
        endRelMs: null, // set by POST /api/marker/:id/end; until then the phase runs to the next marker
      };
      markers.push(m);
      broadcast({ type: 'marker', marker: m });
      json(res, m);
    } else if (/^\/api\/marker\/[^/]+\/end$/.test(p) && (req.method === 'POST' || req.method === 'DELETE')) {
      // End closes a marker's phase here, so what comes after is "Between phases" instead of part of it. DELETE reopens it.
      const id = decodeURIComponent(p.slice('/api/marker/'.length, -'/end'.length));
      const m = markers.find((x) => x.id === id);
      if (!m) {
        json(res, { error: 'not found' }, 404);
      } else if (markers.some((x) => x.session === m.session && x.relMs > m.relMs)) {
        // a later marker already closes this phase: ending it is moot, and reopening it would swallow the phases in between and scramble their order
        json(res, { error: 'only the latest marker can be ended or reopened' }, 409);
      } else {
        if (req.method === 'DELETE') m.endRelMs = null;
        else if (m.endRelMs == null) { // ending twice keeps the first end: to move it, reopen and end again
          const s = sessions.get(m.session);
          m.endRelMs = Math.max(m.relMs, Date.now() - (s?.skew || 0) - (s?.startedAt ?? Date.now()));
        }
        broadcast({ type: 'markers', markers: sessionMarkers(latestSession) });
        json(res, { ok: true, marker: { ...m } });
      }
    } else if (p.startsWith('/api/marker/') && (req.method === 'PATCH' || req.method === 'DELETE')) {
      const id = decodeURIComponent(p.slice('/api/marker/'.length));
      const idx = markers.findIndex((m) => m.id === id);
      if (idx === -1) {
        json(res, { error: 'not found' }, 404);
      } else {
        if (req.method === 'DELETE') markers.splice(idx, 1);
        else {
          const { label } = await readBody(req);
          if (label != null && String(label).trim()) markers[idx].label = String(label).trim().slice(0, 120);
        }
        broadcast({ type: 'markers', markers: sessionMarkers(latestSession) });
        json(res, { ok: true });
      }
    } else if (p === '/api/clear' && req.method === 'POST') {
      records.clear();
      markers.length = 0;
      // A cleared capture starts over: the next request is #1 and the clock is at +0s from now.
      for (const s of sessions.values()) {
        s.idBase = s.lastId || 0;
        s.startedAt = Date.now() - (s.skew || 0);
      }
      broadcast({ type: 'cleared' });
      json(res, { ok: true });
    } else {
      json(res, { error: 'not found' }, 404);
    }
  } catch (error) {
    json(res, { error: String(error) }, 500);
  }
});

// ---- websockets ------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (ws, req) => {
  if (req.url?.startsWith('/app')) {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        void log(msg);
        ingest(msg);
      } catch {
        // ignore malformed
      }
    });
    ws.on('close', () => console.log('[foxy] app disconnected'));
  } else {
    uiClients.add(ws);
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        session: sessions.get(latestSession) ?? null,
        requests: select(new URLSearchParams()).map(slim),
        markers: sessionMarkers(latestSession),
      }),
    );
    ws.on('close', () => uiClients.delete(ws));
  }
});

httpServer.listen(PORT, () => {
  console.log('\n  🦊 Foxy');
  console.log('  -------');
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  App WS:    ws://localhost:${PORT}/app  (adb reverse tcp:${PORT} tcp:${PORT} on Android)`);
  console.log(`  Metro:     ${METRO} (used to symbolicate stacks)`);
  console.log(`  Log:       ${LOG_FILE}`);
  console.log(`  GitHub:    ${GITHUB.repo} @ ${GITHUB.ref.slice(0, 12)} (call-site links)`);
  {
    const b = buildInfo();
    console.log(`  Build:     Foxy ${b.version ?? '?'} · ${b.branch ?? 'detached HEAD'} · ${b.commit ?? 'no commit'}${b.dirty ? ' · uncommitted changes' : ''}`);
  }
  console.log(`  Owners:    app CODEOWNERS ${repoRules ? 'loaded' : 'NOT found'}, core CODEOWNERS ${coreRules ? 'loaded' : `NOT found (${CORE})`}\n`);
  console.log('  Waiting for the app (set FOXY="true" in .js.env, restart Metro)...\n');
});
