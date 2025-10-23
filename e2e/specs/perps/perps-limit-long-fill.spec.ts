import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { PerpsHelpers } from './helpers/perps-helpers';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';
import PerpsE2EModifiers from './helpers/perps-modifiers';

describe(SmokeTrade('Perps - ETH limit long fill'), () => {
  it('creates ETH limit long at -10%, shows open order, then fills after -15%', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPerpsProfile('no-positions').build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to Perps from Actions
        await TabBarComponent.tapTrade();
        await WalletActionsBottomSheet.tapPerpsButton();

        // Open ETH market and select Long

        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();

        // Open order type selector and select Limit using Page Object
        await PerpsOrderView.openOrderTypeSelector();
        await PerpsOrderView.selectLimitOrderType();

        // When Limit is selected without price, the limit price bottom sheet opens automatically.
        // Press preset -10% for long (config LONG_PRESETS: [-1,-2,-5,-10])
        await PerpsOrderView.setLimitPricePreset(-10);

        // Confirm limit price (Set button)
        await PerpsOrderView.confirmLimitPrice();

        // Set amount to 25% using quick percentage button
        await PerpsOrderView.tapQuickAmountPercent(25);

        // Place order
        await PerpsView.tapPlaceOrderButton();

        // The view returns to Market Details. Change to Orders tab and verify open order card
        await PerpsMarketDetailsView.expectOpenOrderVisible();

        // Navigate back to main Perps screen to follow the same navigation pattern as other specs
        await PerpsView.tapBackButtonPositionSheet();
        await TabBarComponent.tapHome();

        // Verify on the Perps tab main screen that the order is visible without entering the market
        await PerpsView.expectOpenOrdersOnTab();

        // Push the price -15% to ensure the order is executed
        // Default ETH price in mock is 2500.00, -15% => 2125.00
        await PerpsE2EModifiers.updateMarketPrice('ETH', '2125.00');

        await PerpsView.expectOpenPositionsOnTab();

        // Navigate to ETH again to verify order is gone and position is present
        await TabBarComponent.tapTrade();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.expectNoOpenOrderVisible();
        await new Promise((resolve) => setTimeout(resolve, 5000));
      },
    );
  });
});
