'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';

const PaymentMethods = {
  SEPA_BANK_TRANSFER: 'SEPA Bank Transfer',
};

describe(SmokeTrade('Off-Ramp Cashout destination'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should change cashout destination', async () => {
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
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSellButton();
        await SellGetStartedView.tapGetStartedButton();
        await Assertions.checkIfTextIsNotDisplayed('SEPA Bank Transfer');
        await BuildQuoteView.tapPaymentMethodDropdown('Debit or Credit');
        await SelectPaymentMethodView.tapPaymentMethodOption(
          PaymentMethods.SEPA_BANK_TRANSFER,
        );
        await Assertions.checkIfTextIsDisplayed('SEPA Bank Transfer');
      },
    );
  });
});
