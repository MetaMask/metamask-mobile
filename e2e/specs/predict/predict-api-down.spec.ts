import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictTabView from '../../pages/Predict/PredictTabView';
import { POLYMARKET_API_DOWN_MOCKS } from '../../api-mocking/mock-responses/polymarket-api-down-mocks';

describe(RegressionTrade('Predict API Down Test'), () => {
  it('handles Polymarket API being down with 500 error', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: POLYMARKET_API_DOWN_MOCKS,
      },
      async () => {
        await loginToApp();

        // Navigate to actions
        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();
        await PredictTabView.isContainerVisible();
      },
    );
  });
});
