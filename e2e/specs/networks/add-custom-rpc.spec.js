'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import WalletView from '../../pages/wallet/WalletView';
import ToastModal from '../../pages/modals/ToastModal';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import NetworkAddedModal from '../../pages/modals/NetworkAddedModal';
import NetworkApprovalModal from '../../pages/modals/NetworkApprovalModal';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';

const fixtureServer = new FixtureServer();
const MAINNET = 'Ethereum Main Network';

describe(Regression('Custom RPC Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should go to settings then networks', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await Assertions.checkIfVisible(NetworkView.networkContainer);
  });

  it('should add Gnosis network', async () => {
    // Tap on Add Network button
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();
    await NetworkView.typeInNetworkName(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
    await Assertions.checkIfVisible(NetworkView.rpcWarningBanner);
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(CustomNetworks.Gnosis.providerConfig.rpcUrl);
    await NetworkView.typeInChainId(
      CustomNetworks.Gnosis.providerConfig.chainId,
    );
    await NetworkView.tapChainIDLabel(); // Focus outside of text input field

    await NetworkView.typeInNetworkSymbol(
      `${CustomNetworks.Gnosis.providerConfig.ticker}\n`,
    );
    if (device.getPlatform() === 'ios') {
      await NetworkView.tapChainIDLabel(); // Focus outside of text input field
      await NetworkView.tapChainIDLabel(); // Focus outside of text input field
      await NetworkView.tapRpcNetworkAddButton();
    }
    await Assertions.checkIfVisible(NetworkApprovalModal.container);
    await NetworkApprovalModal.tapApproveButton();
    await Assertions.checkIfVisible(NetworkAddedModal.switchNetwork);
    await NetworkAddedModal.tapSwitchToNetwork();
  });

  it('should dismiss network education modal', async () => {
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementToHaveText(
      WalletView.navbarNetworkText,
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
  });

  it('should validate that Gnosis is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await Assertions.checkIfVisible(
      NetworkListModal.getCustomNetwork(
        CustomNetworks.Gnosis.providerConfig.nickname,
        true,
      ),
    );
  });

  it('should switch to Sepolia then dismiss the network education modal', async () => {
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should switch back to Gnosis', async () => {
    await Assertions.checkIfElementToHaveText(
      WalletView.navbarNetworkText,
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.scrollToBottomOfNetworkList();
    // Change to back to Gnosis Network
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Gnosis.providerConfig.nickname,
      true,
    );
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementToHaveText(
      WalletView.navbarNetworkText,
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);

    try {
      await Assertions.checkIfVisible(ToastModal.container);
      await Assertions.checkIfNotVisible(ToastModal.container);
    } catch {
      // eslint-disable-next-line no-console
      console.log('Toast is not visible');
    }
  });

  it('should go to settings networks and remove xDai network', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await Assertions.checkIfVisible(NetworkView.networkContainer);

    await NetworkView.longPressToRemoveNetwork(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    if (device.getPlatform() === 'android') {
      await device.disableSynchronization();
    }
    await NetworkEducationModal.tapGotItButton();

    try {
      await Assertions.checkIfVisible(ToastModal.container);
      await Assertions.checkIfNotVisible(ToastModal.container);
    } catch {
      // eslint-disable-next-line no-console
      console.log('Toast is not visible');
    }
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementToHaveText(
      WalletView.navbarNetworkText,
      MAINNET,
    );
  });
});
