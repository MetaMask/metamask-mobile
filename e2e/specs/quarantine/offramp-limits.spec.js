'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import { SmokeRamps } from '../../tags';
import { CustomNetworks } from '../../resources/networks.e2e';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';

describe(SmokeRamps('Off-Ramp Limits'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should check order min and maxlimits', async () => {
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
        await BuyGetStartedView.tapGetStartedButton();
        await BuildQuoteView.enterAmount('0.001');
        await Assertions.checkIfVisible(BuildQuoteView.minLimitErrorMessage);
        await BuildQuoteView.tapKeypadDeleteButton(4);
        await BuildQuoteView.enterAmount('50');
        await Assertions.checkIfVisible(BuildQuoteView.maxLimitErrorMessage);
        await BuildQuoteView.tapKeypadDeleteButton(2);
        await BuildQuoteView.enterAmount('999');
        await Assertions.checkIfVisible(
          BuildQuoteView.insufficientBalanceErrorMessage,
        );
        await BuildQuoteView.tapCancelButton();
      },
    );
  });
});
