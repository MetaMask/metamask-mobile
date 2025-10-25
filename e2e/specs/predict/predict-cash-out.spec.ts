import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_CASH_OUT_MOCKS,
  POLYMARKET_FORCE_BALANCE_REFRESH_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictCashOutPage from '../../pages/Predict/PredictCashOutPage';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

describe(SmokePredictions('Predictions'), () => {
  it('should cash out on open position: Spurs vs. Pelicans', async () => {
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
        await Assertions.expectTextDisplayed('$28.16');

        await WalletView.tapOnPredictionsPosition('Spurs vs. Pelicans');

        await Assertions.expectElementToBeVisible(PredictDetailsPage.container);
        await PredictDetailsPage.tapPositionsTab();
        await PredictDetailsPage.tapCashOutButton();

        // Set up cash out mocks before tapping cash out
        await POLYMARKET_POST_CASH_OUT_MOCKS(mockServer);
        await POLYMARKET_FORCE_BALANCE_REFRESH_MOCKS(mockServer);

        await Assertions.expectElementToBeVisible(PredictCashOutPage.container);

        await Assertions.expectElementToBeVisible(
          PredictCashOutPage.cashOutButton,
        );

        await PredictCashOutPage.tapCashOutButton();

        await new Promise((resolve) => setTimeout(resolve, 9000));
        await PredictDetailsPage.tapBackButton();

        // await Assertions.expectElementToBeVisible(
        //   WalletView.PredictionsTabContainer,
        // );
        // await Assertions.expectTextDisplayed('$58.66');

        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectTextDisplayed('$58.66');
      },
    );
  });
});
