import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../../tags.js';
import { CreateNewWallet } from '../../../flows/wallet.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import {
  newWalletWithMetricsOptInExpectations,
  newWalletMetricsOptOutExpectations,
} from '../../../helpers/analytics/expectations/new-wallet.analytics.js';
import { remoteFeaturePredictGtmOnboardingModalDisabled } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { Mockttp } from 'mockttp';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../../helpers/analytics/walletSetupAttributionE2eConstants.js';
import { withStrictWalletSetupAttributionMatch } from '../../../helpers/analytics/withStrictWalletSetupAttributionMatch.js';

appiumTest.describe(
  SmokeWalletPlatform('Analytics during new wallet flow'),
  () => {
    appiumTest(
      'tracks analytics events during new wallet flow',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                remoteFeaturePredictGtmOnboardingModalDisabled(),
              );
            },
            analyticsExpectations: newWalletWithMetricsOptInExpectations,
          },
          async () => {
            await CreateNewWallet();
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
              await setupRemoteFeatureFlagsMock(
                mockServer,
                remoteFeaturePredictGtmOnboardingModalDisabled(),
              );
            },
            analyticsExpectations: withStrictWalletSetupAttributionMatch(
              newWalletWithMetricsOptInExpectations,
            ),
          },
          async () => {
            await CreateNewWallet({ optInToMarketing: true });
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
            analyticsExpectations: newWalletMetricsOptOutExpectations,
          },
          async () => {
            await CreateNewWallet({
              optInToMetrics: false,
            });
          },
        );
      },
    );
  },
);
