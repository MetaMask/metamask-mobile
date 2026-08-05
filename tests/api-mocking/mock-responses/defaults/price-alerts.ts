import { MockEventsObject } from '../../../framework';

/**
 * Mock data for Price Alerts API endpoints used in E2E testing.
 * Blocks actual requests to the price-alerts supported-chains endpoint,
 * which is fetched whenever the Token Details page is opened.
 */
export const PRICE_ALERTS_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/price-alerts\.(api|dev-api)\.cx\.metamask\.io\/v1\/alerts\/supported-chains$/,
      responseCode: 200,
      response: ['eip155:1'],
    },
  ],
};
