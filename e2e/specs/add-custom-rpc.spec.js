'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import NetworkView from '../pages/Drawer/Settings/NetworksView';

import WalletView from '../pages/WalletView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import { CreateNewWallet } from '../viewHelper';
import TabBarComponent from '../pages/TabBarComponent';

const GORELI = 'Goerli Test Network';
const XDAI_URL = 'https://rpc.gnosischain.com';
const MAINNET = 'Ethereum Main Network';

describe(Regression('Custom RPC Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should create new wallet', async () => {
    await CreateNewWallet();
  });

  it('should go to settings then networks', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await NetworkView.isNetworkViewVisible();
  });

  it('should add xDai network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();

    await NetworkView.typeInNetworkName('xDai');
    await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
    await NetworkView.isRPCWarningVisble(); // Check that warning is displayed
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(XDAI_URL);
    await NetworkView.typeInChainId('100');
    await NetworkView.typeInNetworkSymbol('xDAI\n');

    if (device.getPlatform() === 'ios') {
      await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
      await NetworkView.tapRpcNetworkAddButton();
    }
    await TestHelpers.delay(3000);
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('xDai');
  });
  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Xdai');
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should validate that xDai is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.isVisible();
    await NetworkListModal.isNetworkNameVisibleInListOfNetworks('xDai');
  });

  it('should switch to Goreli then dismiss the network education modal', async () => {
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();
    await NetworkListModal.changeNetwork(GORELI);

    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Goreli Test Network');

    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();

    await WalletView.isVisible();
  });

  it('should switch back to xDAI', async () => {
    await WalletView.isNetworkNameVisible(GORELI);
    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.isVisible();
    await NetworkListModal.scrollToBottomOfNetworkList();

    // Change to back to xDai Network
    await NetworkListModal.changeNetwork('xDai');

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('xDai');
    await NetworkEducationModal.isNotVisible();
  });

  it('should go to settings networks and remove xDai network', async () => {
    await TestHelpers.delay(3000);

    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
    await NetworkView.removeNetwork(); // Tap on xDai to remove network
    await NetworkEducationModal.tapGotItButton();

    await TabBarComponent.tapWallet();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(MAINNET);
  });
});
