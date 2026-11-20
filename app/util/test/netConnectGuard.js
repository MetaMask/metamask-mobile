/**
 * Fails a component-view test that lets app code make an unmocked HTTP request
 * or open an unmocked WebSocket.
 *
 * Nock rejects unmocked requests with `NetConnectNotAllowedError`, but app
 * code often catches that error, so the failure never reaches the test. Nock
 * also emits a `no match` event at the request layer — before any promise is
 * rejected — so the guard records those events in a per-test registry and a
 * root-level `afterEach` fails the test when the registry is non-empty,
 * independent of how the app propagates the error. Nock never sees Node's
 * built-in WebSocket, so the setup also stubs it (recorded the same way).
 * Both installs happen from `setupFilesAfterEnv` (`testSetupView.js`) with
 * no per-test opt-in; the state lives on the per-file Nock instance.
 */
/* global globalThis */
/* eslint-disable import-x/no-commonjs */

// eslint-disable-next-line import-x/no-extraneous-dependencies
// Nock 15 is ESM-only; under Node's require(esm) the require returns the
// module namespace, so fall back to its default export.
const nockModule = require('nock');
const nock = nockModule.default ?? nockModule;
const {
  installDefaultApiMocks,
} = require('../../../tests/component-view/api-mocking/defaults');

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

/** Builds the blocked request from the shapes Nock 15 passes to the `no
 * match` event: a URL-options object, a web-standard `Request`, or a
 * `(ClientRequest, options)` pair. */
const extractRequestFromEvent = (...args) => {
  for (const candidate of args) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    const url =
      typeof candidate.url === 'string'
        ? candidate.url
        : typeof candidate.href === 'string'
          ? candidate.href
          : null;
    if (url) {
      try {
        const parsed = new URL(url);
        return {
          method: String(candidate.method || 'GET').toUpperCase(),
          scheme: parsed.protocol.replace(/:$/, ''),
          host: parsed.host,
          path: `${parsed.pathname}${parsed.search}`,
        };
      } catch {
        continue;
      }
    }
    const host = candidate.host ?? candidate.hostname;
    if (typeof host === 'string' && typeof candidate.path === 'string') {
      return {
        method: String(candidate.method || 'GET').toUpperCase(),
        scheme: String(candidate.proto ?? candidate.protocol ?? 'https:')
          .replace(/:$/, '')
          .replace(/^https$/, 'https'),
        host,
        path: candidate.path,
      };
    }
  }
  return null;
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
  const key = `${request.method} ${request.scheme}://${request.host.replace(/:(443|80)$/, '')}${request.path}`;
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
 * @throws {Error} With the blocked requests, their test, and the hints.
 */
const checkBlockedRequests = async (testName) => {
  // The flush still belongs to the finished test — recording stays on through
  // it, so late emissions are caught. Only after it may new emissions be
  // treated as between-test stragglers.
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
 * several times, and the extra answer throws `InterceptorError` from a timer
 * callback. */
const removeStaleInterceptorListeners = () => {
  // eslint-disable-next-line import-x/no-extraneous-dependencies
  const nodeInterceptorsModule = require('@mswjs/interceptors/presets/node');
  const nodeInterceptors =
    nodeInterceptorsModule.default ?? nodeInterceptorsModule;
  for (const interceptor of nodeInterceptors) {
    interceptor.removeAllListeners?.('request');
    interceptor.removeAllListeners?.('unhandledException');
  }
};

/** Blocks net connect for the run, keeping the loopback allowlist. */
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

/** Installs the guard for this test file: blocks net connect, records every
 * `no match`, re-blocks before each test, fails the test in the root-level
 * `afterEach` when a registry is non-empty, and restores Nock afterwards. */
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

  beforeEach(() => {
    currentTestActive = true;
    blockNetConnect();
    installDefaultApiMocks();
  });
  afterEach(() => checkBlockedRequests(expect.getState().currentTestName));
  afterAll(() => {
    if (nock.isActive()) {
      nock.restore();
    }
    removeStaleInterceptorListeners();
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
