import { MockEventsObject } from '../../../framework';

/**
 * Mock data for external RPC endpoints used in E2E testing.
 * Blocks actual requests to external RPC providers that are not needed for testing.
 */

export const DEFAULT_REWARDS_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint:
        /^https:\/\/rewards\.(uat|dev)-api\.cx\.metamask\.io\/auth\/mobile-login$/,
      responseCode: 401,
      response: {
        error: 'Unauthorized',
      },
    },
  ],
};
