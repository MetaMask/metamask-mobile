import { MockEventsObject } from '../../../framework';

/**
 * Mock data for the Price Alerts API used in E2E testing.
 *
 * The token details screen calls GET /v1/alerts/supported-chains (via
 * `useIsPriceAlertsChainSupported`) to decide whether to render the price
 * alert bell icon. Any test that opens a token details page hits this
 * endpoint, so it lives in the default mocks to avoid unmocked-request
 * cleanup failures. Returns a stable list of CAIP-2 supported chains.
 */
export const PRICE_ALERTS_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/price-alerts\.(dev-api|uat-api|api)\.cx\.metamask\.io\/v1\/alerts\/supported-chains.*/,
      responseCode: 200,
      response: ['eip155:1'],
    },
  ],
};
