import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import Assertions from '../../framework/Assertions';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

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
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.expectLoaded();

        // Wait for and tap a known market row (poll for data to load)
        await PerpsMarketListView.waitForAnyKnownMarket();

        // Validate critical elements on market details page
        await Assertions.expectElementToBeVisible(
          element(by.id(PerpsMarketDetailsViewSelectorsIDs.HEADER)),
        );
        await Assertions.expectElementToBeVisible(
          element(by.id(PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON)),
        );
        await Assertions.expectElementToBeVisible(
          element(by.id(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON)),
        );
        await Assertions.expectElementToBeVisible(
          element(by.id(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON)),
        );
      },
    );
  });
});
