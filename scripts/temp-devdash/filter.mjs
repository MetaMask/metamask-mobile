// DevDash: filter grammar shared by the dashboard and the MCP tools. See scripts/temp-devdash/README.md.
//
// Terms are space separated and all must match:
//   word               case-insensitive text in any searchable field
//   "two words"        exact phrase
//   /^api\d+/i         regular expression (case-insensitive unless flags are given)
//   -word              exclude
//   host:infura        limit a term to one field, also with /regex/ and "phrases"
//   status:4xx         status class
//   status:>=400       number comparison, also time:>500 time:>1s size:>10k

const REGEX_FLAGS = /^[dimsuvy]*$/;
const COMPARISON = /^(>=|<=|>|<|=)(\d+(?:\.\d+)?)(ms|s|k|kb|m|mb)?$/i;
const UNITS = { ms: 1, s: 1000, k: 1024, kb: 1024, m: 1048576, mb: 1048576 };
const urlCache = new Map();

export function splitUrl(url) {
  const text = String(url);
  let parts = urlCache.get(text);
  if (!parts) {
    try {
      const parsed = new URL(text);
      parts = { host: parsed.host, path: `${parsed.pathname}${parsed.search}` };
    } catch {
      parts = { host: '', path: text };
    }
    if (urlCache.size > 5000) {
      urlCache.clear();
    }
    urlCache.set(text, parts);
  }
  return parts;
}

export function isNetworkError(entry) {
  return Boolean(
    entry.error ||
      entry.rpcError ||
      entry.state === 'error' ||
      (typeof entry.status === 'number' && entry.status >= 400),
  );
}

export function logTag(text) {
  return /^\s*\[([^\]\n]{1,40})\]/.exec(String(text))?.[1];
}

/** Replaces ids, addresses and hashes in a path, so repeat calls to one endpoint group together. */
export function normalizePath(path) {
  return String(path)
    .split('?')[0]
    .split('/')
    .map((segment) =>
      /^(\d+|0x[0-9a-f]+|[0-9a-f]{16,}|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(segment) ? ':id' : segment,
    )
    .join('/');
}

/** Groups requests by endpoint, with counts and timings. */
export function groupEndpoints(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const { host, path } = splitUrl(entry.url);
    const rpc = entry.rpc?.[0];
    const endpoint = normalizePath(path);
    const key = `${entry.method} ${host}${endpoint} ${rpc ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = { method: entry.method, host, endpoint, rpc, count: 0, errors: 0, times: [], bytes: 0, last: 0 };
      groups.set(key, group);
    }
    group.count += 1;
    group.errors += isNetworkError(entry) ? 1 : 0;
    group.bytes += entry.resBodySize ?? 0;
    group.last = Math.max(group.last, entry.ts ?? 0);
    if (typeof entry.ms === 'number') {
      group.times.push(entry.ms);
    }
  }
  return [...groups.values()].map(({ times, ...group }) => {
    times.sort((a, b) => a - b);
    return {
      ...group,
      avg: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : undefined,
      p95: times.length ? times[Math.floor((times.length - 1) * 0.95)] : undefined,
      max: times.at(-1),
    };
  });
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRegex(query, start) {
  let index = start + 1;
  while (index < query.length && query[index] !== '/') {
    index += query[index] === '\\' ? 2 : 1;
  }
  if (index >= query.length || index === start + 1) {
    return null;
  }
  let end = index + 1;
  while (end < query.length && !/\s/.test(query[end])) {
    end += 1;
  }
  const flags = query.slice(index + 1, end);
  // A URL path such as /v3/abc is not a regex: its "flags" are not valid ones.
  return REGEX_FLAGS.test(flags)
    ? { source: query.slice(start + 1, index), flags, end }
    : null;
}

/** Parses a query against a schema. Terms with an invalid regex are dropped and reported in `error`. */
export function parseFilter(query, schema) {
  const text = String(query ?? '');
  const numeric = schema?.numeric ?? [];
  const tokens = [];
  let error = null;
  let index = 0;

  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    let negate = false;
    if (text[index] === '-' && index + 1 < text.length && !/\s/.test(text[index + 1])) {
      negate = true;
      index += 1;
    }
    let field = null;
    const prefix = /^([a-z]+):/i.exec(text.slice(index, index + 24));
    if (prefix && schema?.fields?.[prefix[1].toLowerCase()]) {
      field = prefix[1].toLowerCase();
      index += prefix[0].length;
    }

    let token = null;
    if (text[index] === '"') {
      const close = text.indexOf('"', index + 1);
      const end = close === -1 ? text.length : close;
      token = { text: text.slice(index + 1, end) };
      index = end + 1;
    } else {
      const regex = text[index] === '/' ? readRegex(text, index) : null;
      if (regex) {
        index = regex.end;
        try {
          token = {
            regex: new RegExp(regex.source, regex.flags || 'i'),
            source: regex.source,
            flags: regex.flags || 'i',
          };
        } catch (failure) {
          error = failure.message;
          continue;
        }
      } else {
        let end = index;
        while (end < text.length && !/\s/.test(text[end])) {
          end += 1;
        }
        token = { text: text.slice(index, end) };
        index = end;
      }
    }

    const value = token.text;
    if (value === '' && !token.regex) {
      continue;
    }
    if (field === 'status' && value && /^[1-5]xx$/i.test(value)) {
      token = { regex: new RegExp(`^${value[0]}\\d\\d$`), statusClass: true };
    } else if (value && numeric.includes(field)) {
      const comparison = COMPARISON.exec(value);
      if (comparison) {
        token = {
          op: comparison[1],
          number: Number(comparison[2]) * (UNITS[comparison[3]?.toLowerCase()] ?? 1),
        };
      }
    }
    tokens.push({ ...token, negate, field });
  }
  return { tokens, error };
}

function testValue(token, value) {
  if (token.regex) {
    return token.regex.test(value);
  }
  return value.toLowerCase().includes(token.lower ?? (token.lower = token.text.toLowerCase()));
}

function compare(token, value) {
  if (typeof value !== 'number') {
    return false;
  }
  switch (token.op) {
    case '>':
      return value > token.number;
    case '>=':
      return value >= token.number;
    case '<':
      return value < token.number;
    case '<=':
      return value <= token.number;
    default:
      return value === token.number;
  }
}

export function matches(entry, parsed, schema) {
  for (const token of parsed.tokens) {
    let hit;
    if (token.op) {
      hit = compare(token, schema.fields[token.field](entry));
    } else if (token.field) {
      hit = testValue(token, String(schema.fields[token.field](entry) ?? ''));
    } else {
      hit = schema.free.some((name) => testValue(token, String(schema.fields[name](entry) ?? '')));
    }
    if (hit === token.negate) {
      return false;
    }
  }
  return true;
}

/** Regexes that mark what a query matched, for highlighting. */
export function markersFor(parsed) {
  const out = [];
  for (const token of parsed.tokens) {
    if (token.negate || token.op || token.statusClass) {
      continue;
    }
    if (token.regex) {
      out.push(new RegExp(token.source, `${token.flags.replace(/[gy]/g, '')}g`));
    } else if (token.text) {
      out.push(new RegExp(escapeRegex(token.text), 'gi'));
    }
  }
  return out;
}

const json = (value) => (value === undefined ? '' : JSON.stringify(value));

export const NETWORK = {
  numeric: ['status', 'time', 'ms', 'size'],
  free: ['url', 'method', 'status', 'rpc', 'req', 'res', 'error'],
  fields: {
    status: (e) => (e.status === undefined ? (e.error ? 'ERR' : '') : e.status),
    method: (e) => e.method,
    host: (e) => splitUrl(e.url).host,
    path: (e) => splitUrl(e.url).path,
    url: (e) => e.url,
    rpc: (e) => (e.rpc ?? []).join(' '),
    via: (e) => e.transport,
    type: (e) => e.transport,
    state: (e) => e.state,
    req: (e) => e.reqBody,
    res: (e) => e.resBody,
    body: (e) => `${e.reqBody ?? ''}\n${e.resBody ?? ''}`,
    header: (e) => `${json(e.reqHeaders)}\n${json(e.resHeaders)}`,
    error: (e) => e.error ?? e.rpcError,
    time: (e) => e.ms,
    ms: (e) => e.ms,
    size: (e) => e.resBodySize,
  },
};

export const LOGS = {
  free: ['text'],
  fields: {
    text: (l) => l.text,
    level: (l) => l.level,
    tag: (l) => logTag(l.text),
  },
};

export const ACTIONS = {
  free: ['type', 'payload'],
  fields: {
    type: (a) => a.type,
    changed: (a) => (a.changed ?? []).join(' '),
    payload: (a) => json(a.action),
    diff: (a) => json(a.diff),
  },
};

export const CHANGES = {
  free: ['controller', 'paths', 'patches'],
  fields: {
    controller: (c) => c.name,
    paths: (c) => (c.paths ?? []).join(' '),
    patches: (c) => json(c.patches),
  },
};

export const NAMES = {
  free: ['name'],
  fields: { name: (n) => n },
};
