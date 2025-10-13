import { MockEventsObject } from '../../../framework';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';

/**
 * Mock data for external RPC endpoints used in E2E testing.
 * Blocks actual requests to external RPC providers that are not needed for testing.
 */

export const DEFAULT_REWARDS_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: 'https://rewards.uat-api.cx.metamask.io/auth/mobile-login',
      responseCode: 201,
      response: {
        sessionId: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
        accessToken: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
        subscription: {
          id: '723fdbaf-e35e-4b65-9965-1c2e98b437cc',
          createdAt: '2025-10-06T11:40:37.929Z',
          updatedAt: '2025-10-06T11:40:37.929Z',
          referralCode: '2PCRJR',
          accounts: [
            {
              id: 1950,
              address: DEFAULT_FIXTURE_ACCOUNT,
              blockchain: 1,
              subscriptionId: '723fdbaf-e35e-4b65-9965-1c2e98b437cc',
              createdAt: '2025-10-06T11:40:37.929Z',
              updatedAt: '2025-10-06T11:40:37.929Z',
            },
          ],
        },
      },
    },
  ],
};
