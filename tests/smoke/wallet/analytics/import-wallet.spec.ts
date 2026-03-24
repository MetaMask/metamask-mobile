'use strict';
import { SmokeWalletPlatform } from '../../../tags';
import { importWalletWithRecoveryPhrase } from '../../../flows/wallet.flow';
import TestHelpers from '../../../helpers';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { createLogger } from '../../../framework';
import {
  importWalletMetricsOptOutExpectations,
  importWalletWithMetricsOptInExpectations,
} from '../../../helpers/analytics/expectations/import-wallet.analytics';
import {
  AUTHENTICATION_PROFILE_ACCOUNTS_URL_MARKER,
  collectSeenProxiedRequests,
  filterProxiedRequests,
  waitForProxiedRequestsMatching,
} from '../../../api-mocking/helpers/mockHelpers';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../identity/utils/constants';

const logger = createLogger({
  name: 'ImportWalletAnalyticsSpec',
});

describe(SmokeWalletPlatform('Analytics during import wallet flow'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('tracks analytics events during wallet import flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetails(),
          );
        },
        analyticsExpectations: importWalletWithMetricsOptInExpectations,
      },
      async ({ mockServer }) => {
        if (!mockServer) {
          throw new Error(
            'Mock server is not defined, check testSpecificMock setup',
          );
        }

        const profileAccountsMatcher = {
          method: 'PUT' as const,
          urlSubstring: AUTHENTICATION_PROFILE_ACCOUNTS_URL_MARKER,
        };
        const seenBeforeWalletImport =
          await collectSeenProxiedRequests(mockServer);
        const profileAccountsBaseline = filterProxiedRequests(
          seenBeforeWalletImport,
          profileAccountsMatcher,
        ).length;

        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
          optInToMetrics: true,
        });

        await waitForProxiedRequestsMatching(
          mockServer,
          profileAccountsMatcher,
          {
            minCount: profileAccountsBaseline + 1,
            description:
              'New PUT authentication.api.cx.metamask.io/api/v2/profile/accounts observed after wallet import',
          },
        );

        const seenAfterProfileAccountsWait =
          await collectSeenProxiedRequests(mockServer);
        const profileAccountsAfter = filterProxiedRequests(
          seenAfterProfileAccountsWait,
          profileAccountsMatcher,
        ).length;

        logger.info(
          `PUT authentication.api.cx.metamask.io/api/v2/profile/accounts after import: new count=${String(
            profileAccountsAfter - profileAccountsBaseline,
          )}`,
        );
      },
    );
  });

  it('does not track analytics events when opt-in to metrics is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetails(),
          );
        },
        analyticsExpectations: importWalletMetricsOptOutExpectations,
      },
      async () => {
        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
          optInToMetrics: false,
        });
      },
    );
  });
});
