import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { PerpsHelpers } from './helpers/perps-helpers';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';
import PerpsE2E from '../../framework/PerpsE2E';

describe(RegressionTrade('Perps - ETH limit long fill'), () => {
  it('creates ETH limit long at -10%, shows open order, then fills after -15%', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to Perps from Actions
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();

        // Open ETH market and select Long
        await device.disableSynchronization();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();

        // Open order type selector and select Limit using Page Object
        await PerpsOrderView.openOrderTypeSelector();
        await PerpsOrderView.selectLimitOrderType();

        // When Limit is selected without price, the limit price bottom sheet opens automatically.
        // Press preset -10% for long (config LONG_PRESETS: [-1,-2,-5,-10])
        await PerpsOrderView.setLimitPricePresetLong(-10);

        // Confirm limit price (Set button)
        await PerpsOrderView.confirmLimitPrice();

        // Place order
        await PerpsView.tapPlaceOrderButton();

        // The view returns to Market Details. Change to Orders tab and verify open order card
        await PerpsMarketDetailsView.expectOpenOrderVisible();

        // Navigate back to main Perps screen to follow the same navigation pattern as other specs
        await PerpsView.tapBackButtonPositionSheet();
        await PerpsView.tapBackButtonMarketList();

        // Verify on the Perps tab main screen that the order is visible without entering the market
        await PerpsView.expectOpenOrdersOnTab();

        // Push the price -15% to ensure the order is executed
        // Default ETH price in mock is 2500.00, -15% => 2125.00
        await PerpsE2E.updateMarketPrice('ETH', '2125.00');

        // Navigate to ETH again to verify order is gone and position is present
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.expectNoOpenOrderVisible();
      },
    );
  });
});
