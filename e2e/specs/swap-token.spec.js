'use strict';

import {
  importWalletWithRecoveryPhrase,
  switchToTenderlyNetwork,
} from '../viewHelper';

import { Regression } from '../tags';
import SwapView from '../pages/SwapView'


describe(Regression('Swap Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await importWalletWithRecoveryPhrase();
  });

  afterAll(async () => {
  })

  it('should switch to Tenderly Network ', async () => {
    await switchToTenderlyNetwork();
  });

  it.each`
  quantity     | sourceTokenSymbol | sourceTokenName      | destTokenSymbol   | destTokenName
  ${'.5'}      | ${'ETH'}          | ${'Ether'}           | ${'USDC'}         | ${'USD Coin'}
  ${'10'}      | ${'DAI'}          | ${'Dai Stablecoin'}  | ${'ETH'}          | ${'Ether'}
`("should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'", async ({ quantity, sourceTokenSymbol, sourceTokenName, destTokenSymbol, destTokenName }) => {

  await SwapView.swapToken(quantity, sourceTokenSymbol, sourceTokenName, destTokenSymbol, destTokenName);

});
})

/*
${'1'}       | ${'ETH'}          | ${'Ether'}           | ${'WETH'}         | ${'Wrapped Ether'}
${'1'}       | ${'WETH'}         | ${'Wrapped Ether'}   | ${'ETH'}          | ${'Ether'}
${'1'}       | ${'USDC'}         | ${'USD Coin      '}  | ${'DAI'}          | ${'Dai Stablecoin'}
*/
