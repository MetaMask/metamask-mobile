import { MockEventsObject } from '../../../framework';

/**
 * Default Price Alerts API mocks for E2E tests.
 *
 * An empty supported-chains response keeps Price Alerts disabled unless a test
 * explicitly overrides this mock to exercise the feature.
 */
export const PRICE_ALERTS_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/price-alerts\.(api|dev-api)\.cx\.metamask\.io\/v1\/alerts\/supported-chains$/,
      responseCode: 200,
      response: [],
    },
  ],
};
