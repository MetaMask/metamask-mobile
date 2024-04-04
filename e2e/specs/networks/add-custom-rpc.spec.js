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
    await TestHelpers.delay(3000);
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
    await NetworkView.typeInNetworkSymbol(
      `${CustomNetworks.Gnosis.providerConfig.ticker}\n`,
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
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
  });

  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should validate that xDai is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.isNetworkNameVisibleInListOfNetworks(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
  });

  it('should switch to Sepolia then dismiss the network education modal', async () => {
    await NetworkListModal.isTestNetworkToggleOn();
    await NetworkListModal.changeNetwork(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Goreli Test Network');
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
    await WalletView.isVisible();
  });

  it('should switch back to xDAI', async () => {
    await WalletView.isNetworkNameVisible(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.scrollToBottomOfNetworkList();
    // Change to back to xDai Network
    await NetworkListModal.changeNetwork(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(
      CustomNetworks.Gnosis.providerConfig.nickname,
    );
    await NetworkEducationModal.isNotVisible();
  });

  it('should go to settings networks and remove xDai network', async () => {
    await TestHelpers.delay(3000);
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await Assertions.checkIfVisible(NetworkView.networkContainer);
    await NetworkView.longPressToRemoveNetwork(
      CustomNetworks.Gnosis.providerConfig.nickname,
    ); // Tap on xDai to remove network
    await NetworkEducationModal.tapGotItButton();
    await TabBarComponent.tapWallet();
    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(MAINNET);
  });
});
