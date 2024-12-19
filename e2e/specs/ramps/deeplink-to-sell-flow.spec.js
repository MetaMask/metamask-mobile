'use strict';
import { loginToApp } from '../../viewHelper';

import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

import TestHelpers from '../../helpers';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { SmokeCore } from '../../tags';

import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

describe(SmokeCore('Sell Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should deep link to offramp ETH', async () => {
    const sellDeepLinkURL =
      'metamask://sell?chainId=1&address=0x0000000000000000000000000000000000000000&amount=50';
    const franceRegion = {
      currencies: ['/currencies/fiat/eur'],
      emoji: '🇫🇷',
      id: '/regions/fr',
      name: 'France',
      support: { buy: true, sell: true, recurringBuy: true },
      unsupported: false,
      recommended: false,
      detected: false,
      selectedPaymentMethodAgg: '/payments/debit-credit-card',
    };
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(franceRegion)
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
  });
  it('Should deep link to an unsupported network in the off-ramp flow', async () => {
    const unsupportedNetworkSellDeepLink = 'metamask://sell?chainId=56';

    await withFixtures(
      {
        fixture: new FixtureBuilder().withRampsSelectedRegion().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await device.openURL({
          url: unsupportedNetworkSellDeepLink,
        });
        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await SellGetStartedView.tapGetStartedButton();

        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkAddedBottomSheet.tapSwitchToNetwork();
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await NetworkEducationModal.tapGotItButton();
      },
    );
  });
});
