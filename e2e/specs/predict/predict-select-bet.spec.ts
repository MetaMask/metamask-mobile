import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
// import { POLYMARKET_MARKET_DATA_MOCKS } from '../../api-mocking/mock-responses/polymarket-market-data-mocks';

describe(RegressionTrade('Predict Basic Test'), () => {
  it('should open predict tab and handle market cards', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        // testSpecificMock: POLYMARKET_MARKET_DATA_MOCKS,
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
