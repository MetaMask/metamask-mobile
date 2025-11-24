import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';

import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_OPEN_POSITION_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_ADD_CELTICS_POSITION_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};
describe(SmokePredictions('Predictions'), () => {
  it('Opens predict position: Celtics vs. Nets', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );
        // Navigate to actions
        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();
        await device.disableSynchronization();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });

        await PredictMarketList.tapCategoryTab('sports');

        await PredictMarketList.tapMarketCard('sports', 1);
        await PredictDetailsPage.tapOpenPositionValue();

        await POLYMARKET_POST_OPEN_POSITION_MOCKS(mockServer);
        await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'open-position');

        await PredictDetailsPage.tapPositionAmount('10');

        await PredictDetailsPage.tapDoneButton();
        await POLYMARKET_ADD_CELTICS_POSITION_MOCKS(mockServer);

        await PredictDetailsPage.tapOpenPosition();
        await device.enableSynchronization();
        // await new Promise((resolve) => setTimeout(resolve, 3000));

        await PredictDetailsPage.tapBackButton();
        await Assertions.expectTextDisplayed('$17.76');

        // await new Promise((resolve) => setTimeout(resolve, 6000));

        // await Assertions.expectElementToBeVisible(
        //   PredictDetailsPage.container,
        //   {
        //     description: 'Predict details page container should be visible',
        //   },
        // );
      },
    );
  });
});
