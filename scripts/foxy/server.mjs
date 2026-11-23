// Foxy server: receives every fetch/XHR (with initiator stack) from the
// app over WebSocket, symbolicates stacks through Metro, and exposes a live
// dashboard + REST API (also used by mcp.mjs).
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { loadCodeowners, resolveFrameOwners } from './codeowners.mjs';
import { createViewIndexer } from './views.mjs';
import { createPackageLinker } from './packages.mjs';
import {
  parseUrl,
  parseFrame,
  summarizeInitiator,
  groupEndpoints,
  toMarkdown,
  describeFrames,
  bodyFingerprint,
  slim,
} from './lib.mjs';

const PORT = Number(process.env.FOXY_PORT || 8098);
const METRO = process.env.FOXY_METRO || 'http://localhost:8081';
const __dirname = dirname(fileURLToPath(import.meta.url));
// CODEOWNERS: the app repo (app/... frames) and the core monorepo (@metamask/<pkg> frames).
const REPO = process.env.FOXY_REPO || join(__dirname, '..', '..');
const CORE = process.env.FOXY_CORE || join(REPO, '..', 'core');
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
/** Screen name -> where it is defined in the app source (see views.mjs). */
const VIEWS = createViewIndexer(REPO);
/** A frame inside node_modules -> its package's source on GitHub (see packages.mjs). */
const PACKAGE_LINK = createPackageLinker(REPO);
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
    sessions.set(msg.s, {
      id: msg.s,
      startedAt: msg.startedAt,
      platform: msg.platform,
      connectedAt: Date.now(),
    });
    latestSession = msg.s;
    console.log(
      `[foxy] app ${isNew ? 'connected' : 'reconnected'} (${msg.platform}) session ${msg.s}`,
    );
    if (isNew) broadcast({ type: 'session', session: sessions.get(msg.s) });
    return;
  }
  const session = sessions.get(msg.s);
  const key = `${msg.s}:${msg.id}`;
  if (msg.type === 'request') {
    const started = session?.startedAt ?? msg.ts;
    const { host, path, query } = parseUrl(msg.url);
    const rec = {
      key,
      session: msg.s,
      id: msg.id,
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
    } else if (p === '/api/status') {
      json(res, {
        latestSession,
        sessions: [...sessions.values()],
        requests: records.size,
        metro: METRO,
        logFile: LOG_FILE,
        codeowners: { repo: Boolean(repoRules), core: Boolean(coreRules) },
        github: GITHUB,
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
    } else if (p === '/api/markers' && req.method === 'GET') {
      json(res, { markers: sessionMarkers(latestSession) });
    } else if (p === '/api/marker' && req.method === 'POST') {
      // `agoMs` backdates the marker ("this happened 5 s ago") for when you only notice afterwards
      const { label, agoMs } = await readBody(req);
      const started = sessions.get(latestSession)?.startedAt ?? Date.now();
      const ago = Math.max(0, Number(agoMs) || 0);
      const ts = Date.now() - ago;
      const m = {
        id: `m${Date.now().toString(36)}${(markerSeq++).toString(36)}`,
        ts,
        label: String(label || 'marker').slice(0, 120),
        session: latestSession,
        relMs: Math.max(0, ts - started),
      };
      markers.push(m);
      broadcast({ type: 'marker', marker: m });
      json(res, m);
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
  console.log(`  Owners:    app CODEOWNERS ${repoRules ? 'loaded' : 'NOT found'}, core CODEOWNERS ${coreRules ? 'loaded' : `NOT found (${CORE})`}\n`);
  console.log('  Waiting for the app (set FOXY="true" in .js.env, restart Metro)...\n');
});
