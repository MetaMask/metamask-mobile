/* eslint-disable no-console, @typescript-eslint/no-explicit-any -- dev-only tooling that patches globals */
import { Platform } from 'react-native';
import { captureView, type FoxyView } from './FoxyView';

/**
 * Foxy bridge (developer tooling, `__DEV__` + opt-in only).
 *
 * Wraps `globalThis.fetch` and `XMLHttpRequest` and streams every request, with
 * the JS call stack that initiated it, to the local server in
 * `scripts/foxy/`. It must be installed AFTER `NitroFetchSetup`
 * (which replaces `global.fetch`) and BEFORE the Engine boots, so that the
 * requests made during a fresh-install launch are not missed. See `install.ts`.
 *
 * Request bodies and header values are intentionally NOT recorded.
 */

const DEFAULT_URL = 'ws://localhost:8098/app';
const RECONNECT_DELAY_MS = 2000;
const MAX_QUEUE = 10000;
const MAX_FRAMES = 40;
const MAX_BODY_PREVIEW = 4000;
// Header values that can carry credentials are never sent to the dashboard.
const SENSITIVE_HEADER =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-auth.*|.*token.*|.*secret.*|.*signature.*|.*password.*)$/i;

type TransportName = 'fetch' | 'xhr';

type AuditMessage =
  | {
      type: 'hello';
      s: string;
      startedAt: number;
      platform: string;
    }
  | {
      type: 'request';
      s: string;
      id: number;
      ts: number;
      transport: TransportName;
      method: string;
      url: string;
      initiator: string[];
      /** The screen the app was showing when the request was made. */
      view: FoxyView;
      headers?: Record<string, string>;
      bodyBytes?: number;
      bodyPreview?: string;
    }
  | {
      type: 'response';
      s: string;
      id: number;
      ts: number;
      status?: number;
      ok?: boolean;
      durationMs: number;
      sizeBytes?: number;
      error?: string;
      statusText?: string;
      headers?: Record<string, string>;
      bodyPreview?: string;
    };

let installed = false;

/** Normalizes `Headers`, `[k, v][]` or a plain object into a redacted record. */
export function headersToRecord(headers: unknown): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  const put = (name: unknown, value: unknown) => {
    const key = String(name).toLowerCase();
    out[key] = SENSITIVE_HEADER.test(key) ? '[redacted]' : String(value);
  };
  try {
    const h = headers as any;
    if (typeof h.forEach === 'function' && !Array.isArray(h)) {
      h.forEach((value: unknown, name: unknown) => put(name, value));
    } else if (Array.isArray(h)) {
      h.forEach((pair) => put(pair[0], pair[1]));
    } else {
      Object.keys(h).forEach((name) => put(name, h[name]));
    }
  } catch {
    return undefined;
  }
  return Object.keys(out).length ? out : undefined;
}

const preview = (text: string): string =>
  text.length > MAX_BODY_PREVIEW ? `${text.slice(0, MAX_BODY_PREVIEW)}…[truncated ${text.length - MAX_BODY_PREVIEW} chars]` : text;

export function installFoxy(
  dashboardUrl: string = process.env.FOXY_URL || DEFAULT_URL,
): void {
  if (installed) return;
  installed = true;

  const captureBodies = process.env.FOXY_BODIES === 'true';
  const sessionId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const startedAt = Date.now();
  const queue: string[] = [];
  let ws: WebSocket | null = null;
  let nextId = 1;

  const dashboardHostPort = (() => {
    try {
      return new URL(dashboardUrl.replace(/^ws/, 'http')).host;
    } catch {
      return 'localhost:8098';
    }
  })();

  const isIgnored = (url: string): boolean =>
    !/^https?:/i.test(url) ||
    url.includes(dashboardHostPort) ||
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):8081\b/.test(url);

  const send = (message: AuditMessage): void => {
    let raw: string;
    try {
      raw = JSON.stringify(message);
    } catch {
      return;
    }
    if (ws && ws.readyState === 1) {
      ws.send(raw);
      return;
    }
    queue.push(raw);
    if (queue.length > MAX_QUEUE) queue.shift();
  };

  const hello = (): AuditMessage => ({
    type: 'hello',
    s: sessionId,
    startedAt,
    platform: Platform.OS,
  });

  const connect = (): void => {
    try {
      ws = new WebSocket(dashboardUrl);
      ws.onopen = () => {
        console.log(`[Foxy] connected to ${dashboardUrl}`);
        ws?.send(JSON.stringify(hello()));
        while (queue.length > 0 && ws?.readyState === 1) {
          ws.send(queue.shift() as string);
        }
      };
      ws.onclose = () => {
        ws = null;
        setTimeout(connect, RECONNECT_DELAY_MS);
      };
      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      ws = null;
      setTimeout(connect, RECONNECT_DELAY_MS);
    }
  };

  /**
   * Synchronous JS stack at the point the request was issued. Async frames
   * (before an `await`) are not available, so for polled requests this shows the
   * polling function, which is usually enough to name the controller.
   */
  const captureInitiator = (): string[] => {
    const errorCtor = Error as any;
    const previousLimit = errorCtor.stackTraceLimit;
    const previousPrepare = errorCtor.prepareStackTrace;
    let structured: any[] | null = null;
    let text = '';
    try {
      errorCtor.stackTraceLimit = 80;
      // Ask the engine for structured call sites. Something in the app overrides
      // `Error.prepareStackTrace` at times (stacks came back as "[object CallSite]"),
      // so take control of it for this one synchronous read.
      errorCtor.prepareStackTrace = (_error: unknown, sites: unknown) => sites;
      const stack: unknown = new Error().stack;
      if (Array.isArray(stack)) structured = stack;
      else text = String(stack ?? '');
    } catch {
      // fall through to whatever we have
    } finally {
      try {
        errorCtor.stackTraceLimit = previousLimit;
        errorCtor.prepareStackTrace = previousPrepare;
      } catch {
        // ignore
      }
    }

    let lines: string[];
    if (structured) {
      lines = structured.map((site) => {
        try {
          if (site.isNative?.()) return `at ${site.getFunctionName?.() ?? '?'} (native)`;
          const fn = site.getFunctionName?.() || 'anonymous';
          return `at ${fn} (${site.getFileName?.() ?? ''}:${site.getLineNumber?.() ?? 0}:${site.getColumnNumber?.() ?? 0})`;
        } catch {
          return 'at ? (native)';
        }
      });
    } else {
      lines = text.split('\n').slice(1);
    }
    return lines
      .map((line) => line.trim())
      .filter((line) => line && !line.includes('FoxyBridge'))
      .slice(0, MAX_FRAMES);
  };

  const urlOf = (input: unknown): string => {
    try {
      if (typeof input === 'string') return input;
      if (input instanceof URL) return input.href;
      return (input as { url?: string })?.url ?? '';
    } catch {
      return '';
    }
  };

  // ---- fetch ---------------------------------------------------------------
  //
  // Why two layers: `shim.js` installs `proxiedFetch`, an async wrapper that does
  // `await mockReady` and, once that settles, re-installs itself on TOP of
  // whatever `global.fetch` is. A wrapper that stays inside it only runs after
  // the `await`, when the real caller's stack is gone. So the first wrapper is
  // `inner`, and we keep polling for a foreign function in `global.fetch` and wrap
  // it as `outer`. The outer one sees the real call site and records the
  // request; the inner one then skips the matching forwarded call.
  const WRAPPED = '__foxyWrapped';
  const PENDING_TTL_MS = 30000;
  /** `${METHOD} ${url}` -> timestamps of outer-recorded calls not yet forwarded to the inner layer. */
  const pendingOuter = new Map<string, number[]>();

  const claimOuter = (key: string): boolean => {
    const pending = pendingOuter.get(key);
    if (!pending) return false;
    const now = Date.now();
    while (pending.length > 0 && now - pending[0] > PENDING_TTL_MS) pending.shift();
    if (pending.length === 0) {
      pendingOuter.delete(key);
      return false;
    }
    pending.shift();
    if (pending.length === 0) pendingOuter.delete(key);
    return true;
  };

  const wrapFetch = (
    target: typeof fetch,
    role: 'inner' | 'outer',
  ): typeof fetch => {
    const wrapper = function foxyFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ) {
      const url = urlOf(input);
      if (isIgnored(url)) {
        return target.call(globalThis, input, init);
      }
      const method = (
        init?.method ||
        (input as { method?: string })?.method ||
        'GET'
      ).toUpperCase();
      const key = `${method} ${url}`;

      if (role === 'inner') {
        // Already recorded by the outer layer (with the real call site).
        if (claimOuter(key)) return target.call(globalThis, input, init);
      } else {
        const pending = pendingOuter.get(key) ?? [];
        pending.push(Date.now());
        pendingOuter.set(key, pending);
      }

      const id = nextId++;
      const startedMs = Date.now();
      send({
        type: 'request',
        s: sessionId,
        id,
        ts: startedMs,
        transport: 'fetch',
        method,
        url,
        initiator: captureInitiator(),
        view: captureView(),
        headers: headersToRecord(init?.headers ?? (input as Request)?.headers),
        ...(typeof init?.body === 'string'
          ? {
              bodyBytes: init.body.length,
              ...(captureBodies ? { bodyPreview: preview(init.body) } : {}),
            }
          : {}),
      });
      const promise = target.call(globalThis, input, init);
      promise.then(
        (response) => {
          const length = Number(response.headers?.get?.('content-length'));
          const sendResponse = (bodyPreview?: string) =>
            send({
              type: 'response',
              s: sessionId,
              id,
              ts: Date.now(),
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              durationMs: Date.now() - startedMs,
              sizeBytes: Number.isFinite(length) ? length : undefined,
              headers: headersToRecord(response.headers),
              bodyPreview,
            });
          if (captureBodies && typeof response.clone === 'function') {
            // Read a clone so the app's own response body is untouched.
            response
              .clone()
              .text()
              .then(
                (text) => sendResponse(preview(text)),
                () => sendResponse(),
              );
          } else {
            sendResponse();
          }
        },
        (error: unknown) => {
          send({
            type: 'response',
            s: sessionId,
            id,
            ts: Date.now(),
            durationMs: Date.now() - startedMs,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      );
      return promise;
    } as typeof fetch;
    (wrapper as any)[WRAPPED] = true;
    return wrapper;
  };

  if (typeof globalThis.fetch === 'function') {
    globalThis.fetch = wrapFetch(globalThis.fetch, 'inner');
    // Re-wrap anything installed on top of us later (e.g. shim.js `proxiedFetch`).
    setInterval(() => {
      const current = globalThis.fetch as any;
      if (typeof current === 'function' && !current[WRAPPED]) {
        globalThis.fetch = wrapFetch(current, 'outer');
      }
    }, 25);
  }

  // ---- XMLHttpRequest (axios, some SDKs) -------------------------------------
  if (typeof XMLHttpRequest !== 'undefined') {
    const proto = XMLHttpRequest.prototype as any;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    const originalSetRequestHeader = proto.setRequestHeader;

    proto.setRequestHeader = function foxySetHeader(
      this: any,
      name: string,
      value: string,
    ) {
      try {
        (this.__foxyHeaders ??= []).push([name, value]);
      } catch {
        // ignore
      }
      return originalSetRequestHeader.call(this, name, value);
    };

    proto.open = function foxyOpen(
      this: any,
      method: string,
      url: string,
      ...rest: unknown[]
    ) {
      this.__foxy = { method: String(method).toUpperCase(), url };
      return originalOpen.call(this, method, url, ...rest);
    };

    proto.send = function foxySend(this: any, body?: unknown) {
      const meta = this.__foxy as
        | { method: string; url: string }
        | undefined;
      if (meta && !isIgnored(String(meta.url))) {
        const id = nextId++;
        const startedMs = Date.now();
        send({
          type: 'request',
          s: sessionId,
          id,
          ts: startedMs,
          transport: 'xhr',
          method: meta.method,
          url: String(meta.url),
          initiator: captureInitiator(),
          view: captureView(),
          headers: headersToRecord(this.__foxyHeaders),
          ...(typeof body === 'string'
            ? {
                bodyBytes: body.length,
                ...(captureBodies ? { bodyPreview: preview(body) } : {}),
              }
            : {}),
        });
        this.addEventListener('loadend', () => {
          let responseHeaders: Record<string, string> | undefined;
          try {
            const raw: string = this.getAllResponseHeaders?.() ?? '';
            responseHeaders = headersToRecord(
              raw
                .trim()
                .split(/[\r\n]+/)
                .filter(Boolean)
                .map((line) => {
                  const i = line.indexOf(':');
                  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
                }),
            );
          } catch {
            // ignore
          }
          let bodyPreview: string | undefined;
          try {
            if (
              captureBodies &&
              (this.responseType === '' || this.responseType === 'text')
            ) {
              bodyPreview = preview(String(this.responseText ?? ''));
            }
          } catch {
            // ignore
          }
          send({
            type: 'response',
            s: sessionId,
            id,
            ts: Date.now(),
            status: this.status || undefined,
            statusText: this.statusText || undefined,
            ok: this.status >= 200 && this.status < 300,
            durationMs: Date.now() - startedMs,
            error: this.status ? undefined : 'network error',
            headers: responseHeaders,
            bodyPreview,
          });
        });
      }
      return originalSend.call(this, body);
    };
  }

  connect();
  console.log(
    `[Foxy] capturing fetch/XHR, session ${sessionId} -> ${dashboardUrl}`,
  );
}
