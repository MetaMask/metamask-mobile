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
      response: {
        success: true,
      },
    },
  ],
};
