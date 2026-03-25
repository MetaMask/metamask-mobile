import { MockEventsObject } from '../../../framework';

/**
 * Minimal mock data for MetaMask swap API endpoints used in E2E testing.
 * Returns basic feature flags structure to prevent API failures.
 * For specific swap tests, add detailed mocks in the test files.
 */
export const METAMETRICS_API_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: 'https://metametrics.test/track',
      responseCode: 200,
      // Function response routes through the JS callback bridge so request
      // bodies (event payloads) are tracked and accessible via getMockedEndpoints().
      response: () => ({ success: true }),
    },
  ],
};
