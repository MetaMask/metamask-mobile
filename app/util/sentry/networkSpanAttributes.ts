/**
 * Pure helpers that make outgoing-request spans safe and useful in Sentry.
 *
 * A normalized `endpoint` ("GET host/users/:address") groups requests and
 * carries no wallet address, key or query string. The JSON-RPC `rpc.method`
 * names node calls. A `request.redundant` flag is computed on the device,
 * because Sentry samples traces and cannot find repeated calls afterwards.
 */

interface ScrubbableSpan {
  op?: string;
  description?: string;
  data?: Record<string, unknown>;
}

interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
}

interface RedundancyTrackerOptions {
  windowMs?: number;
  maxEntries?: number;
}

export const ENDPOINT_ATTRIBUTE = 'endpoint';
export const RPC_METHOD_ATTRIBUTE = 'rpc.method';
export const REDUNDANT_ATTRIBUTE = 'request.redundant';
export const REDUNDANT_WINDOW_MS = 3000;

const MAX_RPC_BODY_LENGTH = 64 * 1024;
const MAX_TRACKED_REQUESTS = 200;
const HTTP_CLIENT_OP = 'http.client';
const URL_ATTRIBUTES = ['url', 'http.url', 'url.full'];
const QUERY_ATTRIBUTES = ['http.query', 'http.fragment'];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeSegment(segment: string): string {
  if (UUID_PATTERN.test(segment)) return ':id';
  if (/^0x[0-9a-f]{8,}$/i.test(segment)) return ':address';
  if (/^[0-9a-f]{16,}$/i.test(segment)) return ':id';
  if (/^\d{4,}$/.test(segment)) return ':n';
  if (segment.length >= 24 && /\d/.test(segment)) return ':id';
  return segment;
}

function parseHttpUrl(url: string): ParsedUrl | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.host) return undefined;
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
    };
  } catch {
    return undefined;
  }
}

function firstString(
  data: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function splitDescription(description: string | undefined): {
  method?: string;
  url?: string;
} {
  if (!description) return {};
  const separator = description.indexOf(' ');
  if (separator === -1) return {};
  return {
    method: description.slice(0, separator),
    url: description.slice(separator + 1),
  };
}

function rpcMethodsOf(body: unknown): string[] {
  const items = Array.isArray(body) ? body : [body];
  const methods: string[] = [];
  for (const item of items) {
    const method = (item as { method?: unknown } | null)?.method;
    if (typeof method === 'string' && method.length > 0) methods.push(method);
  }
  return [...new Set(methods)];
}

function hashString(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  // eslint-disable-next-line no-bitwise
  return (hash >>> 0).toString(16);
}

/** Collapse ids, hashes and addresses so `/profiles/<uuid>` groups as one endpoint. */
export function normalizePath(path: string): string {
  return path.split('/').map(normalizeSegment).join('/') || '/';
}

/**
 * `METHOD host/normalized/path`: no scheme, query or fragment. An unparseable
 * url yields just the method rather than echoing something unsafe.
 */
export function getEndpointLabel(method: string, url: string): string {
  const verb = method.toUpperCase();
  const parsed = parseHttpUrl(url);
  if (!parsed) return verb;
  return `${verb} ${parsed.host}${normalizePath(parsed.pathname)}`;
}

/** JSON-RPC method of a string body: a name, `batch(n)` for several, else undefined. */
export function getRpcMethod(body: unknown): string | undefined {
  if (typeof body !== 'string') return undefined;
  if (body.length > MAX_RPC_BODY_LENGTH) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  const methods = rpcMethodsOf(parsed);
  if (methods.length === 0) return undefined;
  if (methods.length === 1) return methods[0];
  return `batch(${methods.length})`;
}

/** Short hash so the tracker never keeps a raw url or body in memory. */
export function fingerprintRequest(
  method: string,
  url: string,
  body: unknown,
): string {
  const bodyText = typeof body === 'string' ? body : '';
  return hashString(`${method}|${url}|${bodyText}`);
}

/**
 * Remembers when each request fingerprint was last seen. A repeat inside the
 * window is redundant. Bounded: the oldest entries are evicted first.
 */
export function createRedundancyTracker({
  windowMs = REDUNDANT_WINDOW_MS,
  maxEntries = MAX_TRACKED_REQUESTS,
}: RedundancyTrackerOptions = {}) {
  // A Map, not a Record: keys are added and evicted constantly and order matters.
  const lastSeen = new Map<string, number>();

  return function isRedundant(key: string, now: number = Date.now()): boolean {
    const previous = lastSeen.get(key);
    lastSeen.delete(key);
    lastSeen.set(key, now);
    while (lastSeen.size > maxEntries) {
      const oldest = lastSeen.keys().next().value;
      if (oldest === undefined) break;
      lastSeen.delete(oldest);
    }
    if (previous === undefined) return false;
    return now - previous <= windowMs;
  };
}

/**
 * `beforeSendSpan` for outgoing requests. The SDK records the full url, with
 * its query string, in `url`, `http.url`, `url.full` and `http.query`. Replace
 * them with the normalized form so addresses and API keys never leave the device.
 */
export function scrubOutgoingRequestSpan<TSpan extends ScrubbableSpan>(
  span: TSpan,
): TSpan {
  if (span.op !== HTTP_CLIENT_OP) return span;

  const data = span.data ?? {};
  const fromDescription = splitDescription(span.description);
  const method =
    firstString(data, ['http.method', 'http.request.method']) ??
    fromDescription.method ??
    'GET';
  const rawUrl = firstString(data, URL_ATTRIBUTES) ?? fromDescription.url;
  const parsed = rawUrl ? parseHttpUrl(rawUrl) : undefined;
  const safeUrl = parsed
    ? `${parsed.protocol}//${parsed.host}${normalizePath(parsed.pathname)}`
    : undefined;

  const scrubbedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (QUERY_ATTRIBUTES.includes(key)) continue;
    if (URL_ATTRIBUTES.includes(key)) {
      if (safeUrl) scrubbedData[key] = safeUrl;
      continue;
    }
    scrubbedData[key] = value;
  }

  return {
    ...span,
    description: parsed ? getEndpointLabel(method, rawUrl as string) : method,
    data: scrubbedData,
  };
}
