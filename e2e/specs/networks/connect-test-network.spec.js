import { Regression } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import WalletView from '../../pages/WalletView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';

const SEPOLIA = 'Sepolia Test Network';
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
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();
    await NetworkListModal.changeNetwork(SEPOLIA);
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect(SEPOLIA);
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(SEPOLIA);
  });

  it('should not toggle off the Test Network switch while connected to test network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();
  });

  it('should disconnect to Test Network', async () => {
    await NetworkListModal.changeNetwork(ETHEREUM);
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect(ETHEREUM);
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
    await WalletView.isVisible();
    await WalletView.isConnectedNetwork(ETHEREUM);
  });

  it('should toggle off the Test Network switch', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOff();
    await NetworkListModal.isTestNetworkDisplayed(SEPOLIA);
  });
});
