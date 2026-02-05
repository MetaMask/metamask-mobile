import { loginToApp } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../../e2e/tags';
import BuildQuoteView from '../../../e2e/pages/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import FundActionMenu from '../../../e2e/pages/UI/FundActionMenu';
import BuyGetStartedView from '../../../e2e/pages/Ramps/BuyGetStartedView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';

/**
 * TODO:
 * Moving to quaratine since all tests are being skipped.
 * When this test is fixed we need to add a second shard to CI.
 */
describe(SmokeTrade('On-Ramp Limits'), () => {
  const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];
  it.skip('should check order min and maxlimits', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(selectedRegion)
          .withRampsSelectedPaymentMethod()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletBuyButton();
        await FundActionMenu.tapBuyButton();
        await BuyGetStartedView.tapGetStartedButton();
        await BuildQuoteView.enterAmount('1');
        await Assertions.expectElementToBeVisible(
          BuildQuoteView.minLimitErrorMessage,
        );
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.enterAmount('55555');
        await Assertions.expectElementToBeVisible(
          BuildQuoteView.maxLimitErrorMessage,
        );
        await BuildQuoteView.tapCancelButton();
      },
    );
  });
});
