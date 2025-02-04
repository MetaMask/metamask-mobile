'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeRamps } from '../../tags';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import QuotesView from '../../pages/Ramps/QuotesView';
import Assertions from '../../utils/Assertions';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import SelectCurrencyView from '../../pages/Ramps/SelectCurrencyView';
const fixtureServer = new FixtureServer();

describe(SmokeRamps('Buy Crypto'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should select Region and Payment Method to see the Build Buy Quote screen', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await BuyGetStartedView.tapGetStartedButton();
    await BuildQuoteView.tapSelectRegionDropdown();
    await SelectRegionView.tapRegionOption('United States of America');
    await SelectRegionView.tapRegionOption('California');
    await SelectRegionView.tapContinueButton();
    await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
    await SelectPaymentMethodView.tapContinueButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should skip to the Build Quote screen for returning user', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should change parameters and select a quote', async () => {
    const paymentMethod = device.getPlatform() === 'ios' ? 'Apple Pay' : 'Google Pay';

    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await BuildQuoteView.tapCurrencySelector();
    await SelectCurrencyView.tapCurrencyOption('Euro');
    await BuildQuoteView.tapTokenDropdown('Ethereum');
    await TokenSelectBottomSheet.tapTokenByName('DAI');
    await BuildQuoteView.tapRegionSelector();
    await SelectRegionView.tapRegionOption('France');
    await BuildQuoteView.tapPaymentMethodDropdown('Debit or Credit');
    await SelectPaymentMethodView.tapPaymentMethodOption(paymentMethod);
    await Assertions.checkIfTextIsDisplayed('€0');
    await Assertions.checkIfTextIsNotDisplayed('$0');
    await Assertions.checkIfTextIsDisplayed('Dai Stablecoin');
    await Assertions.checkIfTextIsNotDisplayed('Ethereum');
    await Assertions.checkIfTextIsNotDisplayed('Debit or Credit');
    await Assertions.checkIfTextIsDisplayed(paymentMethod);
    await Assertions.checkIfTextIsNotDisplayed('🇺🇸');
    await Assertions.checkIfTextIsDisplayed('🇫🇷');
    await BuildQuoteView.enterFiatAmount('100');
    await BuildQuoteView.tapGetQuotesButton();
    await Assertions.checkIfVisible(QuotesView.quotes);
    await QuotesView.closeQuotesSection();
    await BuildQuoteView.tapCancelButton();
  });

});
