import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { SmokeRamps } from '../../tags';
import { CustomNetworks } from '../../resources/networks.e2e';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';

describe(SmokeRamps('Off-ramp token amounts'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should change token amounts directly and by percentage', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.FRANCE])
          .withRampsSelectedPaymentMethod()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSellButton();
        await SellGetStartedView.tapGetStartedButton();
        await BuildQuoteView.enterAmount('5');
        await Assertions.expectTextDisplayed('5 ETH');
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.tapQuickAmount25();
        await Assertions.expectTextDisplayed('64 ETH');
        await BuildQuoteView.tapQuickAmount50();
        await Assertions.expectTextDisplayed('128 ETH');
        await BuildQuoteView.tapQuickAmount75();
        await Assertions.expectTextDisplayed('192 ETH');
        await BuildQuoteView.tapQuickAmountMax();
        await Assertions.expectTextNotDisplayed('192 ETH');
      },
    );
  });
});
