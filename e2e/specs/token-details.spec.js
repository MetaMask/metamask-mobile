'use strict';

import { importWalletWithRecoveryPhrase } from '../viewHelper';
import { Regression } from '../tags';
import WalletView from '../pages/WalletView';
import TokenOverview from '../pages/TokenOverview';
import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import NetworkApprovalModal from '../pages/modals/NetworkApprovalModal';
import NetworkAddedModal from '../pages/modals/NetworkAddedModal';
import NetworkView from '../pages/Drawer/Settings/NetworksView';
import TestHelpers from '../helpers';

const TEST_NETWORK = 'Goerli Test Network'

describe(Regression('Token Chart Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });
/*
  it('should not display the chart when using test network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch()
    await NetworkListModal.changeNetwork(TEST_NETWORK)
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect(TEST_NETWORK);
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
    await WalletView.tapOnToken("GoerliETH");
    await TokenOverview.isVisible()
    await TokenOverview.checkChartNotVisible()
    await TokenOverview.tapBackButton()
  });
*/
  it.each`
      networkName                     | symbol
      ${'Ethereum Main Network'}      | ${'Ethereum'}
      ${'Avalanche Mainnet C-Chain'}  | ${'AVAX'}
      ${'Arbitrum One'}               | ${'Ethereum'}
      ${'BNB Smart Chain'}            | ${'BNB'}
      ${'Optimism'}                   | ${'Ethereum'}
      ${'Polygon Mainnet'}            | ${'MATIC'}
  `("should view the '$symbol' chart on '$networkName'", async ({ networkName, symbol }) => {

    if (networkName !== 'Ethereum Main Network')
      await switchNetwork(networkName)

    await WalletView.tapOnToken(symbol);
    await TokenOverview.isVisible()
    await TokenOverview.checkIfChartIsVisible()
    await TokenOverview.scrollOnScreen()
    await TokenOverview.checkIfReceiveButtonVisible()
    await TokenOverview.checkIfBuyButtonVisible()
    await TokenOverview.checkIfSendButtonVisible()
    await TokenOverview.checkIfSwapButtonVisible()
    await TokenOverview.tapBackButton()
  });
})

const  switchNetwork = async (networkName) => {

    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapAddNetworkButton();
    await NetworkView.isRpcViewVisible()
    await NetworkView.tapPopularNetworkByName(networkName);

    await NetworkApprovalModal.isVisible();
    await NetworkApprovalModal.isDisplayNameVisible(networkName);
    await NetworkApprovalModal.tapApproveButton();
    await TestHelpers.delay(1000);

    await NetworkAddedModal.isVisible();
    await NetworkAddedModal.tapSwitchToNetwork();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(networkName);

    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect(networkName);
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(networkName);
};

