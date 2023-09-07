'use strict';

import { loginToApp } from '../../viewHelper';
import { Regression } from '../../tags';
import WalletView from '../../pages/WalletView';
import TokenOverview from '../../pages/TokenOverview';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import Networks from '../../resources/networks.json';

describe(Regression('Token Chart Tests'), () => {
  beforeEach(async () => {
    await startFixtureServer();
  });

  afterEach(async () => {
    await stopFixtureServer();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should not display the chart when using Goerli test network', async () => {
    const fixture = new FixtureBuilder()
      .withNetworkController(Networks.Goerli)
      .build();
    await loadFixture({ fixture });
    await device.launchApp({ delete: true });
    await loginToApp();
    await WalletView.tapOnToken(Networks.Goerli.ticker);
    await TokenOverview.isVisible();
    await TokenOverview.checkChartNotVisible();
    await TokenOverview.checkTokenQuoteIsNotZero();
  });

  it.each`
    network
    ${Networks.Avalanche}
    ${Networks.Arbitrum}
    ${Networks.Optimism}
    ${Networks.Polygon}
    ${Networks.BNB}
  `(
    "should view the token chart on the '$network.providerConfig.nickname' network and get a swap quote",
    async ({ network }) => {
      const fixture = new FixtureBuilder()
        .withNetworkController(network)
        .build();
      await loadFixture({ fixture });
      await device.launchApp({ delete: true });
      await loginToApp();

      //Display the token chart
      const symbol =
        network === Networks.Arbitrum || network === Networks.Optimism
          ? 'Ethereum'
          : network.providerConfig.ticker;
      await WalletView.tapOnToken(symbol);
      await TokenOverview.isVisible();
      await TokenOverview.checkTokenQuoteIsNotZero();
      await TokenOverview.checkIfChartIsVisible();
      await TokenOverview.scrollOnScreen();
      await TokenOverview.isReceiveButtonVisible();
      await TokenOverview.isBuyButtonVisible();
      await TokenOverview.isSendButtonVisible();
      await TokenOverview.isSwapButtonVisible();

      //Get a quote on the native token by tapping to Swap button on the chart
      await TokenOverview.tapSwapButton();
      await Onboarding.tapStartSwapping();
      await QuoteView.isVisible();
      await QuoteView.enterSwapAmount('1');

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      await QuoteView.selectToken('USDC');
      await QuoteView.tapOnGetQuotes();
      await SwapView.isVisible();
    },
  );
});
