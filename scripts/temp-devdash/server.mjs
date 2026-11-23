// DevDash: relay between the app (app/core/TempDevDash.ts), the browser dashboard and the MCP
// server. See scripts/temp-devdash/README.md.
//
// Start: node scripts/temp-devdash/server.mjs, then open http://localhost:8098
//
// The app socket accepts LAN clients so a phone can connect. The dashboard, its socket and the
// HTTP API only accept this machine, and reject other origins, because they can read wallet state
// and run code in the app: without that, any website open in a browser could reach them.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { TOOLS, runTool, redact } from './tools.mjs';

const PORT = Number(process.env.DEVDASH_PORT || 8098);
const HERE = dirname(fileURLToPath(import.meta.url));
const LIMITS = { net: 6000, log: 15000, action: 6000, ctl: 6000, mcp: 300, frames: 200 };
const MAX_NET_BYTES = 400 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 20000;
const HISTORY_CHUNK = 400;
const METRO_PORT = Number(process.env.RCT_METRO_PORT || 8081);
const REPO_ROOT = join(HERE, '..', '..');
const SCREENSHOT_TIMEOUT_MS = 15000;
const ADB_REVERSE_INTERVAL_MS = 10000;
const METRO_PROBE_TIMEOUT_MS = 1500;
// The first lookup builds the source map, which takes a while on a bundle this size.
const SYMBOLICATE_TIMEOUT_MS = 120000;
const MAX_SCREENSHOT_BYTES = 64 * 1024 * 1024;
const STACK_FRAME = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/;
// Plumbing every request passes through, which says nothing about who started it.
const PLUMBING =
  /TempDevDash|InitializeCore|\/metro-runtime\/|InternalBytecode|^shim\.js$|\/shim\.js$|NitroFetchSetup|RampsDebugBridge|address at/;
const COMPILED_NAME_PREFIX = /^\?anon_\d+_/;

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const LOCAL_ORIGINS = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
const IP_OR_LOCALHOST = /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:]+\])(:\d+)?$/i;

const store = {
  net: new Map(),
  netBytes: 0,
  logs: [],
  actions: [],
  changes: [],
  mcp: [],
  seq: 0,
};

const ui = new Set();
const pending = new Map();
let app = null;
let appInfo = null;
let appSession = null;
let commandId = 0;
const symbolicated = new Map();

function isLocalRequest(req) {
  const { origin, host } = req.headers;
  return (
    LOOPBACK.has(req.socket.remoteAddress) &&
    LOCAL_HOSTS.has(host) &&
    (origin === undefined || LOCAL_ORIGINS.has(origin))
  );
}

// React Native sends an Origin built from the URL it dialed, so a browser page on another site
// cannot match it. The IP check stops a DNS rebinding page, which would use a domain name as Host.
function isAppRequest(req) {
  const { origin, host } = req.headers;
  if (!host || !IP_OR_LOCALHOST.test(host)) {
    return false;
  }
  return origin === undefined || origin === `http://${host}` || origin === `https://${host}`;
}

function send(client, payload) {
  if (client.readyState === 1) {
    client.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
  }
}

function broadcast(payload) {
  if (ui.size === 0) {
    return;
  }
  const raw = JSON.stringify(payload);
  for (const client of ui) {
    send(client, raw);
  }
}

function trimArray(list, limit) {
  if (list.length > limit * 1.1) {
    list.splice(0, list.length - limit);
  }
}

function bodyBytes(entry) {
  return (entry.reqBody?.length ?? 0) + (entry.resBody?.length ?? 0);
}

function ingest(events) {
  for (const event of events) {
    store.seq += 1;
    event.seq = store.seq;
    event.session = appSession;
    switch (event.k) {
      case 'net': {
        event.key = `${appSession}:${event.id}`;
        const existing = store.net.get(event.key);
        if (existing) {
          store.netBytes -= bodyBytes(existing);
          Object.assign(existing, event);
          store.netBytes += bodyBytes(existing);
        } else {
          store.net.set(event.key, { ...event });
          store.netBytes += bodyBytes(event);
        }
        while (store.net.size > LIMITS.net || store.netBytes > MAX_NET_BYTES) {
          const [oldestKey, oldest] = store.net.entries().next().value;
          store.netBytes -= bodyBytes(oldest);
          store.net.delete(oldestKey);
        }
        break;
      }
      case 'frame': {
        event.key = `${appSession}:${event.id}`;
        const socket = store.net.get(event.key);
        if (socket) {
          socket.frames = socket.frames ?? [];
          socket.frames.push({
            ts: event.ts,
            dir: event.dir,
            size: event.size,
            data: event.data,
          });
          trimArray(socket.frames, LIMITS.frames);
          socket.framesIn = event.framesIn;
          socket.framesOut = event.framesOut;
        }
        break;
      }
      case 'log':
        store.logs.push(event);
        trimArray(store.logs, LIMITS.log);
        break;
      case 'action':
        store.actions.push(event);
        trimArray(store.actions, LIMITS.action);
        break;
      case 'ctl':
        store.changes.push(event);
        trimArray(store.changes, LIMITS.ctl);
        break;
      default:
        break;
    }
  }
  broadcast({ t: 'batch', events });
}

function clearStore() {
  store.net.clear();
  store.netBytes = 0;
  store.logs.length = 0;
  store.actions.length = 0;
  store.changes.length = 0;
  broadcast({ t: 'reset' });
  broadcast(helloPayload());
}

function counts() {
  return {
    network: store.net.size,
    logs: store.logs.length,
    actions: store.actions.length,
    controllerChanges: store.changes.length,
  };
}

function helloPayload() {
  return {
    t: 'hello',
    connected: Boolean(app),
    info: appInfo,
    tools: TOOLS.map(({ name, description }) => ({ name, description })),
    mcp: store.mcp,
    mcpCommand: `claude mcp add devdash --scope local -- node ${join(HERE, 'mcp.mjs')}`,
  };
}

function sendToApp(cmd, args = {}, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (!app || app.readyState !== 1) {
      reject(new Error('The app is not connected. Open it on a dev build, with Metro running.'));
      return;
    }
    commandId += 1;
    const id = commandId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`The app did not answer within ${timeoutMs} ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    send(app, { t: 'cmd', id, cmd, args });
  });
}

// The live view polls back to back, so callers that overlap share one capture.
let screenshotInFlight = null;
function screenshot() {
  screenshotInFlight ??= captureScreen().finally(() => {
    screenshotInFlight = null;
  });
  return screenshotInFlight;
}

function captureScreen() {
  return new Promise((resolve, reject) => {
    execFile(
      'adb',
      ['exec-out', 'screencap', '-p'],
      { encoding: 'buffer', maxBuffer: MAX_SCREENSHOT_BYTES, timeout: SCREENSHOT_TIMEOUT_MS },
      (error, stdout) => {
        if (error) {
          reject(new Error(`adb could not take a screenshot: ${error.message}`));
        } else if (stdout.length === 0) {
          reject(
            new Error(
              'This screen blocks capture on purpose (FLAG_SECURE), as onboarding and credential screens do. Other screens work.',
            ),
          );
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

// Live video: screenrecord streams Annex B H.264 over adb, sent on as one message per frame
// (first byte 1 for a keyframe), decoded in the page with WebCodecs. It writes a whole frame
// at a time, so a short pause in the data means the last NAL unit is complete.
const NAL_START = Buffer.from([0, 0, 1]);
const SCREEN_IDLE_FLUSH_MS = 10;
const SCREEN_RESTART_MS = 300;
const SCREEN_RETRY_MS = 3000;
const SCREEN_MIN_UPTIME_MS = 2000;
const MAX_SCREEN_BUFFER_BYTES = 32 * 1024 * 1024;
const screenViewers = new Set();
let screenProc = null;
let screenRestartTimer = null;

function screenBroadcast(data) {
  for (const viewer of screenViewers) {
    if (viewer.readyState === 1) viewer.send(data, { binary: typeof data !== 'string' });
  }
}

// Each start sends a fresh keyframe, which is how a viewer that joins mid-stream gets one.
function startScreenStream() {
  clearTimeout(screenRestartTimer);
  screenRestartTimer = null;
  screenProc?.kill();
  const proc = spawn('adb', ['exec-out', 'screenrecord', '--output-format=h264', '--time-limit', '0', '-']);
  screenProc = proc;
  const startedAt = Date.now();
  let buffer = Buffer.alloc(0);
  let prefix = [];
  let frame = null;
  let idleTimer = null;
  let stderr = '';

  const flushFrame = () => {
    if (frame && screenProc === proc) screenBroadcast(Buffer.concat([Buffer.from([frame.key ? 1 : 0]), ...frame.parts]));
    frame = null;
  };
  const onNal = (nal) => {
    if (nal.length < 5) return;
    const type = nal[3] & 0x1f;
    const isSlice = type === 1 || type === 5;
    // first_mb_in_slice above zero: another slice of the frame being built.
    if (isSlice && frame && (nal[4] & 0x80) === 0) {
      frame.parts.push(nal);
      return;
    }
    flushFrame();
    if (type === 7 && screenProc === proc) {
      const codec = `avc1.${[nal[4], nal[5], nal[6]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      screenBroadcast(JSON.stringify({ t: 'config', codec }));
    }
    if (isSlice) {
      frame = { key: type === 5, parts: [...prefix, nal] };
      prefix = [];
    } else {
      prefix.push(nal);
    }
  };
  const drain = (final) => {
    let begin = buffer.indexOf(NAL_START);
    if (begin < 0) return;
    for (let next = buffer.indexOf(NAL_START, begin + 3); next >= 0; next = buffer.indexOf(NAL_START, begin + 3)) {
      onNal(buffer.subarray(begin, next));
      begin = next;
    }
    if (final) {
      onNal(buffer.subarray(begin));
      buffer = Buffer.alloc(0);
      flushFrame();
    } else {
      buffer = buffer.subarray(begin);
    }
  };

  proc.stdout.on('data', (chunk) => {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    if (buffer.length > MAX_SCREEN_BUFFER_BYTES) buffer = Buffer.alloc(0);
    drain(false);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => drain(true), SCREEN_IDLE_FLUSH_MS);
  });
  proc.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-2000);
  });
  proc.on('error', (error) => {
    stderr += error.message;
  });
  proc.on('close', () => {
    clearTimeout(idleTimer);
    if (screenProc !== proc) return;
    screenProc = null;
    if (screenViewers.size === 0) return;
    const failedFast = Date.now() - startedAt < SCREEN_MIN_UPTIME_MS;
    if (failedFast) screenBroadcast(JSON.stringify({ t: 'error', text: stderr.trim() || 'screenrecord stopped' }));
    screenRestartTimer = setTimeout(startScreenStream, failedFast ? SCREEN_RETRY_MS : SCREEN_RESTART_MS);
  });
}

function stopScreenStream() {
  clearTimeout(screenRestartTimer);
  screenRestartTimer = null;
  const proc = screenProc;
  screenProc = null;
  proc?.kill();
}

function handleScreenSocket(client) {
  screenViewers.add(client);
  startScreenStream();
  client.on('message', (raw) => {
    if (raw.toString() === 'restart') startScreenStream();
  });
  client.on('close', () => {
    screenViewers.delete(client);
    if (screenViewers.size === 0) stopScreenStream();
  });
}

// A closed port can hang for 10 seconds under WSL mirrored networking, so check quickly first.
async function assertMetroRunning() {
  try {
    await fetch(`http://127.0.0.1:${METRO_PORT}/status`, { signal: AbortSignal.timeout(METRO_PROBE_TIMEOUT_MS) });
  } catch {
    throw new Error(`Metro is not running on port ${METRO_PORT}`);
  }
}

// Turns bundle positions from the app into source files, using the running Metro.
async function symbolicate(stack) {
  if (symbolicated.has(stack)) {
    return symbolicated.get(stack);
  }
  const frames = stack
    .split('\n')
    .map((line) => STACK_FRAME.exec(line))
    .filter(Boolean)
    .map((match) => ({
      methodName: match[1] ?? 'anonymous',
      file: match[2],
      lineNumber: Number(match[3]),
      column: Number(match[4]),
    }));
  if (frames.length === 0) {
    return { frames: [], codeFrame: null };
  }
  await assertMetroRunning();
  const response = await fetch(`http://127.0.0.1:${METRO_PORT}/symbolicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stack: frames }),
    signal: AbortSignal.timeout(SYMBOLICATE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Metro answered ${response.status}`);
  }
  const mapped = await response.json();
  const result = {
    frames: (mapped.stack ?? []).map((frame) => {
      const file = String(frame.file ?? '');
      const plumbing = PLUMBING.test(file);
      return {
        method: String(frame.methodName ?? '').replace(COMPILED_NAME_PREFIX, '') || 'anonymous',
        file: file.startsWith(REPO_ROOT) ? file.slice(REPO_ROOT.length + 1) : file,
        line: frame.lineNumber,
        column: frame.column,
        plumbing,
        app: !plumbing && !file.includes('node_modules'),
      };
    }),
    codeFrame: mapped.codeFrame?.content ?? null,
  };
  if (symbolicated.size > 2000) {
    symbolicated.clear();
  }
  symbolicated.set(stack, result);
  return result;
}

function rejectPending(reason) {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(new Error(reason));
  }
  pending.clear();
}

const toolContext = {
  store,
  sendToApp,
  clearStore,
  counts,
  screenshot,
  symbolicate,
  status: () => ({
    connected: Boolean(app),
    app: appInfo,
    counts: counts(),
    dashboard: `http://localhost:${PORT}`,
  }),
};

async function callTool(name, args) {
  const startedAt = Date.now();
  let ok = true;
  let text;
  let image;
  try {
    ({ text, image } = await runTool(name, args ?? {}, toolContext));
  } catch (error) {
    ok = false;
    text = error.message;
  }
  const call = {
    k: 'mcp',
    ts: startedAt,
    tool: name,
    args: JSON.parse(redact(JSON.stringify(args ?? {}))),
    ms: Date.now() - startedAt,
    ok,
    preview: text.slice(0, 2000),
  };
  store.mcp.push(call);
  trimArray(store.mcp, LIMITS.mcp);
  broadcast({ t: 'batch', events: [call] });
  return { ok, text, image };
}

function handleAppSocket(client, req) {
  const url = new URL(req.url, 'http://localhost');
  if (app && app !== client) {
    app.close();
  }
  app = client;
  appSession = url.searchParams.get('session') ?? String(Date.now());
  console.log(`[devdash] app connected (session ${appSession})`);

  client.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (message.t === 'batch' && Array.isArray(message.events)) {
      ingest(message.events);
    } else if (message.t === 'info') {
      appInfo = message.info;
      broadcast({ t: 'info', connected: true, info: appInfo });
    } else if (message.t === 'res') {
      const waiting = pending.get(message.id);
      if (waiting) {
        pending.delete(message.id);
        clearTimeout(waiting.timer);
        if (message.ok) {
          waiting.resolve(message.value);
        } else {
          const error = new Error(message.error?.message ?? 'Command failed');
          error.stack = message.error?.stack;
          waiting.reject(error);
        }
      }
    }
  });

  client.on('close', () => {
    if (app !== client) {
      return;
    }
    app = null;
    rejectPending('The app disconnected');
    console.log('[devdash] app disconnected');
    broadcast({ t: 'info', connected: false, info: appInfo });
  });
}

function sendHistory(client) {
  send(client, { t: 'reset' });
  send(client, helloPayload());
  const history = [...store.net.values(), ...store.logs, ...store.actions, ...store.changes];
  for (let start = 0; start < history.length; start += HISTORY_CHUNK) {
    send(client, { t: 'batch', events: history.slice(start, start + HISTORY_CHUNK) });
  }
}

function handleUiSocket(client) {
  ui.add(client);
  sendHistory(client);
  client.on('close', () => ui.delete(client));
  client.on('message', async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (message.t === 'clear') {
      clearStore();
      return;
    }
    if (message.t === 'cmd') {
      try {
        const value = await sendToApp(message.cmd, message.args, message.timeoutMs);
        send(client, { t: 'res', id: message.id, ok: true, value });
      } catch (error) {
        send(client, {
          t: 'res',
          id: message.id,
          ok: false,
          error: { message: error.message, stack: error.stack },
        });
      }
    }
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (!isLocalRequest(req)) {
    res.writeHead(403);
    res.end('DevDash only accepts requests from this machine.');
    return;
  }
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && pathname === '/') {
      const html = await readFile(join(HERE, 'dashboard.html'), 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob:; connect-src 'self' ws://localhost:${PORT} ws://127.0.0.1:${PORT}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      });
      res.end(html);
    } else if (req.method === 'GET' && pathname === '/filter.mjs') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(await readFile(join(HERE, 'filter.mjs'), 'utf-8'));
    } else if (req.method === 'GET' && pathname === '/api/screenshot') {
      const png = await screenshot();
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(png);
    } else if (req.method === 'POST' && pathname === '/api/symbolicate') {
      if (!String(req.headers['content-type']).startsWith('application/json')) {
        json(res, 415, { ok: false, text: 'Expected application/json' });
        return;
      }
      const { stack } = JSON.parse(await readBody(req));
      json(res, 200, await symbolicate(String(stack)));
    } else if (req.method === 'GET' && pathname === '/health') {
      json(res, 200, { ok: true, connected: Boolean(app) });
    } else if (req.method === 'POST' && pathname === '/api/tool') {
      if (!String(req.headers['content-type']).startsWith('application/json')) {
        json(res, 415, { ok: false, text: 'Expected application/json' });
        return;
      }
      const { name, args } = JSON.parse(await readBody(req));
      json(res, 200, await callTool(name, args));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (error) {
    json(res, 500, { ok: false, text: error.message });
  }
});

const sockets = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const allowed =
    (pathname === '/app' && isAppRequest(req)) ||
    ((pathname === '/ui' || pathname === '/screen') && isLocalRequest(req) && LOCAL_ORIGINS.has(req.headers.origin));
  if (!allowed) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(req, socket, head, (client) => {
    if (pathname === '/app') {
      handleAppSocket(client, req);
    } else if (pathname === '/screen') {
      handleScreenSocket(client);
    } else {
      handleUiSocket(client);
    }
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[devdash] port ${PORT} is already in use. Is DevDash already running?`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  DevDash: http://localhost:${PORT}\n  Waiting for the app to connect...\n`);
  // Helps an emulator whose Metro URL is localhost, including one booted after this server.
  // Failing here is fine: 10.0.2.2 and the LAN still work.
  const reversePort = () => {
    if (!app) {
      execFile('adb', ['reverse', `tcp:${PORT}`, `tcp:${PORT}`], { timeout: 5000 }, () => undefined);
    }
  };
  reversePort();
  setInterval(reversePort, ADB_REVERSE_INTERVAL_MS);
});
