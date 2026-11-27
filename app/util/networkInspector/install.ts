/**
 * Dev-only network inspector. Reports every request the JS side makes to the
 * dashboard served by Metro (scripts/network-inspector/server.js), together with
 * the raw stack of whoever called, so engineers can see what fired it.
 *
 * Covered: `global.fetch` (nitro-fetch), XMLHttpRequest (axios and friends),
 * `global.WebSocket`. Not covered, because they never touch these globals:
 * `expo/fetch` imported directly (bridge-controller SSE quotes) and native-side
 * networking (WebView, native SDKs).
 * shortcut: those two gaps, upgrade by wrapping the call sites if needed.
 */
import { Platform, TurboModuleRegistry } from 'react-native';
import { hasTestOverrides } from '../test/utils';
import {
  headersToObject,
  isTextContentType,
  parseRawHeaders,
  redactHeaders,
  truncate,
} from './redact';

interface InspectorEvent {
  id: string;
  [field: string]: unknown;
}
type Report = (event: InspectorEvent) => void;
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

interface FetchLayer {
  active: boolean;
  wrapper: typeof fetch;
}

interface XhrMeta {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
}

const INGEST_PATH = '__network-inspector/ingest';
const FLUSH_MS = 200;
const REWRAP_MS = 1000;
const MAX_QUEUE = 1000;
const MAX_REQUEST_BODY = 20_000;
const MAX_RESPONSE_BODY = 100_000;
const MAX_WS_PAYLOAD = 2_000;
const MIN_STACK_FRAMES = 50;
const SESSION = Math.random().toString(36).slice(2, 8);

let counter = 0;

function nextId(): string {
  counter += 1;
  return `${SESSION}-${counter}`;
}

interface CallSite {
  getFunctionName(): string | null;
  getFileName(): string | null;
  getLineNumber(): number | null;
  getColumnNumber(): number | null;
}

// Under SES lockdown `error.stack` is `at [object CallSite]` on Hermes, so frames
// are read from the structured call sites through a temporary prepareStackTrace.
function formatCallSites(_error: unknown, sites: CallSite[]): string {
  return sites
    .map((site) => {
      const name = site.getFunctionName() ?? '<anonymous>';
      return `    at ${name} (${site.getFileName()}:${site.getLineNumber()}:${site.getColumnNumber()})`;
    })
    .join('\n');
}

function captureStack(): string {
  const errorWithHook = Error as unknown as { prepareStackTrace?: unknown };
  const previous = errorWithHook.prepareStackTrace;
  try {
    errorWithHook.prepareStackTrace = formatCallSites;
    const stack = new Error().stack;
    return typeof stack === 'string' ? stack : '';
  } catch {
    return '';
  } finally {
    errorWithHook.prepareStackTrace = previous;
  }
}

function getDevServerOrigin(): string | undefined {
  const sourceCode = TurboModuleRegistry.get<{
    getConstants(): { scriptURL?: string };
  }>('SourceCode');
  const scriptUrl = sourceCode?.getConstants().scriptURL;
  return scriptUrl?.match(/^https?:\/\/[^/]+\//)?.[0];
}

function getFetchUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  // A Request-like input; nitro's can lack `url`.
  return (input as { url?: string }).url ?? '';
}

function describeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return truncate(body, MAX_REQUEST_BODY);
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return `[binary ${body.byteLength} bytes]`;
  if (ArrayBuffer.isView(body)) return `[binary ${body.byteLength} bytes]`;
  return '[non-text body]';
}

function describePayload(data: unknown): string {
  if (typeof data === 'string') return truncate(data, MAX_WS_PAYLOAD);
  return describeBody(data) ?? '';
}

function startFields(kind: string, url: string, method: string) {
  return {
    kind,
    url,
    method,
    startedAt: Date.now(),
    session: SESSION,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    stack: captureStack(),
  };
}

function createReporter(origin: string): Report {
  let queue: InspectorEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flush() {
    timer = undefined;
    const events = queue;
    queue = [];
    if (events.length === 0) return;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', origin + INGEST_PATH);
      xhr.setRequestHeader('content-type', 'application/json');
      xhr.send(JSON.stringify({ events }));
    } catch {
      // Dashboard unreachable: the inspector must never affect the app.
    }
  }

  return (event) => {
    if (queue.length >= MAX_QUEUE) return;
    queue.push(event);
    timer ??= setTimeout(flush, FLUSH_MS);
  };
}

function guard(work: () => void): void {
  try {
    work();
  } catch {
    // Instrumentation failures must never change the request outcome.
  }
}

async function reportFetchBody(
  report: Report,
  id: string,
  response: Response,
  startMs: number,
): Promise<void> {
  const contentType = response.headers.get('content-type');
  if (!isTextContentType(contentType)) {
    report({
      id,
      resBody: `[binary ${contentType}]`,
      durationMs: Math.round(performance.now() - startMs),
      done: true,
    });
    return;
  }
  const text = await response.clone().text();
  report({
    id,
    resBody: truncate(text, MAX_RESPONSE_BODY),
    resSize: text.length,
    durationMs: Math.round(performance.now() - startMs),
    done: true,
  });
}

function layerFetch(
  report: Report,
  isIgnored: (url: string) => boolean,
  previous?: FetchLayer,
): FetchLayer {
  // The superseded layer keeps forwarding calls but stops reporting, so a
  // request that passes through both is reported once, with the outer stack.
  if (previous) previous.active = false;
  const originalFetch = global.fetch;
  const layer = { active: true } as FetchLayer;

  // Not async on purpose: callers must get the original promise back untouched.
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  layer.wrapper = function inspectedFetch(input: FetchInput, init?: FetchInit) {
    const url = getFetchUrl(input);
    const pending = originalFetch(input, init);
    if (!layer.active || isIgnored(url)) return pending;

    const id = nextId();
    const startMs = performance.now();
    guard(() => {
      const request =
        typeof input === 'object' ? (input as Request) : undefined;
      const method = init?.method ?? request?.method ?? 'GET';
      report({
        id,
        ...startFields('fetch', url, method),
        reqHeaders: redactHeaders(
          headersToObject(init?.headers ?? request?.headers),
        ),
        reqBody: describeBody(init?.body),
      });
    });

    pending.then(
      (response) =>
        guard(() => {
          report({
            id,
            status: response.status,
            statusText: response.statusText,
            resHeaders: redactHeaders(headersToObject(response.headers)),
            ttfbMs: Math.round(performance.now() - startMs),
          });
          const isStream = (init as { stream?: boolean } | undefined)?.stream;
          if (isStream) {
            report({ id, done: true });
            return;
          }
          reportFetchBody(report, id, response, startMs).catch(() =>
            report({ id, done: true }),
          );
        }),
      (error) =>
        guard(() =>
          report({
            id,
            error: String(error?.message ?? error),
            durationMs: Math.round(performance.now() - startMs),
            done: true,
          }),
        ),
    );
    return pending;
  };

  global.fetch = layer.wrapper;
  return layer;
}

function wrapFetch(report: Report, isIgnored: (url: string) => boolean) {
  let layer = layerFetch(report, isIgnored);
  // shim.js re-installs its async `proxiedFetch` on top of global.fetch once its
  // mock-server check settles. It awaits before calling us, and Hermes has no
  // async stacks, so the caller would be lost: stay outermost instead.
  // shortcut: polling, upgrade if something else must wrap fetch after us.
  setInterval(() => {
    if (global.fetch === layer.wrapper) return;
    layer = layerFetch(report, isIgnored, layer);
  }, REWRAP_MS);
}

function wrapXhr(report: Report, isIgnored: (url: string) => boolean) {
  const proto = XMLHttpRequest.prototype;
  // Monkey patching needs the originals; each is always invoked with `.call(this, …)`.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalOpen = proto.open;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalSend = proto.send;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalSetHeader = proto.setRequestHeader;
  const metas = new WeakMap<XMLHttpRequest, XhrMeta>();

  proto.open = function open(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlText = String(url);
    if (!isIgnored(urlText)) {
      metas.set(this, { id: nextId(), method, url: urlText, headers: {} });
    }
    return (originalOpen as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest,
    );
  };

  proto.setRequestHeader = function setRequestHeader(
    this: XMLHttpRequest,
    name: string,
    value: string,
  ) {
    const meta = metas.get(this);
    if (meta) meta.headers[name] = value;
    return originalSetHeader.call(this, name, value);
  };

  proto.send = function send(this: XMLHttpRequest, body?: unknown) {
    const meta = metas.get(this);
    if (meta) {
      guard(() => trackXhr(report, this, meta, body));
    }
    return originalSend.call(this, body as never);
  };
}

function trackXhr(
  report: Report,
  xhr: XMLHttpRequest,
  meta: XhrMeta,
  body: unknown,
): void {
  const startMs = performance.now();
  report({
    id: meta.id,
    ...startFields('xhr', meta.url, meta.method),
    reqHeaders: redactHeaders(meta.headers),
    reqBody: describeBody(body),
  });
  xhr.addEventListener('loadend', () =>
    guard(() => {
      const isText = xhr.responseType === '' || xhr.responseType === 'text';
      const resBody = isText
        ? truncate(xhr.responseText ?? '', MAX_RESPONSE_BODY)
        : `[${xhr.responseType}]`;
      report({
        id: meta.id,
        status: xhr.status,
        resHeaders: redactHeaders(parseRawHeaders(xhr.getAllResponseHeaders())),
        resBody,
        error: xhr.status === 0 ? 'network error or aborted' : undefined,
        durationMs: Math.round(performance.now() - startMs),
        done: true,
      });
    }),
  );
}

function wrapWebSocket(report: Report, isIgnored: (url: string) => boolean) {
  const OriginalWebSocket = global.WebSocket;

  class InspectedWebSocket extends OriginalWebSocket {
    private readonly inspectorId: string | undefined;

    constructor(
      url: string,
      protocols?: string | string[],
      options?: ConstructorParameters<typeof OriginalWebSocket>[2],
    ) {
      super(url, protocols, options);
      if (isIgnored(url)) return;
      const id = nextId();
      this.inspectorId = id;
      guard(() => {
        report({ id, ...startFields('ws', url, 'WS') });
        const track = (dir: string, data?: string, done = false) =>
          report({
            id,
            done: done || undefined,
            wsEvent: { dir, t: Date.now(), data },
          });
        this.addEventListener('open', () => track('open'));
        this.addEventListener('message', (event: { data?: unknown }) =>
          track('in', describePayload(event.data)),
        );
        this.addEventListener('error', () => track('error'));
        this.addEventListener('close', (event: { code?: number }) =>
          track('close', `code ${event.code}`, true),
        );
      });
    }

    send(data: Parameters<WebSocket['send']>[0]) {
      const id = this.inspectorId;
      if (id) {
        guard(() =>
          report({
            id,
            wsEvent: { dir: 'out', t: Date.now(), data: describePayload(data) },
          }),
        );
      }
      super.send(data);
    }
  }

  global.WebSocket = InspectedWebSocket as unknown as typeof WebSocket;
}

function raiseStackLimit(): void {
  // Deep component trees need more than the default frames to reach app code.
  try {
    const errorWithLimit = Error as unknown as { stackTraceLimit?: number };
    errorWithLimit.stackTraceLimit = Math.max(
      errorWithLimit.stackTraceLimit ?? 0,
      MIN_STACK_FRAMES,
    );
  } catch {
    // Frozen intrinsics: keep the default limit.
  }
}

export function installNetworkInspector(): void {
  if (!__DEV__ || hasTestOverrides) return;
  const origin = getDevServerOrigin();
  if (!origin) return;

  // Metro HMR / debugger sockets and our own reporting must stay invisible.
  const wsOrigin = origin.replace(/^http/, 'ws');
  const isIgnored = (url: string) =>
    url.startsWith(origin) || url.startsWith(wsOrigin);

  raiseStackLimit();
  const report = createReporter(origin);
  wrapFetch(report, isIgnored);
  wrapXhr(report, isIgnored);
  wrapWebSocket(report, isIgnored);
}
