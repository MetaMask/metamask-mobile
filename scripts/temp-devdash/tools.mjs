// DevDash: tool definitions shared by the relay server and the MCP server. See scripts/temp-devdash/README.md.
import { ACTIONS, CHANGES, LOGS, NETWORK, groupEndpoints, isNetworkError, matches, parseFilter, splitUrl } from './filter.mjs';

const MAX_OUTPUT_CHARS = 90000;
const SENSITIVE_FIELDS =
  'authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|access_?token|refresh_?token|id_?token|revoke_?token|password|mnemonic|private_?key|api_?key|client_?secret';
const SENSITIVE_FIELD = new RegExp(`(\\\\*")(${SENSITIVE_FIELDS})(\\\\*"\\s*:\\s*\\\\*")[^"\\\\]*`, 'gi');
const BEARER = /\bBearer\s+[\w.~+/=-]+/g;
const JWT = /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g;
// Paths are also reported on their own, without the infura.io host in front of them.
const INFURA_KEY = /(\/v3\/)[0-9a-f]{32}\b/gi;

const FILTER_HELP =
  'Space separated terms, all must match. A term is text, "a phrase" or /regex/flags. Prefix - to exclude.';

/** Removes credentials from anything sent to an agent, because its output leaves this machine. */
export function redact(text) {
  return text
    .replace(SENSITIVE_FIELD, '$1$2$3[redacted]')
    .replace(BEARER, 'Bearer [redacted]')
    .replace(JWT, '[redacted-jwt]')
    .replace(INFURA_KEY, '$1[redacted]');
}

function asPath(path) {
  if (Array.isArray(path)) {
    return path;
  }
  return typeof path === 'string' && path.length > 0 ? path.split('.') : [];
}

function clip(text, max) {
  if (typeof text !== 'string' || text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}... [+${text.length - max} chars]`;
}

function newest(list, limit, fallback) {
  return list.slice(-Math.max(1, Number(limit ?? fallback)));
}

function parseOrThrow(query, schema) {
  const parsed = parseFilter(query, schema);
  if (parsed.error) {
    throw new Error(`Invalid regex in filter: ${parsed.error}`);
  }
  return parsed;
}

const LIMIT = { type: 'number', description: 'Maximum items, newest kept. Defaults to 50.' };
const PATH = {
  description: 'Path into the state, as an array of keys or a dotted string. Empty means the root.',
  oneOf: [{ type: 'array', items: { type: ['string', 'number'] } }, { type: 'string' }],
};
const DEPTH = { type: 'number', description: 'Levels to expand. Deeper values come back as {"$dd":"more"}. Defaults to 3.' };

function tool(name, description, properties = {}, required = []) {
  return {
    name,
    description,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
  };
}

export const TOOLS = [
  tool('status', 'Whether the app is connected, its platform, version, current route and unlock state, plus capture counts.'),
  tool(
    'screenshot',
    'A PNG of the device screen, taken through adb. Android only. Use it to see what the app currently shows.',
  ),
  tool(
    'network_list',
    'List captured requests (fetch, XHR, WebSocket), oldest to newest. Bodies are not included: use network_get with an id.',
    {
      filter: {
        type: 'string',
        description: `${FILTER_HELP} Plain terms search URL, method, status, RPC method, bodies and errors. Fields: status:4xx status:>=400 method:POST host:infura path:/v3 url: rpc:eth_call via:fetch|xhr|ws state: req: res: body: header: error: time:>500 time:>1s size:>10k.`,
      },
      errorsOnly: { type: 'boolean', description: 'Only HTTP 4xx/5xx, network failures and JSON-RPC errors.' },
      limit: LIMIT,
    },
  ),
  tool(
    'network_get',
    'One request in full: headers, bodies, WebSocket frames and the app code that started it. Credentials are redacted.',
    {
      id: { type: 'string', description: 'The id from network_list.' },
      maxBodyChars: { type: 'number', description: 'Maximum characters per body. Defaults to 20000.' },
    },
    ['id'],
  ),
  tool(
    'network_endpoints',
    'Requests grouped by endpoint, with count, errors and timings. Use it to find polling storms and slow or failing endpoints.',
    {
      filter: { type: 'string', description: 'Same filter as network_list.' },
      sort: { type: 'string', enum: ['count', 'errors', 'avg', 'max', 'bytes'], description: 'Defaults to count.' },
      limit: LIMIT,
    },
  ),
  tool(
    'network_replay',
    'Send a captured request again from inside the app, optionally changed. The new request is captured like any other. Replaying a write repeats it for real.',
    {
      id: { type: 'string', description: 'The id from network_list.' },
      url: { type: 'string', description: 'Replaces the URL.' },
      method: { type: 'string', description: 'Replaces the method.' },
      headers: { type: 'object', description: 'Replaces the headers.' },
      body: { type: 'string', description: 'Replaces the body.' },
    },
    ['id'],
  ),
  tool('logs_list', 'List console and Logger output, plus route changes (level nav), oldest to newest.', {
    filter: { type: 'string', description: `${FILTER_HELP} Fields: level: tag: text:. A tag is the leading [Tag] of a message.` },
    levels: {
      type: 'array',
      items: { type: 'string', enum: ['log', 'info', 'warn', 'error', 'debug', 'nav'] },
      description: 'Only these levels.',
    },
    includeDetails: { type: 'boolean', description: 'Include logged objects, such as error stacks, and the code that wrote each warning or error. Defaults to false.' },
    limit: { type: 'number', description: 'Maximum items, newest kept. Defaults to 100.' },
  }),
  tool('redux_actions', 'List dispatched Redux actions (saga puts included), with the slices each one changed.', {
    filter: { type: 'string', description: `${FILTER_HELP} Fields: type: changed: payload: diff:.` },
    includePayload: { type: 'boolean', description: 'Include each action payload. Defaults to false.' },
    includeDiff: { type: 'boolean', description: 'Include what each action changed, as path, before and after. Defaults to false.' },
    limit: LIMIT,
  }),
  tool('redux_get', 'Read the Redux state at a path.', { path: PATH, depth: DEPTH }),
  tool(
    'redux_set',
    'Write a value at a Redux state path. Persisted slices keep it across reloads. engine.backgroundState is overwritten by the next controller update, so use controller_set for controller data.',
    { path: PATH, value: { description: 'Any JSON value.' } },
    ['path', 'value'],
  ),
  tool(
    'redux_dispatch',
    'Dispatch a plain Redux action.',
    { action: { type: 'object', description: 'For example {"type":"SET_SOMETHING","payload":1}.' } },
    ['action'],
  ),
  tool('controllers_list', 'List Engine controllers that have state.'),
  tool(
    'controller_get',
    'Read a controller state at a path. Secrets such as the vault are masked.',
    { name: { type: 'string', description: 'For example RampsController.' }, path: PATH, depth: DEPTH },
    ['name'],
  ),
  tool(
    'controller_set',
    'Write a value at a path in a controller state. It flows to Redux like any other update. KeyringController and SeedlessOnboardingController are read-only.',
    { name: { type: 'string' }, path: PATH, value: { description: 'Any JSON value.' } },
    ['name', 'path', 'value'],
  ),
  tool(
    'controller_call',
    'Call a public controller method and return its result. Pass no method to list the available ones.',
    {
      name: { type: 'string' },
      method: { type: 'string' },
      args: { type: 'array', description: 'Arguments, as JSON values.' },
    },
    ['name'],
  ),
  tool('controller_changes', 'Recent controller state changes, as Immer patches.', {
    name: { type: 'string', description: 'Only this controller.' },
    filter: { type: 'string', description: `${FILTER_HELP} Fields: controller: paths: patches:.` },
    includePatches: { type: 'boolean', description: 'Include patch values. Defaults to false.' },
    limit: LIMIT,
  }),
  tool(
    'state_search',
    'Search keys and values in the Redux state or in controller state. Returns matching paths with a short preview.',
    {
      query: { type: 'string', description: 'Text, or /regex/flags.' },
      source: { type: 'string', enum: ['controllers', 'redux'], description: 'Defaults to controllers.' },
      name: { type: 'string', description: 'Only this controller.' },
      limit: { type: 'number', description: 'Defaults to 100.' },
    },
    ['query'],
  ),
  tool(
    'run_code',
    'Run JavaScript inside the app and return the result, awaiting promises. In scope: Engine, ctl (Engine.context), messenger, store, dispatch, getState, nav, RN. A single expression returns its value; statements need an explicit return. Be careful: this acts on the real wallet in the running app, and only the result is redacted.',
    {
      code: { type: 'string' },
      timeoutMs: { type: 'number', description: 'Defaults to 20000.' },
    },
    ['code'],
  ),
  tool('clear', 'Clear captured network, logs, actions and controller changes.'),
  tool('reload_app', 'Reload the JS bundle in the app.'),
];

async function initiatorOf(stack, ctx) {
  if (!stack) {
    return undefined;
  }
  try {
    return (await ctx.symbolicate(stack)).frames
      .filter((frame) => !frame.plumbing)
      .slice(0, 12)
      .map((frame) => `${frame.method} ${frame.file}:${frame.line}`);
  } catch (error) {
    return `Not available: ${error.message}`;
  }
}

function requireEntry(id, ctx) {
  const entry = ctx.store.net.get(id);
  if (!entry) {
    throw new Error(`No request with id ${id}. It may have been evicted.`);
  }
  return entry;
}

const handlers = {
  status: (_args, ctx) => ctx.status(),

  screenshot: async (_args, ctx) => ({ $image: (await ctx.screenshot()).toString('base64') }),

  network_list: ({ filter, errorsOnly, limit }, ctx) => {
    const parsed = parseOrThrow(filter, NETWORK);
    const matched = [...ctx.store.net.values()].filter(
      (entry) => (!errorsOnly || isNetworkError(entry)) && matches(entry, parsed, NETWORK),
    );
    return {
      total: ctx.store.net.size,
      matched: matched.length,
      requests: newest(matched, limit, 50).map((entry) => {
        const { host, path } = splitUrl(entry.url);
        return {
          id: entry.key,
          time: new Date(entry.ts).toISOString(),
          via: entry.transport,
          method: entry.method,
          status: entry.status,
          host,
          path: clip(path, 300),
          rpc: entry.rpc,
          ms: entry.ms,
          size: entry.resBodySize,
          state: entry.state,
          error: entry.error ?? entry.rpcError,
        };
      }),
    };
  },

  network_get: async ({ id, maxBodyChars }, ctx) => {
    const entry = requireEntry(id, ctx);
    const max = Number(maxBodyChars ?? 20000);
    const { k: _k, seq: _seq, key, stack, ...rest } = entry;
    const initiator = await initiatorOf(stack, ctx);
    return {
      ...rest,
      id: key,
      initiator,
      reqBody: clip(entry.reqBody, max),
      resBody: clip(entry.resBody, max),
      frames: entry.frames?.slice(-50),
    };
  },

  network_endpoints: ({ filter, sort, limit }, ctx) => {
    const parsed = parseOrThrow(filter, NETWORK);
    const key = sort ?? 'count';
    const groups = groupEndpoints(
      [...ctx.store.net.values()].filter((entry) => matches(entry, parsed, NETWORK)),
    ).sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    return {
      endpoints: groups.length,
      groups: groups.slice(0, Math.max(1, Number(limit ?? 50))).map((group) => ({
        ...group,
        last: new Date(group.last).toISOString(),
      })),
    };
  },

  network_replay: ({ id, url, method, headers, body }, ctx) => {
    const entry = requireEntry(id, ctx);
    return ctx.sendToApp('net.replay', {
      url: url ?? entry.url,
      method: method ?? entry.method,
      headers: headers ?? entry.reqHeaders,
      body: body ?? entry.reqBody,
    });
  },

  logs_list: async ({ filter, levels, includeDetails, limit }, ctx) => {
    const parsed = parseOrThrow(filter, LOGS);
    const matched = ctx.store.logs.filter(
      (log) => (!levels?.length || levels.includes(log.level)) && matches(log, parsed, LOGS),
    );
    return {
      total: ctx.store.logs.length,
      matched: matched.length,
      logs: await Promise.all(
        newest(matched, limit, 100).map(async (log) => ({
          time: new Date(log.ts).toISOString(),
          level: log.level,
          text: clip(log.text, 2000),
          ...(includeDetails ? { args: log.args, from: await initiatorOf(log.stack, ctx) } : {}),
        })),
      ),
    };
  },

  redux_actions: ({ filter, includePayload, includeDiff, limit }, ctx) => {
    const parsed = parseOrThrow(filter, ACTIONS);
    const matched = ctx.store.actions.filter((action) => matches(action, parsed, ACTIONS));
    return {
      total: ctx.store.actions.length,
      matched: matched.length,
      actions: newest(matched, limit, 50).map((action) => ({
        time: new Date(action.ts).toISOString(),
        type: action.type,
        changed: action.changed,
        ms: action.ms,
        ...(includePayload ? { action: action.action } : {}),
        ...(includeDiff ? { diff: action.diff } : {}),
      })),
    };
  },

  redux_get: ({ path, depth }, ctx) => ctx.sendToApp('redux.get', { path: asPath(path), depth }),
  redux_set: ({ path, value }, ctx) => ctx.sendToApp('redux.set', { path: asPath(path), value }),
  redux_dispatch: ({ action }, ctx) => ctx.sendToApp('redux.dispatch', { action }),
  controllers_list: (_args, ctx) => ctx.sendToApp('ctl.list'),
  controller_get: ({ name, path, depth }, ctx) =>
    ctx.sendToApp('ctl.get', { name, path: asPath(path), depth }),
  controller_set: ({ name, path, value }, ctx) =>
    ctx.sendToApp('ctl.set', { name, path: asPath(path), value }),
  controller_call: ({ name, method, args }, ctx) =>
    method
      ? ctx.sendToApp('ctl.call', { name, method, args })
      : ctx.sendToApp('ctl.methods', { name }),

  controller_changes: ({ name, filter, includePatches, limit }, ctx) => {
    const parsed = parseOrThrow(filter, CHANGES);
    const matched = ctx.store.changes.filter(
      (change) => (!name || change.name === name) && matches(change, parsed, CHANGES),
    );
    return {
      total: ctx.store.changes.length,
      matched: matched.length,
      changes: newest(matched, limit, 50).map((change) => ({
        time: new Date(change.ts).toISOString(),
        controller: change.name,
        count: change.count,
        paths: change.paths,
        ...(includePatches ? { patches: change.patches } : {}),
      })),
    };
  },

  state_search: ({ query, source, name, limit }, ctx) =>
    ctx.sendToApp('state.search', { query, source: source ?? 'controllers', name, limit: limit ?? 100 }),

  run_code: ({ code, timeoutMs }, ctx) => ctx.sendToApp('eval', { code }, timeoutMs),

  clear: (_args, ctx) => {
    ctx.clearStore();
    return ctx.counts();
  },

  reload_app: (_args, ctx) => ctx.sendToApp('reload'),
};

/** Runs a tool. The result is `{ text }`, or `{ text, image }` with base64 PNG data. */
export async function runTool(name, args, ctx) {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const result = await handler(args, ctx);
  if (result?.$image) {
    return { text: 'Device screenshot', image: result.$image };
  }
  const text = redact(JSON.stringify(result === undefined ? null : result, null, 1));
  return {
    text:
      text.length > MAX_OUTPUT_CHARS
        ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n... [output cut at ${MAX_OUTPUT_CHARS} of ${text.length} chars: narrow the path, depth, filter or limit]`
        : text,
  };
}
