import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import PerpsHomeView from '../../page-objects/Perps/PerpsHomeView';
import PerpsView from '../../page-objects/Perps/PerpsView';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import { TestSuiteParams } from '../../framework/types';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagHomepageRedesignV1Enabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';

describe(RegressionTrade('Perps - ETH limit long fill'), () => {
  it('creates ETH limit long at Mid, shows open order, then fills after -15%', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            ...remoteFeatureFlagHomepageRedesignV1Enabled(),
          });
          await PERPS_ARBITRUM_MOCKS(mockServer);
        },
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }
        await loginToApp();

        // This is needed due to disable animations
        await device.disableSynchronization();

        // Navigate to Perps via homepage section (same click path as smoke perps tests)
        await WalletView.scrollAndTapPerpsSection();

        // Select ETH market and tap Long
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();

        // Open order type selector and select Limit using Page Object
        await PerpsOrderView.openOrderTypeSelector();
        await PerpsOrderView.selectLimitOrderType();

        // When Limit is selected without price, the limit price bottom sheet opens automatically.
        await PerpsOrderView.setLimitPricePresetLong('Mid');

        // Confirm limit price (Set button)
        await PerpsOrderView.confirmLimitPrice();

        // Place order
        await PerpsView.tapPlaceOrderButton();

        // Tap Turn on notifications on the Order placed modal
        if (device.getPlatform() === 'ios') {
          await PerpsOrderView.tapTurnOnNotificationsButton();
        }

        // The view returns to Market Details. Change to Orders tab and verify open order card
        await PerpsMarketDetailsView.expectOpenOrderVisible();

        // Navigate back to main Perps screen to follow the same navigation pattern as other specs
        await PerpsView.tapBackButtonPositionSheet();
        await PerpsHomeView.tapBackHomeButton();

        // Verify on the Perps tab main screen that the order is visible without entering the market
        await PerpsView.expectOpenOrdersOnTab();

        // Push the price -15% to ensure the order is executed
        // Default ETH price in mock is 2500.00, -15% => 2125.00
        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '2125.00',
        );

        // Navigate to ETH again to verify order is gone and position is present
        await WalletView.scrollAndTapPerpsSection();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.expectNoOpenOrderVisible();
      },
    );
  });
});
