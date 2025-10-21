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
import PerpsTransactionsView from '../../pages/Perps/PerpsTransactionsView';
import PerpsView from '../../pages/Perps/PerpsView';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

describe(RegressionTrade('Perps - Activity (Funding/Orders) and trade after closing position'), () => {
  it('checks Activity first, then closes a position and sees a trade in Activity', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('position-testing')
          .withPerpsFirstTimeUser(false)
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();

        // 1) Ir a Activity → Perps y validar Funding (mocks) visible
        await TabBarComponent.tapActivity();
        await Assertions.expectElementToBeVisible(ActivitiesView.title, {
          description: 'Activity view visible',
        });
        // Moverse a la pestaña Perps de Activity (tercera pestaña)
        await ActivitiesView.goToPerpsTab();
        // Abre Funding
        await PerpsTransactionsView.openFunding();
        await PerpsTransactionsView.expectAnyItemVisible('A funding item should be visible');

        // 2) Crear una limit order para poblar Orders y verificarla en Activity
        await TabBarComponent.tapWallet();
        await PerpsHelpers.navigateToPerpsTab();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await device.disableSynchronization();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.openOrderTypeSelector();
        await PerpsOrderView.selectLimitOrderType();
        await PerpsOrderView.setLimitPricePresetLong(-10);
        await PerpsOrderView.confirmLimitPrice();
        await PerpsView.tapPlaceOrderButton();
        await PerpsView.tapBackButtonPositionSheet();
        await PerpsView.tapBackButtonMarketList();

        await TabBarComponent.tapActivity();
        await ActivitiesView.goToPerpsTab();
        await PerpsTransactionsView.openOrders();
        await PerpsTransactionsView.expectAnyItemVisible('An order item should be visible');

        // 3) Volver a Perps, cerrar una posición existente (mock) y verificar que aparece un Trade en Activity
        await TabBarComponent.tapWallet();
        await PerpsHelpers.navigateToPerpsTab();
        // Abrir BTC posición existente del perfil position-testing
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.selectMarket('BTC');
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();
        await PerpsView.tapClosePositionButton();
        await PerpsView.tapClosePositionBottomSheetButton();

        // 4) Volver a Activity → Perps, abrir Trades y encontrar un item
        await PerpsView.tapBackButtonPositionSheet();
        await PerpsView.tapBackButtonMarketList();
        await TabBarComponent.tapActivity();
        await ActivitiesView.goToPerpsTab();
        await PerpsTransactionsView.openTrades();
        await PerpsTransactionsView.expectAnyItemVisible('A trade item should be visible after closing position');
      },
    );
  });
});


