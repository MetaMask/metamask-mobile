import { Regression } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import WalletView from '../../pages/WalletView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import Assertions from '../../utils/Assertions';

const GORELI = 'Goerli Test Network';
const ETHEREUM = 'Ethereum Main Network';

describe(Regression('Connect to a Test Network'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should switch to test Network then dismiss the network education modal', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
    await NetworkListModal.changeNetwork(GORELI);
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      GORELI,
    );
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      GORELI,
    );
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(GORELI);
  });

  it('should not toggle off the Test Network switch while connected to test network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await Assertions.checkIfVisible(NetworkListModal.networkScroll);
    await NetworkListModal.tapTestNetworkSwitch();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testSwitch);
  });

  it('should disconnect to Test Network', async () => {
    await NetworkListModal.changeNetwork(ETHEREUM);
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
    await Assertions.checkIfTextIsDisplayed(GORELI);
  });
});
