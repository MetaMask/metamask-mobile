'use strict';
import { SmokeSwaps } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/TokenOverview';
import {
  importWalletWithRecoveryPhrase,
  switchToSepoliaNetwork,
} from '../../viewHelper';
import { CustomNetworks } from '../../resources/networks.e2e';

describe(SmokeSwaps('Token Chart Tests'), () => {
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

  it('should not display the chart when using Sepolia test network', async () => {
    await switchToSepoliaNetwork();
    await WalletView.tapOnToken(CustomNetworks.Sepolia.providerConfig.ticker);
    await TokenOverview.isVisible();
    await TokenOverview.ChartNotVisible();
    await TokenOverview.TokenQuoteIsZero();
  });
});
