import { RegressionNetworkExpansion } from '../../../../tags';
import { loginToApp } from '../../../../viewHelper';
import WalletView from '../../../../pages/wallet/WalletView';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../../../pages/Network/NetworkEducationModal';
import Assertions from '../../../../framework/Assertions';
import TestHelpers from '../../../../helpers';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import { DappVariants } from '../../../../framework/Constants';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

xdescribe(
  RegressionNetworkExpansion('Chain Permission System, non-permitted chain, '),
  () => {
    // These tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
    const isRemoveGlobalNetworkSelectorEnabled =
      process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
    const itif = (condition) => (condition ? it.skip : it);

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should show bottom sheet when switching to non-permitted chain',
      async () => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
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
            await device.disableSynchronization();
            await NetworkEducationModal.tapGotItButton();
            await device.enableSynchronization();
            // Verify bottom sheet appears
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await Assertions.expectElementToBeVisible(
              NetworkNonPemittedBottomSheet.addThisNetworkTitle,
            );
          },
        );
      },
    );

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should NOT show bottom sheet when permission was already granted',
      async () => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
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
            await device.disableSynchronization();
            await NetworkEducationModal.tapGotItButton();
            await device.enableSynchronization();
            // Verify no bottom sheet appears
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await Assertions.expectElementToNotBeVisible(
              NetworkNonPemittedBottomSheet.addThisNetworkTitle,
            );
          },
        );
      },
    );

    it.skip('should add network permission when requested', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
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
          await device.disableSynchronization();
          await NetworkEducationModal.tapGotItButton();
          await device.enableSynchronization();

          // Add network permission
          await TabBarComponent.tapBrowser();
          await TestHelpers.delay(3000);
          await Browser.navigateToTestDApp();
          await NetworkNonPemittedBottomSheet.tapAddThisNetworkButton();

          // Verify the permission was added by checking that disconnecting both networks shows disconnect all button
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
          await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
          await Assertions.checkIfVisible(
            ConnectedAccountsModal.disconnectNetworksButton,
          );
        },
      );
    });

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should allow switching to permitted network when attempting to use non-permitted network',
      async () => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
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
            await Browser.navigateToTestDApp();
            await Assertions.expectElementToBeVisible(
              NetworkNonPemittedBottomSheet.addThisNetworkTitle,
            );
            await NetworkNonPemittedBottomSheet.tapChooseFromPermittedNetworksButton();

            // Select Sepolia from permitted networks
            await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
            await NetworkEducationModal.tapGotItButton();

            // Verify network switched to Sepolia
            await TabBarComponent.tapWallet();
            await Assertions.expectElementToBeVisible(WalletView.container);
            await Assertions.expectElementToHaveLabel(
              WalletView.navbarNetworkPicker,
              SEPOLIA,
            );
          },
        );
      },
    );

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should allow adding new chain permission through edit permissions',
      async () => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
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
            await device.disableSynchronization();
            await NetworkEducationModal.tapGotItButton();
            await device.enableSynchronization();

            // Verify bottom sheet appears and navigate to edit permissions
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await Assertions.expectElementToBeVisible(
              NetworkNonPemittedBottomSheet.addThisNetworkTitle,
            );
            await NetworkNonPemittedBottomSheet.tapChooseFromPermittedNetworksButton();
            await NetworkNonPemittedBottomSheet.tapEditPermissionsButton();

            // Select Linea Sepolia from network selector and update permissions
            await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
            await NetworkConnectMultiSelector.tapUpdateButton();
            // await NetworkEducationModal.tapGotItButton(); // commeting this line for now, for some reason the e2e recordings dont currently show a got it modal here

            // Select Linea Sepolia from permitted networks
            await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
            await NetworkEducationModal.tapGotItButton();

            // Verify network switched to Linea Sepolia
            await TabBarComponent.tapWallet();
            await Assertions.expectElementToBeVisible(WalletView.container);
            await Assertions.expectElementToHaveLabel(
              WalletView.navbarNetworkPicker,
              'Linea Sepolia',
            );
          },
        );
      },
    );
  },
);
