import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import Assertions from '../../framework/Assertions';
import { POLYMARKET_MARKET_DATA_MOCKS } from '../../api-mocking/mock-responses/polymarket-market-data-mocks';

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

        // Wait for container with longer timeout
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
          timeout: 10000,
        });
        await PredictMarketList.tapMarketCard(1);

        // // Wait a bit for market data to load
        // await new Promise(resolve => setTimeout(resolve, 3000));

        // // Check if we have market data or empty state
        // const isEmptyStateVisible = await PredictMarketList.isMarketListEmptyStateVisible();

        // if (isEmptyStateVisible) {
        //   console.log('No market data available - showing empty state');
        //   return; // Skip the test if no data
        // }

        // // Verify first card is visible before tapping
        // const isCard1Visible = await PredictMarketList.isMarketCardVisible(1);

        // if (!isCard1Visible) {
        //   console.log('Market card 1 not visible - may still be loading');
        //   return;
        // }

        // console.log('Market card 1 is visible - proceeding with tap');

        // Tap on the first card

        // Navigate back (if needed)
        // await SomeNavigationHelper.goBack();

        // Tap on the second card
        // await PredictMarketList.tapMarketCard(2);

        // // Tap on the third card
        // await PredictMarketList.tapMarketCard(3);
      },
    );
  });
});
