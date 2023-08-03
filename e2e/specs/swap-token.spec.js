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
    quantity     | sourceTokenSymbol | sourceTokenName      | destTokenSymbol   | destTokenName
    ${'.5'}      | ${'ETH'}          | ${'Ether'}           | ${'USDC'}         | ${'USD Coin'}
    ${'10'}      | ${'DAI'}          | ${'Dai Stablecoin'}  | ${'ETH'}          | ${'Ether'}
` ("should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'", async ({ quantity, sourceTokenSymbol, sourceTokenName, destTokenSymbol, destTokenName }) => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSwapButton();
    await SwapView.getQuote(quantity, sourceTokenSymbol, sourceTokenName, destTokenSymbol, destTokenName);
    await SwapView.swapToken(sourceTokenSymbol, destTokenSymbol);
  });

  it('should complete a ETH to USDC swap from the token chart', async () => {
    await WalletView.isVisible()
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible()
    await TokenOverview.tapSwapButton()
    await SwapView.getQuote('.3', null, null, 'USDC', 'USD Coin');
    await SwapView.swapToken('ETH', 'USDC');
    await TokenOverview.tapBackButton()
  });
})

