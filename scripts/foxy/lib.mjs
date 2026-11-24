// Pure helpers for the Foxy server (no I/O, unit-tested in lib.test.mjs).

export function parseUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.host, path: u.pathname, query: u.search.replace(/^\?/, '') };
  } catch {
    return { host: '', path: String(url), query: '' };
  }
}

/**
 * Parses one Hermes/JSC stack line into a frame. Handles:
 *   at fn (http://host:8081/index.bundle?x=1:123:45)
 *   at fn (address at InternalBytecode.js:1:2345)
 *   at fn (native)
 *   at http://host/index.bundle:123:45
 *   fn@http://host/index.bundle:123:45
 */
export function parseFrame(line) {
  const raw = String(line).trim();
  let m = raw.match(/^at\s+(.*?)\s+\((?:address at\s+)?(.*):(\d+):(\d+)\)$/);
  if (!m) m = raw.match(/^at\s+()(?:address at\s+)?(.*):(\d+):(\d+)$/);
  if (!m) m = raw.match(/^(.*?)@(.*):(\d+):(\d+)$/);
  if (!m) {
    const native = raw.match(/^at\s+(.*?)\s+\(native\)$/);
    return { raw, methodName: native ? native[1] : '', file: '', lineNumber: 0, column: 0 };
  }
  return {
    raw,
    methodName: m[1] || '',
    file: m[2],
    lineNumber: Number(m[3]),
    column: Number(m[4]),
  };
}

const isBundleUrl = (file) => /^https?:\/\//.test(file || '');

/**
 * Shortens a file for display: `app/...` and `<package>/...` for symbolicated
 * sources, `<repo-relative>` for other project files, and just `index.bundle`
 * for an unsymbolicated bundle URL (never the huge query string).
 */
export function shortFile(file) {
  if (!file) return '';
  if (isBundleUrl(file)) {
    const path = file.replace(/^https?:\/\/[^/]+/, '').split(/[?&]/)[0];
    return `${path.replace(/\/+$/, '').replace(/^\//, '') || 'bundle'}`;
  }
  const nm = file.lastIndexOf('node_modules/');
  if (nm !== -1) return file.slice(nm + 'node_modules/'.length);
  const app = file.lastIndexOf('/app/');
  if (app !== -1) return file.slice(app + 1);
  return file.replace(/^.*\/metamask-mobile[^/]*\//, '');
}

/** Hermes names anonymous functions `?anon_0_name`; show just `name`. */
export function cleanMethod(name) {
  const n = String(name || '').replace(/^\?anon_\d+_/, '').replace(/^\?/, '');
  return n === 'anonymous' || n === '' ? '<anonymous>' : n;
}

// Frames added by the bridge's own wrappers (function names survive even when the file is the bundle).
const BRIDGE_FN = /^(captureInitiator|foxy(Fetch|Open|Send)|rampsFetchDebugProxy)$/;
// Wrappers/plumbing that sit between the real caller and the network layer
// (our bridge, the Ramps debug bridge, Nitro fetch, Sentry's fetch/XHR
// instrumentation, promise/async helpers, Hermes internals).
const INFRA_FILE =
  /FoxyBridge|RampsDebugBridge|NitroFetchSetup|react-native-nitro-fetch|InternalBytecode\.js$|node_modules\/@sentry\/[^/]+\/.*\/instrument\/|node_modules\/(react-native\/Libraries\/(Promise|Core\/Timers|BatchedBridge)|promise|regenerator-runtime|@babel\/runtime|tslib|metro-runtime)\//;

export function classifyFrame(frame) {
  const file = frame.file || '';
  if (BRIDGE_FN.test(frame.methodName || '')) return 'infra';
  if (!file) return 'infra'; // native frames: apply, next, proxy trap, ...
  if (INFRA_FILE.test(file)) return 'infra';
  // E2E mock-server wrapper from shim.js; it is the fetch forwarder, never the caller.
  if (/(^|\/)shim\.js$/.test(file) && /proxiedFetch/.test(frame.methodName || '')) return 'infra';
  if (isBundleUrl(file)) return 'unsymbolicated';
  if (file.includes('node_modules/@metamask/')) return 'controller';
  if (file.includes('node_modules/')) return 'package';
  if (/(^|\/)app\//.test(file)) return 'app';
  return 'project';
}

/** `@scope/pkg` or `pkg` from a node_modules-relative short path. */
export function packageName(shortPath) {
  const parts = String(shortPath || '').split('/');
  if (!parts[0]) return '';
  return parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Structured view of a frame for the UI. */
export function frameInfo(f) {
  const kind = classifyFrame(f);
  const file = shortFile(f.file);
  return {
    method: cleanMethod(f.methodName),
    file,
    line: f.lineNumber,
    col: f.column,
    kind,
    pkg: kind === 'package' || kind === 'controller' ? packageName(file) : null,
    unsymbolicated: isBundleUrl(f.file),
  };
}

/** `method  file:line:col`, plus a marker when the frame could not be symbolicated. */
export function fmt(f) {
  const where = `${shortFile(f.file)}:${f.lineNumber}:${f.column}`;
  const suffix = isBundleUrl(f.file) ? ' (unsymbolicated)' : '';
  return `${cleanMethod(f.methodName)}  ${where}${suffix}`;
}

/**
 * The call site is the first frame that is not wrapper/native/promise plumbing,
 * i.e. the function that actually called fetch. The owner is the nearest frame
 * in `app/` or `@metamask/*`, which is usually what you want to name in the audit
 * (a third-party lib like NetInfo can be the call site while the owner is the
 * app code that started it).
 */
export function summarizeInitiator(frames) {
  const real = frames.filter((f) => classifyFrame(f) !== 'infra');
  const callSite = real[0] || null;
  // Nearest app/@metamask frame that is not the call site itself (= who started it).
  const owner =
    real.slice(1).find((f) => ['app', 'controller'].includes(classifyFrame(f))) || null;
  const symbolicated = real.length > 0 && real.every((f) => !isBundleUrl(f.file));
  return {
    callSite: callSite ? fmt(callSite) : null,
    callSiteKind: callSite ? classifyFrame(callSite) : null,
    callSiteRef: callSite ? { kind: classifyFrame(callSite), shortPath: shortFile(callSite.file) } : null,
    ownerRef: owner ? { kind: classifyFrame(owner), shortPath: shortFile(owner.file) } : null,
    callSiteInfo: callSite ? frameInfo(callSite) : null,
    ownerInfo: owner ? frameInfo(owner) : null,
    owner: owner ? fmt(owner) : null,
    symbolicated,
    text: callSite ? `${fmt(callSite)}${owner ? `  <-  ${fmt(owner)}` : ''}` : '(no stack)',
  };
}

/**
 * Frames prepared for display: structured info, a short label, and (via the
 * optional `resolveOwners(info)` callback) the CODEOWNERS teams for each frame.
 */
export function describeFrames(frames, resolveOwners) {
  return frames.map((f) => {
    const info = frameInfo(f);
    return {
      ...info,
      raw: f.raw,
      display: fmt(f),
      hasFile: Boolean(f.file),
      owners: resolveOwners && info.kind !== 'infra' ? resolveOwners(info) : null,
    };
  });
}

export function slim(record) {
  const { frames, initiator, detail, ...rest } = record;
  return rest;
}

/** `@MetaMask/mobile-platform` -> `mobile-platform` */
export const teamName = (o) => String(o).replace(/^@MetaMask\//i, '');

/** Owners to show for a request: the call-site file's, else the nearest app/@metamask frame's. */
export function effectiveOwners(r) {
  if (r.codeOwners && r.codeOwners.length) return { owners: r.codeOwners, via: false };
  if (r.ownerCodeOwners && r.ownerCodeOwners.length) return { owners: r.ownerCodeOwners, via: true };
  return { owners: [], via: false };
}

/** Groups request records by `METHOD host/path`. */
const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cheap stable fingerprint of a request body: size plus an FNV-1a hash of the captured preview (if any). '' means no body info. */
export function bodyFingerprint(bodyBytes, bodyPreview) {
  if (bodyBytes == null && bodyPreview == null) return '';
  let h = 0x811c9dc5;
  for (const ch of String(bodyPreview ?? '')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${bodyBytes ?? ''}:${bodyPreview == null ? '' : h.toString(16)}`;
}

/**
 * Identity of a request for "identical duplicate" detection. GET/HEAD/OPTIONS are identical by URL.
 * Other methods only when the body matches; with no body info they are never called identical.
 */
export function dupeKey(r) {
  const url = r.url ?? `${r.host}${r.path}?${r.query ?? ''}`;
  if (IDEMPOTENT.has(r.method)) return `${r.method} ${url}`;
  if (r.bodyKey) return `${r.method} ${url} ${r.bodyKey}`;
  return `unique:${r.key ?? r.id}`;
}

export function groupEndpoints(records) {
  const groups = new Map();
  for (const r of records) {
    const key = `${r.method} ${r.host}${r.path}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        endpoint: key,
        method: r.method,
        host: r.host,
        path: r.path,
        count: 0,
        firstSeenMs: r.relMs,
        lastSeenMs: r.relMs,
        statuses: {},
        initiators: [],
        owners: [],
        distinctQueries: new Set(),
        ids: [],
      };
      groups.set(key, g);
    }
    g.count += 1;
    g.firstSeenMs = Math.min(g.firstSeenMs, r.relMs);
    g.lastSeenMs = Math.max(g.lastSeenMs, r.relMs);
    const status = r.error ? 'error' : r.status ?? 'pending';
    g.statuses[status] = (g.statuses[status] || 0) + 1;
    if (r.initiatorText && !g.initiators.includes(r.initiatorText)) {
      g.initiators.push(r.initiatorText);
    }
    for (const o of effectiveOwners(r).owners) {
      if (!g.owners.includes(o)) g.owners.push(o);
    }
    g.distinctQueries.add(dupeKey(r));
    g.ids.push(r.id);
  }
  return [...groups.values()]
    .map(({ distinctQueries, ...g }) => ({
      ...g,
      distinctQueries: distinctQueries.size,
      duplicateIdenticalCalls: g.count - distinctQueries.size,
    }))
    .sort((a, b) => a.firstSeenMs - b.firstSeenMs);
}

/**
 * Markers split the capture into phases: each marker starts a phase that lasts until the next marker.
 * Requests made before the first marker belong to a leading "Before first marker" phase.
 * Returns [] when there are no markers. Mirrors computePhases in dashboard.html.
 */
export function computePhases(records, markers = []) {
  if (!markers.length) return [];
  const sorted = [...markers].sort((a, b) => a.relMs - b.relMs);
  const mk = (label, startMs, marker) => ({
    id: marker?.id ?? 'pre',
    label,
    startMs,
    endMs: Infinity,
    marker: marker ?? null,
    requests: 0,
    newEndpoints: 0,
    identicalDupes: 0,
    failed: 0,
    bytes: 0,
  });
  const phases = [mk('Before first marker', 0, null), ...sorted.map((m) => mk(m.label, m.relMs, m))];
  phases.forEach((p, i) => {
    if (phases[i + 1]) p.endMs = phases[i + 1].startMs;
  });
  const seenEndpoints = new Set();
  const seenRequests = new Set();
  for (const r of [...records].sort((a, b) => a.relMs - b.relMs)) {
    let phase = phases[0];
    for (const p of phases) if (p.startMs <= r.relMs) phase = p;
    phase.requests++;
    phase.bytes += r.sizeBytes || 0;
    if (r.error || r.status >= 400) phase.failed++;
    const endpoint = `${r.method} ${r.host}${r.path}`;
    if (!seenEndpoints.has(endpoint)) {
      seenEndpoints.add(endpoint);
      phase.newEndpoints++;
    }
    const key = dupeKey(r);
    if (seenRequests.has(key)) phase.identicalDupes++;
    else seenRequests.add(key);
  }
  // the leading phase only matters when something happened before the first marker
  return phases[0].requests === 0 ? phases.slice(1) : phases;
}

/**
 * The requests of one phase: those made from its marker up to the next marker (`id` is a marker id, or `'pre'` for what ran before the first one).
 * The last marker's phase has no next marker, so it is `open`: it is still collecting, and this is what it holds right now.
 * Returns null for an id that is not a marker. `records` and `markers` are one session's.
 */
export function exportPhase(records, markers, id) {
  const sorted = [...markers].sort((a, b) => a.relMs - b.relMs);
  const i = id === 'pre' ? -1 : sorted.findIndex((m) => m.id === id);
  if ((id !== 'pre' && i === -1) || !sorted.length) return null;
  const marker = i === -1 ? null : sorted[i];
  const startMs = marker ? marker.relMs : 0;
  const next = sorted[i + 1];
  const endMs = next ? next.relMs : Infinity;
  const inPhase = [...records].filter((r) => (marker ? r.relMs >= startMs : true) && r.relMs < endMs).sort((a, b) => a.relMs - b.relMs);
  // the numbers come from the whole capture, so "new endpoints" and "identical dupes" mean what the dashboard shows
  const stats = computePhases(records, markers).find((p) => p.id === id) ?? { requests: 0, newEndpoints: 0, identicalDupes: 0, failed: 0, bytes: 0 };
  return {
    phase: {
      id: marker ? marker.id : 'pre',
      label: marker ? marker.label : 'Before first marker',
      marker,
      startMs,
      endMs: next ? endMs : null,
      open: !next,
      requests: inPhase.length,
      newEndpoints: stats.newEndpoints,
      identicalDupes: stats.identicalDupes,
      failed: stats.failed,
      bytes: stats.bytes,
    },
    records: inPhase,
  };
}

/** A name safe for a file: `Wallet ready!` -> `wallet-ready`. */
export const fileSlug = (text) => String(text).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'phase';

/** Skeleton of the TRAM-4463 recommendation table; the verdict columns are left for a human. */
export function toMarkdown(records, { markers = [], sessionId = '' } = {}) {
  const groups = groupEndpoints(records);
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const lines = [
    `# Network requests (session ${sessionId || 'n/a'})`,
    '',
    `${records.length} requests across ${groups.length} distinct endpoints.`,
    '',
  ];
  const phases = computePhases(records, markers);
  if (phases.length) {
    lines.push(
      'Phases (each marker starts a phase that lasts until the next one):',
      '',
      '| Phase | Starts (+s) | Requests | New endpoints | Identical dupes | Failed |',
      '|-------|-------------|----------|---------------|-----------------|--------|',
    );
    for (const p of phases) {
      lines.push(
        `| ${esc(p.label)} | ${(p.startMs / 1000).toFixed(1)} | ${p.requests} | ${p.newEndpoints} | ${p.identicalDupes} | ${p.failed} |`,
      );
    }
    lines.push('');
  }
  lines.push(
    '| # | Request | Calls | Identical dupes | First (+s) | Call site <- owner | Code owners | Needed on Onboarding? | Verdict | Reason / target flow |',
    '|---|---------|-------|-----------------|------------|--------------------|-------------|-----------------------|---------|----------------------|',
  );
  groups.forEach((g, i) => {
    lines.push(
      `| ${i + 1} | \`${esc(g.endpoint)}\` | ${g.count} | ${g.duplicateIdenticalCalls} | ${(g.firstSeenMs / 1000).toFixed(1)} | ${esc(g.initiators.slice(0, 2).join(' ; ') || '(unknown)')} | ${esc(g.owners.map(teamName).join(', ') || '3rd party / unknown')} |  |  |  |`,
    );
  });
  return lines.join('\n');
}
