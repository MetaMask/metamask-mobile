'use strict';

import { loginToApp } from '../../viewHelper';
import { Regression } from '../../tags';
import SwapView from '../../pages/SwapView';
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

describe(Regression('Swap Tests'), () => {
  let swapOnboarded = false;
  beforeAll(async () => {
    const fixture = new FixtureBuilder()
      .withNetworkController({
        isCustomNetwork: true,
        providerConfig: {
          type: 'rpc',
          chainId: '1',
          rpcTarget:
            'https://rpc.tenderly.co/fork/c0fe0d2d-186c-4c76-9481-409255b991bf',
          nickname: 'Tenderly',
          ticker: 'ETH',
          rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
        },
      })
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
        await this.tapStartSwapping();
        swapOnboarded = true;
      }
      await SwapView.isVisible();

      //Select source token, if ETH then can skip because already selected
      if (sourceTokenSymbol !== 'ETH') {
        await SwapView.tapOnSelectSourceToken();
        await SwapView.selectToken(sourceTokenSymbol);
      }
      await SwapView.enterSwapAmount(quantity);

      //Select destination token
      await SwapView.tapOnSelectDestToken();
      await SwapView.selectToken(destTokenSymbol);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await SwapView.checkMaxSlippage('Max slippage 0%');
      }
      await SwapView.tapOnGetQuotes();
      await SwapView.isQuoteVisible();
      await SwapView.swipeToSwap();
      await SwapView.checkIfSwapCompleted(sourceTokenSymbol, destTokenSymbol);
    },
  );

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await WalletView.isVisible();
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible();

    await TokenOverview.tapSwapButton();
    await SwapView.isVisible();
    await SwapView.tapOnSelectSourceToken();
    await SwapView.selectToken('USDC');
    await SwapView.enterSwapAmount('5');
    await SwapView.tapOnSelectDestToken();
    await SwapView.selectToken('DAI');
    await SwapView.tapOnGetQuotes();
    await SwapView.isQuoteVisible();
    await SwapView.swipeToSwap();
    await SwapView.checkIfSwapCompleted('USDC', 'DAI');
    await TokenOverview.tapBackButton();
  });
});
