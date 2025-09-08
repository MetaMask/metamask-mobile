import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';

describe(RegressionTrade('Perps Open Three Positions'), () => {
  it('Open 3 positions custom leverage and amount and verify them in the main screen', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withPerpsProfile('no-positions')
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
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();
        await PerpsHelpers.navigateToPerpsTab();

        // 1) ETH long 2x (amount 00 as typed by keypad for demo purposes)
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.selectLeverage(2);
        await PerpsOrderView.setAmountUSD('00');
        await PerpsView.tapPlaceOrderButton();
        await PerpsView.tapBackButtonPositionSheet();

        // 2) BTC short 40x
        await PerpsMarketListView.selectMarket('BTC');
        await PerpsMarketDetailsView.tapShortButton();
        await PerpsOrderView.selectLeverage(40);
        await PerpsView.tapPlaceOrderButton();
        await PerpsView.tapBackButtonPositionSheet();

        // 3) SOL long 10x
        await PerpsMarketListView.selectMarket('SOL');
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.selectLeverage(10);
        await PerpsView.tapPlaceOrderButton();
        await PerpsView.tapBackButtonPositionSheet();
        await PerpsView.tapBackButtonMarketList();

        // Assertions
        await PerpsView.expectPerpsTabPosition('ETH', 2, 'long', 0);
        await PerpsView.expectPerpsTabPosition('BTC', 40, 'short', 1);
        await PerpsView.expectPerpsTabPosition('SOL', 10, 'long', 2);
      },
    );
  });
});
