import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';

describe(SmokeTrade('On-Ramp Limits'), () => {
  const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];
  it('should check order min and maxlimits', async () => {
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
