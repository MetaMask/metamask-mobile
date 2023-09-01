'use strict';
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

import { loginToApp } from '../../viewHelper';
import { Regression } from '../../tags';
import WalletView from '../../pages/WalletView';
import TokenOverview from '../../pages/TokenOverview';
import SwapView from '../../pages/SwapView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';

const Goerli = {
  providerConfig: {
    type: 'mainnet',
    chainId: '5',
    rpcTarget: 'https://goerli.infura.io/v3/',
    nickname: 'Goerli Test Network',
    ticker: 'GoerliETH',
  },
};

const Avalanche = {
  providerConfig: {
    type: 'rpc',
    chainId: '43114',
    rpcTarget: 'https://api.avax.network/ext/bc/C/rpc',
    nickname: 'Avalanche Mainnet C-Chain',
    ticker: 'AVAX',
  },
};

const Arbitrum = {
  providerConfig: {
    type: 'rpc',
    chainId: '42161',
    rpcTarget: `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
    nickname: 'Arbitrum One',
    ticker: 'Ethereum',
  },
};

const Optimism = {
  providerConfig: {
    type: 'rpc',
    chainId: '10',
    rpcTarget: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
    nickname: 'Optimism',
    ticker: 'Ethereum',
  },
};

const Polygon = {
  providerConfig: {
    type: 'rpc',
    chainId: '137',
    rpcTarget: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
    nickname: 'Polygon Mainnet',
    ticker: 'MATIC',
  },
};

const BNB = {
  providerConfig: {
    type: 'rpc',
    chainId: '56',
    rpcTarget: 'https://bsc-dataseed.binance.org/',
    nickname: 'BNB Smart Chain',
    ticker: 'BNB',
  },
};

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
    const fixture = new FixtureBuilder().withNetworkController(Goerli).build();
    await loadFixture({ fixture });
    await device.launchApp({ delete: true });
    await loginToApp();
    await WalletView.tapOnToken('GoerliETH');
    await TokenOverview.isVisible();
    await TokenOverview.checkChartNotVisible();
    await TokenOverview.checkTokenQuoteIsNotZero();
  });

  it.each`
    network
    ${Avalanche}
    ${Arbitrum}
    ${Optimism}
    ${Polygon}
    ${BNB}
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
      await WalletView.tapOnToken(network.providerConfig.ticker);
      await TokenOverview.isVisible();
      await TokenOverview.checkTokenQuoteIsNotZero();
      await TokenOverview.checkIfChartIsVisible();
      await TokenOverview.scrollOnScreen();
      await TokenOverview.checkIfReceiveButtonVisible();
      await TokenOverview.checkIfBuyButtonVisible();
      await TokenOverview.checkIfSendButtonVisible();
      await TokenOverview.checkIfSwapButtonVisible();

      //Get a quote on the native token by tapping to Swap button on the chart
      await TokenOverview.tapSwapButton();
      await SwapView.tapStartSwapping();
      await SwapView.isVisible();
      await SwapView.enterSwapAmount('1');

      //Select destination token
      await SwapView.tapOnSelectDestToken();
      await SwapView.selectToken('USDC');
      await SwapView.tapOnGetQuotes();
      await SwapView.isQuoteVisible();
    },
  );
});
