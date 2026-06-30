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
import nock from 'nock';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';
import type { PriceAlert } from '../../../app/components/UI/Assets/PriceAlerts/constants';

const PRICE_ALERTS_ORIGIN = 'https://price-alerts.dev-api.cx.metamask.io';
const ALERTS_PATH = '/v1/alerts';

export const mockPriceAlertsData: PriceAlert[] = [
  {
    id: 'alert-1',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    threshold: 3000,
    recurring: true,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'alert-2',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    threshold: 1500,
    recurring: false,
    active: false,
    createdAt: '2025-01-02T00:00:00.000Z',
  },
];

/** Fixture for the alert returned by POST /v1/alerts in tests. */
export const mockCreatedAlert: PriceAlert = {
  id: 'alert-new',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  threshold: 1300,
  recurring: true,
  active: true,
  createdAt: '2025-06-01T00:00:00.000Z',
};

/**
 * Sets up nock interceptors for the Price Alerts API.
 * Call in beforeEach of price-alerts view tests.
 *
 * Intercepts GET /v1/alerts and POST /v1/alerts.
 *
 * @param alerts - The alerts to return from GET /v1/alerts. Defaults to mockPriceAlertsData.
 */
export function setupPriceAlertsApiMock(
  alerts: PriceAlert[] = mockPriceAlertsData,
): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(PRICE_ALERTS_ORIGIN)
    .get(ALERTS_PATH)
    .query(true)
    .reply(200, alerts)
    .persist();

  nock(PRICE_ALERTS_ORIGIN)
    .post(ALERTS_PATH)
    .reply(201, mockCreatedAlert)
    .persist();
}

/**
 * Clears all nock interceptors after each price-alerts test.
 */
export function clearPriceAlertsApiMocks(): void {
  jest.clearAllMocks();
  clearAllNockMocks();
}
