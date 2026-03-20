/**
 * Shared nock helpers for component view tests that mock external HTTP APIs.
 * Use these so all API-mocking features share the same teardown behavior and
 * tests can combine multiple feature mocks without leaks.
 *
 * Usage:
 * - In your feature's setup (e.g. setupXxxApiMock): call nock.cleanAll() and
 * nock.disableNetConnect() before defining interceptors, then nock('<origin>').get(...).reply(...).persist().
 * - In afterEach: call clearAllNockMocks() (or your feature's clearXxxMocks() which should call this).
 *
 * @see tests/component-view/api-mocking/ (e.g. trending.ts) and references/navigation-mocking.md
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';

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
 * Disables real network connections for the current test run. Call at the
 * start of your feature's setup (e.g. in setupXxxApiMock) so unmocked requests
 * fail fast instead of hitting the network.
 */
export function disableNetConnect(): void {
  nock.disableNetConnect();
}

/**
 * Restores nock to a clean state: removes all interceptors and re-enables
 * net connect. Use in afterEach if you need to fully reset nock (e.g. when
 * switching between test suites that use different mock strategies).
 * Most tests only need clearAllNockMocks().
 */
export function teardownNock(): void {
  nock.cleanAll();
  nock.enableNetConnect();
}
