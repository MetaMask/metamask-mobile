'use strict';
import { SmokeTrade } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import {
  importWalletWithRecoveryPhrase,
  switchToSepoliaNetwork,
} from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import CommonView from '../../pages/CommonView';
import TestHelpers from '../../helpers';

describe(SmokeTrade('Token Chart Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should view the token chart', async () => {
    await WalletView.tapOnToken();
    await Assertions.checkIfElementNotToHaveText(
      TokenOverview.tokenPrice,
      '$0',
    );

    await TokenOverview.tapChartPeriod1d();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1d);
    await TokenOverview.tapChartPeriod1w();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1w);
    await TokenOverview.tapChartPeriod1m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1m);
    await TokenOverview.tapChartPeriod3m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3m);
    await TokenOverview.tapChartPeriod1y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1y);
    await TokenOverview.tapChartPeriod3y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3y);

    await TokenOverview.scrollOnScreen();
    await Assertions.checkIfVisible(TokenOverview.receiveButton);
    await Assertions.checkIfVisible(TokenOverview.sendButton);
    await Assertions.checkIfVisible(TokenOverview.swapButton);
    await CommonView.tapBackButton();
  });

  it('should not display the chart when using Sepolia test network', async () => {
    const sepoliaTokenSymbol = 'S';
    await switchToSepoliaNetwork();
    await WalletView.tapOnToken(sepoliaTokenSymbol);
    await Assertions.checkIfVisible(TokenOverview.noChartData, 60000);
    await Assertions.checkIfElementToHaveText(TokenOverview.tokenPrice, '$0');
  });
});
