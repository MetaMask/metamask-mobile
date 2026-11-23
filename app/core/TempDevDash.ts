// DevDash app agent (dev builds only): streams network, logs, Redux and controller state to
// scripts/temp-devdash/server.mjs and runs commands sent from there. Reference branch, not for main
// or release branches. Architecture, protocol and porting notes: scripts/temp-devdash/README.md
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, no-new-func */
import { DevSettings, NativeModules, Platform } from 'react-native';
import packageJson from '../../package.json';
import { hasTestOverrides } from '../util/test/utils';

type Path = (string | number)[];
type DevDashEvent = Record<string, unknown> & { k: string };
type Dict = Record<string, unknown>;

interface EncodeOptions {
  depth: number;
  maxString: number;
  maxNodes: number;
  maxKeys: number;
}

interface ControllerLike {
  name?: string;
  state?: unknown;
  update?: (callback: (draft: unknown) => void) => void;
}

interface EngineLike {
  context: Record<string, ControllerLike>;
  controllerMessenger: {
    subscribe: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}

interface StoreLike {
  dispatch: (action: unknown) => unknown;
  getState: () => unknown;
}

interface ActionLike {
  type?: string;
  path?: Path;
  value?: unknown;
}

const PORT = 8098;
const RECONNECT_MS = 2500;
const FLUSH_MS = 250;
const INFO_MS = 3000;
const CONTROLLER_SYNC_MS = 2000;
const MAX_QUEUE_EVENTS = 4000;
const MAX_QUEUE_BYTES = 30 * 1024 * 1024;
const MAX_FLUSH_EVENTS = 300;
const MAX_FLUSH_BYTES = 2 * 1024 * 1024;
const MAX_BODY_CHARS = 128 * 1024;
const MAX_DECODE_BYTES = 8 * 1024 * 1024;
const MAX_FRAME_CHARS = 2048;
const MAX_FRAMES_PER_SECOND = 25;
const SET_ACTION_TYPE = '@@devdash/SET';

const LOG_ENCODE: EncodeOptions = {
  depth: 4,
  maxString: 4000,
  maxNodes: 1500,
  maxKeys: 200,
};
const ACTION_ENCODE: EncodeOptions = {
  depth: 5,
  maxString: 2000,
  maxNodes: 3000,
  maxKeys: 200,
};
const PATCH_ENCODE: EncodeOptions = {
  depth: 5,
  maxString: 2000,
  maxNodes: 2000,
  maxKeys: 100,
};
const READ_ENCODE: EncodeOptions = {
  depth: 3,
  maxString: 20000,
  maxNodes: 60000,
  maxKeys: 1000,
};
const RESULT_ENCODE: EncodeOptions = {
  depth: 6,
  maxString: 50000,
  maxNodes: 40000,
  maxKeys: 1000,
};
// Runs inside a reducer on every action, so each value stays small.
const DIFF_ENCODE: EncodeOptions = {
  depth: 2,
  maxString: 300,
  maxNodes: 60,
  maxKeys: 20,
};
const MAX_DIFF_ENTRIES = 40;
const MAX_DIFF_VISITS = 20000;
const ROUTE_POLL_MS = 1000;
const MAX_STACK_CHARS = 4000;
const MAX_COMPLETIONS = 500;

// Matched by key name wherever it appears, so the Redux mirror of a controller is covered too.
const SENSITIVE_KEY =
  /^(vault|encryptionKey|encryptionSalt|mnemonic|seedPhrase|seedWords|privateKey|password|access_?token|refresh_?token|revoke_?token|id_?token|metadataAccessToken|nodeAuthTokens|vaultEncryptionKey|vaultEncryptionSalt|encryptedSeedlessEncryptionKey|encryptedKeyringEncryptionKey|socialBackupsMetadata)$/i;

// A bad edit here can lock the dev wallet for good, so these stay read-only outside Run.
const READ_ONLY_CONTROLLERS = new Set([
  'KeyringController',
  'SeedlessOnboardingController',
]);

const DEV_INFRA_URL = /^[a-z]+:\/\/[^/]+:(8081|8097|8098|8099|9090)(\/|$)/i;
const TEXTUAL_CONTENT_TYPE = /json|text|xml|javascript|urlencoded|graphql/i;
const PLAIN_PROPERTY_CHAIN = /^[\w$]+(\.[\w$]+)*$/;
const REGEX_QUERY = /^\/(.+)\/([dimsuvy]*)$/;

const g = globalThis as unknown as Dict & {
  fetch: typeof fetch;
  WebSocket: typeof WebSocket;
  XMLHttpRequest: typeof XMLHttpRequest;
  ErrorUtils?: {
    getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
    setGlobalHandler: (
      handler: (error: unknown, isFatal?: boolean) => void,
    ) => void;
  };
};

const session = Date.now().toString(36);
let installed = false;
let paused = false;
let captureFrames = true;
let socket: WebSocket | null = null;
let activeHost: string | null = null;
let candidateIndex = 0;
let queue: { event: DevDashEvent; size: number }[] = [];
let queueBytes = 0;
let dropped = 0;
let netCounter = 0;
let logCounter = 0;
let actionCounter = 0;
let changeCounter = 0;
let subscribedMessenger: unknown = null;
let lastRouteName: string | undefined;
let OriginalWebSocket: typeof WebSocket | null = null;

const capturing = () => installed && !paused;

// Lazy so this module, which loads first, never changes the app's module init order.
const getEngine = () => require('./Engine').default as EngineLike;
const getStore = () => require('./redux').default.store as StoreLike;
// getCurrentRoute is safe during startup, unlike the navigation getter, which logs an error.
const getNavigationService = () =>
  require('./NavigationService').default as {
    navigation: unknown;
    getCurrentRoute: () => { name?: string; params?: unknown } | undefined;
  };

function encode(value: unknown, options: EncodeOptions): unknown {
  let nodes = 0;
  const ancestors = new WeakSet<object>();

  const walk = (input: unknown, depth: number): unknown => {
    nodes += 1;
    switch (typeof input) {
      case 'string':
        return input.length > options.maxString
          ? `${input.slice(0, options.maxString)}... [+${input.length - options.maxString} chars]`
          : input;
      case 'boolean':
        return input;
      case 'number':
        return Number.isFinite(input)
          ? input
          : { $dd: 'number', value: String(input) };
      case 'undefined':
        return { $dd: 'undefined' };
      case 'bigint':
        return { $dd: 'bigint', value: input.toString() };
      case 'symbol':
        return { $dd: 'symbol', value: String(input) };
      case 'function':
        return { $dd: 'fn', name: input.name || 'anonymous' };
      default:
        break;
    }
    if (input === null) {
      return null;
    }
    const object = input as Dict;
    if (nodes > options.maxNodes) {
      return { $dd: 'cut' };
    }
    if (ancestors.has(object)) {
      return { $dd: 'circular' };
    }
    if (object instanceof Error) {
      return {
        $dd: 'error',
        name: object.name,
        message: object.message,
        stack: object.stack,
      };
    }
    if (object instanceof Date) {
      return object.toISOString();
    }
    if (object instanceof RegExp) {
      return String(object);
    }
    if (object instanceof ArrayBuffer) {
      return { $dd: 'bytes', size: object.byteLength };
    }
    if (ArrayBuffer.isView(object)) {
      return { $dd: 'bytes', size: object.byteLength };
    }
    if (
      typeof object.toHexString === 'function' ||
      object._isBigNumber === true ||
      (Array.isArray(object.words) && typeof object.toString === 'function')
    ) {
      return { $dd: 'bignum', value: String(object) };
    }

    ancestors.add(object);
    try {
      if (object instanceof Set) {
        return walk([...object], depth);
      }
      if (Array.isArray(object)) {
        if (depth <= 0 && object.length > 0) {
          return { $dd: 'more', kind: 'array', size: object.length };
        }
        const items = object
          .slice(0, options.maxKeys)
          .map((item) => walk(item, depth - 1));
        if (object.length > options.maxKeys) {
          items.push({
            $dd: 'cut',
            remaining: object.length - options.maxKeys,
          });
        }
        return items;
      }
      const entries: [string, unknown][] =
        object instanceof Map
          ? [...object.entries()].map(([key, item]) => [String(key), item])
          : Object.keys(object).map((key) => [key, undefined]);
      const isMap = object instanceof Map;
      if (depth <= 0 && entries.length > 0) {
        return {
          $dd: 'more',
          kind: isMap ? 'map' : 'object',
          size: entries.length,
        };
      }
      const out: Dict = {};
      for (const [key, mapValue] of entries.slice(0, options.maxKeys)) {
        if (SENSITIVE_KEY.test(key)) {
          const raw = isMap ? mapValue : object[key];
          out[key] = raw === undefined || raw === null ? raw : '[masked]';
          continue;
        }
        try {
          out[key] = walk(isMap ? mapValue : object[key], depth - 1);
        } catch (error) {
          out[key] = { $dd: 'error', message: String(error) };
        }
      }
      if (entries.length > options.maxKeys) {
        out.$ddCut = entries.length - options.maxKeys;
      }
      return out;
    } finally {
      ancestors.delete(object);
    }
  };

  return walk(value, options.depth);
}

function getAt(root: unknown, path: Path): unknown {
  let current = root;
  for (const segment of path) {
    if (current === undefined || current === null) {
      return undefined;
    }
    if (SENSITIVE_KEY.test(String(segment))) {
      return '[masked]';
    }
    current =
      current instanceof Map
        ? current.get(segment)
        : (current as Dict)[segment];
  }
  return current;
}

function setIn(target: unknown, path: Path, value: unknown): unknown {
  if (path.length === 0) {
    return value;
  }
  const [head, ...rest] = path;
  const copy = (
    Array.isArray(target) ? [...target] : { ...(target as Dict) }
  ) as Dict;
  copy[head] = setIn(copy[head], rest, value);
  return copy;
}

function assignIn(draft: unknown, path: Path, value: unknown): void {
  if (path.length === 0) {
    throw new Error('A controller edit needs a path');
  }
  let current = draft as Dict;
  for (const segment of path.slice(0, -1)) {
    current = current[segment] as Dict;
    if (current === undefined || current === null) {
      throw new Error(`No value at ${path.join('.')}`);
    }
  }
  current[path[path.length - 1]] = value;
}

function preview(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return String(value).slice(0, 160);
  }
  return Array.isArray(value)
    ? `[${value.length}]`
    : `{${Object.keys(value).length}}`;
}

function textMatcher(query: string): (text: string) => boolean {
  const regex = REGEX_QUERY.exec(query);
  if (regex) {
    const pattern = new RegExp(regex[1], regex[2] || 'i');
    return (text) => pattern.test(text);
  }
  const needle = query.toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
}

function searchState(
  root: unknown,
  query: string,
  basePath: Path,
  limit: number,
  results: { path: Path; preview: string }[],
): void {
  const isMatch = textMatcher(query);
  const seen = new WeakSet<object>();
  let visited = 0;

  const walk = (value: unknown, path: Path): void => {
    visited += 1;
    if (results.length >= limit || visited > 500000) {
      return;
    }
    if (value === null || typeof value !== 'object') {
      if (
        value !== undefined &&
        typeof value !== 'function' &&
        isMatch(String(value))
      ) {
        results.push({ path, preview: String(value).slice(0, 160) });
      }
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    const entries: [string, unknown][] =
      value instanceof Map
        ? [...value.entries()].map(([key, item]) => [String(key), item])
        : Object.entries(value);
    for (const [key, child] of entries) {
      if (SENSITIVE_KEY.test(key) || results.length >= limit) {
        continue;
      }
      if (isMatch(key)) {
        results.push({ path: [...path, key], preview: preview(child) });
      }
      walk(child, [...path, key]);
    }
  };

  walk(root, basePath);
}

function emit(event: DevDashEvent, size = 400): void {
  if (queue.length >= MAX_QUEUE_EVENTS || queueBytes + size > MAX_QUEUE_BYTES) {
    const removed = queue.shift();
    queueBytes -= removed?.size ?? 0;
    dropped += 1;
  }
  queue.push({ event, size });
  queueBytes += size;
}

function flush(): void {
  if (!socket || socket.readyState !== 1 || queue.length === 0) {
    return;
  }
  let count = 0;
  let bytes = 0;
  while (
    count < queue.length &&
    count < MAX_FLUSH_EVENTS &&
    bytes < MAX_FLUSH_BYTES
  ) {
    bytes += queue[count].size;
    count += 1;
  }
  const batch = queue.slice(0, count);
  queue = queue.slice(count);
  queueBytes -= bytes;
  try {
    socket.send(
      JSON.stringify({ t: 'batch', events: batch.map((item) => item.event) }),
    );
  } catch {
    dropped += batch.length;
  }
}

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) {
    return out;
  }
  try {
    const iterable = headers as {
      forEach?: (callback: (value: string, key: string) => void) => void;
    };
    if (Array.isArray(headers)) {
      for (const [key, value] of headers as [string, string][]) {
        out[String(key).toLowerCase()] = String(value);
      }
    } else if (typeof iterable.forEach === 'function') {
      iterable.forEach((value, key) => {
        out[String(key).toLowerCase()] = String(value);
      });
    } else {
      for (const [key, value] of Object.entries(headers as Dict)) {
        out[key.toLowerCase()] = String(value);
      }
    }
  } catch {
    // Headers are best effort: a strange shape must not break the request.
  }
  return out;
}

function bodyToString(body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  try {
    if (body instanceof ArrayBuffer) {
      return new TextDecoder().decode(new Uint8Array(body));
    }
    if (ArrayBuffer.isView(body)) {
      return new TextDecoder().decode(body);
    }
    if (
      typeof URLSearchParams !== 'undefined' &&
      body instanceof URLSearchParams
    ) {
      return body.toString();
    }
    const name = (body as object).constructor?.name ?? 'Object';
    return `[${name} body not captured]`;
  } catch {
    return '[body not captured]';
  }
}

function parseRpcMethods(body: string | undefined): string[] | undefined {
  if (!body || body.length > 200000 || !body.includes('"method"')) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(body);
    const calls: { method?: unknown }[] = Array.isArray(parsed)
      ? parsed
      : [parsed];
    const methods = calls
      .map((call) => call?.method)
      .filter((method): method is string => typeof method === 'string');
    return methods.length > 0 ? methods : undefined;
  } catch {
    return undefined;
  }
}

function parseRpcError(body: string): string | undefined {
  if (body.length > 200000 || !body.includes('"error"')) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(body);
    const replies: { error?: { message?: string } | string }[] = Array.isArray(
      parsed,
    )
      ? parsed
      : [parsed];
    const failed = replies.find((reply) => reply?.error);
    if (!failed) {
      return undefined;
    }
    return typeof failed.error === 'string'
      ? failed.error
      : (failed.error?.message ?? 'RPC error');
  } catch {
    return undefined;
  }
}

// Drops the frames of this file: Error, captureStack, its caller and the patched function.
function captureStack(): string | undefined {
  try {
    const stack = new Error().stack;
    return stack
      ? clip(stack.split('\n').slice(4).join('\n'), MAX_STACK_CHARS)
      : undefined;
  } catch {
    return undefined;
  }
}

function startNet(fields: {
  transport: 'fetch' | 'xhr' | 'ws';
  method: string;
  url: string;
  reqHeaders?: Record<string, string>;
  reqBody?: string;
}) {
  netCounter += 1;
  const id = String(netCounter);
  const startedAt = Date.now();
  const rpc = parseRpcMethods(fields.reqBody);
  emit(
    {
      k: 'net',
      id,
      ts: startedAt,
      state: 'pending',
      ...fields,
      reqBody:
        fields.reqBody === undefined
          ? undefined
          : clip(fields.reqBody, MAX_BODY_CHARS),
      reqBodySize: fields.reqBody?.length,
      rpc,
      stack: captureStack(),
    },
    1500 + Math.min(fields.reqBody?.length ?? 0, MAX_BODY_CHARS),
  );
  return { id, startedAt, rpc };
}

async function finishFetch(
  record: ReturnType<typeof startNet>,
  response: Response,
  skipBody: boolean,
): Promise<void> {
  const ms = Date.now() - record.startedAt;
  const resHeaders = normalizeHeaders(response.headers);
  const contentType = resHeaders['content-type'] ?? '';
  const declaredSize = Number(resHeaders['content-length'] ?? 0);
  let resBody: string | undefined;
  let resBodySize: number | undefined = declaredSize || undefined;
  let rpcError: string | undefined;

  if (skipBody) {
    resBody = '[stream: body not captured]';
  } else if (contentType && !TEXTUAL_CONTENT_TYPE.test(contentType)) {
    resBody = `[${contentType} body not captured]`;
  } else if (declaredSize > MAX_DECODE_BYTES) {
    resBody = `[${declaredSize} bytes: too large to capture]`;
  } else {
    try {
      const text = await response.clone().text();
      resBodySize = text.length;
      resBody = clip(text, MAX_BODY_CHARS);
      rpcError = record.rpc ? parseRpcError(text) : undefined;
    } catch (error) {
      resBody = `[body not captured: ${String(error)}]`;
    }
  }

  emit(
    {
      k: 'net',
      id: record.id,
      state: 'done',
      ms,
      status: response.status,
      statusText: response.statusText,
      redirected: response.redirected,
      resHeaders,
      resBody,
      resBodySize,
      rpcError,
    },
    400 + (resBody?.length ?? 0),
  );
}

function wrapFetch<F>(original: F, skipBody = false): F {
  const call = original as unknown as (
    input: unknown,
    init?: Dict,
  ) => Promise<Response>;

  const wrapped = (input: unknown, init?: Dict) => {
    if (!capturing()) {
      return call(input, init);
    }
    let record: ReturnType<typeof startNet> | undefined;
    try {
      const request = input as { url?: string; href?: string; method?: string };
      const url =
        typeof input === 'string'
          ? input
          : (request.url ?? request.href ?? String(input));
      if (!DEV_INFRA_URL.test(url)) {
        record = startNet({
          transport: 'fetch',
          method: String(init?.method ?? request.method ?? 'GET').toUpperCase(),
          url,
          reqHeaders: normalizeHeaders(
            init?.headers ?? (request as Dict).headers,
          ),
          reqBody: bodyToString(init?.body),
        });
      }
    } catch {
      record = undefined;
    }
    const promise = call(input, init);
    if (record) {
      const active = record;
      promise.then(
        (response) =>
          finishFetch(
            active,
            response,
            skipBody || Boolean(init?.stream),
          ).catch(() => undefined),
        (error) =>
          emit({
            k: 'net',
            id: active.id,
            state: 'error',
            ms: Date.now() - active.startedAt,
            error: String(error),
          }),
      );
    }
    return promise;
  };
  return wrapped as unknown as F;
}

function patchXhr(): void {
  const proto = g.XMLHttpRequest?.prototype;
  if (!proto) {
    return;
  }
  const meta = new WeakMap<
    XMLHttpRequest,
    { method: string; url: string; headers: Record<string, string> }
  >();
  const originalOpen = proto.open as (...args: unknown[]) => void;
  const originalSetHeader = proto.setRequestHeader;
  const originalSend = proto.send;

  proto.open = function open(this: XMLHttpRequest, ...args: unknown[]) {
    meta.set(this, {
      method: String(args[0]).toUpperCase(),
      url: String(args[1]),
      headers: {},
    });
    return originalOpen.apply(this, args);
  } as typeof proto.open;

  proto.setRequestHeader = function setRequestHeader(
    this: XMLHttpRequest,
    key: string,
    value: string,
  ) {
    const current = meta.get(this);
    if (current) {
      current.headers[key.toLowerCase()] = value;
    }
    return originalSetHeader.call(this, key, value);
  };

  proto.send = function send(
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const current = meta.get(this);
    if (current && capturing() && !DEV_INFRA_URL.test(current.url)) {
      const record = startNet({
        transport: 'xhr',
        method: current.method,
        url: current.url,
        reqHeaders: current.headers,
        reqBody: bodyToString(body),
      });
      this.addEventListener('loadend', () => {
        let resBody: string | undefined;
        let resBodySize: number | undefined;
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            resBodySize = this.responseText.length;
            resBody = clip(this.responseText, MAX_BODY_CHARS);
          } else if (this.responseType === 'json') {
            const text = JSON.stringify(this.response);
            resBodySize = text.length;
            resBody = clip(text, MAX_BODY_CHARS);
          } else {
            resBody = `[${this.responseType} body not captured]`;
          }
        } catch {
          resBody = '[body not captured]';
        }
        const headerLines = this.getAllResponseHeaders?.() ?? '';
        const resHeaders: Record<string, string> = {};
        for (const line of headerLines.split(/\r?\n/)) {
          const separator = line.indexOf(':');
          if (separator > 0) {
            resHeaders[line.slice(0, separator).trim().toLowerCase()] = line
              .slice(separator + 1)
              .trim();
          }
        }
        emit(
          {
            k: 'net',
            id: record.id,
            state: this.status === 0 ? 'error' : 'done',
            ms: Date.now() - record.startedAt,
            status: this.status,
            statusText: this.statusText,
            resHeaders,
            resBody,
            resBodySize,
            error: this.status === 0 ? 'Request failed' : undefined,
            rpcError:
              record.rpc && resBody ? parseRpcError(resBody) : undefined,
          },
          400 + (resBody?.length ?? 0),
        );
      });
    }
    return originalSend.call(this, body as XMLHttpRequestBodyInit);
  };
}

function patchWebSocket(): void {
  const Original = g.WebSocket;
  OriginalWebSocket = Original;

  function WrappedWebSocket(
    url: string,
    protocols?: string | string[],
    options?: unknown,
  ) {
    const Constructor = Original as unknown as new (
      ...args: unknown[]
    ) => WebSocket;
    const instance = new Constructor(url, protocols, options);
    if (!capturing() || DEV_INFRA_URL.test(url)) {
      return instance;
    }

    const record = startNet({ transport: 'ws', method: 'WS', url });
    let framesIn = 0;
    let framesOut = 0;
    let windowStart = Date.now();
    let windowCount = 0;

    const onFrame = (direction: 'in' | 'out', data: unknown) => {
      if (direction === 'in') {
        framesIn += 1;
      } else {
        framesOut += 1;
      }
      if (!capturing() || !captureFrames) {
        return;
      }
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        windowCount = 0;
      }
      windowCount += 1;
      if (windowCount > MAX_FRAMES_PER_SECOND) {
        return;
      }
      const text =
        typeof data === 'string'
          ? data
          : `[binary ${(data as ArrayBuffer)?.byteLength ?? '?'} bytes]`;
      emit(
        {
          k: 'frame',
          id: record.id,
          ts: now,
          dir: direction,
          size: text.length,
          data: clip(text, MAX_FRAME_CHARS),
          framesIn,
          framesOut,
        },
        200 + Math.min(text.length, MAX_FRAME_CHARS),
      );
    };

    const socketInstance = instance as unknown as {
      addEventListener: (type: string, listener: (event: Dict) => void) => void;
      send: (data: unknown) => void;
    };
    socketInstance.addEventListener('open', () =>
      emit({
        k: 'net',
        id: record.id,
        state: 'open',
        status: 101,
        ms: Date.now() - record.startedAt,
      }),
    );
    socketInstance.addEventListener('message', (event) =>
      onFrame('in', event.data),
    );
    socketInstance.addEventListener('error', (event) =>
      emit({
        k: 'net',
        id: record.id,
        state: 'error',
        error: String(event.message ?? 'WebSocket error'),
      }),
    );
    socketInstance.addEventListener('close', (event) =>
      emit({
        k: 'net',
        id: record.id,
        state: 'closed',
        ms: Date.now() - record.startedAt,
        closeCode: event.code,
        closeReason: event.reason,
        framesIn,
        framesOut,
      }),
    );
    const originalSend = socketInstance.send.bind(instance);
    socketInstance.send = (data: unknown) => {
      onFrame('out', data);
      originalSend(data);
    };
    return instance;
  }

  // Keeps the routing marker symbol so a Fast Refresh of the setup module does not nest wrappers.
  Object.assign(WrappedWebSocket, Original, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  });
  g.WebSocket = WrappedWebSocket as unknown as typeof WebSocket;
}

function logText(args: unknown[]): string {
  const parts = args.map((arg) => {
    if (typeof arg === 'string') {
      return arg;
    }
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    try {
      return clip(JSON.stringify(encode(arg, LOG_ENCODE)) ?? String(arg), 600);
    } catch {
      return String(arg);
    }
  });
  return clip(parts.join(' '), 4000);
}

function captureLog(level: string, args: unknown[]): void {
  if (!capturing()) {
    return;
  }
  try {
    const text = logText(args);
    logCounter += 1;
    const hasObjects = args.some((arg) => typeof arg !== 'string');
    emit(
      {
        k: 'log',
        id: logCounter,
        ts: Date.now(),
        level,
        text,
        args: hasObjects ? encode(args, LOG_ENCODE) : undefined,
        stack:
          level === 'warn' || level === 'error' ? captureStack() : undefined,
      },
      300 + text.length * (hasObjects ? 3 : 1),
    );
  } catch {
    // Logging must never be able to break the caller.
  }
}

function patchConsole(): void {
  const target = console as unknown as Record<
    string,
    (...args: unknown[]) => void
  >;
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = target[level];
    target[level] = (...args: unknown[]) => {
      captureLog(level, args);
      original.apply(console, args);
    };
  }
}

function patchErrorHandler(): void {
  if (!g.ErrorUtils) {
    return;
  }
  const previous = g.ErrorUtils.getGlobalHandler();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    captureLog('error', [
      isFatal ? 'Uncaught fatal error:' : 'Uncaught error:',
      error,
    ]);
    previous(error, isFatal);
  });
}

function changedSlices(previous: unknown, next: unknown): string[] {
  if (previous === next || !next || typeof next !== 'object') {
    return [];
  }
  const before = (previous ?? {}) as Dict;
  return Object.keys(next as Dict).filter(
    (key) => before[key] !== (next as Dict)[key],
  );
}

// Walks only what changed: unchanged branches share references, so this stays cheap.
function diffState(previous: unknown, next: unknown): Dict[] {
  const out: Dict[] = [];
  let visits = 0;

  const walk = (before: unknown, after: unknown, path: string[]): void => {
    visits += 1;
    if (
      Object.is(before, after) ||
      out.length >= MAX_DIFF_ENTRIES ||
      visits > MAX_DIFF_VISITS
    ) {
      return;
    }
    const sameShape =
      before !== null &&
      after !== null &&
      typeof before === 'object' &&
      typeof after === 'object' &&
      Array.isArray(before) === Array.isArray(after);
    if (!sameShape) {
      out.push({
        path: path.join('.'),
        before: encode(before, DIFF_ENCODE),
        after: encode(after, DIFF_ENCODE),
      });
      return;
    }
    const left = before as Dict;
    const right = after as Dict;
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      if (SENSITIVE_KEY.test(key)) {
        if (left[key] !== right[key]) {
          out.push({
            path: [...path, key].join('.'),
            before: '[masked]',
            after: '[masked]',
          });
        }
      } else {
        walk(left[key], right[key], [...path, key]);
      }
    }
  };

  if (previous !== undefined) {
    walk(previous, next, []);
  }
  return out;
}

function recordAction(
  action: ActionLike,
  previous: unknown,
  next: unknown,
  ms: number,
): void {
  try {
    actionCounter += 1;
    emit(
      {
        k: 'action',
        id: actionCounter,
        ts: Date.now(),
        type: String(action?.type),
        action: encode(action, ACTION_ENCODE),
        changed: changedSlices(previous, next),
        diff: diffState(previous, next),
        ms,
      },
      3000,
    );
  } catch {
    // The action log must never be able to break a reducer.
  }
}

/** Wraps the root reducer so every action is seen (including saga puts) and state paths can be set. */
export function tempDevDashWrapReducer<R>(reducer: R): R {
  const inner = reducer as unknown as (
    state: unknown,
    action: ActionLike,
  ) => unknown;
  const wrapped = (state: unknown, action: ActionLike) => {
    if (action?.type === SET_ACTION_TYPE) {
      const edited = setIn(state, action.path ?? [], action.value);
      if (capturing()) {
        recordAction(action, state, edited, 0);
      }
      return edited;
    }
    const startedAt = Date.now();
    const next = inner(state, action);
    if (capturing()) {
      recordAction(action, state, next, Date.now() - startedAt);
    }
    return next;
  };
  return wrapped as unknown as R;
}

/** For fetch implementations imported directly, which never pass through the global one. */
export function tempDevDashWrapFetch<F>(original: F): F {
  return wrapFetch(original, true);
}

function encodePatches(patches: unknown[]): unknown {
  const masked = patches.map((patch) => {
    const { path, ...rest } = patch as { path?: Path; value?: unknown };
    return path?.some((segment) => SENSITIVE_KEY.test(String(segment)))
      ? { ...rest, path, value: '[masked]' }
      : { ...rest, path };
  });
  return encode(masked, PATCH_ENCODE);
}

function controllerEntries(): [string, ControllerLike][] {
  return Object.entries(getEngine().context).filter(
    ([, controller]) =>
      controller !== null &&
      typeof controller === 'object' &&
      controller.state !== null &&
      typeof controller.state === 'object',
  );
}

function recordControllerChange(name: string, patches: unknown): void {
  if (!capturing()) {
    return;
  }
  const list = Array.isArray(patches) ? patches : [];
  changeCounter += 1;
  emit(
    {
      k: 'ctl',
      id: changeCounter,
      ts: Date.now(),
      name,
      count: list.length,
      paths: list
        .slice(0, 20)
        .map((patch: { path?: Path }) => (patch.path ?? []).join('.')),
      patches: encodePatches(list),
    },
    1500,
  );
}

function syncControllerSubscriptions(): void {
  try {
    const engine = getEngine();
    const messenger = engine.controllerMessenger;
    if (messenger === subscribedMessenger) {
      return;
    }
    subscribedMessenger = messenger;
    for (const [key, controller] of controllerEntries()) {
      try {
        messenger.subscribe(
          `${controller.name ?? key}:stateChange`,
          (_state: unknown, patches: unknown) =>
            recordControllerChange(key, patches),
        );
      } catch {
        // Not every Engine context entry publishes state changes.
      }
    }
  } catch {
    // Engine is not up yet: the next sync tries again.
  }
}

function requireController(name: string): ControllerLike {
  const controller = getEngine().context[name];
  if (!controller) {
    throw new Error(`Unknown controller: ${name}`);
  }
  return controller;
}

function listMethods(controller: object): string[] {
  const names = new Set<string>();
  let proto = Object.getPrototypeOf(controller);
  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (
        name !== 'constructor' &&
        !name.startsWith('_') &&
        typeof Object.getOwnPropertyDescriptor(proto, name)?.value ===
          'function'
      ) {
        names.add(name);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return [...names].sort();
}

function evalScope(): Dict {
  const scope: Dict = {
    Engine: undefined,
    ctl: undefined,
    messenger: undefined,
    store: undefined,
    dispatch: undefined,
    getState: undefined,
    nav: undefined,
    RN: require('react-native'),
  };
  try {
    const engine = getEngine();
    scope.Engine = engine;
    scope.ctl = engine.context;
    scope.messenger = engine.controllerMessenger;
  } catch {
    // Engine not up yet: code touching it gets undefined.
  }
  try {
    const store = getStore();
    scope.store = store;
    scope.dispatch = store.dispatch;
    scope.getState = store.getState;
  } catch {
    // Store not up yet.
  }
  try {
    const navigationService = getNavigationService();
    if (navigationService.getCurrentRoute()) {
      scope.nav = navigationService.navigation;
    }
  } catch {
    // Navigation not up yet.
  }
  return scope;
}

function compile(
  code: string,
  names: string[],
): (...args: unknown[]) => unknown {
  // Tries expression before statements, so `getState().user` returns its value without `return`.
  const bodies = [
    `return (async () => { return (\n${code}\n); })();`,
    `return (async () => {\n${code}\n})();`,
    `return (\n${code}\n);`,
    code,
  ];
  let lastError: unknown;
  for (const body of bodies) {
    try {
      return new Function(...names, body) as (...args: unknown[]) => unknown;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const commands: Record<string, (args: Dict) => unknown> = {
  info: () => buildInfo(),

  config: (args) => {
    if (typeof args.paused === 'boolean') {
      paused = args.paused;
    }
    if (typeof args.captureFrames === 'boolean') {
      captureFrames = args.captureFrames;
    }
    return buildInfo();
  },

  reload: () => {
    // Long enough for the answer to reach the server before the socket closes.
    setTimeout(() => DevSettings.reload(), 400);
    return true;
  },

  'ctl.list': () =>
    controllerEntries()
      .map(([name, controller]) => ({
        name,
        keys: Object.keys(controller.state as object).length,
        readOnly: READ_ONLY_CONTROLLERS.has(name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),

  'ctl.get': ({ name, path, depth }) => {
    const value = getAt(
      requireController(String(name)).state,
      (path as Path) ?? [],
    );
    return encode(value, { ...READ_ENCODE, depth: Number(depth ?? 3) });
  },

  'ctl.set': ({ name, path, value }) => {
    const key = String(name);
    if (READ_ONLY_CONTROLLERS.has(key)) {
      throw new Error(
        `${key} is read-only here. Use Run if you really need to.`,
      );
    }
    const controller = requireController(key);
    if (typeof controller.update !== 'function') {
      throw new Error(`${key} has no update method`);
    }
    controller.update((draft) => assignIn(draft, path as Path, value));
    return encode(getAt(controller.state, path as Path), READ_ENCODE);
  },

  'ctl.methods': ({ name }) => listMethods(requireController(String(name))),

  'ctl.call': async ({ name, method, args }) => {
    const controller = requireController(String(name)) as unknown as Record<
      string,
      (...params: unknown[]) => unknown
    >;
    if (typeof controller[String(method)] !== 'function') {
      throw new Error(`${String(name)} has no method ${String(method)}`);
    }
    const result = await controller[String(method)](
      ...((args as unknown[]) ?? []),
    );
    return encode(result, RESULT_ENCODE);
  },

  'redux.get': ({ path, depth }) =>
    encode(getAt(getStore().getState(), (path as Path) ?? []), {
      ...READ_ENCODE,
      depth: Number(depth ?? 3),
    }),

  'redux.set': ({ path, value }) => {
    const store = getStore();
    store.dispatch({ type: SET_ACTION_TYPE, path, value });
    return encode(getAt(store.getState(), path as Path), READ_ENCODE);
  },

  'redux.dispatch': ({ action }) =>
    encode(getStore().dispatch(action), RESULT_ENCODE),

  'state.search': ({ source, name, query, limit }) => {
    const max = Number(limit ?? 200);
    const results: { path: Path; preview: string; name?: string }[] = [];
    if (source === 'redux') {
      searchState(getStore().getState(), String(query), [], max, results);
      return results;
    }
    const entries: [string, ControllerLike][] = name
      ? [[String(name), requireController(String(name))]]
      : controllerEntries();
    for (const [key, controller] of entries) {
      const start = results.length;
      searchState(controller.state, String(query), [], max, results);
      for (let index = start; index < results.length; index += 1) {
        results[index].name = key;
      }
    }
    return results;
  },

  eval: async ({ code }) => {
    const scope = evalScope();
    const names = Object.keys(scope);
    const fn = compile(String(code), names);
    const result = await fn(...names.map((key) => scope[key]));
    return encode(result, RESULT_ENCODE);
  },

  // Walks properties only, so asking for completions never runs the typed code.
  complete: ({ expr }) => {
    const chain = String(expr);
    if (!PLAIN_PROPERTY_CHAIN.test(chain)) {
      return [];
    }
    const scope = evalScope();
    const [first, ...rest] = chain.split('.');
    let value: unknown = first in scope ? scope[first] : g[first];
    for (const key of rest) {
      value = (value as Dict | null | undefined)?.[key];
    }
    const names = new Set<string>();
    let current: unknown = value;
    while (
      current !== null &&
      current !== undefined &&
      current !== Object.prototype &&
      current !== Function.prototype &&
      names.size < MAX_COMPLETIONS
    ) {
      Object.getOwnPropertyNames(Object(current)).forEach((name) =>
        names.add(name),
      );
      current = Object.getPrototypeOf(Object(current));
    }
    names.delete('constructor');
    return [...names].sort();
  },

  // Uses the patched fetch, so the new request shows up like any other.
  'net.replay': async ({ url, method, headers, body }) => {
    const verb = String(method ?? 'GET').toUpperCase();
    const startedAt = Date.now();
    const response = await g.fetch(String(url), {
      method: verb,
      headers: headers as Record<string, string> | undefined,
      body:
        verb === 'GET' || verb === 'HEAD' || body === undefined || body === null
          ? undefined
          : String(body),
    });
    return {
      status: response.status,
      ms: Date.now() - startedAt,
      url: String(url),
    };
  },
};

async function handleCommand(raw: string): Promise<void> {
  let id: unknown;
  try {
    const message = JSON.parse(raw) as {
      t?: string;
      id?: unknown;
      cmd?: string;
      args?: Dict;
    };
    if (message.t !== 'cmd') {
      return;
    }
    id = message.id;
    const handler = commands[String(message.cmd)];
    if (!handler) {
      throw new Error(`Unknown command: ${message.cmd}`);
    }
    const value = await handler(message.args ?? {});
    socket?.send(JSON.stringify({ t: 'res', id, ok: true, value }));
  } catch (error) {
    const failure = error as Error;
    socket?.send(
      JSON.stringify({
        t: 'res',
        id,
        ok: false,
        error: {
          name: failure?.name,
          message: failure?.message ?? String(error),
          stack: failure?.stack,
        },
      }),
    );
  }
}

function metroHost(): string | undefined {
  try {
    const sourceCode = NativeModules.SourceCode as {
      scriptURL?: string;
      getConstants?: () => { scriptURL?: string };
    };
    const scriptUrl =
      sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL;
    return scriptUrl?.match(/^[a-z]+:\/\/([^:/]+)/i)?.[1];
  } catch {
    return undefined;
  }
}

function hostCandidates(): string[] {
  const hosts = [metroHost()];
  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }
  hosts.push('localhost');
  return [...new Set(hosts.filter((host): host is string => Boolean(host)))];
}

function buildInfo(): Dict {
  let route: string | undefined;
  let routeParams: unknown;
  let unlocked: boolean | undefined;
  try {
    const current = getNavigationService().getCurrentRoute();
    route = current?.name;
    routeParams = current?.params
      ? encode(current.params, DIFF_ENCODE)
      : undefined;
  } catch {
    route = undefined;
  }
  try {
    const keyring = getEngine().context.KeyringController as unknown as {
      isUnlocked: () => boolean;
    };
    unlocked = keyring.isUnlocked();
  } catch {
    unlocked = undefined;
  }
  return {
    session,
    platform: Platform.OS,
    osVersion: Platform.Version,
    appVersion: packageJson.version,
    route,
    routeParams,
    unlocked,
    paused,
    captureFrames,
    host: activeHost,
    queued: queue.length,
    dropped,
  };
}

function connect(): void {
  if (!OriginalWebSocket) {
    return;
  }
  const hosts = hostCandidates();
  const host = hosts[candidateIndex % hosts.length];
  candidateIndex += 1;
  try {
    const next = new OriginalWebSocket(
      `ws://${host}:${PORT}/app?session=${session}`,
    );
    socket = next;
    let closed = false;
    next.onopen = () => {
      activeHost = host;
      candidateIndex -= 1;
      next.send(JSON.stringify({ t: 'info', info: buildInfo() }));
    };
    next.onmessage = (event) => {
      if (typeof event.data === 'string') {
        handleCommand(event.data).catch(() => undefined);
      }
    };
    next.onerror = () => {
      next.close();
    };
    next.onclose = () => {
      // A failed connection can report close more than once: keep one reconnect loop.
      if (closed) {
        return;
      }
      closed = true;
      if (socket === next) {
        socket = null;
      }
      if (activeHost === host) {
        activeHost = null;
      }
      setTimeout(connect, RECONNECT_MS);
    };
  } catch {
    setTimeout(connect, RECONNECT_MS);
  }
}

function trackRoute(): void {
  if (!capturing()) {
    return;
  }
  try {
    const route = getNavigationService().getCurrentRoute();
    if (route?.name && route.name !== lastRouteName) {
      lastRouteName = route.name;
      logCounter += 1;
      emit(
        {
          k: 'log',
          id: logCounter,
          ts: Date.now(),
          level: 'nav',
          text: `Route: ${route.name}`,
          args: route.params ? encode([route.params], LOG_ENCODE) : undefined,
        },
        600,
      );
    }
  } catch {
    // Navigation is not up yet: the next poll tries again.
  }
}

function install(): void {
  if (g.__tempDevDashInstalled) {
    return;
  }
  g.__tempDevDashInstalled = true;
  installed = true;

  g.fetch = wrapFetch(g.fetch);
  patchXhr();
  patchWebSocket();
  patchConsole();

  setInterval(flush, FLUSH_MS);
  setInterval(() => {
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({ t: 'info', info: buildInfo() }));
    }
  }, INFO_MS);
  setInterval(syncControllerSubscriptions, CONTROLLER_SYNC_MS);
  setInterval(trackRoute, ROUTE_POLL_MS);
  // The app installs its own global handler during startup, so wrap it afterwards.
  setTimeout(patchErrorHandler, 3000);
  connect();
}

if (__DEV__ && !hasTestOverrides && typeof jest === 'undefined') {
  install();
}
