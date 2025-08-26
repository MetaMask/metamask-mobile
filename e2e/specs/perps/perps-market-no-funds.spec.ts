import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';

describe(
  SmokeTrade('Perps - market details shows Add Funds when no balance'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it('should show Add Funds button when account has zero balance', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withMetaMetricsOptIn()
            .withPerpsFeatureFlagEnabled()
            .withPerpsMockBalance('0')
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
          await PerpsMarketDetailsView.tapAddFunds();
        },
      );
    });
  },
);
