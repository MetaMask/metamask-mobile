import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_MOCK_GAS_ESTIMATE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictWithdrawPage from '../../pages/Predict/PredictWithdrawPage';
import PredictMarketList from '../../pages/Predict/PredictMarketList';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

describe(SmokePredictions('Predictions'), () => {
  it('should withdraw funds from predictions account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();

        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictMarketList.tapWithdrawButton();
        await POLYMARKET_MOCK_GAS_ESTIMATE_MOCKS(mockServer);

        await Assertions.expectElementToBeVisible(
          PredictWithdrawPage.container,
          {
            description: 'Withdraw page container should be visible',
          },
        );
        // await PredictWithdrawPage.enterAmount('2');
        // await PredictWithdrawPage.tapContinue();
        // await Assertions.expectTextDisplayed('<0.01', {
        //   description: 'Transaction Fee is displayed',
        // });

        // await Assertions.expectTextDisplayed('1.00', {
        //   description: 'Total is displayed',
        // });
      },
    );
  });
});
