'use strict';

import {
  importWalletWithRecoveryPhrase,
  switchToTenderlyNetwork,
} from '../viewHelper';

import { Regression } from '../tags';
import SwapView from '../pages/SwapView';
import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';
import WalletView from '../pages/WalletView';
import TokenOverview from '../pages/TokenOverview';
import FixtureBuilder from '../fixtures/fixture-builder';
import { loadFixture, startFixtureServer, stopFixtureServer } from '../fixtures/fixture-helper';
import { loginToApp } from '../viewHelper';

describe(Regression('Swap Tests'), () => {
  beforeAll(async () => {

    const fixture = new FixtureBuilder()
    .withNetworkController({
      networkConfigurations: {
        networkConfigurationId: {
          rpcUrl: 'https://rpc.tenderly.co/fork/c0fe0d2d-186c-4c76-9481-409255b991bf',
          chainId: '1',
          nickname: "Tenderly",
          ticker: "ETH",
          rpcPrefs: {},
        },
      },
    })
    .build()
    await startFixtureServer()
    await loadFixture({fixture});
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' }});
    await loginToApp()
  });

  afterAll(async () => {
    await stopFixtureServer();
  })

  beforeEach(async () => {
    jest.setTimeout(150000);
  })

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
      await SwapView.getQuote(quantity, sourceTokenSymbol, destTokenSymbol);
      await SwapView.swapToken(sourceTokenSymbol, destTokenSymbol);
    },
  );

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await WalletView.isVisible();
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible();
    await TokenOverview.tapSwapButton();
    await SwapView.getQuote('5', 'USDC', 'DAI');
    await SwapView.swapToken('USDC', 'DAI');
    await TokenOverview.tapBackButton();
  });
});
