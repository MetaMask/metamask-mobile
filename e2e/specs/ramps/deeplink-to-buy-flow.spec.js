'use strict';
import { loginToApp } from '../../viewHelper';

import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

import TestHelpers from '../../helpers';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { SmokeCore } from '../../tags';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';

import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';

describe(SmokeCore('Buy Crypto Deeplinks'), () => {
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
          .withPopularNetworks()
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
        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();
        await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);

        /* Uncomment this once the bug:
              "when I update the token after deep linking"
              is updated

            // await BuildQuoteView.tapDefaultToken();
            // await TokenSelectBottomSheet.tapTokenByName('LINK');
            // await Assertions.checkIfTextIsDisplayed('LINK');
            */
        // await Assertions.checkIfTextIsDisplayed('XCD');
        await Assertions.checkIfTextIsDisplayed('$275');
      },
    );
  });

  it('should deep link to onramp on Linea network', async () => {
    const unaddedNetworkBuyDeepLink =
      'metamask://buy?chainId=59144&address=0x176211869cA2b568f2A7D4EE941E073a821EE1ff&amount=270';
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
          url: unaddedNetworkBuyDeepLink,
        });
        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();
        await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);

        await Assertions.checkIfTextIsDisplayed('$270');
      },
    );
  });
});
