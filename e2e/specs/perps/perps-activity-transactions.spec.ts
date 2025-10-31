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
import PerpsTransactionsView from '../../pages/Perps/PerpsTransactionsView';
import PerpsView from '../../pages/Perps/PerpsView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

describe(
  SmokeTrade(
    'Perps - Activity (Funding/Orders) and trade after closing position',
  ),
  () => {
    it('checks Activity first, then closes a position and sees a trade in Activity', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('position-testing')
            .build(),
          restartDevice: true,
          testSpecificMock: PERPS_ARBITRUM_MOCKS,
        },
        async () => {
          await loginToApp();
          await device.disableSynchronization();

          // 1) Go to Activity and validate Perps is visible
          await TabBarComponent.tapActivity();

          // Move to the Perps tab in Activity (third tab)
          await ActivitiesView.goToPerpsTab();

          // Open Trades
          await PerpsTransactionsView.openTrades();
          await PerpsTransactionsView.expectTextsInList([
            'Opened long 0.01 BTC -$1.25',
          ]);

          // Open Orders
          await PerpsTransactionsView.openOrders();
          await PerpsTransactionsView.expectTextsInList([
            'Limit long 10 SOL',
            'Limit long 0.50 ETH',
          ]);

          // Open Funding
          await PerpsTransactionsView.openFunding();
          await PerpsTransactionsView.expectTextsInList([
            'Received funding fee BTC +$1.5',
          ]);

          // Open Deposits
          await PerpsTransactionsView.openDeposits();
          await PerpsTransactionsView.expectTextsInList([
            'Deposited 100.00 USDC Completed',
          ]);

          // 3) Go back to Perps, close an existing (mock) position and verify a Trade appears in Activity
          await TabBarComponent.tapWallet();
          await PerpsHelpers.navigateToPerpsTab();

          // Open BTC existing position from 'position-testing' profile
          await TabBarComponent.tapTrade();
          await WalletActionsBottomSheet.tapPerpsButton();
          await PerpsMarketListView.selectMarket('BTC');
          await PerpsMarketDetailsView.tapPositionTab();
          await PerpsMarketDetailsView.scrollToBottom();
          await PerpsMarketDetailsView.expectClosePositionButtonVisible();
          await PerpsView.tapClosePositionButton();
          await PerpsView.tapClosePositionBottomSheetButton();
          await PerpsView.tapBackButtonPositionSheet();

          await PerpsMarketListView.selectMarket('ETH');
          await PerpsMarketDetailsView.tapOrdersTab();
          await PerpsMarketDetailsView.scrollToBottom();
          await PerpsMarketDetailsView.expectCloseOrderButtonVisible();
          await PerpsMarketDetailsView.tapCloseOrderButton();
          await PerpsView.tapBackButtonPositionSheet();
          await TabBarComponent.tapHome();

          // 4) Go back to Activity → Perps, open Trades and find an item
          await TabBarComponent.tapActivity();
          await ActivitiesView.goToPerpsTab();
          await PerpsTransactionsView.openTrades();
          await PerpsTransactionsView.expectTextsInList([
            'Closed long 0.1 BTC +$150.00',
            'Opened long 0.01 BTC -$1.25',
          ]);

          // Open Orders
          await PerpsTransactionsView.openOrders();
          await PerpsTransactionsView.expectTextsInList([
            'Limit long 10 SOL',
            'Limit long 0.50 ETH Canceled',
          ]);
        },
      );
    });
  },
);
