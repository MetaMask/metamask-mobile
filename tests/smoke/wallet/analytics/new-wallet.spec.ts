'use strict';
import { SmokeWalletPlatform } from '../../../tags';
import { CreateNewWallet } from '../../../flows/wallet.flow';
import TestHelpers from '../../../helpers';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import {
  newWalletWithMetricsOptInExpectations,
  newWalletMetricsOptOutExpectations,
} from '../../../helpers/analytics/expectations/new-wallet.analytics';
import { remoteFeaturePredictGtmOnboardingModalDisabled } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';

describe(SmokeWalletPlatform('Analytics during new wallet flow'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('tracks analytics events during new wallet flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
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
  });

  it('does not track analytics events when opt-in to metrics is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        analyticsExpectations: newWalletMetricsOptOutExpectations,
      },
      async () => {
        await CreateNewWallet({
          optInToMetrics: false,
        });
      },
    );
  });
});
