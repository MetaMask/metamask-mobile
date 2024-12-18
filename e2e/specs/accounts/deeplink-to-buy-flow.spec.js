'use strict';
import TestHelpers from '../../helpers';

import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../fixtures/fixture-helper';
import { SmokeAccounts } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';

import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';

import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import Assertions from '../../utils/Assertions';

describe(SmokeAccounts('Buy Crypto Deeplinks'), () => {
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

        await TokenSelectBottomSheet.tapTokenByName('DAI');
        await Assertions.checkIfTextIsDisplayed('Dai Stablecoin');
        await Assertions.checkIfTextIsDisplayed('$275');
      },
    );
  });

  it('should deep link to onramp on Linea network', async () => {
    const queryParamsBuyDeepLink =
      'metamask://buy?chainId=59144&address=0x176211869ca2b568f2a7d4ee941e073a821ee1ff';
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
          url: queryParamsBuyDeepLink,
        });
        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();
        await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);

        await Assertions.checkIfTextIsDisplayed('$270');
        await Assertions.checkIfTextIsDisplayed('USD coin');
        await Assertions.checkIfTextIsDisplayed('USDC');
      },
    );
  });
});
