import { MockEventsObject } from '../../../framework';

/**
 * Mock data for Digest API endpoints used in E2E testing.
 * Blocks actual requests to the digest market overview API.
 */

export const DIGEST_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/digest\.(api|dev-api)\.cx\.metamask\.io\/api\/v1\/market-overview.*/,
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint:
        /^https:\/\/digest\.(api|dev-api)\.cx\.metamask\.io\/api\/v1\/asset-summary.*/,
      responseCode: 200,
      response: {},
    },
  ],
};
