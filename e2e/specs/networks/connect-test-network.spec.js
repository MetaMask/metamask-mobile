import { Regression } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import { CustomNetworks } from '../../resources/networks.e2e';

const fixtureServer = new FixtureServer();
const ETHEREUM = 'Ethereum Main Network';

describe(Regression('Connect to a Test Network'), () => {
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

  it('should switch to test Network then dismiss the network education modal', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
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

    const networkPicker = await WalletView.getNavbarNetworkPicker();
    await Assertions.checkIfElementHasLabel(
      networkPicker,
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
  });

  it('should not toggle off the Test Network switch while connected to test network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
  });

  it('should disconnect to Test Network', async () => {
    await NetworkListModal.scrollToTopOfNetworkList();
    await NetworkListModal.changeNetworkTo(ETHEREUM);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      ETHEREUM,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await Assertions.checkIfVisible(WalletView.container);

    const networkPicker = await WalletView.getNavbarNetworkPicker();
    await Assertions.checkIfElementHasLabel(networkPicker, ETHEREUM);
  });

  it('should toggle off the Test Network switch', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await Assertions.checkIfTextIsDisplayed(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOff(NetworkListModal.testNetToggle);
    await Assertions.checkIfTextIsNotDisplayed(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
  });
});
