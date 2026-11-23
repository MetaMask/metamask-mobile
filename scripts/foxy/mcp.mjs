#!/usr/bin/env node
// Minimal zero-dependency MCP (stdio) server so an agent can query the network
// audit server:  claude mcp add foxy -- node scripts/foxy/mcp.mjs
// It is a thin wrapper over the REST API in server.mjs (default http://localhost:8098).
import { createInterface } from 'node:readline';

const BASE = process.env.FOXY_API || `http://localhost:${process.env.FOXY_PORT || 8098}`;

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
      "Insert a labelled marker into the timeline, e.g. 'onboarding screen visible' or 'wallet created'. Each marker starts a phase that lasts until the next marker, so requests can be attributed to what the user was doing. Use agoSeconds to backdate it.",
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

async function call(name, args = {}) {
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
            content: [{ type: 'text', text: `${error}. Is server.mjs running at ${BASE}?` }],
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
