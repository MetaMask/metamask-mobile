'use strict';

import {
  importWalletWithRecoveryPhrase,
  switchToTenderlyNetwork,
} from '../viewHelper';

import { Regression } from '../tags';
import SwapView from '../pages/SwapView'
import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';
import WalletView from '../pages/WalletView';
import TokenOverview from '../pages/TokenOverview';


describe(Regression('Swap Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await importWalletWithRecoveryPhrase();
  });

  it('should switch to Tenderly Network ', async () => {
    await switchToTenderlyNetwork();
  });

  it.each`
    quantity     | sourceTokenSymbo      | destTokenSymbol
    ${'1 '}      | ${'ETH'}              | ${'WETH'}
    ${'1'}       | ${'WETH'}             | ${'ETH'}
    ${'.5'}      | ${'ETH'}              | ${'USDC'}
    ${'10'}      | ${'DAI'}              | ${'ETH'}
` ("should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'", async ({ quantity, sourceTokenSymbol, destTokenSymbol }) => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSwapButton();
    await SwapView.getQuote(quantity, sourceTokenSymbol, destTokenSymbol);
    await SwapView.swapToken(sourceTokenSymbol, destTokenSymbol);
  });

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await WalletView.isVisible()
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible()
    await TokenOverview.tapSwapButton()
    await SwapView.getQuote('.3', 'USDC', 'DAI');
    await SwapView.swapToken('USDC', 'DAI');
    await TokenOverview.tapBackButton()
  });
})

