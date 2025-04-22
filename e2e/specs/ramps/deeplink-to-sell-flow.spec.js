'use strict';
import { loginToApp } from '../../viewHelper';

import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

import TestHelpers from '../../helpers';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { SmokeTrade } from '../../tags';

import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { PopularNetworksList } from '../../resources/networks.e2e';

describe(SmokeTrade('Sell Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  const itif = (condition) => (condition ? it : it.skip);

  itif(device.getPlatform() === 'android')(
    'should deep link to offramp ETH',
    async () => {
      const sellDeepLinkURL = 'metamask://sell?chainId=1&amount=50';
      const franceRegion = {
        currencies: ['/currencies/fiat/eur'],
        emoji: '🇫🇷',
        id: '/regions/fr',
        name: 'France',
        support: { buy: true, sell: true, recurringBuy: true },
        unsupported: false,
        recommended: false,
        detected: false,
      };
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsSelectedRegion(franceRegion)
            .withRampsSelectedPaymentMethod()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          await device.openURL({
            url: sellDeepLinkURL,
          });
          await Assertions.checkIfVisible(
            await SellGetStartedView.getStartedButton,
          );

          await SellGetStartedView.tapGetStartedButton();
          await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);

          await Assertions.checkIfTextIsDisplayed('50 ETH');
        },
      );
    },
  );

  itif(device.getPlatform() === 'android')(
    'should deep link to offramp with Base but switch network to OP Mainnet',
    async () => {
      const SellDeepLink = 'metamask://sell?chainId=8453';

      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsSelectedRegion()
            .withRampsSelectedPaymentMethod()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: SellDeepLink,
          });
          await Assertions.checkIfVisible(
            await SellGetStartedView.getStartedButton,
          );
          await SellGetStartedView.tapGetStartedButton();
          await Assertions.checkIfVisible(NetworkApprovalBottomSheet.container);
          await NetworkApprovalBottomSheet.tapCancelButton();
          await NetworkListModal.changeNetworkTo(
            PopularNetworksList.Optimism.providerConfig.nickname,
          );
          await NetworkApprovalBottomSheet.tapApproveButton();
          await NetworkAddedBottomSheet.tapCloseButton();
          await Assertions.checkIfVisible(NetworkEducationModal.container);
          await NetworkEducationModal.tapGotItButton();
          await Assertions.checkIfTextIsDisplayed(
            PopularNetworksList.Optimism.providerConfig.nickname,
          );
        },
      );
    },
  );
});
