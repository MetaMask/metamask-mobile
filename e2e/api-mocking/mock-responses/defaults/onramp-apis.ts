import { TestSpecificMock } from '../../../framework';

/**
 * Mock data for on-ramp API endpoints used in E2E testing.
 * Covers geolocation and other on-ramp services.
 */

export const ONRAMP_API_MOCKS: TestSpecificMock = {
  GET: [
    {
      urlEndpoint: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
      responseCode: 200,
      response: 'US',
    },
    {
      urlEndpoint: 'https://on-ramp.api.cx.metamask.io/geolocation',
      responseCode: 200,
      response: 'US',
    },
  ],
};
