import { Regression } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/WalletView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
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

const fixtureServer = new FixtureServer();
const SEPOLIA = 'Sepolia Test Network';
const ETHEREUM = 'Ethereum Main Network';

describe(Regression('Connect to a Test Network'), () => {
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

  it('should switch to test Network then dismiss the network education modal', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
    await NetworkListModal.changeToNetwork(SEPOLIA);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      SEPOLIA,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(SEPOLIA);
  });

  it('should not toggle off the Test Network switch while connected to test network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
  });

  it('should disconnect to Test Network', async () => {
    await NetworkListModal.changeToNetwork(ETHEREUM);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      ETHEREUM,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(ETHEREUM);
  });

  it('should toggle off the Test Network switch', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOff(NetworkListModal.testSwitch);
    await Assertions.checkIfTextIsNotDisplayed(SEPOLIA);
  });
});
