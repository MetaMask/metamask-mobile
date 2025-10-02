import { RegressionAssets } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import Assertions from '../../framework/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

const ETHEREUM = 'Ethereum Main Network';

describe(RegressionAssets('Connect to a Test Network'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should switch to test Network then dismiss the network education modal', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        // Tap to prompt network list
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToHaveText(
          NetworkEducationModal.networkName,
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectElementToNotBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToBeVisible(WalletView.container);

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
      },
    );
  });

  it('should not toggle off the Test Network switch while connected to test network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Sepolia)
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.tapTestNetworkSwitch();
        await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
      },
    );
  });

  it('should disconnect to Test Network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Sepolia)
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToTopOfNetworkList();
        await NetworkListModal.changeNetworkTo(ETHEREUM);
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToHaveText(
          NetworkEducationModal.networkName,
          ETHEREUM,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectElementToNotBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToBeVisible(WalletView.container);

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          ETHEREUM,
        );
      },
    );
  });

  it('should toggle off the Test Network switch', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await Assertions.expectTextDisplayed(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
        await NetworkListModal.tapTestNetworkSwitch();
        await Assertions.expectToggleToBeOff(NetworkListModal.testNetToggle);
        await Assertions.expectTextNotDisplayed(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
      },
    );
  });
});
