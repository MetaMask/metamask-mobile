'use strict';

/* eslint-env node */

// Generic mitmproxy sidecar — spawns mitmdump with the network_capture addon,
// tails the NDJSON, and produces a summary suitable for rate-limit and
// traffic-shape assertions.
//
// Domain-agnostic. Callers pass `url_pattern`, `status_match`,
// `endpoint_buckets`, and `message_pattern`. Presets (e.g. 'hyperliquid')
// can fill these in to keep recipes short.
//
// Active probes are registered on `executionState.probes` so a recipe can
// start in one node and stop in another, and teardown can sweep dangling
// processes.

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ADDON_PATH = path.join(__dirname, 'mitmproxy', 'network_capture.py');
const DEFAULT_PORT = Number(process.env.MITM_PORT || 8089);

// Preset library. Each preset supplies sensible defaults for a known API.
// Recipes can still override any field explicitly; preset only fills gaps.
const PRESETS = {
  hyperliquid: {
    url_pattern: 'api\\.hyperliquid(?:-testnet)?\\.xyz',
    status_match: [429],
    // Match only rate-limit signals from the HL SDK. The SDK wraps every 429
    // response as either:
    //   [HttpRequestError: 429 - ...]            (REST path)
    //   [WebSocketRequestError: 429 Too Many ...] (WS info-post path)
    // Requiring the named error followed by ":\s*429" excludes unrelated
    // WebSocketRequestError variants (e.g. "Signal timed out") that surface
    // during stress runs but are not rate-limit hits. "Too Many Requests" is
    // kept as a safety-net fallback for any log path that elides the 429 code.
    // Still avoids false positives against allMids price JSON because those
    // never contain the "WebSocketRequestError:" / "HttpRequestError:" prefix.
    message_pattern:
      '(?:WebSocketRequestError|HttpRequestError):\\s*429|Too Many Requests',
    // Matches HL POST body `type` values; unmatched traffic lands in "other".
    endpoint_buckets: [
      'candleSnapshot',
      'userNonFundingLedgerUpdates',
      'userFills',
      'historicalOrders',
      'userFunding',
    ],
  },
};

function resolveOpts(rawOpts) {
  const opts = { ...(rawOpts || {}) };
  if (opts.preset) {
    const preset = PRESETS[opts.preset];
    if (!preset) {
      throw new Error(
        `Unknown probe preset "${opts.preset}" (available: ${Object.keys(PRESETS).join(', ')})`,
      );
    }
    for (const [key, value] of Object.entries(preset)) {
      if (opts[key] === undefined) opts[key] = value;
    }
  }
  if (!opts.url_pattern) {
    throw new Error(
      'probe requires `url_pattern` (or a `preset` that supplies it) — no default; cast a narrow net',
    );
  }
  if (!Array.isArray(opts.endpoint_buckets)) opts.endpoint_buckets = [];
  if (!Array.isArray(opts.status_match)) opts.status_match = [];
  opts.status_match = opts.status_match.map(Number).filter((n) => Number.isFinite(n));
  return opts;
}

function ensureMitmdump() {
  const check = spawnSync('mitmdump', ['--version'], { stdio: 'pipe' });
  if (check.status !== 0) {
    throw new Error(
      'mitmdump not found on PATH. Install it with: brew install mitmproxy',
    );
  }
}

function ensureAddonExists() {
  if (!fs.existsSync(ADDON_PATH)) {
    throw new Error(`mitmproxy addon missing: ${ADDON_PATH}`);
  }
}

function emptySummary(endpointBuckets) {
  const byEndpoint = {};
  [...endpointBuckets, 'other'].forEach((bucket) => {
    byEndpoint[bucket] = { total: 0, status200: 0, matchedStatus: 0 };
  });
  return {
    network: { total: 0, status200: 0, matchedStatus: 0, byEndpoint },
    messages: { total: 0, byPattern: {} },
  };
}

function classifyEndpoint(record, endpointBuckets) {
  if (!endpointBuckets || endpointBuckets.length === 0) return 'other';
  // 1) Match POST body `type` field (HL-style JSON RPC pattern, but any
  //    key-in-body API works — if your API uses a different key, pre-flatten
  //    upstream; keeping this check narrow avoids false positives).
  const body = record.req_body || '';
  if (body) {
    try {
      const parsed = JSON.parse(body);
      const type = parsed && parsed.type;
      if (typeof type === 'string' && endpointBuckets.includes(type)) {
        return type;
      }
    } catch {
      // not JSON — fall through
    }
  }
  // 2) Fall back to path substring (case-insensitive).
  const pathStr = String(record.path || '').toLowerCase();
  for (const bucket of endpointBuckets) {
    if (pathStr.includes(String(bucket).toLowerCase())) {
      return bucket;
    }
  }
  return 'other';
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const records = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return records;
}

function buildSummary(records, opts) {
  const endpointBuckets = opts.endpoint_buckets || [];
  const statusMatch = new Set((opts.status_match || []).map(Number));
  const msgRegex = opts.message_pattern ? new RegExp(opts.message_pattern) : null;
  const summary = emptySummary(endpointBuckets);

  for (const rec of records) {
    if (rec.kind === 'http') {
      const bucket = classifyEndpoint(rec, endpointBuckets);
      const slot = summary.network.byEndpoint[bucket]
        || (summary.network.byEndpoint[bucket] = { total: 0, status200: 0, matchedStatus: 0 });
      summary.network.total += 1;
      slot.total += 1;
      if (rec.status === 200) {
        summary.network.status200 += 1;
        slot.status200 += 1;
      }
      if (statusMatch.size > 0 && statusMatch.has(Number(rec.status))) {
        summary.network.matchedStatus += 1;
        slot.matchedStatus += 1;
      }
    } else if (rec.kind === 'ws' && msgRegex) {
      const text = rec.msg_preview || '';
      const match = text.match(msgRegex);
      if (match) {
        summary.messages.total += 1;
        const key = match[0];
        summary.messages.byPattern[key] = (summary.messages.byPattern[key] || 0) + 1;
      }
    }
  }

  return summary;
}

function scanConsoleLog(metroLogPath, startOffset, messagePattern) {
  if (!messagePattern || !metroLogPath || !fs.existsSync(metroLogPath)) {
    return { total: 0, byPattern: {} };
  }
  const stat = fs.statSync(metroLogPath);
  const from = Math.max(0, Math.min(startOffset || 0, stat.size));
  const len = stat.size - from;
  if (len <= 0) return { total: 0, byPattern: {} };
  const buf = Buffer.alloc(len);
  const fd = fs.openSync(metroLogPath, 'r');
  try {
    fs.readSync(fd, buf, 0, len, from);
  } finally {
    fs.closeSync(fd);
  }
  const text = buf.toString('utf8');
  const re = new RegExp(messagePattern, 'g');
  const byPattern = {};
  let total = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    total += 1;
    const key = m[0];
    byPattern[key] = (byPattern[key] || 0) + 1;
  }
  return { total, byPattern };
}

function mergeMessages(a, b) {
  const byPattern = { ...a.byPattern };
  for (const [k, v] of Object.entries(b.byPattern)) {
    byPattern[k] = (byPattern[k] || 0) + v;
  }
  return { total: a.total + b.total, byPattern };
}

function getProbeRegistry(executionState) {
  if (!executionState.probes) executionState.probes = {};
  return executionState.probes;
}

async function startProbe({ name, opts, artifactsRoot, executionState, metroLogPath }) {
  ensureMitmdump();
  ensureAddonExists();

  const probes = getProbeRegistry(executionState);
  if (probes[name] && probes[name].proc && !probes[name].stopped) {
    throw new Error(`probe "${name}" already running`);
  }

  const resolvedOpts = resolveOpts(opts);

  const probesDir = path.join(artifactsRoot || process.cwd(), 'probes');
  fs.mkdirSync(probesDir, { recursive: true });
  const ndjsonPath = path.join(probesDir, `${name}.ndjson`);
  const stderrPath = path.join(probesDir, `${name}.stderr.log`);
  const stdoutPath = path.join(probesDir, `${name}.stdout.log`);
  fs.writeFileSync(ndjsonPath, '');
  fs.writeFileSync(stderrPath, '');
  fs.writeFileSync(stdoutPath, '');

  const port = Number(resolvedOpts.port || DEFAULT_PORT);
  const env = {
    ...process.env,
    PROBE_OUT: ndjsonPath,
    PROBE_URL_PATTERN: resolvedOpts.url_pattern,
  };

  // --verbose so TLS/WS failures land in stderr; --set flow_detail=2 gives
  // per-connection transitions that point at the actual cause when the HL
  // SDK hits RECONNECTION_LIMIT under proxy.
  const args = [
    '-s', ADDON_PATH,
    '--listen-port', String(port),
    '--set', 'stream_large_bodies=1m',
    '--set', 'flow_detail=2',
    '--verbose',
  ];

  const stderrBuf = [];
  const proc = spawn('mitmdump', args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' });
  const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' });
  proc.stderr.on('data', (chunk) => {
    stderrBuf.push(chunk.toString('utf8'));
    stderrStream.write(chunk);
  });
  proc.stdout.on('data', (chunk) => {
    stdoutStream.write(chunk);
  });

  const net = require('node:net');
  const startedAt = Date.now();
  const timeoutMs = 10000;
  let ready = false;
  while (Date.now() - startedAt < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(
        `mitmdump exited early (code ${proc.exitCode}). stderr:\n${stderrBuf.join('')}`,
      );
    }
    const ok = await new Promise((resolve) => {
      const sock = net.connect({ host: '127.0.0.1', port }, () => {
        sock.end();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
      sock.setTimeout(500, () => {
        sock.destroy();
        resolve(false);
      });
    });
    if (ok) { ready = true; break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    proc.kill('SIGTERM');
    throw new Error(`mitmdump did not start listening on :${port} within ${timeoutMs}ms`);
  }

  let consoleBaselineOffset = 0;
  if (metroLogPath && fs.existsSync(metroLogPath)) {
    try {
      consoleBaselineOffset = fs.statSync(metroLogPath).size;
    } catch {
      consoleBaselineOffset = 0;
    }
  }

  probes[name] = {
    proc,
    port,
    ndjsonPath,
    stderrPath,
    stdoutPath,
    stderrStream,
    stdoutStream,
    opts: resolvedOpts,
    metroLogPath,
    consoleBaselineOffset,
    startedAt,
    stopped: false,
  };

  return { name, port, ndjsonPath, stderrPath, stdoutPath, pid: proc.pid, opts: resolvedOpts };
}

async function stopProbe({ name, executionState }) {
  const probes = getProbeRegistry(executionState);
  const probe = probes[name];
  if (!probe) {
    throw new Error(`probe "${name}" was never started`);
  }
  if (probe.stopped) {
    return probe.summary || emptySummary(probe.opts.endpoint_buckets || []);
  }

  probe.stopped = true;
  const { proc } = probe;
  if (proc && proc.exitCode === null) {
    proc.kill('SIGTERM');
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch { /* already dead */ }
        resolve();
      }, 3000);
      proc.on('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  await new Promise((r) => setTimeout(r, 200));

  // Flush log streams so forensic analysis has full stderr/stdout after stop.
  try { probe.stderrStream && probe.stderrStream.end(); } catch { /* already closed */ }
  try { probe.stdoutStream && probe.stdoutStream.end(); } catch { /* already closed */ }

  const records = readNdjson(probe.ndjsonPath);
  const summary = buildSummary(records, probe.opts);
  summary.stderrPath = probe.stderrPath;
  summary.stdoutPath = probe.stdoutPath;
  const consoleMessages = scanConsoleLog(
    probe.metroLogPath,
    probe.consoleBaselineOffset,
    probe.opts.message_pattern,
  );
  summary.messages = mergeMessages(summary.messages, consoleMessages);
  summary.name = name;
  summary.capturedAt = new Date().toISOString();
  summary.ndjsonPath = probe.ndjsonPath;
  summary.opts = {
    url_pattern: probe.opts.url_pattern,
    status_match: probe.opts.status_match,
    message_pattern: probe.opts.message_pattern,
    endpoint_buckets: probe.opts.endpoint_buckets,
  };
  probe.summary = summary;
  return summary;
}

async function stopAllProbes(executionState) {
  const probes = getProbeRegistry(executionState);
  const results = [];
  for (const [name, probe] of Object.entries(probes)) {
    if (probe.stopped) continue;
    try {
      results.push(await stopProbe({ name, executionState }));
    } catch (error) {
      results.push({ name, error: String(error.message || error) });
    }
  }
  return results;
}

function hasActiveProbes(executionState) {
  const probes = executionState && executionState.probes;
  if (!probes) return false;
  return Object.values(probes).some((p) => p && !p.stopped);
}

module.exports = {
  DEFAULT_PORT,
  PRESETS,
  buildSummary,
  classifyEndpoint,
  emptySummary,
  ensureMitmdump,
  hasActiveProbes,
  readNdjson,
  resolveOpts,
  scanConsoleLog,
  startProbe,
  stopAllProbes,
  stopProbe,
};
