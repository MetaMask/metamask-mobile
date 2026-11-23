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
import { closeTrackedSockets } from '../../../app/util/test/socketLeakGuard';

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
 * connect, and deactivates interception entirely.
 *
 * Nock v15 intercepts at the process-wide socket layer, so an interceptor
 * left active after a suite would also see — and block or answer — requests
 * made by later suites sharing the same Jest worker. Deactivating here hands
 * the socket layer back between files; the next nock import (or
 * `disableNetConnect`) activates it again. The dispose also destroys the
 * client's idle keep-alive sockets, which is what used to leave half-open TLS
 * sockets that broke later suites (e.g. ChoosePassword `read EINVAL` after
 * Ramp Quotes).
 */
export function teardownNock(): void {
  nock.cleanAll();
  nock.enableNetConnect();
  nock.restore();
}

/**
 * Converts the `Request` object nock v15 passes to reply functions into the
 * `uri` string (path + query) nock v14 used to pass, so reply callbacks keep
 * working with paths like `/v1/orders?account=0x...`.
 *
 * @param request - The web-standard `Request` nock v15 hands to reply functions.
 * @returns The request path including its query string, without the origin.
 */
export function nockRequestUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

/**
 * Disables real network connections for the current test run. Call at the
 * start of your feature's setup (e.g. in setupXxxApiMock) so unmocked requests
 * fail fast instead of hitting the network.
 *
 * Nock v15 intercepts at the process-wide socket layer. A request riding on a
 * keep-alive socket opened by an earlier passthrough (real-network) test of
 * the same file never opens a new connection, so it would bypass every
 * interceptor registered here. Destroy the sockets this file opened so far
 * (the same treatment the socket leak guard applies at file end) so the next
 * requests connect afresh and are intercepted.
 */
export function disableNetConnect(): void {
  closeTrackedSockets();
  if (!nock.isActive()) {
    nock.activate();
  }
  nock.disableNetConnect();
  // Each enableNetConnect(matcher) call overwrites the previous allowlist
  // matcher (single assignment). Both patterns must be combined into
  // one regex so neither is lost. Include bs-local.com for BrowserStack Local
  // agents that may poll during local / CI component-view runs.
  nock.enableNetConnect(/127\.0\.0\.1|localhost|bs-local\.com/);
}
