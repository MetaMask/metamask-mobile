import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';

describe(
  SmokeTrade('Perps - open market and place SHORT 500 via keypad'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it('should place a SHORT order entering 500 with keypad', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withMetaMetricsOptIn()
            .withPerpsFeatureFlagEnabled()
            .withPerpsMockBalance('1000')
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPerpsButton();
          await PerpsMarketListView.expectLoaded();

          await PerpsMarketListView.tapMarketRowBySymbol('BTC');
          await PerpsMarketDetailsView.expectLoaded();

          await PerpsMarketDetailsView.tapShort();

          await PerpsOrderView.enterAmountWithKeypad('500');
          await PerpsOrderView.tapPlaceOrderShort('BTC');

          await PerpsOrderView.dismissToast();
        },
      );
    });
  },
);
