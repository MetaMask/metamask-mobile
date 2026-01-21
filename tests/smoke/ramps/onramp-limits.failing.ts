import { loginToApp } from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import FundActionMenu from '../../page-objects/UI/FundActionMenu';
import BuyGetStartedView from '../../page-objects/Ramps/BuyGetStartedView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';

/**
 * TODO:
 * Moving to quaratine since all tests are being skipped.
 * When this test is fixed we need to add a second shard to CI.
 */
describe.skip(SmokeTrade('On-Ramp Limits'), () => {
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
