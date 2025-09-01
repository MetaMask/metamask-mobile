import { RegressionAssets } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import WalletView from '../../pages/wallet/WalletView';
import ToastModal from '../../pages/wallet/ToastModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';

describe(RegressionAssets('Custom RPC Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should go to network and add Gnosis network, switch to it and validate that it is added to network list', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();

        // Tap on Add Network button
        await NetworkView.tapAddNetworkFormButton();

        await NetworkView.typeInNetworkName(
          CustomNetworks.Gnosis.providerConfig.nickname,
        );

        await NetworkView.tapRpcDropDownButton();
        await NetworkView.tapAddRpcButton();

        await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
        await Assertions.expectElementToBeVisible(NetworkView.rpcWarningBanner);
        await NetworkView.clearRpcInputBox();
        await NetworkView.typeInRpcUrl(
          CustomNetworks.Gnosis.providerConfig.rpcUrl,
        );

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
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Gnosis.providerConfig.nickname,
        );
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToHaveText(
          NetworkEducationModal.networkName,
          CustomNetworks.Gnosis.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectElementToBeVisible(WalletView.container);

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          CustomNetworks.Gnosis.providerConfig.nickname,
        );

        // Tap to prompt network list
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          CustomNetworks.Gnosis.providerConfig.nickname,
        );

        // Switch to Sepolia and back to Gnosis
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
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
        await WalletView.tapNetworksButtonOnNavBar();

        // back to Gnosis
        await NetworkListModal.scrollToBottomOfNetworkList();

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          CustomNetworks.Sepolia.providerConfig.nickname,
        );

        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.scrollToTopOfNetworkList();
        // Change to back to Gnosis Network
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Gnosis.providerConfig.nickname,
        );
        await Assertions.expectElementToBeVisible(WalletView.container);

        await Assertions.expectElementToHaveLabel(
          WalletView.navbarNetworkPicker,
          CustomNetworks.Gnosis.providerConfig.nickname,
        );

        await Assertions.expectElementToNotBeVisible(
          NetworkEducationModal.container,
        );
        try {
          await Assertions.expectElementToBeVisible(ToastModal.container);
          await Assertions.expectElementToNotBeVisible(ToastModal.container);
        } catch {
          // eslint-disable-next-line no-console
          console.log('Toast is not visible');
        }
      },
    );
  });

  it('should go to settings networks and remove xDai network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Gnosis)
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

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
          await Assertions.expectElementToBeVisible(ToastModal.container);
          await Assertions.expectElementToNotBeVisible(ToastModal.container);
        } catch {
          // eslint-disable-next-line no-console
          console.log('Toast is not visible');
        }

        try {
          await Assertions.expectElementToBeVisible(ToastModal.container);
          await Assertions.expectElementToNotBeVisible(ToastModal.container);
        } catch {
          // eslint-disable-next-line no-console
          console.log('Toast is not visible');
        }
      },
    );
  });
});
