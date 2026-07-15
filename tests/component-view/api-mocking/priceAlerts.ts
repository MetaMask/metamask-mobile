/**
 * Price Alerts API mock for component view tests.
 * Intercepts GET https://price-alerts.dev-api.cx.metamask.io/v1/alerts?asset=*
 *
 * Note: api.ts uses Engine.context.AuthenticationController.getBearerToken()
 * for the Authorization header — that is already stubbed in mocks.ts.
 *
 * Use in beforeEach/afterEach of ManagePriceAlertsView.view.test.tsx.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock, { type Scope } from 'nock';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';
import type { AbsolutePriceAlert } from '../../../app/components/UI/Assets/PriceAlerts/constants';

const PRICE_ALERTS_ORIGIN = 'https://price-alerts.dev-api.cx.metamask.io';
const ALERTS_PATH = '/v1/alerts';

export const mockPriceAlertsData: AbsolutePriceAlert[] = [
  {
    id: 'alert-1',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    type: 'absolute_price',
    threshold: 3000,
    recurring: true,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'alert-2',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    type: 'absolute_price',
    threshold: 1500,
    recurring: false,
    active: false,
    createdAt: '2025-01-02T00:00:00.000Z',
  },
];

/** Fixture for the alert returned by POST /v1/alerts in tests. */
export const mockCreatedAlert: AbsolutePriceAlert = {
  id: 'alert-new',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'absolute_price',
  threshold: 1300,
  recurring: true,
  active: true,
  createdAt: '2025-06-01T00:00:00.000Z',
};

/**
 * Sets up nock interceptors for the Price Alerts API.
 * Call in beforeEach of price-alerts view tests.
 *
 * Intercepts GET /v1/alerts only. Use {@link setupPriceAlertsPostMock} in
 * tests that also need to intercept POST /v1/alerts.
 *
 * @param alerts - The alerts to return from GET /v1/alerts. Defaults to mockPriceAlertsData.
 */
export function setupPriceAlertsApiMock(
  alerts: AbsolutePriceAlert[] = mockPriceAlertsData,
): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(PRICE_ALERTS_ORIGIN)
    .get(ALERTS_PATH)
    .query(true)
    .reply(200, alerts)
    .persist();
}

/**
 * Registers a one-shot POST /v1/alerts nock interceptor.
 * Call this inside the individual test that exercises alert creation,
 * after {@link setupPriceAlertsApiMock} has already been called in beforeEach.
 * Returns the nock scope so callers can assert `scope.isDone()`.
 */
export function setupPriceAlertsPostMock(): Scope {
  return nock(PRICE_ALERTS_ORIGIN)
    .post(ALERTS_PATH)
    .reply(201, mockCreatedAlert);
}

/**
 * Registers a one-shot DELETE /v1/alerts/:id nock interceptor.
 * Returns the nock scope so callers can assert `scope.isDone()`.
 */
export function setupPriceAlertsDeleteMock(alertId: string): Scope {
  return nock(PRICE_ALERTS_ORIGIN)
    .delete(`${ALERTS_PATH}/${alertId}`)
    .reply(200);
}

/**
 * Registers a one-shot PATCH /v1/alerts/:id nock interceptor.
 * Returns the nock scope so callers can assert `scope.isDone()`.
 */
export function setupPriceAlertsPatchMock(alertId: string): Scope {
  return nock(PRICE_ALERTS_ORIGIN)
    .patch(`${ALERTS_PATH}/${alertId}`)
    .reply(200);
}

/**
 * Sets up a nock interceptor for GET /v1/alerts/supported-chains.
 * Used by TokenDetails to determine if the bell icon should be shown.
 *
 * @param chains - The list of CAIP-2 chain identifiers to return. Defaults to ['eip155:1'].
 */
export function setupPriceAlertsSupportedChainsMock(
  chains: string[] = ['eip155:1'],
): void {
  nock(PRICE_ALERTS_ORIGIN)
    .get('/v1/alerts/supported-chains')
    .reply(200, chains)
    .persist();
}

/**
 * Clears all nock interceptors after each price-alerts test.
 */
export function clearPriceAlertsApiMocks(): void {
  jest.clearAllMocks();
  clearAllNockMocks();
}
