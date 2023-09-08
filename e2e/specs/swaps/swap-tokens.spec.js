'use strict';

import { loginToApp } from '../../viewHelper';
import { Regression } from '../../tags';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import WalletView from '../../pages/WalletView';
import TokenOverview from '../../pages/TokenOverview';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import Networks from '../../resources/networks.json';

describe(Regression('Swap Tests'), () => {
  let swapOnboarded = false;
  beforeAll(async () => {
    const fixture = new FixtureBuilder()
      .withNetworkController(Networks.Tenderly)
      .build();
    await startFixtureServer();
    await loadFixture({ fixture });
    await device.launchApp({
      delete: true,
      permissions: { notifications: 'YES' },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it.each`
    quantity | sourceTokenSymbol | destTokenSymbol
    ${'1'}   | ${'ETH'}          | ${'WETH'}
    ${'1'}   | ${'WETH'}         | ${'ETH'}
    ${'.05'} | ${'ETH'}          | ${'USDC'}
    ${'10'}  | ${'USDC'}         | ${'ETH'}
  `(
    "should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'",
    async ({ quantity, sourceTokenSymbol, destTokenSymbol }) => {
      await TabBarComponent.tapActions();
      await WalletActionsModal.tapSwapButton();

      if (!swapOnboarded) {
        await Onboarding.tapStartSwapping();
        swapOnboarded = true;
      }
      await QuoteView.isVisible();

      //Select source token, if ETH then can skip because already selected
      if (sourceTokenSymbol !== 'ETH') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.selectToken(sourceTokenSymbol);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      await QuoteView.selectToken(destTokenSymbol);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await QuoteView.checkMaxSlippage('Max slippage 0%');
      }
      await QuoteView.tapOnGetQuotes();
      await SwapView.isVisible();
      await SwapView.swipeToSwap();
      await SwapView.waitForSwapToComplete(sourceTokenSymbol, destTokenSymbol);
    },
  );

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await WalletView.isVisible();
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible();

    await TokenOverview.tapSwapButton();
    if (!swapOnboarded) await Onboarding.tapStartSwapping();
    await QuoteView.isVisible();
    await QuoteView.tapOnSelectSourceToken();
    await QuoteView.selectToken('USDC');
    await QuoteView.enterSwapAmount('5');
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.selectToken('DAI');
    await QuoteView.tapOnGetQuotes();
    await SwapView.isVisible();
    await SwapView.swipeToSwap();
    await SwapView.waitForSwapToComplete('USDC', 'DAI');
  });
});
