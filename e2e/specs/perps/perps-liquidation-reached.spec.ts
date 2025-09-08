import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsE2E from '../../framework/PerpsE2E';
import { PerpsMarketListViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';
import PerpsTabView from '../../pages/Perps/PerpsTabView';

describe(RegressionTrade('Perps liquidation reached indicator'), () => {
  it('shows 0.0% liquidation movement when liquidation equals current price', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          // Inject mock profile to ensure we start with some funds
          .withPerpsProfile('position-testing')
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();

        // Navigate to Perps
        await PerpsHelpers.navigateToPerpsTab();
        if (!PerpsHelpers.navigateToPerpsTab) {
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPerpsButton();
        }

        // Push current price via deep link (handled by e2eBridge inside app)

        await PerpsE2E.updateMarketPrice('BTC', '40000.00');
        await PerpsE2E.triggerLiquidation('BTC');

        // Scroll to reveal and tap Start new trade CTA (Perps tab)
        await PerpsTabView.scrollToRevealStartNewTradeCta();
        await PerpsTabView.tapStartNewTradeCta();

        // Wait for markets list to be visible
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(
            PerpsMarketListViewSelectorsIDs.LIST_HEADER,
          ) as unknown as DetoxElement,
          { description: 'Perps markets list visible' },
        );
        await PerpsMarketListView.tapMarketRowItemBTC();

        await PerpsMarketDetailsView.tapLongButton();

        // Open Leverage modal
        await PerpsOrderView.selectLeverage(5);

        // Expect 0.0% liquidation movement text
        const zeroPercent = Matchers.getElementByText('0.0%');
        await Assertions.expectElementToBeVisible(
          zeroPercent as unknown as DetoxElement,
          { description: 'Liquidation distance 0.0% should be visible' },
        );
      },
    );
  });
});
