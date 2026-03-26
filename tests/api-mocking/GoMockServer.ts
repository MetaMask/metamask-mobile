// tests/api-mocking/GoMockServer.ts
/* eslint-disable import-x/no-nodejs-modules */

import { spawn, ChildProcess } from 'child_process';
import http, { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import axios from 'axios';
import {
  MockEventsObject,
  MockApiEndpoint,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework';
import PortManager, { ResourceType } from '../framework/PortManager';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../framework/Constants';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';
import {
  MockttpCompat,
  MockttpCallback,
  MockttpPredicate,
  MockttpCompatTerminalChain,
} from './MockttpCompat';

// ── SRP identifier map ─────────────────────────────────────────────────────────
// Maps public keys to stable E2E test identifiers. Module-level so identifiers
// are consistent across multiple fixture calls within a single test worker.
const _e2eIdentifierMap = new Map<string, string>();
const E2E_SRP_IDENTIFIER_BASE_KEY = 'MOCK_SRP_IDENTIFIER';

function getE2ESrpIdentifierForPublicKey(publicKey: string): string {
  if (_e2eIdentifierMap.has(publicKey)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return _e2eIdentifierMap.get(publicKey)!;
  }
  const id = `${E2E_SRP_IDENTIFIER_BASE_KEY}_${_e2eIdentifierMap.size + 1}`;
  _e2eIdentifierMap.set(publicKey, id);
  return id;
}

/** Extracts the original target URL from the bridge's synthetic proxy URL. */
function decodeProxiedUrl(syntheticUrl: string): string {
  try {
    return decodeURIComponent(
      new URL(syntheticUrl).searchParams.get('url') ?? '',
    );
  } catch {
    return '';
  }
}

const goArch = process.arch === 'x64' ? 'amd64' : process.arch;
const BINARY_PATH = path.join(
  __dirname,
  '../bin',
  `mock-server-${process.platform}-${goArch}`,
);

// ── Callback Bridge ────────────────────────────────────────────────────────────
//
// The Go proxy forwards unmatched requests to this Node.js HTTP server so that
// tests using .matching(predicate).thenCallback/thenJson/thenReply() work.
// The bridge iterates registered handlers in order; returns X-No-Match: true
// when none accept the request (Go then falls through to the real forwarder).

interface BridgeEntry {
  method: string;
  predicate: MockttpPredicate | null;
  jsonBodyMatcher: Record<string, unknown> | null;
  handler: MockttpCallback;
  customHeaders: Record<string, string> | null;
  /** Higher value = higher priority. Handlers are tried highest-priority-first. */
  priority: number;
}

/** Deep-check that `actual` contains all key-value pairs in `expected`. */
function jsonBodyIncludes(actual: unknown, expected: unknown): boolean {
  if (typeof expected !== 'object' || expected === null) {
    return actual === expected;
  }
  if (typeof actual !== 'object' || actual === null) {
    return false;
  }
  const expMap = expected as Record<string, unknown>;
  const actMap = actual as Record<string, unknown>;
  for (const [key, expVal] of Object.entries(expMap)) {
    if (Array.isArray(expVal)) {
      const actArr = actMap[key];
      if (!Array.isArray(actArr)) return false;
      for (const item of expVal) {
        const match = actArr.some(
          (a) => JSON.stringify(a) === JSON.stringify(item),
        );
        if (!match) return false;
      }
    } else if (!jsonBodyIncludes(actMap[key], expVal)) {
      return false;
    }
  }
  return true;
}

interface SeenBridgeRequest {
  url: string;
  bodyText: string;
  method: string;
}

class CallbackBridge {
  private _server: http.Server | null = null;
  private _handlers: BridgeEntry[] = [];
  private _seenRequests: SeenBridgeRequest[] = [];
  private _port = 0;

  async start(): Promise<void> {
    this._server = http.createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        void this._handleRequest(req, res);
      },
    );
    await new Promise<void>((resolve) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._server!.listen(0, '127.0.0.1', resolve),
    );
    this._port = (this._server.address() as AddressInfo).port;
  }

  stop(): void {
    this._server?.close();
    this._server = null;
    this._handlers = [];
    this._seenRequests = [];
  }

  reset(): void {
    this._handlers = [];
    this._seenRequests = [];
  }

  register(entry: BridgeEntry): void {
    this._handlers.push(entry);
    // Sort descending by priority so higher-priority handlers are tried first.
    // Array.sort is stable in V8, so registration order is preserved within the same priority.
    this._handlers.sort((a, b) => b.priority - a.priority);
  }

  getSeenRequests(): {
    url: string;
    method: string;
    body: {
      getText(): Promise<string | undefined>;
      getJson<T = unknown>(): Promise<T>;
    };
  }[] {
    return this._seenRequests.map(({ url, bodyText }) => ({
      url,
      method: 'POST',
      body: {
        getText: async () => bodyText || undefined,
        getJson: async <T = unknown>(): Promise<T> => {
          if (!bodyText) return undefined as unknown as T;
          try {
            return JSON.parse(bodyText) as T;
          } catch {
            return undefined as unknown as T;
          }
        },
      },
    }));
  }

  get url(): string {
    return `http://127.0.0.1:${this._port}`;
  }

  private async _handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // X-Proxy-URL contains the decoded target URL (e.g. https://storage.api.../path).
    // We reconstruct a synthetic URL so JS predicates that call getDecodedProxiedURL()
    // can extract it correctly: getDecodedProxiedURL does new URL(url).searchParams.get('url').
    const proxyUrl = (req.headers['x-proxy-url'] as string) ?? '';
    const syntheticUrl = `http://proxy/proxy?url=${encodeURIComponent(proxyUrl)}`;
    const method = (req.method ?? 'GET').toUpperCase();
    process.stderr.write(`[Bridge] ${method} ${proxyUrl}\n`);

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve) => req.on('end', resolve));
    const bodyText = Buffer.concat(chunks).toString('utf8');

    // Build a headers map (lowercase keys) forwarded from the original app request
    // via the Go proxy. JS handlers like getSrpIdentifierFromHeaders() need these.
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === 'string') {
        headers[key.toLowerCase()] = val;
      } else if (Array.isArray(val)) {
        headers[key.toLowerCase()] = val.join(', ');
      }
    }

    const mockRequest = {
      url: syntheticUrl,
      path: new URL(syntheticUrl).pathname,
      method,
      headers,
      body: {
        getText: async () => bodyText || undefined,
        // Return undefined (not throw) for empty/non-JSON bodies so that
        // handlers using `body.getJson()` in Promise.all don't crash the bridge.
        getJson: async <T = unknown>(): Promise<T> => {
          if (!bodyText) return undefined as unknown as T;
          try {
            return JSON.parse(bodyText) as T;
          } catch {
            return undefined as unknown as T;
          }
        },
      },
    };

    // Track every request that reaches the bridge so getMockedEndpoints()
    // can surface analytics event payloads to getEventsPayloads().
    this._seenRequests.push({ url: syntheticUrl, bodyText, method });

    for (const entry of this._handlers) {
      if (entry.method !== '*' && entry.method.toUpperCase() !== method)
        continue;

      if (entry.predicate) {
        const matched = await entry.predicate(mockRequest);
        if (!matched) continue;
      }

      if (entry.jsonBodyMatcher !== null) {
        try {
          const parsed: unknown = JSON.parse(bodyText);
          if (!jsonBodyIncludes(parsed, entry.jsonBodyMatcher)) continue;
        } catch {
          continue;
        }
      }

      try {
        const response = await entry.handler(mockRequest);
        const responseBody =
          response.json !== undefined
            ? JSON.stringify(response.json)
            : typeof response.body === 'string'
              ? response.body
              : response.body !== undefined
                ? JSON.stringify(response.body)
                : '';
        const responseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(entry.customHeaders ?? {}),
        };
        res.writeHead(response.statusCode, responseHeaders);
        res.end(responseBody);
      } catch (err) {
        process.stderr.write(
          `[Bridge] handler error for ${method} ${proxyUrl}: ${String(err)}\n`,
        );
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }

    // No handler matched — tell Go to fall through to the real forwarder.
    process.stderr.write(
      `[Bridge] no-match for ${method} ${proxyUrl} (${this._handlers.length} handlers)\n`,
    );
    res.writeHead(204, { 'X-No-Match': 'true' });
    res.end();
  }
}

// ── GoMockServer ───────────────────────────────────────────────────────────────

export default class GoMockServer implements Resource {
  private _process: ChildProcess | null = null;
  private _proxyPort = 0;
  private _controlPort = 0;
  private _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _events: MockEventsObject;
  private _testSpecificMock?: TestSpecificMock;
  private _bridge: CallbackBridge = new CallbackBridge();

  constructor(params: {
    events: MockEventsObject;
    testSpecificMock?: TestSpecificMock;
  }) {
    this._events = params.events;
    this._testSpecificMock = params.testSpecificMock;
  }

  // ── Resource interface ────────────────────────────────────────────────────

  async start(): Promise<void> {
    // _proxyPort is already set by setServerPort() before start() is called
    // (via startResourceWithRetry in FixtureHelper). Only allocate the control port here.
    const controlAllocation = await PortManager.getInstance().allocatePort(
      ResourceType.MOCK_SERVER_CONTROL,
    );
    this._controlPort = controlAllocation.port;

    const portMaps = this._buildPortMaps();

    this._process = spawn(BINARY_PATH, [
      '--proxy-port',
      String(this._proxyPort),
      '--control-port',
      String(this._controlPort),
      ...portMaps,
    ]);

    this._process.stderr?.on('data', (chunk) => {
      process.stderr.write(`[GoMockServer stderr] ${chunk}`);
    });

    this._process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this._serverStatus = ServerStatus.STOPPED;
        console.error(
          `[GoMockServer] binary exited unexpectedly with code ${code}`,
        );
      }
    });

    this._process.on('error', (err) => {
      console.error(`[GoMockServer] failed to start binary: ${err.message}`);
    });

    await this._waitForHealthy();

    // POST static (non-function) default mocks to the control API.
    // These were previously passed as --defaults <json> on the CLI, but that
    // argument can exceed the kernel ARG_MAX limit on Linux CI runners.
    await this._postStaticDefaultMocks(this._events);

    // Start the callback bridge and register its URL with the Go proxy.
    // The proxy forwards unmatched requests to the bridge so JS thenCallback handlers work.
    await this._bridge.start();
    await axios.post(`${this._controlUrl}/mocks/callback-bridge`, {
      url: this._bridge.url,
    });

    if (this._testSpecificMock) {
      await this._testSpecificMock(this._makeCompat());
    }

    // Register function-based DEFAULT_MOCKS as fallback bridge handlers.
    // testSpecificMock handlers (registered above) take priority since the
    // bridge iterates handlers in registration order.
    this._registerFunctionMocksAsBridgeHandlers(this._events);

    this._serverStatus = ServerStatus.STARTED;
  }

  async stop(): Promise<void> {
    this._bridge.stop();
    this._process?.kill('SIGTERM');
    this._process = null;
    this._serverStatus = ServerStatus.STOPPED;
    PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER);
    PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER_CONTROL);
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  setServerPort(port: number): void {
    this._proxyPort = port;
  }

  getServerPort(): number {
    return this._proxyPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  get getServerUrl(): string {
    return `http://localhost:${this._proxyPort}`;
  }

  // ── Mock lifecycle ────────────────────────────────────────────────────────

  async reset(): Promise<void> {
    this._bridge.reset();
    await axios.delete(`${this._controlUrl}/mocks`);
  }

  async validateLiveRequests(): Promise<void> {
    // No-op: the original MockServerE2E.validateLiveRequests() checked for
    // in-flight (pending) requests at teardown time, not for unmocked requests.
    // The Go server forwards unmocked requests to real servers as expected
    // (e.g. Anvil RPC calls, connectivity checks), so there is nothing to validate.
  }

  // eslint-disable-next-line no-empty-function
  startDraining(): void {}
  // eslint-disable-next-line no-empty-function
  async removeAbortFilter(): Promise<void> {}

  get server(): MockttpCompat {
    return this._makeCompat();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private get _controlUrl(): string {
    return `http://localhost:${this._controlPort}`;
  }

  private async _waitForHealthy(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await axios.get(`${this._controlUrl}/health`);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    throw new Error(
      `[GoMockServer] did not become healthy within ${timeoutMs}ms. ` +
        `Check that binary exists at: ${BINARY_PATH}`,
    );
  }

  /**
   * Registers DEFAULT_MOCKS rules whose `response` is a JavaScript function as
   * fallback bridge handlers. These are rules that couldn't be serialized to JSON
   * for the Go static rule store (e.g. auth nonce/login/access-token mocks from
   * @metamask/profile-sync-controller whose responses compute dynamic values).
   *
   * Handlers are registered AFTER testSpecificMock so that test-specific overrides
   * take priority (bridge iterates handlers in registration order).
   */
  private _registerFunctionMocksAsBridgeHandlers(
    events: MockEventsObject,
  ): void {
    for (const [method, rules] of Object.entries(events)) {
      for (const rule of rules as MockApiEndpoint[]) {
        if (typeof rule.response !== 'function') continue;

        const fn = rule.response as (
          requestBody: unknown,
          path: string,
          identifierFn: (publicKey: string) => string,
        ) => unknown;

        const urlMatcher = rule.urlEndpoint;
        const responseCode = rule.responseCode;

        this._bridge.register({
          method,
          predicate: (request) => {
            const url = decodeProxiedUrl(request.url);
            if (urlMatcher instanceof RegExp) {
              return urlMatcher.test(url);
            }
            const urlStr = String(urlMatcher);
            return url === urlStr || url.startsWith(urlStr);
          },
          jsonBodyMatcher: null,
          handler: async (request) => {
            const bodyText = (await request.body.getText()) ?? '';
            let requestBody: unknown;
            try {
              requestBody = bodyText ? JSON.parse(bodyText) : undefined;
            } catch {
              // Not JSON (e.g. URL-encoded body for access-token POST) — pass as string
              requestBody = bodyText || undefined;
            }
            const decodedPath = decodeProxiedUrl(request.url);
            const json = fn(
              requestBody,
              decodedPath,
              getE2ESrpIdentifierForPublicKey,
            );
            return { statusCode: responseCode, json };
          },
          customHeaders: null,
          // Lower priority than testSpecificMock handlers (default 999) so test-specific
          // mocks always win regardless of registration order.
          priority: 1,
        });
      }
    }
  }

  /**
   * POST each static (non-function) mock rule from `events` to the Go control
   * API. This replaces the old --defaults CLI argument which could exceed the
   * kernel ARG_MAX limit on Linux CI runners (POSIX E2BIG).
   */
  private async _postStaticDefaultMocks(
    events: MockEventsObject,
  ): Promise<void> {
    const controlUrl = this._controlUrl;
    for (const [method, rules] of Object.entries(events)) {
      for (const rule of rules as MockApiEndpoint[]) {
        if (typeof rule.response === 'function') continue;
        const isRegex = rule.urlEndpoint instanceof RegExp;
        await axios.post(`${controlUrl}/mocks`, {
          method,
          urlEndpoint: isRegex
            ? (rule.urlEndpoint as RegExp).source
            : rule.urlEndpoint,
          isRegex: isRegex || (rule as { isRegex?: boolean }).isRegex === true,
          responseCode: rule.responseCode,
          response: rule.response,
        });
      }
    }
  }

  private _buildPortMaps(): string[] {
    const portManager = PortManager.getInstance();
    const maps: string[] = [];
    const ganachePort = portManager.getPort(ResourceType.GANACHE);
    if (ganachePort !== undefined) {
      maps.push('--port-map', `${FALLBACK_GANACHE_PORT}:${ganachePort}`);
    }
    const anvilPort = portManager.getPort(ResourceType.ANVIL);
    if (anvilPort !== undefined) {
      maps.push('--port-map', `${DEFAULT_ANVIL_PORT}:${anvilPort}`);
    }
    for (let i = 0; i < 10; i++) {
      const dappPort = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        `dapp-server-${i}`,
      );
      if (dappPort !== undefined) {
        maps.push('--port-map', `${FALLBACK_DAPP_SERVER_PORT + i}:${dappPort}`);
      }
    }
    return maps;
  }

  private _makeCompat(): MockttpCompat {
    const controlUrl = this._controlUrl;
    const bridge = this._bridge;

    /**
     * Build the terminal chain (thenCallback / thenJson / thenReply).
     * All three register a handler in the callback bridge so the Go proxy
     * forwards unmatched requests through for dynamic routing.
     */
    const makeTerminal = (
      method: string,
      predicate: MockttpPredicate | null,
      jsonBodyMatcher: Record<string, unknown> | null,
      priority = 999,
    ): MockttpCompatTerminalChain => ({
      thenCallback: async (handler: MockttpCallback) => {
        bridge.register({
          method,
          predicate,
          jsonBodyMatcher,
          handler,
          customHeaders: null,
          priority,
        });
      },
      thenJson: async (statusCode: number, body: object) => {
        bridge.register({
          method,
          predicate,
          jsonBodyMatcher,
          handler: async () => ({ statusCode, json: body }),
          customHeaders: null,
          priority,
        });
      },
      thenReply: async (
        statusCode: number,
        body: unknown,
        headers?: Record<string, string>,
      ) => {
        bridge.register({
          method,
          predicate,
          jsonBodyMatcher,
          handler: async () => ({
            statusCode,
            body: typeof body === 'string' ? body : JSON.stringify(body),
          }),
          customHeaders: headers ?? null,
          priority,
        });
      },
    });

    const makeRule = (method: string, url: string | RegExp) => {
      // URL predicate used by bridge-registered handlers (thenCallback, asPriority).
      const urlPredicate: MockttpPredicate = (request) => {
        const reqUrl = decodeProxiedUrl(request.url);
        if (url instanceof RegExp) return url.test(reqUrl);
        const urlStr = String(url);
        return reqUrl === urlStr || reqUrl.startsWith(urlStr);
      };

      return {
        thenReply: async (
          statusCode: number,
          body: unknown,
          headers?: Record<string, string>,
        ) => {
          await axios.post(`${controlUrl}/mocks`, {
            method,
            urlEndpoint: url instanceof RegExp ? url.source : url,
            isRegex: url instanceof RegExp,
            responseCode: statusCode,
            response: body,
          });
          void headers; // static-rule thenReply doesn't forward headers to Go yet
        },
        thenJson: async (statusCode: number, body: object) => {
          await axios.post(`${controlUrl}/mocks`, {
            method,
            urlEndpoint: url instanceof RegExp ? url.source : url,
            isRegex: url instanceof RegExp,
            responseCode: statusCode,
            response: body,
          });
        },
        thenCallback: async (handler: MockttpCallback) => {
          await makeTerminal(method, urlPredicate, null).thenCallback(handler);
        },
        matching: (predicate: MockttpPredicate) => {
          const combinedPredicate: MockttpPredicate = async (request) =>
            (await urlPredicate(request)) && (await predicate(request));
          const terminal = makeTerminal(method, combinedPredicate, null);
          return {
            ...terminal,
            always: () => makeTerminal(method, combinedPredicate, null),
            withJsonBodyIncluding: (bodyMatcher: Record<string, unknown>) =>
              makeTerminal(method, combinedPredicate, bodyMatcher),
            asPriority: (priority: number) =>
              makeTerminal(method, combinedPredicate, null, priority),
          };
        },
        asPriority: (priority: number) =>
          makeTerminal(method, urlPredicate, null, priority),
      };
    };

    return {
      forGet: (url) => makeRule('GET', url),
      forPost: (url) => makeRule('POST', url),
      forPut: (url) => makeRule('PUT', url),
      forDelete: (url) => makeRule('DELETE', url),
      forHead: (url) => makeRule('HEAD', url),
      forAnyRequest: () => makeRule('*', /.+/),
      getMockedEndpoints: async () =>
        [
          {
            isPending: async () => false,
            getSeenRequests: async () => bridge.getSeenRequests(),
          },
        ] as unknown as import('./MockttpCompat').MockttpCompatEndpoint[],
    };
  }
}
