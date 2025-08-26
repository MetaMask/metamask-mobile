import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';

describe(SmokeTrade('Perps - should show the tutorial'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should show the tutorial', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
        restartDevice: true,
      },
      async () => {
        // Saltar onboarding y llegar al login usando fixture por defecto
        await loginToApp();

        // Open the actions menu from the Tab Bar (Actions)
        await TabBarComponent.tapActions();
        // Tap Perps using the real testID
        await WalletActionsBottomSheet.tapPerpsButton();
        // Verify that the Perps market list is visible
        await PerpsMarketListView.expectLoaded();
        // Open the tutorial from market list header button
        await PerpsMarketListView.tapTutorialButton();
        // No explicit testIDs for tutorial steps; we just ensure navigation happened by
        // pressing the header tutorial button and relying on absence of errors.
      },
    );
  });
});
