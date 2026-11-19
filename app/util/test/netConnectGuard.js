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
 * `installNetConnectGuard()` is called from `setupFilesAfterEnv`
 * (`testSetupView.js`), so blocking applies to every component-view test with
 * no per-test opt-in. Like the other guards, the emitter listener and the
 * registry live on the per-file Nock module instance, so they do not leak to
 * the next suite in the same Jest worker.
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

let installed = false;

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
 * Records a request the current test made that nock has no mock for.
 *
 * @param {...unknown} args - Arguments Nock passed with the `no match` event.
 * @returns {void}
 */
const recordBlockedRequest = (...args) => {
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
 * Fails the current test when it made unmocked HTTP requests, and resets the
 * registry either way so the next test starts clean.
 *
 * @param {string | undefined} testName - Full name of the current test.
 * @returns {Promise<void>} Resolves when the check is done.
 * @throws {Error} With the blocked requests, their test, and the hint.
 */
const checkBlockedRequests = async (testName) => {
  await flushPendingRequests();
  try {
    if (blockedRequests.size === 0) {
      return;
    }
    const lines = [
      `Unmocked HTTP request(s) in "${testName ?? 'unknown test'}":`,
      ...formatBlockedRequests().map((request) => `  ${request}`),
      'Add a nock interceptor for each request in tests/component-view/api-mocking/ (see nockHelpers.ts).',
    ];
    throw new Error(lines.join('\n'));
  } finally {
    blockedRequests.clear();
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
    nock.activate();
  }
  nock.disableNetConnect();
  nock.enableNetConnect(ALLOWED_NET_CONNECT);
};

/**
 * Installs the guard for this test file: blocks net connect, records every
 * `no match` into the per-test registry, re-blocks before each test (the
 * feature teardown helpers re-enable net connect so their state does not
 * leak to suites in other Jest workers), and fails the test in the root-level
 * `afterEach` when the registry is non-empty. The file's Nock instance is
 * restored afterwards so its patches do not outlive the file.
 *
 * @returns {void}
 */
const installNetConnectGuard = () => {
  if (installed) {
    return;
  }
  installed = true;

  blockNetConnect();
  nock.emitter.on('no match', recordBlockedRequest);

  beforeEach(blockNetConnect);
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
};
