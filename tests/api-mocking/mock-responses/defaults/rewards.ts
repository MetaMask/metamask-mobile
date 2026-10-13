import { MockEventsObject } from '../../../framework';

/**
 * Hosts used by builds.yml. `main-e2e` merges `public_envs`, which points
 * REWARDS_API_URL at the production host (`rewards.api.cx.metamask.io`).
 * Dev and exp builds use `rewards.dev-api` / `rewards.uat-api`.
 * Match all three so Appium smoke cleanup does not fail on unmocked
 * RewardsDataService traffic.
 */
const REWARDS_HOST = String.raw`https:\/\/rewards\.(?:dev-|uat-)?api\.cx\.metamask\.io`;

/**
 * Mock data for the rewards API used in E2E testing.
 * Blocks live requests that the rewards controller makes in the background.
 */
export const DEFAULT_REWARDS_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: new RegExp(`^${REWARDS_HOST}\\/auth\\/mobile-login$`),
      responseCode: 401,
      response: {
        error: 'Unauthorized',
      },
    },
    {
      urlEndpoint: new RegExp(`^${REWARDS_HOST}\\/public\\/rewards\\/ois$`),
      responseCode: 200,
      response: {
        ois: [],
      },
    },
  ],
  GET: [
    {
      urlEndpoint: new RegExp(`^${REWARDS_HOST}\\/public\\/seasons\\/status$`),
      responseCode: 200,
      response: {
        previous: null,
        current: {},
        next: null,
      },
    },
    {
      urlEndpoint: new RegExp(
        `^${REWARDS_HOST}\\/public\\/seasons\\/[a-f0-9-]+\\/metadata$`,
      ),
      responseCode: 200,
      response: {},
    },
  ],
};
