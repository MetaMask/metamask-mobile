'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import WalletView from '../../pages/wallet/WalletView';
import ToastModal from '../../pages/wallet/ToastModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { loginToApp } from '../../viewHelper';
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

describe('Custom RPC Tests', () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
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

  it('should go to network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
  });

  it('should add Gnosis network', async () => {
    // Tap on Add Network button
    await NetworkView.tapAddNetworkFormButton();

    await NetworkView.typeInNetworkName(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );

    await NetworkView.tapRpcDropDownButton();
    await NetworkView.tapAddRpcButton();

    await TestHelpers.delay(200);
    await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
    await Assertions.checkIfVisible(NetworkView.rpcWarningBanner);
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(CustomNetworks.Gnosis.providerConfig.rpcUrl);

    await NetworkView.tapAddRpcButton();

    await NetworkView.typeInNetworkSymbol(
      `${CustomNetworks.Gnosis.providerConfig.ticker}\n`,
    );

    await NetworkView.typeInChainId(
      CustomNetworks.Gnosis.providerConfig.chainId,
    );

    await NetworkView.tapChainIDLabel(); // Focus outside of text input field

    await NetworkView.tapBlockExplorerDownButton();
    await NetworkView.tapBlockExplorerButton();
    await NetworkView.typeInNetworkBlockExplorer(
      `${CustomNetworks.Gnosis.providerConfig.BlockExplorerUrl}\n`,
    );

    if (device.getPlatform() === 'ios') {
      await NetworkView.tapChainIDLabel(); // Focus outside of text input field
      await NetworkView.tapChainIDLabel(); // Focus outside of text input field
    }
    await NetworkView.tapRpcNetworkAddButton();
  });

  it('should switch to Gnosis network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
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
    const networkPicker = await WalletView.getNavbarNetworkPicker();
    await Assertions.checkIfElementHasLabel(
      networkPicker,
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
  });

  it('should validate that Gnosis is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);

    const networkPicker = await WalletView.getNavbarNetworkPicker();
    await Assertions.checkIfElementHasLabel(
      networkPicker,
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
  });

  it('should switch to Sepolia then dismiss the network education modal', async () => {
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await Assertions.checkIfVisible(NetworkEducationModal.container);

    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await Assertions.checkIfVisible(WalletView.container);
    const networkPicker = await WalletView.getNavbarNetworkPicker();

    await Assertions.checkIfElementHasLabel(
      networkPicker,
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
  });

  it('should switch back to Gnosis', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.scrollToBottomOfNetworkList();

    const networkPicker = await WalletView.getNavbarNetworkPicker();
    await Assertions.checkIfElementHasLabel(
      networkPicker,
      CustomNetworks.Sepolia.providerConfig.nickname,
    );

    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.scrollToTopOfNetworkList();
    // Change to back to Gnosis Network
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementHasLabel(
      networkPicker,
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
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );

    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.longPressOnNetwork(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );

    if (device.getPlatform() === 'android') {
      await device.disableSynchronization();
    }

    // delete Gnosis network
    await NetworkListModal.deleteNetwork();

    await TestHelpers.delay(200);

    await NetworkListModal.tapDeleteButton();

    try {
      await Assertions.checkIfVisible(ToastModal.container);
      await Assertions.checkIfNotVisible(ToastModal.container);
    } catch {
      // eslint-disable-next-line no-console
      console.log('Toast is not visible');
    }

    try {
      await Assertions.checkIfVisible(ToastModal.container);
      await Assertions.checkIfNotVisible(ToastModal.container);
    } catch {
      // eslint-disable-next-line no-console
      console.log('Toast is not visible');
    }
  });
});
