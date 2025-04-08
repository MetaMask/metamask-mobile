'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

import TestHelpers from '../../helpers';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { SmokeRamps } from '../../tags';
import { CustomNetworks } from '../../resources/networks.e2e';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';

describe(SmokeRamps('Off-ramp token amounts'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should change token amounts directly and by percentage', async () => {
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
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withRampsSelectedRegion(franceRegion)
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
        await Assertions.checkIfTextIsDisplayed('5 ETH');
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.tapQuickAmount25();
        await Assertions.checkIfTextIsDisplayed('64 ETH');
        await BuildQuoteView.tapQuickAmount50();
        await Assertions.checkIfTextIsDisplayed('128 ETH');
        await BuildQuoteView.tapQuickAmount75();
        await Assertions.checkIfTextIsDisplayed('192 ETH');
        await BuildQuoteView.tapQuickAmountMax();
        await Assertions.checkIfTextIsNotDisplayed('192 ETH');
      },
    );
  });
});
