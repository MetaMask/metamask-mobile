'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import WalletView from '../../pages/WalletView';
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
import Networks from '../../resources/networks.json';

const fixtureServer = new FixtureServer();
const SEPOLIA = 'Sepolia Test Network';
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
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();
    await NetworkView.typeInNetworkName(
      Networks.Gnosis.providerConfig.nickname,
    );
    await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
    await Assertions.checkIfVisible(NetworkView.rpcWarningBanner);
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(Networks.Gnosis.providerConfig.rpcUrl);
    await NetworkView.typeInChainId(Networks.Gnosis.providerConfig.chainId);
    await NetworkView.typeInNetworkSymbol(
      `${Networks.Gnosis.providerConfig.ticker}\n`,
    );
    if (device.getPlatform() === 'ios') {
      await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
      await NetworkView.tapRpcNetworkAddButton();
    }

    await TestHelpers.delay(3000);
    await Assertions.checkIfVisible(NetworkApprovalModal.container);
    await NetworkApprovalModal.tapApproveButton();

    await TestHelpers.delay(3000);
    await Assertions.checkIfVisible(NetworkAddedModal.switchNetwork);
    await NetworkAddedModal.tapSwitchToNetwork();

    await TestHelpers.delay(3000);
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(
      Networks.Gnosis.providerConfig.nickname,
    );
  });

  it('should dismiss network education modal', async () => {
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      Networks.Gnosis.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
  });

  it('should validate that xDai is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await Assertions.checkIfTextIsDisplayed('xDai');
  });

  it('should switch to Goreli then dismiss the network education modal', async () => {
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
    await NetworkListModal.changeNetwork(SEPOLIA);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      Networks.Gnosis.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await WalletView.isVisible();
  });

  it('should switch back to xDAI', async () => {
    await WalletView.isNetworkNameVisible(SEPOLIA);
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.scrollToBottomOfNetworkList();
    // Change to back to xDai Network
    await NetworkListModal.changeNetwork(
      Networks.Gnosis.providerConfig.nickname,
    );
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(
      Networks.Gnosis.providerConfig.nickname,
    );
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
  });

  it('should go to settings networks and remove xDai network', async () => {
    await TestHelpers.delay(3000);
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await Assertions.checkIfVisible(NetworkView.networkContainer);
    await NetworkView.tapRemoveNetwork(Networks.Gnosis.providerConfig.nickname); // Tap on xDai to remove network
    await NetworkEducationModal.tapGotItButton();
    await TabBarComponent.tapWallet();
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(MAINNET);
  });
});
