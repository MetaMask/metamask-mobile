/**
 * Shared nock helpers for component view tests that mock external HTTP APIs.
 * Use these so all API-mocking features share the same teardown behavior and
 * tests can combine multiple feature mocks without leaks.
 *
 * Usage:
 * - In your feature's setup (e.g. setupXxxApiMock): call nock.cleanAll() and
 * nock.disableNetConnect() before defining interceptors, then nock('<origin>').get(...).reply(...).persist().
 * - When the caller uses global `fetch` (undici), also pass that same reply
 * body to `stubFetchPath(origin, path, body)` from `./fetchStub`. A nock
 * interceptor does not always settle undici, and a per-feature fetch spy
 * drifts from the nock payload. `clearXxxMocks` should call
 * `restoreFetchPath` for that target.
 * - In afterEach: call teardownNock() (or your feature's clearXxxMocks() which
 * should call it) so disableNetConnect does not leak to later suites in the
 * same Jest worker.
 *
 * @see tests/component-view/api-mocking/ (e.g. trending.ts) and references/navigation-mocking.md
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { blockNetConnect } from '../../../app/util/test/netConnectGuard';

/**
 * Clears all nock interceptors. Call in afterEach of any test file that uses
 * API mocks so the next test or suite does not see previous interceptors.
 * Feature-specific clear helpers (e.g. clearTrendingApiMocks) should call this
 * and any feature-specific cleanup (e.g. jest.clearAllMocks).
 */
export function clearAllNockMocks(): void {
  nock.cleanAll();
}

/**
 * Restores nock to a clean state: removes all interceptors, re-enables net
 * connect, and cycles restore/activate so @mswjs/interceptors (nock v14) does
 * not leave half-open TLS sockets that break later suites (e.g. ChoosePassword
 * `read EINVAL` after Ramp Quotes).
 *
 * The re-enable is deliberate: it stops this file's blocked state from
 * leaking into other suites in the same Jest worker. In component-view runs
 * the net connect guard re-blocks before every test (`testSetupView.js`), so
 * protection continues there.
 */
export function teardownNock(): void {
  nock.cleanAll();
  nock.enableNetConnect();
  if (nock.isActive()) {
    nock.restore();
  }
  nock.activate();
}

/**
 * Disables real network connections for the current test run. Call at the
 * start of your feature's setup (e.g. in setupXxxApiMock) so unmocked requests
 * fail fast instead of hitting the network.
 *
 * Delegates to the component-view net connect guard, which also records every
 * unmocked request and fails the test from its root-level `afterEach` (see
 * `app/util/test/netConnectGuard.js`).
 */
export function disableNetConnect(): void {
  blockNetConnect();
}
