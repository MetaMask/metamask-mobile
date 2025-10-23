import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictCashOutPage from '../../pages/Predict/PredictCashOutPage';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

describe(SmokeTrade('Predictions'), () => {
  it('should cash out on open position: 76ers vs. Celtics', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();

        await WalletView.tapOnPredictionsTab();
        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );
        await WalletView.tapOnPredictionsPosition('76ers vs. Celtics');

        await Assertions.expectElementToBeVisible(PredictDetailsPage.container);
        await PredictDetailsPage.tapPositionsTab();
        await PredictDetailsPage.tapCashOutButton();

        await Assertions.expectElementToBeVisible(PredictCashOutPage.container);

        await Assertions.expectElementToBeVisible(
          PredictCashOutPage.cashOutButton,
        );

        await PredictCashOutPage.tapCashOutButton();

        // TODO: Complete cash out flow. Currently in Dev
      },
    );
  });
});
