import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import PredictUnavailableView from '../../pages/Predict/PredictUnavailableView';
import Assertions from '../../framework/Assertions';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

// Enable the Predictions feature flag and force Polymarket geoblock
const PredictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: true },
  });
};

describe(RegressionTrade('Predictions - Geo Restriction'), () => {
  it('displays geo restriction modal when in US region', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionGeoBlockedFeature,
      },
      async () => {
        // Set device location to US (New York City coordinates)
        // Detox API: device.setLocation(latitude, longitude)
        await device.setLocation(40.7128, -74.006);

        await loginToApp();

        // Navigate to Predictions
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });

        // Open any market to trigger checks in details (safer)
        await PredictMarketList.tapCategoryTab('new');
        await PredictMarketList.tapMarketCard('new', 1);
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Predict details page container should be visible',
          },
        );

        // The modal should open automatically when blocked
        await PredictUnavailableView.expectVisible();

        // Dismiss modal
        await PredictUnavailableView.tapGotIt();
      },
    );
  });
});
