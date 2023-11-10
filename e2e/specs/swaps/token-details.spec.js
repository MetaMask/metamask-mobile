'use strict';

import { Regression } from '../../tags';
import WalletView from '../../pages/WalletView';
import TokenOverview from '../../pages/TokenOverview';
import {
  switchToGoreliNetwork,
  importWalletWithRecoveryPhrase,
} from '../../viewHelper';
import Networks from '../../resources/networks.json';

describe(Regression('Token Chart Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should view the token chart', async () => {
    await WalletView.tapOnToken();
    await TokenOverview.isVisible();
    await TokenOverview.TokenQuoteIsNotZero();
    await TokenOverview.checkIfChartIsVisible();
    await TokenOverview.scrollOnScreen();
    await TokenOverview.isReceiveButtonVisible();
    await TokenOverview.isSendButtonVisible();
    await TokenOverview.isSwapButtonVisible();
    await TokenOverview.tapBackButton();
  });

  it('should not display the chart when using Goerli test network', async () => {
    await switchToGoreliNetwork();
    await WalletView.tapOnToken(Networks.Goerli.providerConfig.ticker);
    await TokenOverview.isVisible();
    await TokenOverview.ChartNotVisible();
    await TokenOverview.TokenQuoteIsNotZero();
  });
});
