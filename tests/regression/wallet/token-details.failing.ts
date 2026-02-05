import { RegressionTrade } from '../../../e2e/tags';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import TokenOverview from '../../../e2e/pages/wallet/TokenOverview';
import {
  importWalletWithRecoveryPhrase,
  switchToSepoliaNetwork,
} from '../../../e2e/viewHelper';
import Assertions from '../../framework/Assertions';
import CommonView from '../../../e2e/pages/CommonView';
import TestHelpers from '../../../e2e/helpers';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(RegressionTrade('Token Chart Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase({});
  });

  it('should view the token chart', async () => {
    await WalletView.tapOnToken('Ethereum');
    await Assertions.expectElementToNotHaveText(TokenOverview.tokenPrice, '$0');

    await TokenOverview.tapChartPeriod1d();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1d);
    await TokenOverview.tapChartPeriod1w();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1w);
    await TokenOverview.tapChartPeriod1m();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1m);
    await TokenOverview.tapChartPeriod3m();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod3m);
    await TokenOverview.tapChartPeriod1y();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1y);
    await TokenOverview.tapChartPeriod3y();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod3y);

    await TokenOverview.scrollOnScreen();
    await Assertions.expectElementToBeVisible(TokenOverview.receiveButton);
    await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
    await Assertions.expectElementToBeVisible(TokenOverview.swapButton);
    await CommonView.tapBackButton();
  });

  // TODO: fix this test
  it.skip('should not display the chart when using Sepolia test network', async () => {
    const sepoliaTokenSymbol = 'S';
    await switchToSepoliaNetwork();
    await WalletView.tapOnToken(sepoliaTokenSymbol);
    await Assertions.expectElementToBeVisible(TokenOverview.noChartData, {
      timeout: 60000,
    });
    await Assertions.expectElementToHaveText(TokenOverview.tokenPrice, '$0');
  });
});
