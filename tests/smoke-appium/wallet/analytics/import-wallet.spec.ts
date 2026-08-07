import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../../tags.js';
import { importWalletWithRecoveryPhrase } from '../../../flows/wallet.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  remoteFeatureMultichainAccountsAccountDetails,
  remoteFeaturePredictGtmOnboardingModalDisabled,
} from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  createLogger,
  countProxiedRequestsMatching,
  waitForAdditionalProxiedRequestsMatching,
} from '../../../framework/index.js';
import {
  AUTHENTICATION_PROFILE_ACCOUNTS_URL_MARKER,
  PROFILE_ACCOUNTS_PROXIED_REQUEST_TIMEOUT_MS,
} from './constants.js';
import {
  importWalletMetricsOptOutExpectations,
  importWalletWithMetricsOptInExpectations,
} from '../../../helpers/analytics/expectations/import-wallet.analytics.js';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../../smoke/identity/utils/constants.js';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../../helpers/analytics/walletSetupAttributionE2eConstants.js';
import { withStrictWalletSetupAttributionMatch } from '../../../helpers/analytics/withStrictWalletSetupAttributionMatch.js';

const logger = createLogger({
  name: 'ImportWalletAnalyticsSpec',
});

appiumTest.describe(
  SmokeWalletPlatform('Analytics during import wallet flow'),
  () => {
    appiumTest(
      'tracks analytics events during wallet import flow',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
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
      },
    );

    appiumTest(
      'Wallet Setup Completed includes persisted UTM and attribution_id when marketing is on',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withOnboardingFixture()
              .withWalletSetupAttributionForE2e(
                E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
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
              optInToMarketing: true,
            });
          },
        );
      },
    );

    appiumTest(
      'does not track analytics events when opt-in to metrics is off',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
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
      },
    );
  },
);
