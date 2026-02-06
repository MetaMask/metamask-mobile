import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import Assertions from '../../../tests/framework/Assertions';
import { PopularNetworksList } from '../../../tests/resources/networks.e2e';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeRamps('Buy Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should deep link to onramp ETH', async () => {
    const buyLink = 'metamask://buy?chainId=1&amount=275';

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedPaymentMethod()
          .withRampsSelectedRegion()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.sendToHome();
        await device.launchApp({
          url: buyLink,
        });
        await Assertions.expectElementToBeVisible(
          SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();
        await Assertions.expectElementToBeVisible(
          BuildQuoteView.getQuotesButton,
        );
        await BuildQuoteView.tapTokenDropdown('Ethereum');

        await TokenSelectBottomSheet.tapTokenByName('DAI');
        await Assertions.expectTextDisplayed('Dai Stablecoin');
        await Assertions.expectTextDisplayed('$275');
      },
    );
  });
  it('should deep link to onramp on Base network', async () => {
    const BuyDeepLink =
      'metamask://buy?chainId=8453&address=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&amount=12';

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withRampsSelectedRegion()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.sendToHome();
        await device.launchApp({
          url: BuyDeepLink,
        });

        await Assertions.expectElementToBeVisible(
          SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();

        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectTextDisplayed('USD Coin');
        await Assertions.expectTextDisplayed(
          PopularNetworksList.Base.providerConfig.nickname,
        );
      },
    );
  });
});
