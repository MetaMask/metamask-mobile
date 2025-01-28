import { SmokeMultiChainPermissions } from '../../../../tags';
import { loginToApp } from '../../../../viewHelper';
import WalletView from '../../../../pages/wallet/WalletView';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../../../pages/Network/NetworkEducationModal';
import Assertions from '../../../../utils/Assertions';
import TestHelpers from '../../../../helpers';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import {
  stopFixtureServer,
  withFixtures,
} from '../../../../fixtures/fixture-helper';
import FixtureServer from '../../../../fixtures/fixture-server';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';

const fixtureServer = new FixtureServer();
const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

describe(
  SmokeMultiChainPermissions('Chain Permission System, non-permitted chain, '),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    afterAll(async () => {
      await stopFixtureServer(fixtureServer);
    });

    it('should show bottom sheet when switching to non-permitted chain', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to non-permitted network
          await TabBarComponent.tapWallet();
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo(SEPOLIA);
          await NetworkEducationModal.tapGotItButton();

          // Verify bottom sheet appears
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000);
          await Browser.navigateToTestDApp();
          await Assertions.checkIfVisible(
            NetworkNonPemittedBottomSheet.addThisNetworkTitle,
          );
        },
      );
    });

    it('should NOT show bottom sheet when permission was already granted', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission([
              '0x1',
              CustomNetworks.Sepolia.providerConfig.chainId,
            ])
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to already permitted network
          await TabBarComponent.tapWallet();
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo(SEPOLIA);
          await NetworkEducationModal.tapGotItButton();

          // Verify no bottom sheet appears
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000);
          await Browser.navigateToTestDApp();
          await Assertions.checkIfNotVisible(
            NetworkNonPemittedBottomSheet.addThisNetworkTitle,
          );
        },
      );
    });

    it.skip('should add network permission when requested', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to non-permitted network
          await TabBarComponent.tapWallet();
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo(SEPOLIA);
          await NetworkEducationModal.tapGotItButton();

          // Add network permission
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000);
          await Browser.navigateToTestDApp();
          await NetworkNonPemittedBottomSheet.tapAddThisNetworkButton();

          // Verify the permission was added by checking that disconnecting both networks shows disconnect all button
          await Browser.tapNetworkAvatarButtonOnBrowser();
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
          await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
          await Assertions.checkIfVisible(
            ConnectedAccountsModal.disconnectNetworksButton,
          );
        },
      );
    });

    it('should allow switching to permitted network when attempting to use non-permitted network', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission([
              '0x1',
              CustomNetworks.Sepolia.providerConfig.chainId,
            ]) // Initialize with Ethereum mainnet and Sepolia
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to non-permitted network (Linea Sepolia)
          await TabBarComponent.tapWallet();
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo('Linea Sepolia');
          await NetworkEducationModal.tapGotItButton();

          // Verify bottom sheet appears and choose from permitted networks
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000); // Wait for the browser to load
          await Browser.navigateToTestDApp();
          await TestHelpers.delay(3000); // Wait for the toast to disappear
          await Assertions.checkIfVisible(
            NetworkNonPemittedBottomSheet.addThisNetworkTitle,
          );
          await TestHelpers.delay(3000); // still waiting for the toast to disappear
          await NetworkNonPemittedBottomSheet.tapChooseFromPermittedNetworksButton();

          // Select Sepolia from permitted networks
          await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
          await NetworkEducationModal.tapGotItButton();
          await TestHelpers.delay(3000); // another toast to wait for, after switching to Sepolia

          // Verify network switched to Sepolia
          await TabBarComponent.tapWallet();
          await Assertions.checkIfVisible(WalletView.container);
          const networkPicker = await WalletView.getNavbarNetworkPicker();
          await Assertions.checkIfElementHasLabel(networkPicker, SEPOLIA);
        },
      );
    });

    it('should allow adding new chain permission through edit permissions', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission() // Initialize with only Ethereum mainnet
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to non-permitted network (Sepolia)
          await TabBarComponent.tapWallet();
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.changeNetworkTo(SEPOLIA);
          await NetworkEducationModal.tapGotItButton();

          // Verify bottom sheet appears and navigate to edit permissions
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000); // Wait for the browser to load
          await Browser.navigateToTestDApp();
          await Assertions.checkIfVisible(
            NetworkNonPemittedBottomSheet.addThisNetworkTitle,
          );
          await TestHelpers.delay(3000); // Wait for the toast to disappear
          await NetworkNonPemittedBottomSheet.tapChooseFromPermittedNetworksButton();
          await NetworkNonPemittedBottomSheet.tapEditPermissionsButton();

          // Select Linea Sepolia from network selector and update permissions
          await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
          await NetworkConnectMultiSelector.tapUpdateButton();
          // await NetworkEducationModal.tapGotItButton(); // commeting this line for now, for some reason the e2e recordings dont currently show a got it modal here
          await TestHelpers.delay(3000); // Wait for the toast to disappear

          // Select Linea Sepolia from permitted networks
          await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
          await NetworkEducationModal.tapGotItButton();
          await TestHelpers.delay(3000); // Wait for the toast to disappear

          // Verify network switched to Linea Sepolia
          await TabBarComponent.tapWallet();
          await Assertions.checkIfVisible(WalletView.container);
          const networkPicker = await WalletView.getNavbarNetworkPicker();
          await Assertions.checkIfElementHasLabel(
            networkPicker,
            'Linea Sepolia',
          );
        },
      );
    });
  },
);
