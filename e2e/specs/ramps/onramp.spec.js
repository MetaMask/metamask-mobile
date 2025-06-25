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
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { withFixtures } from '../../fixtures/fixture-helper';

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

const setupOnRampTest = async (testFn) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(franceRegion)
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

describe(SmokeTrade('Onramp quote build screen'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should get to the Amount to buy screen, after selecting Get Started', async () => {
    await setupOnRampTest(async () => {
      await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
      await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
      await BuildQuoteView.tapCancelButton();
    });
  });

  it('should skip to the Amount to buy screen for returning user', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
  });

  it('should enter amount and show quotes', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.enterAmount('100');
      await BuildQuoteView.tapGetQuotesButton();
      await Assertions.checkIfVisible(QuotesView.quotes);
    });
  });
});
