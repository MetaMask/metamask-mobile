import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';

describe(SmokePerps('Perps Position'), () => {
  it('should navigate to Market list and select BTC market', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          .ensureSolanaModalSuppressed()
          .build(),
        restartDevice: true,
      },
      async () => {
        await device.launchApp();
        console.log('🚀 Starting Perps Position test...');

        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        await PerpsHelpers.importHyperLiquidWallet();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();

        await Assertions.expectElementToBeVisible(
          PerpsMarketListView.listHeader,
        );

        await Assertions.expectElementToBeVisible(
          PerpsMarketListView.marketRowItemBTC,
        );

        await PerpsMarketListView.tapMarketRowItemBTC();

        await PerpsMarketDetailsView.tapLongButton();

        await device.disableSynchronization();

        await PerpsOrderView.tapPlaceOrderButton();

        await PerpsOrderView.tapTakeProfitButton();

        await PerpsView.tapTakeProfitPercentageButton(5);

        await PerpsView.tapStopLossPercentageButton(5);

        await PerpsView.tapClosePositionButton();

        await PerpsView.tapConfirmClosePositionButton();
      },
    );
  });
});
