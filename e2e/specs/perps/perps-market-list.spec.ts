import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';

describe(SmokePerps('Perps Market List'), () => {
  it('should open app, login, and navigate to Perpetuals UI, and check that the market list is visible', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        console.log('🚀 Starting Perpetuals navigation test...');

        // Check if login screen is visible and login
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();

        // Check that the list header is present
        await Assertions.expectElementToBeVisible(
          PerpsMarketListView.listHeader,
        );

        // Check that at least one market row item is present
        await Assertions.expectElementToBeVisible(
          PerpsMarketListView.getMarketRowItemBTC(),
        );
      },
    );
  });
});
