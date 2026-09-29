import type { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { TRENDING_API_MOCKS } from '../../api-mocking/mock-responses/trending-api-mocks.js';
import { setupMockEvents } from '../../api-mocking/helpers/mockHelpers.js';
import { getDecodedProxiedURL } from '../notifications/utils/helpers.js';
import {
  remoteFeatureFlagTrendingTokensEnabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';

export async function trendingFeedMock(mockServer: Mockttp): Promise<void> {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagTrendingTokensEnabled(),
    ...remoteFeatureFlagPredictEnabled(),
    // TODO: Fix this test to support the FF-enabled What's Happening Explore section.
    aiSocialWhatsHappeningEnabled: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
  });

  await setupMockEvents(mockServer, TRENDING_API_MOCKS);

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      try {
        const url = getDecodedProxiedURL(request.url);
        return /compliance\.(dev-api|api|uat-api)\.cx\.metamask\.io\/v1\/wallet\/batch/.test(
          url,
        );
      } catch {
        return false;
      }
    })
    .asPriority(1001)
    .thenCallback(async (request) => {
      let addresses: string[] = [];
      try {
        const text = await request.body.getText();
        if (text) {
          const parsed = JSON.parse(text) as unknown;
          if (Array.isArray(parsed)) {
            addresses = parsed.filter(
              (a): a is string => typeof a === 'string',
            );
          }
        }
      } catch {
        /* ignore malformed body */
      }
      return {
        statusCode: 200,
        json: addresses.map((address) => ({ address, blocked: false })),
      };
    });
}
