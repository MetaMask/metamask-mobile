import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';

describe(SmokeTrade('On-Ramp Limits'), () => {
  it('should check order min and maxlimits', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.FRANCE])
          .withRampsSelectedPaymentMethod()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapBuyButton();
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
