import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';

import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
};

describe(SmokePredictions('Predictions'), () => {
  it('should open predict tab and view market details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();

        // Navigate to actions
        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictMarketList.tapCategoryTab('new');
        await PredictMarketList.tapMarketCard('new', 1);
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Predict details page container should be visible',
          },
        );
      },
    );
  });
});
