import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagHomepageSectionsV1Enabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_GEO_BLOCKED_MOCKS,
  POLYMARKET_MARKET_FEEDS_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../page-objects/Predict/PredictAddFunds';
import PredictUnavailableView from '../../page-objects/Predict/PredictUnavailableView';
import { geoBlockedDepositExpectations } from '../../helpers/analytics/expectations/predict-geo-restriction.analytics';

const predictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    carouselBanners: false,
  });
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  await POLYMARKET_GEO_BLOCKED_MOCKS(mockServer);
};

describe(SmokePredictions('Predictions - Geo Restriction'), () => {
  it('displays unavailable modal when adding funds from predict balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
        restartDevice: true,
        testSpecificMock: predictionGeoBlockedFeature,
        analyticsExpectations: geoBlockedDepositExpectations,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.balanceCard,
          {
            description:
              'Predict balance card is visible before attempting add funds',
          },
        );
        await PredictAddFunds.tapAddFunds();
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.balanceCard,
          {
            description:
              'Predict balance card is visible after dismissing unavailable modal',
          },
        );
      },
    );
  });
});
