'use strict';
import TestHelpers from '../../helpers';

import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../fixtures/fixture-helper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';

import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';

import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import Assertions from '../../utils/Assertions';

import { PopularNetworksList } from '../../resources/networks.e2e';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
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
        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();
        await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
        await BuildQuoteView.tapTokenDropdown('Ethereum');

        await TokenSelectBottomSheet.tapTokenByName('DAI');
        await Assertions.checkIfTextIsDisplayed('Dai Stablecoin');
        await Assertions.checkIfTextIsDisplayed('$275');
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

        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();

        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await NetworkEducationModal.tapGotItButton();
        await Assertions.checkIfTextIsDisplayed('USD Coin');
        await Assertions.checkIfTextIsDisplayed(
          PopularNetworksList.Base.providerConfig.nickname,
        );
      },
    );
  });
});
