'use strict';
import { SmokeWalletPlatform } from '../../../tags';
import { importWalletWithRecoveryPhrase } from '../../../flows/wallet.flow';
import TestHelpers from '../../../helpers';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureMultichainAccountsAccountDetails,
  remoteFeaturePredictGtmOnboardingModalDisabled,
} from '../../../api-mocking/mock-responses/feature-flags-mocks';
import {
  createLogger,
  countProxiedRequestsMatching,
  waitForAdditionalProxiedRequestsMatching,
} from '../../../framework';
import {
  AUTHENTICATION_PROFILE_ACCOUNTS_URL_MARKER,
  PROFILE_ACCOUNTS_PROXIED_REQUEST_TIMEOUT_MS,
} from './constants';
import {
  importWalletMetricsOptOutExpectations,
  importWalletWithMetricsOptInExpectations,
} from '../../../helpers/analytics/expectations/import-wallet.analytics';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../identity/utils/constants';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../../helpers/analytics/walletSetupAttributionE2eConstants';
import { withStrictWalletSetupAttributionMatch } from '../../../helpers/analytics/withStrictWalletSetupAttributionMatch';

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
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureMultichainAccountsAccountDetails(),
            ...remoteFeaturePredictGtmOnboardingModalDisabled(),
          });
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
        const profileAccountsBaseline = await countProxiedRequestsMatching(
          mockServer,
          profileAccountsMatcher,
        );

        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
          optInToMetrics: true,
        });

        await waitForAdditionalProxiedRequestsMatching(
          mockServer,
          profileAccountsMatcher,
          profileAccountsBaseline,
          {
            description:
              'New PUT authentication.api.cx.metamask.io/api/v2/profile/accounts observed after wallet import',
            timeout: PROFILE_ACCOUNTS_PROXIED_REQUEST_TIMEOUT_MS,
            successLog: {
              logger,
              label:
                'PUT authentication.api.cx.metamask.io/api/v2/profile/accounts after import',
            },
          },
        );
      },
    );
  });

  it('Wallet Setup Completed includes persisted UTM and attribution_id when marketing is on', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withOnboardingFixture()
          .withWalletSetupAttributionForE2e(E2E_WALLET_SETUP_ATTRIBUTION_FIELDS)
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureMultichainAccountsAccountDetails(),
            ...remoteFeaturePredictGtmOnboardingModalDisabled(),
          });
        },
        analyticsExpectations: withStrictWalletSetupAttributionMatch(
          importWalletWithMetricsOptInExpectations,
        ),
      },
      async () => {
        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
          optInToMetrics: true,
        });
      },
    );
  });

  it('does not track analytics events when opt-in to metrics is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureMultichainAccountsAccountDetails(),
            ...remoteFeaturePredictGtmOnboardingModalDisabled(),
          });
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
