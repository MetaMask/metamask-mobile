/**
 * Fails a component-view test that lets app code make an unmocked HTTP request
 * or open an unmocked WebSocket.
 *
 * Nock rejects unmocked requests with `NetConnectNotAllowedError`, but app
 * code often catches that error (a service `catch` returning null, a loader
 * left up), so the failure never reaches the test. Nock also emits a
 * `no match` event on its global emitter at the request layer — before any
 * promise is rejected — so the guard records those events in a per-test
 * registry and a root-level `afterEach` fails the test when the registry is
 * non-empty, independent of how the app propagates the error. Nock's
 * interceptors never see Node's built-in WebSocket, so the setup also swaps
 * it for a stub that records every construction (`Unmocked WebSocket: <url>`).
 *
 * Both installs happen from `setupFilesAfterEnv` (`testSetupView.js`), so
 * blocking applies to every component-view test with no per-test opt-in. The
 * listener and the registries live on the per-file Nock module instance, so
 * they do not leak to the next suite in the same Jest worker.
 */
/* global globalThis */
/* eslint-disable import-x/no-commonjs */

// eslint-disable-next-line import-x/no-extraneous-dependencies
const nock = require('nock');
const {
  refreshDefaultFetchSpy,
} = require('../../../tests/component-view/api-mocking/fetchStub');

/**
 * Hosts nock still lets through for real. Environmental noise only (e.g.
 * BrowserStack Local agents polling bs-local.com), not app requests.
 */
const ALLOWED_NET_CONNECT = /127\.0\.0\.1|localhost|bs-local\.com/;

const blockedRequests = new Map();
const blockedWebSockets = new Map();
let installed = false;

// True between a test's beforeEach and the start of its afterEach check. The
// emitters can also fire for stragglers from a finished test; those belong to
// no running test and would otherwise be blamed on the next one.
let currentTestActive = false;

// Nock layers stack when a test file leaves its nock instance active and the
// next file in the same Jest worker activates its own. The applied layers are
// keyed on the shared core `http` module (Jest gives every test file its own
// global, but core modules are shared across module registries — the same
// property socketLeakGuard relies on when it patches `net`), so the next
// file's install can unwind every stale layer.
const NET_CONNECT_LAYERS = Symbol.for('metamask.netConnectGuard.layers');

// eslint-disable-next-line import-x/no-nodejs-modules
const httpModule = require('http');

const getNetConnectLayers = () => {
  const layers = httpModule[NET_CONNECT_LAYERS] ?? new Map();
  httpModule[NET_CONNECT_LAYERS] = layers;
  return layers;
};

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

/** Unwraps every nock layer a previous test file left applied. */
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

/** Builds the blocked request from the shapes Nock passes to the `no match`
 * event: a plain options object (host never mocked) or a
 * `(ClientRequest, options, body)` triple (host mocked, request unmatched). */
const extractRequestFromEvent = (target, options) => {
  for (const candidate of [options, target]) {
    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate.host === 'string' &&
      typeof candidate.path === 'string'
    ) {
      return {
        method: String(candidate.method || 'GET').toUpperCase(),
        scheme:
          candidate.proto ||
          String(candidate.protocol ?? 'http:').replace(/:$/, '') ||
          'http',
        host: candidate.host,
        path: candidate.path || '/',
      };
    }
  }
  return null;
};

/** Renders `METHOD scheme://host/path` without a default port. */
const formatRequest = ({ method, scheme, host, path }) => {
  const hostWithoutDefaultPort = host.replace(/:(443|80)$/, '');
  return `${method} ${scheme}://${hostWithoutDefaultPort}${path}`;
};

/** One entry per recorded key, with the repeat count beyond the first. */
const formatEntries = (entries, prefix) =>
  Array.from(entries, ([key, count]) => {
    const line = prefix ? `${prefix}: ${key}` : key;
    return count > 1 ? `${line} (${count} times)` : line;
  });

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

const recordBlockedWebSocket = (url) => {
  if (!currentTestActive) {
    return;
  }
  blockedWebSockets.set(url, (blockedWebSockets.get(url) ?? 0) + 1);
};

/**
 * Lets queued work settle so requests issued right before the last assertion
 * still reach the emitter before the registry is checked. Bounded to a few
 * immediate rounds and stops early once the registries stabilize, so this is
 * a yield, not a sleep.
 */
const flushPendingRequests = async () => {
  for (let round = 0; round < 4; round += 1) {
    const before = blockedRequests.size + blockedWebSockets.size;
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    if (blockedRequests.size + blockedWebSockets.size === before) {
      break;
    }
  }
};

/**
 * Fails the current test when it made unmocked HTTP requests or opened an
 * unmocked WebSocket, and resets both registries either way.
 *
 * @param {string | undefined} testName - Full name of the current test.
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
        ...formatEntries(blockedRequests).map((request) => `  ${request}`),
        'Add a nock interceptor for each request in tests/component-view/api-mocking/ (see nockHelpers.ts).',
      );
    }
    if (blockedWebSockets.size > 0) {
      lines.push(
        ...formatEntries(blockedWebSockets, 'Unmocked WebSocket'),
        'Provide a fake WebSocket via setupFakeWebSocket in tests/component-view/api-mocking/webSocket.ts.',
      );
    }
    throw new Error(lines.join('\n'));
  } finally {
    blockedRequests.clear();
    blockedWebSockets.clear();
  }
};

/** Removes listeners a previous nock activation left on the shared
 * interceptor instances: restore disposes the patches but not the listeners,
 * so every restore/activate cycle would otherwise answer each request
 * several times (the extra answer then finds the request already handled and
 * throws `InterceptorError` from a timer callback). */
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
 * the loopback allowlist (environmental noise only).
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

/** A WebSocket stand-in that never connects; constructions are recorded. */
const createWebSocketTripwire = () => {
  /* eslint-disable no-empty-function */
  class UnmockedWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    url = '';
    readyState = UnmockedWebSocket.CONNECTING;
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

/** Replaces `globalThis.WebSocket` with the tripwire. `webSocket.ts`'s fake
 * swaps it back when a test provides its own socket. */
const installWebSocketTripwire = () => {
  globalThis.WebSocket = createWebSocketTripwire();
};

/**
 * Installs the guard for this test file: blocks net connect, records every
 * `no match` into the per-test registry, re-blocks before each test, fails
 * the test in the root-level `afterEach` when a registry is non-empty, and
 * restores the file's Nock instance afterwards so its patches do not outlive
 * the file.
 */
const installNetConnectGuard = () => {
  if (installed) {
    return;
  }
  installed = true;

  // Requiring nock applies this file's own layer on whatever the previous
  // file in the worker left behind. Undo ours first, then unwind the stale
  // ones, so the fresh activation below starts from the pristine modules.
  if (nock.isActive()) {
    nock.restore();
  }
  unwindStaleNetConnectLayers();
  blockNetConnect();
  nock.emitter.on('no match', recordBlockedRequest);

  beforeEach(async () => {
    // Quiesce before this test's window opens: stragglers from the previous
    // test resolving across the boundary are dropped instead of attributed to
    // this test, which did not issue them.
    currentTestActive = false;
    blockNetConnect();
    await flushPendingRequests();
    currentTestActive = true;
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
