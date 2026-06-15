// eslint-disable-next-line @typescript-eslint/no-shadow
import {
  getLocal,
  type ClientError,
  type CompletedRequest,
  type CompletedResponse,
  type Headers as MockttpHeaders,
  type InitiatedRequest,
  Mockttp,
  type TlsHandshakeFailure,
  type WebSocketClose,
  type WebSocketMessage,
} from 'mockttp';
// eslint-disable-next-line import-x/no-nodejs-modules
import { existsSync } from 'fs';
import { ALLOWLISTED_HOSTS, ALLOWLISTED_URLS } from './mock-e2e-allowlist.ts';
import { SUPPRESSED_LOGS_URLS } from './mock-config/suppressed-logs.ts';
import { createLogger, LogLevel } from '../framework/logger.ts';
import {
  E2E_PROXY_CA_CERT_PEM_PATH,
  E2E_PROXY_CA_KEY_PATH,
} from '../framework/utils/E2EProxyCa.ts';
import {
  MockApiEndpoint,
  MockEventsObject,
  PlatformDetector,
  Resource,
  ServerStatus,
  TestSpecificMock,
} from '../framework';
import {
  findMatchingPostEvent,
  processPostRequestBody,
  setupAccountsV2SupportedNetworksMock,
  setupAccountsV4TransactionsMock,
} from './helpers/mockHelpers.ts';
import { getLocalHost } from '../framework/fixtures/FixtureUtils.ts';
import PortManager, { ResourceType } from '../framework/PortManager.ts';
import {
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
} from '../framework/Constants.ts';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager.ts';
import { logLiveMetaMetricsPostIfDebug } from '../helpers/analytics/analyticsDebug.ts';

const logger = createLogger({
  name: 'MockServer',
  level: LogLevel.INFO,
});

// ---------------------------------------------------------------------------
// Patch mockttp's matchesAll so aborted requests don't become unhandled
// rejections.
//
// findMatchingRule() starts ALL rules matching concurrently (.map) but awaits
// them one-by-one. When the first match succeeds it returns, abandoning the
// rest. If any of those reject (streamToBuffer → Error('Aborted') from a
// client disconnect), they become unhandled rejections that Jest turns into
// test failures.
//
// This patch catches only Error('Aborted') and returns false ("no match").
// All other errors propagate normally.
// ---------------------------------------------------------------------------
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockttpMatchers = require('mockttp/dist/rules/matchers');
  const originalMatchesAll = mockttpMatchers.matchesAll;
  mockttpMatchers.matchesAll = async function (
    ...args: Parameters<typeof originalMatchesAll>
  ) {
    try {
      return await originalMatchesAll.apply(this, args);
    } catch (e) {
      if (e instanceof Error && e.message === 'Aborted') {
        return false;
      }
      throw e;
    }
  };
} catch (e) {
  logger.warn('Failed to patch mockttp matchesAll:', e);
}

/**
 * Safely reads request body text, catching abort errors.
 * When a client drops a connection mid-request (e.g., app navigation, AbortController),
 * mockttp's streamToBuffer rejects with Error('Aborted'). This wrapper catches those
 * errors and returns undefined instead of letting them bubble up as unhandled rejections.
 *
 * @param request - The mockttp request object
 * @returns The body text or undefined if reading failed or was aborted
 */
export const safeGetBodyText = async (request: {
  body: { getText: () => Promise<string | undefined> };
}): Promise<string | undefined> => {
  try {
    return await request.body.getText();
  } catch (error) {
    if (error instanceof Error && error.message === 'Aborted') {
      logger.debug('Request body read aborted (client disconnected)');
      return undefined;
    }
    logger.warn('Failed to read request body:', error);
    return undefined;
  }
};

export interface LiveRequest {
  url: string;
  method: string;
  timestamp: string;
}

interface JsonRpcLikeMessage {
  id?: unknown;
  method?: unknown;
  result?: unknown;
  error?: unknown;
}

export interface InternalMockServer extends Mockttp {
  _liveRequests?: LiveRequest[];
  // Count of OS-proxy-intercepted native arrivals (matched or not). Non-zero
  // only when the device proxy is actually on the path — the N3 canary asserts
  // this is > 0 to prove the proxy isn't silently dormant.
  _deviceProxyRequestCount?: number;
  // Unmocked device-proxied requests, for the N4 warn-only inventory.
  _deviceProxyUnmocked?: LiveRequest[];
}

export type HttpProxyTrafficSource = 'shim-proxy' | 'device-proxy';

export interface NormalizedHttpProxyRequest {
  source: HttpProxyTrafficSource;
  targetUrl: string;
  method: string;
  headers: MockttpHeaders;
  bodyText?: string;
  requestBodyJson?: unknown;
}

/**
 * Response shape flowing back through the proxy pipeline to mockttp.
 *
 * `body` MUST stay a Buffer for binary payloads (snap tarballs, images,
 * PDFs): decoding bytes to a string and back is lossy (invalid UTF-8
 * sequences become U+FFFD), which corrupts the payload and produces a
 * content-length that no longer matches what the client expects.
 */
export interface ProxyHandlerResponse {
  statusCode: number;
  body: string | Buffer;
  headers?: MockttpHeaders;
}

/**
 * What a proxy handler hands back to mockttp: an HTTP response, or 'close'
 * to drop the connection — used to surface upstream network-level failures
 * (DNS, refused) as connection failures rather than synthesized 500s.
 */
export type ProxyHandlerResult = ProxyHandlerResponse | 'close';

interface NormalizedHttpProxyRequestOptions {
  events: MockEventsObject;
  liveRequests?: LiveRequest[];
  // Collects unmocked device-proxy-sourced requests for the N4 warn-only
  // summary. Unlike liveRequests, recording here never fails the test —
  // native traffic enforcement is a deliberate later step.
  deviceProxyMisses?: LiveRequest[];
  forwardRequest?: typeof handleDirectFetch;
  getForwardUrl?: (targetUrl: string, source: HttpProxyTrafficSource) => string;
}

const DEVICE_LOCAL_HOST_ALIASES = new Set([
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '10.0.3.2',
  'bs-local.com',
]);

/**
 * Internal marker set on loopback re-entries of raw device-proxy traffic
 * (see the forUnmatchedRequest handler). Lets the /proxy ingress preserve
 * device-proxy source semantics (allowlist exemption, unmocked-request
 * logging) for requests that re-enter through the shim ingress. Never
 * forwarded upstream.
 */
export const DEVICE_PROXY_INGRESS_MARKER_HEADER =
  'x-metamask-e2e-device-proxy-ingress';

/**
 * Translates fallback ports to actual allocated ports in URLs.
 * This allows the MockServer (running on host) to forward requests to dynamically allocated local resources.
 *
 * @param url - The URL that may contain a fallback port
 * @returns The URL with fallback port replaced by actual allocated port, or original URL
 */
const translateFallbackPortToActual = (
  url: string,
  {
    normalizeDeviceLocalHostAlias = false,
  }: { normalizeDeviceLocalHostAlias?: boolean } = {},
): string => {
  try {
    const parsedUrl = new URL(url);
    const port = parsedUrl.port;

    if (!port) {
      return url;
    }

    const portNum = parseInt(port, 10);
    const portManager = PortManager.getInstance();
    let actualPort: number | undefined;

    // Map fallback ports to actual allocated ports
    if (portNum === FALLBACK_FIXTURE_SERVER_PORT) {
      actualPort = portManager.getPort(ResourceType.FIXTURE_SERVER);
    } else if (portNum === FALLBACK_COMMAND_QUEUE_SERVER_PORT) {
      actualPort = portManager.getPort(ResourceType.COMMAND_QUEUE_SERVER);
    } else if (portNum === FALLBACK_GANACHE_PORT) {
      // Try Ganache first, fallback to Anvil if Ganache not running
      actualPort = portManager.getPort(ResourceType.GANACHE);
      if (actualPort === undefined) {
        actualPort = portManager.getPort(ResourceType.ANVIL);
      }
    } else if (portNum === DEFAULT_ANVIL_PORT) {
      actualPort = portManager.getPort(ResourceType.ANVIL);
    } else if (
      portNum >= FALLBACK_DAPP_SERVER_PORT &&
      portNum < FALLBACK_DAPP_SERVER_PORT + 100
    ) {
      // Dapp server ports start at FALLBACK_DAPP_SERVER_PORT (8085, 8086, etc.)
      const dappIndex = portNum - FALLBACK_DAPP_SERVER_PORT;
      actualPort = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        `dapp-server-${dappIndex}`,
      );
    }

    const originalUrl = parsedUrl.toString();
    if (
      normalizeDeviceLocalHostAlias &&
      DEVICE_LOCAL_HOST_ALIASES.has(parsedUrl.hostname)
    ) {
      parsedUrl.hostname = getLocalHost();
    }

    if (actualPort !== undefined) {
      parsedUrl.port = actualPort.toString();
    }

    const translatedUrl = parsedUrl.toString();
    if (translatedUrl !== originalUrl) {
      logger.info(
        `[E2E_DEVICE_PROXY_LOCAL_RESOURCE_TRANSLATED] ${url} -> ${translatedUrl}`,
      );
    }
    return translatedUrl;
  } catch (error) {
    logger.warn('Failed to parse URL for port translation:', url, error);
    return url;
  }
};

const isUrlAllowed = (url: string): boolean => {
  try {
    if (ALLOWLISTED_URLS.includes(url)) {
      return true;
    }

    // Malformed npm: package URIs that leak through the snap proxy
    // e.g. https://https//npm:@metamask/... or npm:@metamask/...
    if (/^(?:https?:\/\/.*)?npm[:@]@?metamask\//.test(url)) {
      return true;
    }

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    if (parsedUrl.protocol === 'data:') {
      return true;
    }

    return ALLOWLISTED_HOSTS.some((allowedHost) => {
      if (allowedHost.startsWith('*.')) {
        const domain = allowedHost.slice(2);
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return hostname === allowedHost;
    });
  } catch (error) {
    logger.warn('Invalid URL:', url);
    return false;
  }
};

const isUrlSuppressedFromLogs = (url: string): boolean =>
  SUPPRESSED_LOGS_URLS.some((pattern: RegExp) => pattern.test(url));

const isShimProxyRequest = (pathOrUrl?: string): boolean =>
  pathOrUrl?.startsWith('/proxy') ?? false;

const getDetectedPlatform = (): 'android' | 'ios' | undefined => {
  try {
    return PlatformDetector.getPlatform();
  } catch {
    return undefined;
  }
};

export const getProxyForwardUrl = (
  targetUrl: string,
  source: HttpProxyTrafficSource,
): string => {
  const platform = getDetectedPlatform();
  const platformAdjustedUrl =
    source === 'shim-proxy' && platform === 'android'
      ? targetUrl.replace('localhost', '127.0.0.1')
      : targetUrl;

  return translateFallbackPortToActual(platformAdjustedUrl, {
    normalizeDeviceLocalHostAlias: source === 'device-proxy',
  });
};

const getRequestHost = (request: {
  hostname?: string;
  headers?: MockttpHeaders;
}): string => {
  const headerHost = request.headers?.host;
  return (
    request.hostname ||
    (Array.isArray(headerHost) ? headerHost[0] : headerHost) ||
    'unknown'
  );
};

const isSolanaRelatedHttpCandidate = (urlOrHost: string): boolean => {
  const value = urlOrHost.toLowerCase();
  return (
    value.includes('solana') ||
    value.includes('slip44:501') ||
    value.includes('5eykt4usfv8p8njdtrepy1vzqkqzkvdp')
  );
};

const JSON_RPC_BALANCE_METHODS = new Set([
  'getBalance',
  'getTokenAccountBalance',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'getAccountInfo',
]);

const redactNativeProxyUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.endsWith('infura.io')) {
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      parsedUrl.pathname =
        pathSegments.length > 0
          ? `/${pathSegments.map(() => '<redacted>').join('/')}`
          : '/';
      parsedUrl.search = parsedUrl.search ? '?<redacted>' : '';
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
};

const parseJsonRpcMessages = (message: string): JsonRpcLikeMessage[] => {
  try {
    const parsed = JSON.parse(message) as
      | JsonRpcLikeMessage
      | JsonRpcLikeMessage[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

const summarizeWebSocketMessage = (
  message: WebSocketMessage,
): {
  summary: string;
  methods: string[];
  isBalanceCandidate: boolean;
} => {
  if (message.isBinary) {
    return {
      summary: `binaryBytes=${message.content.byteLength}`,
      methods: [],
      isBalanceCandidate: false,
    };
  }

  const body = Buffer.from(message.content).toString('utf8');
  const parsedMessages = parseJsonRpcMessages(body);

  if (parsedMessages.length === 0) {
    return {
      summary: `bytes=${body.length} non-json`,
      methods: [],
      isBalanceCandidate: false,
    };
  }

  const methods = parsedMessages
    .map((entry) => entry.method)
    .filter((method): method is string => typeof method === 'string');
  const ids = parsedMessages
    .map((entry) => entry.id)
    .filter((id) => id !== undefined)
    .map((id) => String(id));
  const hasResult = parsedMessages.some((entry) => entry.result !== undefined);
  const hasError = parsedMessages.some((entry) => entry.error !== undefined);
  const summaryParts = [
    `messages=${parsedMessages.length}`,
    methods.length ? `methods=${Array.from(new Set(methods)).join(',')}` : '',
    ids.length ? `ids=${ids.slice(0, 5).join(',')}` : '',
    hasResult ? 'hasResult=true' : '',
    hasError ? 'hasError=true' : '',
  ].filter(Boolean);

  return {
    summary: summaryParts.join(' '),
    methods,
    isBalanceCandidate: methods.some((method) =>
      JSON_RPC_BALANCE_METHODS.has(method),
    ),
  };
};

const logSolanaRelatedHttpCandidate = (
  method: string,
  url: string,
  source: string,
): void => {
  if (!isSolanaRelatedHttpCandidate(url)) {
    return;
  }

  logger.warn(
    `[E2E_SOLANA_RELATED_HTTP_CANDIDATE] source=${source} ${method} ${url}`,
  );
};

const logNativeProxyRequestInitiated = (request: InitiatedRequest): void => {
  if (isShimProxyRequest(request.path)) {
    // Log the decoded /proxy target so CI logs show every shim-routed
    // request regardless of which mock layer ends up serving it — matched
    // mockttp rules are otherwise invisible at INFO level, which made
    // balance-pipeline starvation undiagnosable from host logs alone.
    try {
      const target = new URL(request.url).searchParams.get('url');
      if (target && !isUrlSuppressedFromLogs(target)) {
        const viaLoopback = Boolean(
          request.headers?.[DEVICE_PROXY_INGRESS_MARKER_HEADER],
        );
        logger.info(
          `[E2E_SHIM_PROXY_REQUEST_INITIATED] ${request.method} ${redactNativeProxyUrl(
            target,
          )}${viaLoopback ? ' source=device-proxy-loopback' : ''}`,
        );
      }
    } catch {
      // Malformed wrapper URL — nothing useful to log.
    }
    return;
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_REQUEST_INITIATED] ${request.method} ${request.url} protocol=${request.protocol} host=${getRequestHost(request)}`,
  );
  logSolanaRelatedHttpCandidate(
    request.method,
    request.url,
    'request-initiated',
  );
};

const logNativeProxyTlsClientError = (request: TlsHandshakeFailure): void => {
  const host =
    request.hostname ||
    request.tlsMetadata.sniHostname ||
    request.tlsMetadata.connectHostname ||
    'unknown';

  logger.warn(
    `[E2E_NATIVE_PROXY_TLS_CLIENT_ERROR] host=${host} cause=${request.failureCause}`,
  );
  logSolanaRelatedHttpCandidate('TLS', host, 'tls-client-error');
};

const logNativeProxyClientError = (error: ClientError): void => {
  if (isShimProxyRequest(error.request.path)) {
    return;
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_CLIENT_ERROR] ${error.request.method ?? 'UNKNOWN'} ${
      error.request.url ?? 'unknown-url'
    } errorCode=${error.errorCode ?? 'unknown'} response=${
      error.response === 'aborted' ? 'aborted' : error.response.statusCode
    }`,
  );
  logSolanaRelatedHttpCandidate(
    error.request.method ?? 'UNKNOWN',
    error.request.url ?? 'unknown-url',
    'client-error',
  );
};

const getMockttpProxyOptions = () => {
  if (
    existsSync(E2E_PROXY_CA_CERT_PEM_PATH) &&
    existsSync(E2E_PROXY_CA_KEY_PATH)
  ) {
    logger.warn(
      `[E2E_NATIVE_PROXY_HTTPS_ENABLED] Mockttp HTTPS interception using ${E2E_PROXY_CA_CERT_PEM_PATH}`,
    );

    return {
      https: {
        certPath: E2E_PROXY_CA_CERT_PEM_PATH,
        keyPath: E2E_PROXY_CA_KEY_PATH,
      },
      http2: 'fallback' as const,
    };
  }

  logger.warn(
    `[E2E_NATIVE_PROXY_HTTPS_DISABLED] Missing ${E2E_PROXY_CA_CERT_PEM_PATH} or ${E2E_PROXY_CA_KEY_PATH}; HTTPS native proxy traffic will not be decrypted`,
  );

  return {};
};

/**
 * Response headers NOT forwarded from live upstream responses.
 *
 * content-encoding/content-length/transfer-encoding: fetch already
 * decompressed the body, so echoing these would corrupt client decoding,
 * and mockttp recomputes the length from the body we hand it.
 *
 * connection/keep-alive: hop-by-hop, never forwarded by proxies.
 */
const NON_FORWARDABLE_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

/**
 * Request headers NOT forwarded on live upstream forwards.
 *
 * content-length/content-encoding/transfer-encoding: mockttp hands us the
 * DECODED request body, so the original framing headers no longer describe
 * what we send — undici rejects the mismatch with
 * UND_ERR_REQ_CONTENT_LENGTH_MISMATCH (observed on device-proxied Firebase
 * installation POSTs) and recomputes content-length itself from the body.
 *
 * host: must describe the host we actually dial; after local-resource port
 * translation the original value is stale, and undici derives the correct
 * one from the target URL.
 *
 * Remaining entries are hop-by-hop headers that proxies never forward.
 */
const NON_FORWARDABLE_REQUEST_HEADERS = new Set([
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'proxy-connection',
  'expect',
  'upgrade',
  'te',
  'trailer',
  'host',
]);

const CORS_PREFLIGHT_REQUEST_METHOD_HEADER = 'access-control-request-method';

const getSingleHeaderValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * Builds a permissive CORS preflight (OPTIONS) response echoing whatever the
 * client asked for. Device-proxied preflights previously depended on the
 * LIVE upstream answering them — a hidden network dependency that happened
 * to work only while a cached preflight or a reachable upstream existed.
 */
const synthesizeCorsPreflightResponse = (
  requestHeaders: MockttpHeaders,
): ProxyHandlerResponse => {
  const origin = getSingleHeaderValue(requestHeaders.origin) ?? '*';
  const requestedMethod = getSingleHeaderValue(
    requestHeaders[CORS_PREFLIGHT_REQUEST_METHOD_HEADER],
  );
  const requestedHeaders = getSingleHeaderValue(
    requestHeaders['access-control-request-headers'],
  );

  return {
    statusCode: 204,
    body: '',
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods':
        requestedMethod ?? 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
      'access-control-allow-headers': requestedHeaders ?? '*',
      'access-control-max-age': '300',
      vary: 'origin',
    },
  };
};

/**
 * Injects a permissive Access-Control-Allow-Origin into responses that lack
 * one so CORS-bound clients (WebViews) can read mock-served bodies. Live
 * forwards keep whatever the upstream sent; only header-less responses are
 * touched. Native (non-CORS) clients ignore the extra header.
 */
const withCorsResponseHeaders = (
  result: ProxyHandlerResult,
  requestHeaders: MockttpHeaders,
): ProxyHandlerResult => {
  if (result === 'close') {
    return result;
  }

  const headers: MockttpHeaders = { ...(result.headers ?? {}) };
  if (!headers['access-control-allow-origin']) {
    headers['access-control-allow-origin'] =
      getSingleHeaderValue(requestHeaders.origin) ?? '*';
    headers.vary = headers.vary ? `${String(headers.vary)}, origin` : 'origin';
  }

  return { ...result, headers };
};

const NETWORK_ERROR_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  // undici's "other side closed": the upstream (or a thenCloseConnection
  // mock rule, see setupMockNetworkFailure) dropped the socket mid-request.
  'UND_ERR_SOCKET',
]);

const isNetworkLevelFetchError = (error: unknown): boolean => {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return Boolean(cause?.code && NETWORK_ERROR_CODES.has(cause.code));
};

const handleDirectFetch = async (
  url: string,
  method: string,
  headers: MockttpHeaders,
  requestBody?: string,
): Promise<ProxyHandlerResult> => {
  try {
    const fetchHeaders: HeadersInit = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value && !NON_FORWARDABLE_REQUEST_HEADERS.has(key.toLowerCase())) {
        fetchHeaders[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    const response = await global.fetch(url, {
      method,
      headers: fetchHeaders,
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined,
    });

    // Read raw bytes, never text(): UTF-8 decoding corrupts binary payloads.
    const responseBody = Buffer.from(await response.arrayBuffer());
    // Forward upstream response headers (minus hop-by-hop and body-encoding
    // headers). WebView fetches are CORS-bound: dropping the upstream
    // Access-Control-Allow-* headers makes every preflighted request fail
    // even when the upstream answered it correctly.
    const responseHeaders: MockttpHeaders = {};
    response.headers.forEach((value, key) => {
      if (!NON_FORWARDABLE_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    // Recompute content-length from the (already-decompressed) body we are
    // actually sending: mockttp passes these headers straight to writeHead,
    // so omitting it serves the response chunked — and the mobile snap
    // installer hard-asserts on content-length for NPM tarballs
    // (app/core/Snaps/location/npm.ts).
    if (response.status !== 204 && response.status !== 304) {
      responseHeaders['content-length'] = String(responseBody.length);
    }
    return {
      statusCode: response.status,
      body: responseBody,
      headers: responseHeaders,
    };
  } catch (error) {
    if (!isUrlSuppressedFromLogs(url)) {
      logger.error('Error forwarding request:', url, error);
    }
    // Network-level failures (DNS, refused, reset) must surface to the client
    // as connection failures, not synthesized HTTP 500s: a 500 means "the
    // server answered", which breaks error-handling semantics — e.g. the
    // in-app browser renders a 500 page instead of its network-error screen
    // for an unresolvable host.
    if (isNetworkLevelFetchError(error)) {
      return 'close';
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to forward request' }),
    };
  }
};

const METHODS_WITH_REQUEST_BODY = new Set(['POST', 'PUT', 'PATCH']);

const methodCanHaveRequestBody = (method: string): boolean =>
  METHODS_WITH_REQUEST_BODY.has(method.toUpperCase());

const parseRequestBodyJson = (requestBodyText?: string): unknown => {
  if (!requestBodyText) {
    return undefined;
  }

  try {
    return JSON.parse(requestBodyText);
  } catch {
    return undefined;
  }
};

const findMatchingMockEvent = (
  events: MockEventsObject,
  method: string,
  targetUrl: string,
  requestBodyJson: unknown,
): MockApiEndpoint | undefined => {
  const methodEvents = events[method] || [];
  const candidateEvents = methodEvents.filter((event: MockApiEndpoint) => {
    const eventUrl = event.urlEndpoint;
    if (!eventUrl) return false;
    if (event.urlEndpoint instanceof RegExp) {
      return event.urlEndpoint.test(targetUrl);
    }
    const eventUrlStr = String(eventUrl);
    return targetUrl === eventUrlStr || targetUrl.startsWith(eventUrlStr);
  });

  if (candidateEvents.length === 0) {
    return undefined;
  }

  if (method === 'POST') {
    return findMatchingPostEvent(candidateEvents, requestBodyJson);
  }

  return candidateEvents[0];
};

const createMockEventResponse = (
  matchingEvent: MockApiEndpoint,
  request: NormalizedHttpProxyRequest,
): ProxyHandlerResponse => {
  // INFO marker so CI logs show which requests the events table (defaults)
  // served — rule-served and event-served traffic are otherwise
  // indistinguishable from silence in the logs.
  logger.info(
    `[E2E_EVENT_MOCK_SERVED] ${request.method} ${request.targetUrl} status=${matchingEvent.responseCode}`,
  );
  logger.debug('Response:', matchingEvent.response);

  if (request.method === 'POST' && matchingEvent.requestBody) {
    const result = processPostRequestBody(
      request.bodyText,
      matchingEvent.requestBody,
      { ignoreFields: matchingEvent.ignoreFields || [] },
    );

    if (!result.matches) {
      return {
        statusCode: result.error === 'Missing request body' ? 400 : 404,
        body: JSON.stringify({
          error: result.error,
          expected: matchingEvent.requestBody,
          received: result.requestBodyJson,
        }),
      };
    }
  }

  const mockResponse = matchingEvent.response;
  return {
    statusCode: matchingEvent.responseCode,
    body:
      Buffer.isBuffer(mockResponse) || mockResponse instanceof Uint8Array
        ? Buffer.from(mockResponse)
        : typeof mockResponse === 'string'
          ? mockResponse
          : JSON.stringify(mockResponse),
  };
};

export interface DeviceProxyTrafficSummary {
  totalRequests: number;
  unmockedCount: number;
  hosts: { host: string; count: number }[];
}

/**
 * Builds the N4 device-proxy traffic summary: the total OS-proxy-intercepted
 * native requests, the unmocked subset, and those unmocked requests deduped by
 * host and ranked by descending count — a ready-made inventory of native
 * traffic still to mock. Pure (no I/O) so it is unit-testable in isolation.
 */
export const buildDeviceProxySummary = (
  totalRequests: number,
  misses: LiveRequest[],
): DeviceProxyTrafficSummary => {
  const byHost = new Map<string, number>();
  for (const miss of misses) {
    let host: string;
    try {
      host = new URL(miss.url).host;
    } catch {
      host = miss.url;
    }
    byHost.set(host, (byHost.get(host) ?? 0) + 1);
  }

  const hosts = Array.from(byHost.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));

  return { totalRequests, unmockedCount: misses.length, hosts };
};

const logDirectDeviceProxyMiss = (
  method: string,
  targetUrl: string,
  requestBodyText?: string,
): void => {
  if (!isUrlSuppressedFromLogs(targetUrl)) {
    logger.warn(
      `[E2E_DEVICE_PROXY_UNMOCKED_REQUEST] source=device-proxy ${method} ${targetUrl} matchedMock=false liveRequestTracking=false`,
    );
    if (method === 'POST' && requestBodyText) {
      logger.warn(
        `[E2E_DEVICE_PROXY_UNMOCKED_REQUEST_BODY] ${requestBodyText}`,
      );
    }
  }
};

/**
 * Unwraps legacy mock-server wrapper URLs (http://<local-alias>:8000/proxy?url=X)
 * nested inside a request target, repeatedly until a real target emerges.
 *
 * Fixture state bakes already-wrapped RPC URLs into controller state (e.g.
 * NetworkController RPC endpoints), so the app's shim wraps them a second
 * time: the outer /proxy reaches us normally but its inner "target" is
 * another wrapper aimed at the device-side port 8000, which is dead on the
 * host. Without unwrapping, those forwards ECONNREFUSED and the app's
 * chain/balance state never loads.
 */
const unwrapLegacyMockServerWrappers = (targetUrl: string): string => {
  let current = targetUrl;
  for (let depth = 0; depth < 5; depth++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return current;
    }
    const isWrapper =
      DEVICE_LOCAL_HOST_ALIASES.has(parsed.hostname) &&
      parsed.port === '8000' &&
      parsed.pathname === '/proxy' &&
      parsed.searchParams.has('url');
    if (!isWrapper) {
      return current;
    }
    const inner = parsed.searchParams.get('url') as string;
    logger.warn(
      `[E2E_DEVICE_PROXY_LEGACY_WRAPPER_UNWRAPPED] ${current} -> ${inner}`,
    );
    current = inner;
  }
  return current;
};

export const handleNormalizedHttpProxyRequest = async (
  request: NormalizedHttpProxyRequest,
  options: NormalizedHttpProxyRequestOptions,
): Promise<ProxyHandlerResult> => {
  const unwrappedTargetUrl = unwrapLegacyMockServerWrappers(request.targetUrl);
  if (unwrappedTargetUrl !== request.targetUrl) {
    // A wrapper is the app's shim addressing the mock server, so the
    // unwrapped request carries shim-proxy semantics regardless of which
    // ingress it arrived through.
    request = {
      ...request,
      targetUrl: unwrappedTargetUrl,
      source: 'shim-proxy',
    };
  }
  const method = request.method.toUpperCase();
  const requestBodyJson =
    request.requestBodyJson ?? parseRequestBodyJson(request.bodyText);
  const normalizedRequest = {
    ...request,
    method,
    requestBodyJson,
  };

  logSolanaRelatedHttpCandidate(method, request.targetUrl, request.source);

  if (method === 'POST') {
    logLiveMetaMetricsPostIfDebug(request.targetUrl, requestBodyJson);
  }

  const matchingEvent = findMatchingMockEvent(
    options.events,
    method,
    request.targetUrl,
    requestBodyJson,
  );

  if (matchingEvent) {
    return createMockEventResponse(matchingEvent, normalizedRequest);
  }

  const updatedUrl = options.getForwardUrl
    ? options.getForwardUrl(request.targetUrl, request.source)
    : request.targetUrl;

  if (request.source === 'device-proxy') {
    logDirectDeviceProxyMiss(method, updatedUrl, request.bodyText);
    // Record for the N4 warn-only inventory. This does NOT fail the test
    // (cf. liveRequests below) — surfacing native traffic still to mock.
    options.deviceProxyMisses?.push({
      url: updatedUrl,
      method,
      timestamp: new Date().toISOString(),
    });
  } else if (!isUrlAllowed(updatedUrl)) {
    const errorMessage = `Request going to live server: ${updatedUrl}`;
    logger.warn(errorMessage);
    if (method === 'POST') {
      logger.warn(`Request Body: ${request.bodyText}`);
    }
    options.liveRequests?.push({
      url: updatedUrl,
      method,
      timestamp: new Date().toISOString(),
    });
  } else if (ALLOWLISTED_URLS.includes(updatedUrl)) {
    logger.warn(`Allowed URL: ${updatedUrl}`);
    if (method === 'POST') {
      logger.warn(`Request Body: ${request.bodyText}`);
    }
  }

  const forwardRequest = options.forwardRequest ?? handleDirectFetch;
  return await forwardRequest(
    updatedUrl,
    method,
    request.headers,
    methodCanHaveRequestBody(method) ? request.bodyText : undefined,
  );
};

export default class MockServerE2E implements Resource {
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: InternalMockServer | null = null;
  private _events: MockEventsObject;
  private _testSpecificMock?: TestSpecificMock;
  private _activeRequests = 0;
  private _shuttingDown = false;
  private _abortFilterHandler: ((...args: unknown[]) => void) | null = null;
  private _abortExceptionHandler: ((...args: unknown[]) => void) | null = null;
  private _abortSuppressCount = 0;
  private _originalRejectionHandlers: ((...args: unknown[]) => void)[] = [];
  private _originalExceptionHandlers: ((...args: unknown[]) => void)[] = [];
  private _webSocketUrlsByStreamId = new Map<string, string>();
  private _httpRequestLogContextById = new Map<string, string>();

  constructor(params: {
    events: MockEventsObject;
    testSpecificMock?: TestSpecificMock;
  }) {
    this._events = params.events;
    this._serverPort = 0; // Will be set when starting the server
    this._testSpecificMock = params.testSpecificMock;
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  getServerPort(): number {
    return this._serverPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  get getServerUrl(): string {
    return `http://${getLocalHost()}:${this._serverPort}`;
  }

  get server(): InternalMockServer {
    if (!this._server) {
      throw new Error('Mock server not started');
    }
    return this._server;
  }

  setServerPort(port: number): void {
    this._serverPort = port;
  }

  async start(): Promise<void> {
    if (this._serverStatus === ServerStatus.STARTED) {
      logger.debug('Mock server already started');
      return;
    }

    this._server = getLocal(getMockttpProxyOptions()) as InternalMockServer;
    this._server._liveRequests = [];
    this._server._deviceProxyRequestCount = 0;
    this._server._deviceProxyUnmocked = [];
    await this._server.start(this._serverPort);

    logger.info(
      `Mockttp server running at http://${getLocalHost()}:${this._serverPort}`,
    );

    await this._applyServerConfiguration();

    this._serverStatus = ServerStatus.STARTED;
    this._installAbortFilter();
  }

  /**
   * Swaps in the next test's mock configuration on the already-running
   * server, instead of stopping and restarting it.
   *
   * Why the server must survive test boundaries: on Android the emulator's
   * global proxy routes the Detox tester WebSocket through this server (the
   * proxy exclusion list is not honored for WS upgrades). Stopping the
   * server between tests severs that tunnel with a clean close — and on a
   * clean close the app-side Detox client dispatches its termination action
   * (DetoxServerAdapter.onClosed) and never reconnects, so every subsequent
   * test running with restartDevice: false fails with "Detox can't seem to
   * connect to the test app(s)". server.reset() disposes rules and
   * subscriptions but leaves the listening socket and established tunnels
   * intact, so per-test mock isolation is preserved without killing the
   * Detox session.
   */
  async reconfigure(params: {
    events: MockEventsObject;
    testSpecificMock?: TestSpecificMock;
  }): Promise<void> {
    if (!this._server || this._serverStatus !== ServerStatus.STARTED) {
      throw new Error('Cannot reconfigure a mock server that is not running');
    }

    // Let the previous test's in-flight handlers finish before their rules
    // and events are swapped out from under them.
    await this._waitForActiveRequests();

    this._events = params.events;
    this._testSpecificMock = params.testSpecificMock;
    this._shuttingDown = false;
    this._webSocketUrlsByStreamId.clear();
    this._httpRequestLogContextById.clear();
    this._server._liveRequests = [];
    this._server._deviceProxyRequestCount = 0;
    this._server._deviceProxyUnmocked = [];

    this._server.reset();
    await this._applyServerConfiguration();

    // The per-test cleanup in withFixtures restores Jest's handlers via
    // removeAbortFilter(); re-arm the filter for the next test.
    this._installAbortFilter();
  }

  /**
   * Registers event subscriptions, static rules, per-test mocks
   * (testSpecificMock) and the proxy ingress handlers on the running server.
   *
   * Runs from start() and again from reconfigure() after server.reset():
   * reset() disposes all rules AND event subscriptions, so everything here
   * must be re-registered for each test that reuses the server.
   */
  private async _applyServerConfiguration(): Promise<void> {
    const server = this.server;

    await server.on('request-initiated', logNativeProxyRequestInitiated);
    await server.on('request-initiated', this._trackHttpRequestForResponseLog);
    await server.on('response', this._logHttpProxyResponseServed);
    await server.on('tls-client-error', logNativeProxyTlsClientError);
    await server.on('client-error', logNativeProxyClientError);
    await server.on('websocket-request', this._logNativeProxyWebSocketRequest);
    await server.on(
      'websocket-accepted',
      this._logNativeProxyWebSocketAccepted,
    );
    await server.on(
      'websocket-message-received',
      this._logNativeProxyWebSocketMessageReceived,
    );
    await server.on(
      'websocket-message-sent',
      this._logNativeProxyWebSocketMessageSent,
    );
    await server.on('websocket-close', this._logNativeProxyWebSocketClose);

    await server
      .forGet('/health-check')
      .thenReply(200, 'Mock server is running');
    await server
      .forGet(
        /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\\d+)?\/favicon\.ico$/,
      )
      .thenReply(200, 'favicon.ico');

    if (this._testSpecificMock) {
      logger.info('Applying testSpecificMock function (takes precedence)');
      await this._testSpecificMock(server);
    }

    await server.forAnyWebSocket().thenPassThrough();

    await setupAccountsV2SupportedNetworksMock(server);
    await setupAccountsV4TransactionsMock(server);

    await server
      .forAnyRequest()
      .matching((request) => request.path.startsWith('/proxy'))
      .thenCallback(async (request) => {
        // During shutdown, consume the body (to prevent mockttp's streamToBuffer
        // from producing an unhandled rejection) and return 503 immediately.
        if (this._shuttingDown) {
          try {
            await request.body.getText();
          } catch {
            /* swallow abort errors */
          }
          return { statusCode: 503, body: 'Server shutting down' };
        }
        this._activeRequests++;
        try {
          const urlEndpoint = new URL(request.url).searchParams.get('url');
          if (!urlEndpoint) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing url parameter' }),
            };
          }

          const method = request.method.toUpperCase();
          const requestBodyText = methodCanHaveRequestBody(method)
            ? await safeGetBodyText(request)
            : undefined;

          // Loopback re-entries of raw device-proxy traffic carry the
          // ingress marker: honor their original source so allowlist and
          // unmocked-request semantics are unchanged, and strip the marker
          // so it never reaches a live upstream.
          const headers = { ...request.headers };
          const isDeviceProxyReentry = Boolean(
            headers[DEVICE_PROXY_INGRESS_MARKER_HEADER],
          );
          delete headers[DEVICE_PROXY_INGRESS_MARKER_HEADER];

          return await handleNormalizedHttpProxyRequest(
            {
              source: isDeviceProxyReentry ? 'device-proxy' : 'shim-proxy',
              targetUrl: urlEndpoint,
              method,
              headers,
              bodyText: requestBodyText,
            },
            {
              events: this._events,
              liveRequests: this._server?._liveRequests,
              deviceProxyMisses: this._server?._deviceProxyUnmocked,
              getForwardUrl: getProxyForwardUrl,
            },
          );
        } catch (error) {
          // Client dropped the connection before we could respond (e.g. bridge
          // controller AbortController fired mid-request). Return a benign
          // response so mockttp doesn't surface an unhandled rejection.
          if (error instanceof Error && error.message === 'Aborted') {
            return { statusCode: 499, body: '' };
          }
          throw error;
        } finally {
          this._activeRequests--;
        }
      });

    await server.forUnmatchedRequest().thenCallback(async (request) => {
      // During shutdown, consume the body and return 503 immediately.
      if (this._shuttingDown) {
        try {
          await request.body.getText();
        } catch {
          /* swallow abort errors */
        }
        return { statusCode: 503, body: 'Server shutting down' };
      }

      this._activeRequests++;
      try {
        const method = request.method.toUpperCase();
        const bodyText = methodCanHaveRequestBody(method)
          ? await safeGetBodyText(request)
          : undefined;
        // If body read was aborted, return 499 (client closed request)
        if (method === 'POST' && bodyText === undefined) {
          return { statusCode: 499, body: '' };
        }

        // Device-proxied traffic aimed at the mock server itself. The app's
        // JS shim wraps fetches as http://localhost:8000/proxy?url=<target>
        // expecting the adb-reverse path, but the emulator global proxy does
        // not reliably honor the exclusion list, so those wrappers arrive
        // here in proxy form. They MUST be unwrapped and served through the
        // shim-proxy pipeline — black-holing them (the old 204) or live-
        // forwarding the wrapper to the host's dead port 8000 starves the
        // app of fixture-backed state (local-node RPC, balances).
        try {
          const url = new URL(request.url);
          const isLocalhost = DEVICE_LOCAL_HOST_ALIASES.has(url.hostname);
          const isMockServerPort =
            url.port === '8000' || url.port === this._serverPort.toString();

          if (isLocalhost && isMockServerPort && url.pathname !== '/proxy') {
            // /proxy wrappers fall through to handleNormalizedHttpProxyRequest,
            // whose unwrap step serves them with shim-proxy semantics.
            if (url.pathname === '/health-check') {
              return { statusCode: 200, body: 'Mock server is running' };
            }
            logger.debug(`Ignoring MockServer self-reference: ${request.url}`);
            return { statusCode: 204, body: '' };
          }
        } catch (e) {
          // Ignore URL parsing errors
        }

        // CORS-bound clients (the snaps execution WebView, in-app browser
        // pages) preflight cross-origin requests and reject responses
        // without Access-Control-Allow-*. Live forwards preserve upstream
        // CORS headers, but MOCK-served responses carry none — Chromium
        // then fails the fetch ("Failed to fetch") even though the mock
        // matched. Synthesize permissive preflight answers here, and inject
        // a permissive allow-origin into relayed responses lacking one.
        if (
          method === 'OPTIONS' &&
          request.headers[CORS_PREFLIGHT_REQUEST_METHOD_HEADER]
        ) {
          return synthesizeCorsPreflightResponse(request.headers);
        }

        // This is a genuine OS-proxy-intercepted native arrival (not a
        // self-reference, health-check, or preflight). Count it as proof the
        // device proxy is on the path — the N3 canary asserts this is > 0.
        if (this._server) {
          this._server._deviceProxyRequestCount =
            (this._server._deviceProxyRequestCount ?? 0) + 1;
        }

        // Re-enter raw device-proxy arrivals through our own /proxy ingress
        // instead of consulting the events table directly. testSpecificMock
        // registers priority-999 mockttp RULES on the /proxy path, which raw
        // arrivals would otherwise never see — the app would get the DEFAULT
        // mock (e.g. a 0-ETH accounts-API balance) even though the test
        // registered an override. The loopback makes every mock layer (rules
        // AND events) apply to every ingress; the marker header preserves
        // device-proxy source semantics and is stripped before any live
        // forward. /proxy ingress is terminal, so re-entry cannot recurse.
        const loopbackUrl = `http://127.0.0.1:${
          this._serverPort
        }/proxy?url=${encodeURIComponent(request.url)}`;
        const relayedResult = await handleDirectFetch(
          loopbackUrl,
          method,
          {
            ...request.headers,
            [DEVICE_PROXY_INGRESS_MARKER_HEADER]: '1',
          },
          bodyText,
        );
        return withCorsResponseHeaders(relayedResult, request.headers);
      } catch (error) {
        // Client dropped the connection before we could respond (e.g. bridge
        // controller AbortController fired mid-request). Return a benign
        // response so mockttp doesn't surface an unhandled rejection.
        if (error instanceof Error && error.message === 'Aborted') {
          return { statusCode: 499, body: '' };
        }
        throw error;
      } finally {
        this._activeRequests--;
      }
    });
  }

  /**
   * Bridges device-proxied WebSocket traffic aimed at a local fallback port
   * to the host-side mock WebSocket server's actual (dynamically allocated)
   * port.
   *
   * Why this exists: shim.js reroutes known WS services to
   * `ws://localhost:<fallbackPort>`, which normally travels the adb-reverse
   * path on Android. But the emulator's global proxy does not reliably apply
   * the exclusion list to WebSocket upgrades, so these connections can arrive
   * at mockttp instead. The host-side server does NOT listen on the fallback
   * port (that's only the device-side adb-reverse alias), so a blanket
   * passthrough would dial a dead port and ECONNREFUSED. This mirrors the
   * HTTP-side local-resource translation (getProxyForwardUrl) for WebSockets.
   *
   * Implementation notes (validated against mockttp 4.x behavior):
   *
   * Registered at priority 2 (above RulePriority.DEFAULT = 1) because mockttp
   * returns the FIRST unused matching rule within a priority set, so a
   * later-registered bridge can never beat the blanket
   * `forAnyWebSocket().thenPassThrough()` from start() at equal priority.
   *
   * Uses a `.matching()` callback instead of `.withUrlMatching()` because
   * mockttp's normalizeUrl mangles ws/wss URLs ("ws://x" becomes "ws//x"),
   * so protocol-anchored URL regexes silently never match WebSocket rules.
   */
  async bridgeLocalWebSocketPort(
    fallbackPort: number,
    actualPort: number,
  ): Promise<void> {
    await this.server
      .forAnyWebSocket()
      .asPriority(2)
      .matching((request) => {
        try {
          const url = new URL(request.url);
          return (
            DEVICE_LOCAL_HOST_ALIASES.has(url.hostname) &&
            url.port === String(fallbackPort)
          );
        } catch {
          return false;
        }
      })
      .thenForwardTo(`ws://localhost:${actualPort}`);
    logger.info(
      `[E2E_NATIVE_PROXY_WS_LOCAL_BRIDGE] device fallback port ${fallbackPort} -> host port ${actualPort}`,
    );
  }

  /**
   * Tracks request context so the 'response' subscription can log which
   * request a status belongs to — mockttp's CompletedResponse only carries
   * the request id. Rule-served (priority-999) mock responses produce no
   * other log line, which previously made mock serving invisible in CI logs.
   */
  private _trackHttpRequestForResponseLog = (
    request: InitiatedRequest,
  ): void => {
    let target = request.url;
    if (isShimProxyRequest(request.path)) {
      try {
        target = new URL(request.url).searchParams.get('url') ?? request.url;
      } catch {
        // Keep the raw URL when the wrapper is malformed.
      }
    }
    if (isUrlSuppressedFromLogs(target)) {
      return;
    }
    this._httpRequestLogContextById.set(
      request.id,
      `${request.method} ${redactNativeProxyUrl(target)}`,
    );
  };

  private _logHttpProxyResponseServed = (response: CompletedResponse): void => {
    const context = this._httpRequestLogContextById.get(response.id);
    if (!context) {
      return;
    }
    this._httpRequestLogContextById.delete(response.id);
    logger.info(
      `[E2E_PROXY_RESPONSE_SERVED] ${context} status=${response.statusCode}`,
    );
  };

  private _logNativeProxyWebSocketRequest = (
    request: CompletedRequest,
  ): void => {
    const redactedUrl = redactNativeProxyUrl(request.url);
    this._webSocketUrlsByStreamId.set(request.id, redactedUrl);

    logger.warn(
      `[E2E_NATIVE_PROXY_WS_REQUEST] ${request.method} ${redactedUrl} protocol=${request.protocol} host=${getRequestHost(request)}`,
    );
  };

  private _logNativeProxyWebSocketAccepted = (
    response: CompletedResponse,
  ): void => {
    logger.warn(
      `[E2E_NATIVE_PROXY_WS_ACCEPTED] streamId=${response.id} status=${response.statusCode} url=${this._getNativeProxyWebSocketUrl(response.id)}`,
    );
  };

  private _logNativeProxyWebSocketMessageReceived = (
    message: WebSocketMessage,
  ): void => {
    this._logNativeProxyWebSocketMessage(
      'E2E_NATIVE_PROXY_WS_MESSAGE_RECEIVED',
      message,
    );
  };

  private _logNativeProxyWebSocketMessageSent = (
    message: WebSocketMessage,
  ): void => {
    this._logNativeProxyWebSocketMessage(
      'E2E_NATIVE_PROXY_WS_MESSAGE_SENT',
      message,
    );
  };

  private _logNativeProxyWebSocketClose = (close: WebSocketClose): void => {
    logger.warn(
      `[E2E_NATIVE_PROXY_WS_CLOSE] streamId=${close.streamId} url=${this._getNativeProxyWebSocketUrl(close.streamId)} closeCode=${
        close.closeCode ?? 'unknown'
      } closeReason=${close.closeReason || 'none'}`,
    );
    this._webSocketUrlsByStreamId.delete(close.streamId);
  };

  private _logNativeProxyWebSocketMessage(
    marker: string,
    message: WebSocketMessage,
  ): void {
    const { summary, methods, isBalanceCandidate } =
      summarizeWebSocketMessage(message);
    const url = this._getNativeProxyWebSocketUrl(message.streamId);

    logger.warn(
      `[${marker}] streamId=${message.streamId} url=${url} ${summary}`,
    );

    if (isBalanceCandidate) {
      logger.warn(
        `[E2E_NATIVE_PROXY_WS_BALANCE_CANDIDATE] streamId=${
          message.streamId
        } url=${url} methods=${Array.from(new Set(methods)).join(',')}`,
      );
    }
  }

  private _getNativeProxyWebSocketUrl(streamId: string): string {
    return this._webSocketUrlsByStreamId.get(streamId) ?? 'unknown';
  }

  /**
   * Puts the server into draining mode — handlers return 503 immediately
   * without forwarding. Call this before stopping backend services (Anvil/Ganache)
   * to prevent forwarding requests to dead backends during cleanup.
   */
  startDraining(): void {
    logger.info(
      'MockServer entering drain mode — new requests will receive 503',
    );
    this._shuttingDown = true;
  }

  /**
   * Removes the lifecycle-wide abort filter. Call this AFTER all cleanup is
   * complete to ensure late async "Aborted" rejections are caught.
   *
   * This method is intentionally async: CI logs show abort events firing up to
   * ~200ms AFTER all cleanup has completed and this method is called. We hold
   * the filter active for an extra 500ms before restoring Jest's handlers so
   * those stragglers are still suppressed rather than recorded as test failures.
   */
  async removeAbortFilter(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this._removeAbortFilter();
  }

  async stop(): Promise<void> {
    logger.info('Mock server shutting down');
    if (!this._server) {
      this._serverStatus = ServerStatus.STOPPED;
      return;
    }

    // Signal handlers to stop processing new requests. Any request arriving
    // after this flag is set will have its body consumed (preventing mockttp's
    // streamToBuffer from producing an unhandled rejection) and receive 503.
    this._shuttingDown = true;

    // Wait for in-flight request handlers to complete. This is the key to
    // avoiding the "Aborted" unhandled rejections: mockttp's stop() calls
    // destroy() which immediately kills all TCP connections. If a handler is
    // still running (e.g. awaiting handleDirectFetch to a real backend), the
    // IncomingMessage is aborted and streamToBuffer rejects its promise.
    // By waiting for handlers to finish, destroy() only kills idle connections.
    await this._waitForActiveRequests();

    try {
      if (this._server) {
        await this._server.stop();
      }
      // Brief drain period: 'aborted' events from destroyed sockets may fire
      // asynchronously on the next event-loop tick after `stop()` resolves.
      // 500ms is generous for CI environments where event-loop ticks may be delayed.
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Error stopping mock server:', error);
    } finally {
      this._webSocketUrlsByStreamId.clear();
      this._httpRequestLogContextById.clear();
      this._shuttingDown = false;
      this._server = null;
      this._serverStatus = ServerStatus.STOPPED;
      // Release the port after server is stopped
      if (this._serverPort > 0) {
        PortManager.getInstance().releasePort(ResourceType.MOCK_SERVER);
      }
    }
  }

  /**
   * Checks whether an error is a mockttp "Aborted" error from streamToBuffer.
   */
  private static _isMockttpAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message === 'Aborted' &&
      (error.stack?.includes('mockttp') ?? false)
    );
  }

  /**
   * Installs lifecycle-wide filters for mockttp "Aborted" errors on BOTH
   * `unhandledRejection` AND `uncaughtException`.
   *
   * When the app unexpectedly drops connections during a test (e.g., UI transitions,
   * RN bridge interruptions), mockttp's internal `streamToBuffer` rejects with
   * `Error('Aborted')` from `buffer-utils.ts`. Depending on the Node.js runtime
   * behaviour and how the error surfaces through mockttp's internals, this can appear
   * as either an unhandled promise rejection OR an uncaught exception (e.g. from a
   * stream 'error' event with no listener, or a throw inside a setImmediate callback).
   *
   * jest-circus installs the same `uncaught` handler on both event types, so we must
   * intercept both to prevent the error from being recorded as a test failure.
   *
   * The filters are active for the entire server lifecycle (start → stop).
   */
  private _installAbortFilter(): void {
    if (this._abortFilterHandler) {
      return; // Already installed
    }

    this._abortSuppressCount = 0;

    // --- unhandledRejection filter ---
    this._originalRejectionHandlers = process
      .rawListeners('unhandledRejection')
      .slice() as ((...args: unknown[]) => void)[];
    process.removeAllListeners('unhandledRejection');

    this._abortFilterHandler = (reason: unknown, promise: unknown) => {
      const rejectedPromise = promise as Promise<unknown>;
      if (MockServerE2E._isMockttpAbortError(reason)) {
        // Mark the promise as handled so Node.js does not consider it unhandled.
        // eslint-disable-next-line no-empty-function
        rejectedPromise.catch(() => {});
        this._abortSuppressCount++;
        logger.debug(
          `Suppressed mockttp Aborted rejection (#${this._abortSuppressCount})`,
        );
        return;
      }

      // Forward any other unhandled rejection to the original handlers (e.g. Jest).
      if (this._originalRejectionHandlers.length === 0) {
        throw reason;
      }
      let firstError: unknown;
      for (const handler of this._originalRejectionHandlers) {
        try {
          handler(reason, rejectedPromise);
        } catch (err) {
          if (firstError === undefined) {
            firstError = err;
          }
        }
      }
      if (firstError !== undefined) {
        throw firstError;
      }
    };

    process.on('unhandledRejection', this._abortFilterHandler);

    // --- uncaughtException filter ---
    this._originalExceptionHandlers = process
      .rawListeners('uncaughtException')
      .slice() as ((...args: unknown[]) => void)[];
    process.removeAllListeners('uncaughtException');

    this._abortExceptionHandler = (error: unknown, origin: unknown) => {
      if (MockServerE2E._isMockttpAbortError(error)) {
        this._abortSuppressCount++;
        logger.debug(
          `Suppressed mockttp Aborted exception (#${this._abortSuppressCount})`,
        );
        return;
      }

      // Forward any other exception to the original handlers (e.g. Jest).
      if (this._originalExceptionHandlers.length === 0) {
        throw error;
      }
      let firstError: unknown;
      for (const handler of this._originalExceptionHandlers) {
        try {
          handler(error, origin);
        } catch (err) {
          if (firstError === undefined) {
            firstError = err;
          }
        }
      }
      if (firstError !== undefined) {
        throw firstError;
      }
    };

    process.on('uncaughtException', this._abortExceptionHandler);

    logger.info(
      `Abort filter installed — listeners: unhandledRejection=${process.listenerCount('unhandledRejection')}, uncaughtException=${process.listenerCount('uncaughtException')}`,
    );
  }

  /**
   * Removes the lifecycle-wide Aborted error filters and restores original handlers.
   * Any handlers added by other code during the filter's lifetime are preserved.
   */
  private _removeAbortFilter(): void {
    if (!this._abortFilterHandler) {
      return;
    }

    // --- Restore unhandledRejection handlers ---
    const currentRejectionHandlers = process
      .rawListeners('unhandledRejection')
      .slice();
    const addedRejectionDuringLifecycle = currentRejectionHandlers.filter(
      (h) =>
        h !== this._abortFilterHandler &&
        !this._originalRejectionHandlers.includes(
          h as (...args: unknown[]) => void,
        ),
    );

    process.removeAllListeners('unhandledRejection');
    for (const handler of [
      ...this._originalRejectionHandlers,
      ...(addedRejectionDuringLifecycle as ((...args: unknown[]) => void)[]),
    ]) {
      process.on('unhandledRejection', handler);
    }

    // --- Restore uncaughtException handlers ---
    if (this._abortExceptionHandler) {
      const currentExceptionHandlers = process
        .rawListeners('uncaughtException')
        .slice();
      const addedExceptionDuringLifecycle = currentExceptionHandlers.filter(
        (h) =>
          h !== this._abortExceptionHandler &&
          !this._originalExceptionHandlers.includes(
            h as (...args: unknown[]) => void,
          ),
      );

      process.removeAllListeners('uncaughtException');
      for (const handler of [
        ...this._originalExceptionHandlers,
        ...(addedExceptionDuringLifecycle as ((...args: unknown[]) => void)[]),
      ]) {
        process.on('uncaughtException', handler);
      }
    }

    this._abortFilterHandler = null;
    this._abortExceptionHandler = null;
    this._originalRejectionHandlers = [];
    this._originalExceptionHandlers = [];

    logger.info(
      `Abort filter removed — suppressed ${this._abortSuppressCount} mockttp "Aborted" error(s) during server lifecycle`,
    );
    this._abortSuppressCount = 0;
  }

  /**
   * Waits for all active request handler callbacks to complete.
   * Polls every 50ms until _activeRequests reaches 0 or the timeout expires.
   *
   * @param timeoutMs - Maximum time to wait (default 5s, generous for slow CI)
   */
  private async _waitForActiveRequests(timeoutMs = 5000): Promise<void> {
    if (this._activeRequests === 0) {
      return;
    }
    logger.info(
      `Waiting for ${this._activeRequests} active request(s) to complete before shutdown...`,
    );
    const start = Date.now();
    while (this._activeRequests > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (this._activeRequests > 0) {
      logger.warn(
        `${this._activeRequests} request(s) still active after ${timeoutMs}ms timeout, proceeding with shutdown`,
      );
    } else {
      logger.info(
        `All requests drained in ${Date.now() - start}ms, proceeding with shutdown`,
      );
    }
  }

  /**
   * Number of OS-proxy-intercepted native requests observed this test. Used by
   * the device-proxy canary spec to assert the proxy is actually on the path
   * (> 0); it is 0 when the proxy is dormant (e.g. Detox iOS in Phase 0).
   */
  getDeviceProxyRequestCount(): number {
    return this._server?._deviceProxyRequestCount ?? 0;
  }

  /**
   * Emits the N4 warn-only summary of device-proxy traffic and returns it.
   * Warn-only by design: unmocked native traffic is surfaced as an inventory,
   * not failed — enforcement is a deliberate later step (vs. validateLiveRequests,
   * which fails the test for unmocked shim traffic). Returns an empty summary
   * when the proxy never engaged (no native arrivals).
   */
  summarizeDeviceProxyTraffic(): DeviceProxyTrafficSummary {
    const summary = buildDeviceProxySummary(
      this._server?._deviceProxyRequestCount ?? 0,
      this._server?._deviceProxyUnmocked ?? [],
    );

    if (summary.totalRequests === 0) {
      return summary;
    }

    const hostList = summary.hosts
      .map(({ host, count }) => `${host}(${count})`)
      .join(', ');
    logger.warn(
      `[E2E_DEVICE_PROXY_UNMOCKED_SUMMARY] total=${summary.totalRequests} unmocked=${summary.unmockedCount} hosts=${hostList}`,
    );
    return summary;
  }

  validateLiveRequests(): void {
    const mockServer = this._server;
    if (!mockServer?._liveRequests || mockServer._liveRequests.length === 0) {
      return;
    }

    const uniqueRequests = Array.from(
      new Map(
        mockServer._liveRequests.map((req) => [
          `${req.method} ${req.url}`,
          req,
        ]),
      ).values(),
    );

    const requestsSummary = uniqueRequests
      .map(
        (req, index) =>
          `${index + 1}. [${req.method}] ${req.url} (${req.timestamp})`,
      )
      .join('\n');

    const totalCount = mockServer._liveRequests.length;
    const uniqueCount = uniqueRequests.length;
    const message =
      `Test made ${totalCount} unmocked request(s) (${uniqueCount} unique):\n${requestsSummary}\n\n` +
      "Check your test-specific mocks or add them to the default mocks.\n You can also add the URL to the allowlist if it's a known live request.";
    logger.error(message);
    throw new Error(message);
  }

  private _sanitizeJson(value: unknown, ignoreFields: string[]): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this._sanitizeJson(item, ignoreFields));
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (ignoreFields.includes(key)) continue;
        result[key] = this._sanitizeJson(val, ignoreFields);
      }
      return result;
    }
    return value;
  }
}
