#!/usr/bin/env node
// Minimal zero-dependency MCP (stdio) server so an agent can query the network
// audit server:  claude mcp add foxy -- node scripts/foxy/mcp.mjs
// It is a thin wrapper over the REST API in server.mjs (default http://localhost:8098).
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePhase } from './lib.mjs';

const BASE = process.env.FOXY_API || `http://localhost:${process.env.FOXY_PORT || 8098}`;
// Big exports (a whole phase with headers, bodies and call chains) go to a file, so they never flood the agent's context.
const EXPORT_DIR = process.env.FOXY_EXPORT_DIR || join(tmpdir(), 'foxy');

const tools = [
  {
    name: 'network_list',
    description:
      'List captured network requests for the latest app session (oldest first). Filter by host/path/url substring or status.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string' },
        path: { type: 'string' },
        q: { type: 'string', description: 'substring of the full URL' },
        status: { type: 'string', description: 'e.g. 200, error, pending' },
        session: { type: 'string', description: "'latest' (default), 'all' or a session id" },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    path: '/api/requests',
  },
  {
    name: 'network_get',
    description:
      'Get one request with its full (symbolicated when possible) initiator stack. id is the numeric id from network_list.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'network_summary',
    description:
      'Group requests by METHOD host/path with call counts, identical-duplicate counts, first-seen time and distinct initiators.',
    inputSchema: {
      type: 'object',
      properties: { host: { type: 'string' }, path: { type: 'string' }, session: { type: 'string' } },
    },
    path: '/api/summary',
  },
  {
    name: 'network_export_markdown',
    description: 'Markdown table skeleton of every endpoint for the audit report (verdict columns left blank).',
    inputSchema: { type: 'object', properties: { session: { type: 'string' } } },
    path: '/api/export',
    text: true,
  },
  {
    name: 'marker_add',
    description:
      "Insert a labelled marker into the timeline, e.g. 'onboarding screen visible' or 'wallet created'. Each marker starts a phase that lasts until the next marker (so adding one also closes the previous phase), so requests can be attributed to what the user was doing. Use agoSeconds to backdate it. See marker_list, marker_end and network_export_phase.",
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        agoSeconds: { type: 'number', description: 'Place the marker this many seconds in the past (default 0 = now).' },
      },
      required: ['label'],
    },
  },
  {
    name: 'marker_list',
    description:
      'List the phases of the latest session, oldest first: id, label, start/end (ms from the start of the run), whether it is still open (the newest marker\'s phase is open until something closes it), and its totals (requests, new endpoints, identical dupes, failed, bytes). Use the id or the label with marker_end and network_export_phase. "pre" is what ran before the first marker; "Between phases" is idle time after an ended phase.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'marker_end',
    description:
      'End a marker\'s phase now, so anything after this moment (until the next marker) is "Between phases" instead of part of it. Defaults to the newest marker. Only the newest marker can be ended or reopened. Set reopen to true to undo.',
    inputSchema: {
      type: 'object',
      properties: {
        phase: { type: 'string', description: 'Marker id or label. Omit for the newest marker.' },
        reopen: { type: 'boolean', description: 'Reopen a phase that was ended (default false).' },
      },
    },
  },
  {
    name: 'network_export_phase',
    description:
      'Export everything one phase holds. format "json" (default) writes every request in full (headers, bodies, call chain with owners) to a file and returns its path with the phase totals, so read the file for detail. format "md" returns a markdown table inline. phase is a marker id or label (or "pre"); omit it for the newest marker\'s phase. A phase that nothing has closed yet is still collecting: the export holds what has arrived so far and says open: true. To get a finished phase, add the next marker (or call marker_end) first.',
    inputSchema: {
      type: 'object',
      properties: {
        phase: { type: 'string', description: 'Marker id or label, or "pre" for before the first marker. Omit for the newest marker.' },
        format: { type: 'string', enum: ['json', 'md'] },
      },
    },
  },
  {
    name: 'network_export_capture',
    description:
      'Export the whole latest session to a JSON file (every request in full, the markers and the phases) and return its path with a summary (request, marker and phase counts, and the phases with their totals).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'audit_get',
    description:
      'Get the audit a person did of one phase in the Foxy dashboard: what the verdicts mean, then every endpoint the phase called with its verdict (keep / defer / move / drop, or null when not judged yet), their reason, call count, identical dupes, statuses, code owners and callSites (function, file, line) of the code that makes the request. Use it to propose changes: for "defer", "move" and "drop" endpoints find the code at callSites and change it, quoting the reason; leave "keep" alone; assume nothing about null. phase is a marker id or label (or "pre"); omit it for the newest marker\'s phase. marker_list shows how many endpoints each phase has verdicts for. Small results come back inline; a big one is written to a file and its path returned, so narrow it with verdict.',
    inputSchema: {
      type: 'object',
      properties: {
        phase: { type: 'string', description: 'Marker id or label, or "pre". Omit for the newest marker.' },
        verdict: { type: 'string', enum: ['keep', 'defer', 'move', 'drop', 'judged', 'unjudged'], description: 'Only endpoints with this verdict ("judged" = any verdict, "unjudged" = none yet).' },
      },
    },
  },
  {
    name: 'network_clear',
    description: 'Clear captured requests and markers.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'status',
    description: 'Server status: sessions, request count, Metro URL, log file.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const pretty = (value) => JSON.stringify(value, null, 2);
/** An error that is the agent's to fix (a wrong phase name): the message is shown as is, without the "is the server running" hint. */
class AgentError extends Error {}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} answered ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Writes an export to EXPORT_DIR and returns where it went. The server names the file (Content-Disposition), so it matches what the dashboard downloads. */
async function saveExport(path, fallbackName) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} answered ${res.status}: ${await res.text()}`);
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const body = await res.text();
  await mkdir(EXPORT_DIR, { recursive: true });
  const file = join(EXPORT_DIR, name);
  await writeFile(file, body);
  return { file, bytes: Buffer.byteLength(body), body };
}

const INLINE_LIMIT = 60000; // bytes: past this a result goes to a file
const phaseView = (p) => ({
  id: p.id, label: p.label, startMs: Math.round(p.startMs), endMs: p.endMs == null ? null : Math.round(p.endMs), open: p.open, ended: p.ended,
  requests: p.requests, newEndpoints: p.newEndpoints, identicalDupes: p.identicalDupes, failed: p.failed, bytes: p.bytes,
  ...(p.audit ? { audit: p.audit } : {}),
});

/** The tools that work on phases. They return text for the agent, or throw a message it can act on. */
async function phaseTool(name, args) {
  const { phases } = await getJson('/api/phases');
  if (name === 'marker_list') {
    return pretty({ phases: phases.map(phaseView), hint: phases.length ? undefined : 'No markers yet. Add one with marker_add.' });
  }
  const found = resolvePhase(phases, args.phase);
  if (found.error) throw new AgentError(found.error);
  const { phase } = found;
  if (name === 'marker_end') {
    if (!phase.marker) throw new AgentError(`"${phase.label}" is not a marker, so it cannot be ended or reopened. ${resolvePhase(phases, '').phase ? `The newest marker is "${resolvePhase(phases, '').phase.label}".` : ''}`);
    const res = await fetch(`${BASE}/api/marker/${encodeURIComponent(phase.id)}/end`, { method: args.reopen ? 'DELETE' : 'POST' });
    if (res.status === 409) throw new AgentError(`Only the newest marker can be ended or reopened, and "${phase.label}" has a later marker after it. The newest is "${resolvePhase(phases, '').phase.label}".`);
    if (!res.ok) throw new Error(`marker_end answered ${res.status}: ${await res.text()}`);
    const after = resolvePhase((await getJson('/api/phases')).phases, phase.id).phase;
    return pretty({ phase: phaseView(after), note: args.reopen ? 'Reopened: it collects again until the next marker.' : 'Ended: anything after now, until the next marker, is "Between phases".' });
  }
  // network_export_phase
  if (args.format === 'md') {
    const res = await fetch(`${BASE}/api/export/phase?marker=${encodeURIComponent(phase.id)}&format=md`);
    if (!res.ok) throw new Error(`export answered ${res.status}: ${await res.text()}`);
    return res.text();
  }
  const out = await saveExport(`/api/export/phase?marker=${encodeURIComponent(phase.id)}`, 'foxy-phase.json');
  return pretty({ file: out.file, bytes: out.bytes, phase: phaseView(JSON.parse(out.body).phase), note: phase.open ? 'This phase is still collecting: the file holds what has arrived so far. Add the next marker (or call marker_end) to close it, then export again.' : undefined });
}

/** The audit of a phase from the server, optionally narrowed to one verdict. Inline when small, else written to a file. */
async function auditTool(args) {
  const res = await fetch(`${BASE}/api/audit/export?phase=${encodeURIComponent(args.phase ?? '')}`);
  if (res.status === 404) throw new AgentError((await res.json()).error);
  if (!res.ok) throw new Error(`audit export answered ${res.status}: ${await res.text()}`);
  const doc = await res.json();
  const want = args.verdict;
  const keep = (e) => (!want ? true : want === 'judged' ? Boolean(e.verdict) : want === 'unjudged' ? !e.verdict : e.verdict === want);
  const out = want ? { ...doc, shown: `${doc.endpoints.filter(keep).length} of ${doc.endpoints.length} endpoints (verdict: ${want})`, endpoints: doc.endpoints.filter(keep) } : doc;
  const body = pretty(out);
  if (Buffer.byteLength(body) <= INLINE_LIMIT) return body;
  await mkdir(EXPORT_DIR, { recursive: true });
  const file = join(EXPORT_DIR, /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'foxy-audit.json');
  await writeFile(file, body);
  return pretty({ file, bytes: Buffer.byteLength(body), phase: doc.phase, summary: doc.summary, note: 'Too big to return inline: read the file, or narrow it with verdict (for example "defer" or "judged").' });
}

async function call(name, args = {}) {
  if (name === 'audit_get') return auditTool(args);
  if (name === 'marker_list' || name === 'marker_end' || name === 'network_export_phase') return phaseTool(name, args);
  if (name === 'network_export_capture') {
    const out = await saveExport('/api/export/capture', 'foxy-capture.json');
    const parsed = JSON.parse(out.body);
    return pretty({ file: out.file, bytes: out.bytes, summary: parsed.summary, phases: parsed.phases.map(phaseView) });
  }
  const qs = (a) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(a)) if (v !== undefined && v !== '') p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  let res;
  switch (name) {
    case 'network_get':
      res = await fetch(`${BASE}/api/requests/${encodeURIComponent(args.id)}`);
      break;
    case 'marker_add':
      res = await fetch(`${BASE}/api/marker`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: args.label, agoMs: Math.round((Number(args.agoSeconds) || 0) * 1000) }),
      });
      break;
    case 'network_clear':
      res = await fetch(`${BASE}/api/clear`, { method: 'POST' });
      break;
    case 'status':
      res = await fetch(`${BASE}/api/status`);
      break;
    default: {
      const tool = tools.find((t) => t.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      res = await fetch(`${BASE}${tool.path}${qs(args)}`);
    }
  }
  return res.text();
}

const write = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

createInterface({ input: process.stdin }).on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  try {
    if (method === 'initialize') {
      write({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'foxy', version: '0.1.0' },
        },
      });
    } else if (method === 'tools/list') {
      write({
        jsonrpc: '2.0',
        id,
        result: { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
      });
    } else if (method === 'tools/call') {
      try {
        const text = await call(params.name, params.arguments);
        write({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } catch (error) {
        write({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: error instanceof AgentError ? error.message : `${error}. Is server.mjs running at ${BASE}?` }],
          },
        });
      }
    } else if (method === 'ping') {
      write({ jsonrpc: '2.0', id, result: {} });
    } else {
      write({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (error) {
    write({ jsonrpc: '2.0', id, error: { code: -32603, message: String(error) } });
  }
});
