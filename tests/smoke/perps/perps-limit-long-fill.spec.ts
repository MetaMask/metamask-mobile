import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import PerpsHomeView from '../../page-objects/Perps/PerpsHomeView';
import PerpsView from '../../page-objects/Perps/PerpsView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import { TestSuiteParams } from '../../framework/types';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import Utilities from '../../framework/Utilities';
describe(SmokePerps('Perps - ETH limit long fill'), () => {
  it('creates ETH limit long at Mid, shows open order, then fills after -15%', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
          .withNetworkController({
            type: 'rpc',
            chainId: '0xa4b1',
            rpcUrl: 'https://arb1.arbitrum.io/rpc',
            nickname: 'Arbitrum One',
            ticker: 'ETH',
          })
          .withTokensForAllPopularNetworks([
            {
              address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              type: 'erc20',
            },
          ])
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagHomepageSectionsV1Enabled(),
          });
          await PERPS_ARBITRUM_MOCKS(mockServer);
          await mockPerpsGeolocation(
            mockServer,
            RampsRegions[RampsRegionsEnum.SPAIN],
          );
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
        await PerpsHomeView.tapExploreCryptoIfVisible();

        // Select ETH market and tap Long
        await Utilities.executeWithRetry(
          async () => {
            await PerpsMarketListView.selectMarket('ETH');
            await PerpsMarketDetailsView.tapLongButton();
          },
          { interval: 1000, timeout: 30000 },
        );

        // Open order type selector and select Limit using Page Object
        await PerpsOrderView.openOrderTypeSelector();
        await PerpsOrderView.selectLimitOrderType();

        // When Limit is selected without price, the limit price bottom sheet opens automatically.
        await PerpsOrderView.setLimitPricePresetLong('Mid');

        // Confirm limit price (Set button)
        await PerpsOrderView.confirmLimitPrice();

        // Place order (PerpsView waits until the button is enabled, then taps)
        await PerpsView.tapPlaceOrderButton();

        // Return to Perps portfolio home (explore → details → order: need list back, not wallet back)
        await PerpsView.navigateToPerpsPortfolioHomeFromMarketOrderFlow();

        await PerpsView.expectLimitOrderVisibleOnPortfolio({
          symbol: 'ETH',
          direction: 'long',
        });

        // Push the price -15% to ensure the order is executed
        // Default ETH price in mock is 2500.00, -15% => 2125.00
        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '2125.00',
        );

        await PerpsView.expectPositionRowAfterLimitOrderFilled({
          symbol: 'ETH',
          direction: 'long',
        });
      },
    );
  });
});
