import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';

describe(SmokeTrade('Perps - open market details from list'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should be able to do a long with any market option', async () => {
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
        // Open actions sheet first, then tap Perps
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.expectLoaded();

        // Tap BTC row explicitly by testID
        await PerpsMarketListView.tapMarketRowBySymbol('BTC');

        await PerpsMarketDetailsView.expectLoaded();

        await PerpsMarketDetailsView.tapLong();

        // await PerpsOrderView.tapAmountDisplay();
        await PerpsOrderView.setAmountToPercentage(0.5);
        await PerpsOrderView.tapPlaceOrderLong('BTC');

        await PerpsOrderView.expectSuccessToastLong('BTC');
        await PerpsOrderView.dismissToast();
      },
    );
  });
});
