/**
 * Fails a component-view test that lets app code make an unmocked HTTP request.
 *
 * Nock rejects an unmocked request with `NetConnectNotAllowedError`, but app
 * code often catches that error (a service `catch` returning null, a loader
 * left up), so the failure never reaches the test. Nock also emits a
 * `no match` event on its global emitter at the request layer — before any
 * promise is rejected — so the guard records those events in a per-test
 * registry and a root-level `afterEach` fails the test when the registry is
 * non-empty. The failure therefore does not depend on the app propagating the
 * error, and it surfaces requests fired after the last assertion too.
 *
 * `installNetConnectGuard()` and `installWebSocketTripwire()` are called from
 * `setupFilesAfterEnv` (`testSetupView.js`), so blocking applies to every
 * component-view test with no per-test opt-in. Like the other guards, the
 * emitter listener and the registries live on the per-file Nock module
 * instance, so they do not leak to the next suite in the same Jest worker.
 */

/* eslint-disable import-x/no-commonjs */

// eslint-disable-next-line import-x/no-extraneous-dependencies
const nock = require('nock');

/**
 * Hosts nock still lets through for real. Environmental noise only (e.g.
 * BrowserStack Local agents polling bs-local.com during local / CI runs),
 * not requests made by the app under test. Requests to these hosts are not
 * recorded; everything else is.
 */
const ALLOWED_NET_CONNECT = /127\.0\.0\.1|localhost|bs-local\.com/;

const blockedRequests = new Map();

// WebSocket URLs the current test opened. nock's interceptors (mswjs
// 0.41.3) do not see Node's built-in WebSocket at all — a `wss://` probe
// with net connect disabled really connected — so the tripwire below is the
// only thing that notices.
const blockedWebSockets = new Map();

let installed = false;

// True between a test's beforeEach and the start of its afterEach check. The
// emitters can also fire for stragglers from a finished test; those belong to
// no running test and would otherwise be blamed on the next one.
let currentTestActive = false;

// Nock layers stack when a test file leaves its nock instance active and the
// next file in the same Jest worker activates its own: `http.ClientRequest`
// and the global fetch end up wrapped once per file, and a blocked request
// then travels through several error paths. The applied layers are keyed on
// the shared core `http` module (Jest gives every test file its own global,
// but core modules are shared across module registries — the same property
// socketLeakGuard relies on when it patches `net`), so the next file's
// install can unwind every stale layer and start from the pristine modules.
const NET_CONNECT_LAYERS = Symbol.for('metamask.netConnectGuard.layers');

// eslint-disable-next-line import-x/no-nodejs-modules
const httpModule = require('http');

const getNetConnectLayers = () => {
  const layers = httpModule[NET_CONNECT_LAYERS] ?? new Map();
  httpModule[NET_CONNECT_LAYERS] = layers;
  return layers;
};

/**
 * Records this file's nock layer so a later file can unwind it.
 *
 * @returns {void}
 */
const markNetConnectLayer = () => {
  const layers = getNetConnectLayers();
  if (!layers.has(nock)) {
    layers.set(nock, () => {
      if (nock.isActive()) {
        nock.restore();
      }
    });
  }
};

/**
 * Unwraps every nock layer a previous test file left applied, outermost
 * first, so this file activates on the pristine modules.
 *
 * @returns {void}
 */
const unwindStaleNetConnectLayers = () => {
  const layers = getNetConnectLayers();
  const stale = [...layers.entries()].filter(([instance]) => instance !== nock);
  stale.forEach(([instance]) => layers.delete(instance));
  for (const [, restore] of stale.reverse()) {
    try {
      restore();
    } catch {
      // Stale layers are unwound best-effort; blocking below still applies.
    }
  }
};

/**
 * Builds the blocked request from the shapes Nock passes to the `no match`
 * event: a plain options object (host never mocked) or a
 * `(ClientRequest, options, body)` triple (host mocked, request unmatched).
 *
 * @param {Array<unknown>} args - Arguments Nock emitted with the event.
 * @returns {{ method: string, scheme: string, host: string, path: string } |
 *   null} The request, or null when no argument carries a recognizable shape.
 */
const extractRequestFromEvent = (...args) => {
  let request = null;
  let scheme = '';
  for (const candidate of args) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    if (
      !request &&
      typeof candidate.host === 'string' &&
      typeof candidate.path === 'string'
    ) {
      request = {
        method: String(candidate.method || 'GET').toUpperCase(),
        host: candidate.host,
        path: candidate.path || '/',
      };
    }
    if (typeof candidate.proto === 'string' && candidate.proto) {
      scheme = candidate.proto;
    } else if (typeof candidate.protocol === 'string' && candidate.protocol) {
      scheme = candidate.protocol.replace(/:$/, '');
    }
  }
  return request ? { ...request, scheme: scheme || 'http' } : null;
};

/**
 * Renders `METHOD scheme://host/path` without a default port.
 *
 * @param {{ method: string, scheme: string, host: string, path: string }}
 *   request - Recorded request.
 * @returns {string} The display form of the request.
 */
const formatRequest = ({ method, scheme, host, path }) => {
  const hostWithoutDefaultPort = host.replace(/:(443|80)$/, '');
  return `${method} ${scheme}://${hostWithoutDefaultPort}${path}`;
};

/**
 * One blocked request per line, so the failure message stays copy-pastable.
 *
 * @returns {string[]} One `METHOD scheme://host/path` entry per request,
 *   suffixed with the repeat count when a request was blocked more than once.
 */
const formatBlockedRequests = () =>
  Array.from(blockedRequests.entries(), ([request, count]) =>
    count > 1 ? `${request} (${count} times)` : request,
  );

/**
 * One `Unmocked WebSocket: <url>` entry per opened socket, with the repeat
 * count when a test opened the same URL more than once.
 *
 * @returns {string[]} The display lines for the recorded WebSockets.
 */
const formatBlockedWebSockets = () =>
  Array.from(blockedWebSockets.entries(), ([url, count]) =>
    count > 1
      ? `Unmocked WebSocket: ${url} (${count} times)`
      : `Unmocked WebSocket: ${url}`,
  );

/**
 * Records a WebSocket URL the current test opened.
 *
 * @param {string} url - URL passed to the WebSocket constructor.
 * @returns {void}
 */
const recordBlockedWebSocket = (url) => {
  if (!currentTestActive) {
    return;
  }
  blockedWebSockets.set(url, (blockedWebSockets.get(url) ?? 0) + 1);
};

/**
 * Records a request the current test made that nock has no mock for.
 *
 * @param {...unknown} args - Arguments Nock passed with the `no match` event.
 * @returns {void}
 */
const recordBlockedRequest = (...args) => {
  if (!currentTestActive) {
    return;
  }
  const request = extractRequestFromEvent(...args);
  if (!request) {
    blockedRequests.set('(unrecognized request shape)', 1);
    return;
  }
  if (ALLOWED_NET_CONNECT.test(request.host)) {
    return;
  }
  const key = formatRequest(request);
  blockedRequests.set(key, (blockedRequests.get(key) ?? 0) + 1);
};

/**
 * Lets one macrotask pass so requests issued right before the last assertion
 * still reach the emitter before the registry is checked. Not a sleep: it
 * only yields to work that is already queued.
 *
 * @returns {Promise<void>} Resolves after the queued callbacks run.
 */
const flushPendingRequests = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

/**
 * Fails the current test when it made unmocked HTTP requests or opened an
 * unmocked WebSocket, and resets both registries either way so the next test
 * starts clean.
 *
 * @param {string | undefined} testName - Full name of the current test.
 * @returns {Promise<void>} Resolves when the check is done.
 * @throws {Error} With the blocked requests, their test, and the hints.
 */
const checkBlockedRequests = async (testName) => {
  // The flush still belongs to the finished test; only after it may new
  // emissions be treated as between-test stragglers.
  await flushPendingRequests();
  currentTestActive = false;
  try {
    if (blockedRequests.size === 0 && blockedWebSockets.size === 0) {
      return;
    }
    const lines = [];
    if (blockedRequests.size > 0) {
      lines.push(
        `Unmocked HTTP request(s) in "${testName ?? 'unknown test'}":`,
        ...formatBlockedRequests().map((request) => `  ${request}`),
        'Add a nock interceptor for each request in tests/component-view/api-mocking/ (see nockHelpers.ts).',
      );
    }
    if (blockedWebSockets.size > 0) {
      lines.push(
        ...formatBlockedWebSockets().map(
          (webSocket) => `Unmocked WebSocket: ${webSocket}`,
        ),
        'Provide a fake WebSocket via setupFakeWebSocket in tests/component-view/api-mocking/webSocket.ts.',
      );
    }
    throw new Error(lines.join('\n'));
  } finally {
    blockedRequests.clear();
    blockedWebSockets.clear();
  }
};

const removeStaleInterceptorListeners = () => {
  // eslint-disable-next-line import-x/no-extraneous-dependencies
  const nodeInterceptors = require('@mswjs/interceptors/presets/node');
  for (const interceptor of nodeInterceptors) {
    interceptor.removeAllListeners?.('request');
    interceptor.removeAllListeners?.('unhandledException');
  }
};

/**
 * Blocks real network connections for the whole component-view run, keeping
 * the loopback allowlist. Callers that need a mock only have to register one;
 * everything else is rejected and recorded by the guard.
 *
 * @returns {void}
 */
const blockNetConnect = () => {
  if (!nock.isActive()) {
    removeStaleInterceptorListeners();
    nock.activate();
  }
  nock.disableNetConnect();
  nock.enableNetConnect(ALLOWED_NET_CONNECT);
  markNetConnectLayer();
};

/**
 * A WebSocket stand-in that never connects. Constructions are recorded;
 * everything else (send, close, handlers) stays inert so app code that opens
 * a socket keeps running into the same never-connects world an unmocked
 * request lives in, and the test fails afterwards regardless of what the app
 * caught.
 *
 * @returns {typeof WebSocket} The tripwire constructor.
 */
const createWebSocketTripwire = () => {
  /* eslint-disable no-empty-function */
  class UnmockedWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url = '';
    readyState = UnmockedWebSocket.CONNECTING;
    bufferedAmount = 0;
    extensions = '';
    protocol = '';
    binaryType = 'blob';

    constructor(url) {
      this.url = String(url);
      recordBlockedWebSocket(this.url);
    }

    addEventListener() {}

    removeEventListener() {}

    dispatchEvent() {
      return false;
    }

    send() {}

    close() {}
  }
  /* eslint-enable no-empty-function */

  return UnmockedWebSocket;
};

/**
 * Replaces `globalThis.WebSocket` with the tripwire. Call once from the CV
 * setup. `tests/component-view/api-mocking/webSocket.ts` swaps it for a fake
 * when a test really needs a socket, and restores this afterwards.
 *
 * @returns {void}
 */
const installWebSocketTripwire = () => {
  globalThis.WebSocket = createWebSocketTripwire();
};

/**
 * Installs the guard for this test file: blocks net connect, records every
 * `no match` into the per-test registry, re-blocks before each test (feature
 * teardown helpers cycle nock's interceptors between tests), and fails the
 * test in the root-level `afterEach` when a registry is non-empty. The
 * file's Nock instance is restored afterwards so its patches do not outlive
 * the file.
 *
 * @returns {void}
 */
const installNetConnectGuard = () => {
  if (installed) {
    return;
  }
  installed = true;

  // Requiring nock applies this file's own layer on whatever the previous
  // file in the worker left behind. Undo ours first, then unwind the stale
  // ones, so the fresh activation below starts from the pristine modules.
  // BISECT-MINIMAL
  blockNetConnect();
  nock.emitter.on('no match', recordBlockedRequest);

  beforeEach(() => {
    currentTestActive = true;
    blockNetConnect();
  });
  afterEach(() => checkBlockedRequests(expect.getState().currentTestName));
  afterAll(() => {
    if (nock.isActive()) {
      nock.restore();
    }
  });
};

module.exports = {
  blockNetConnect,
  checkBlockedRequests,
  installNetConnectGuard,
  installWebSocketTripwire,
  isNetConnectGuardInstalled: () => installed,
  removeStaleInterceptorListeners,
};
