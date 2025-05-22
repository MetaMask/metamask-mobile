'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import SelectCurrencyView from '../../pages/Ramps/SelectCurrencyView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { withFixtures } from '../../fixtures/fixture-helper';

const unitedStatesRegion = {
  currencies: ['/currencies/fiat/usd'],
  emoji: '🇺🇸',
  id: '/regions/us-ca',
  name: 'California',
  support: { buy: true, sell: true, recurringBuy: true },
  unsupported: false,
  recommended: false,
  detected: false,
};

const setupOnRampTest = async (testFn) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(unitedStatesRegion)
        .build(),
      restartDevice: true,
    },
    async () => {
      await loginToApp();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

describe(SmokeTrade('On-Ramp Parameters'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should select currency and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapCurrencySelector();
      await SelectCurrencyView.tapCurrencyOption('Euro');
      await Assertions.checkIfTextIsDisplayed('€0');
      await Assertions.checkIfTextIsNotDisplayed('$0');
    });
  });

  it('should select token and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapTokenDropdown('Ethereum');
      await TokenSelectBottomSheet.tapTokenByName('DAI');
      await Assertions.checkIfTextIsDisplayed('Dai Stablecoin');
      await Assertions.checkIfTextIsNotDisplayed('Ethereum');
    });
  });

  it('should select region and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapRegionSelector();
      await SelectRegionView.tapRegionOption('Spain');
      await Assertions.checkIfTextIsNotDisplayed('🇺🇸');
      await Assertions.checkIfTextIsDisplayed('🇪🇸');
    });
  });

  it('should select payment method and verify display', async () => {
    await setupOnRampTest(async () => {
      const paymentMethod = device.getPlatform() === 'ios' ? 'Apple Pay' : 'Google Pay';
      await BuildQuoteView.tapPaymentMethodDropdown(paymentMethod);
      await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
      await Assertions.checkIfTextIsNotDisplayed(paymentMethod);
      await Assertions.checkIfTextIsDisplayed('Debit or Credit');
    });
  });
});
