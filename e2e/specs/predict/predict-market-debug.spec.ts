import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import Assertions from '../../framework/Assertions';

describe(RegressionTrade('Predict Market Debug Test'), () => {
  it('debugs market list state', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();

        // Wait for the market list container to be visible
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Market list container should be visible',
        });

        // Check if we have market cards or empty state
        const isCard1Visible = await PredictMarketList.isMarketCardVisible(1);
        const isEmptyStateVisible = await PredictMarketList.isMarketListEmptyStateVisible();

        console.log('Card 1 visible:', isCard1Visible);
        console.log('Empty state visible:', isEmptyStateVisible);

        if (isEmptyStateVisible) {
          console.log('No market data available - showing empty state');
        } else if (isCard1Visible) {
          console.log('Market cards are visible - can proceed with testing');
        } else {
          console.log('Neither cards nor empty state visible - may be loading');
        }
      },
    );
  });
});
