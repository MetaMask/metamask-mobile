import { MockEventsObject } from '../../../framework';

/**
 * Mock data for external RPC endpoints used in E2E testing.
 * Blocks actual requests to external RPC providers that are not needed for testing.
 *
 * Hosts used by builds.yml (`main` → rewards.api, `dev`/`uat` → rewards.dev-api /
 * rewards.uat-api). All three are matched so RewardsController traffic stays
 * mocked regardless of the build variant under test.
 */

export const DEFAULT_REWARDS_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint:
        /^https:\/\/rewards\.(dev-api|uat-api|api)\.cx\.metamask\.io\/auth\/mobile-login$/,
      responseCode: 401,
      response: {
        error: 'Unauthorized',
      },
    },
    {
      urlEndpoint:
        /^https:\/\/rewards\.(dev-api|uat-api|api)\.cx\.metamask\.io\/public\/rewards\/ois$/,
      responseCode: 200,
      response: {
        ois: [],
      },
    },
  ],
  GET: [
    {
      urlEndpoint:
        /^https:\/\/rewards\.(dev-api|uat-api|api)\.cx\.metamask\.io\/public\/seasons\/status$/,
      responseCode: 200,
      response: {
        previous: null,
        current: {},
        next: null,
      },
    },
    {
      urlEndpoint:
        /^https:\/\/rewards\.(dev-api|uat-api|api)\.cx\.metamask\.io\/public\/seasons\/[a-f0-9-]+\/metadata$/,
      responseCode: 200,
      response: {},
    },
  ],
};
