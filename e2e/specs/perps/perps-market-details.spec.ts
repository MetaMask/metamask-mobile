import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';

describe(SmokeTrade('Perps - open market details from list'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should open first market and validate details elements', async () => {
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
        await device.disableSynchronization();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.expectLoaded();

        // Tap BTC row explicitly by testID
        await PerpsMarketListView.tapMarketRowBySymbol('BTC');

        await PerpsMarketDetailsView.expectLoaded();
      },
    );
  });
});
