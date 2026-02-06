import { loginToApp } from '../../../e2e/viewHelper.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import FundActionMenu from '../../../e2e/pages/UI/FundActionMenu.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { SmokeRamps } from '../../../e2e/tags';
import { CustomNetworks } from '../../resources/networks.e2e';
import BuildQuoteView from '../../../e2e/pages/Ramps/BuildQuoteView.ts';
import Assertions from '../../framework/Assertions.ts';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.ts';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup.ts';

describe(SmokeRamps('Off-ramp token amounts'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should change token amounts directly and by percentage', async () => {
    const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
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
        await FundActionMenu.tapSellButton();
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
