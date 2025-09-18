import {
  RegressionNetworkExpansion,
  SmokeNetworkExpansion,
} from '../../../../../tags';
import { loginToApp } from '../../../../../viewHelper';
import Assertions from '../../../../framework/Assertions';
import TestHelpers from '../../../../../helpers';
import FixtureBuilder from '../../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../../../resources/networks.e2e';
import Browser from '../../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../../pages/wallet/TabBarComponent';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import ConnectedAccountsModal from '../../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../../pages/Browser/NetworkConnectMultiSelector';
import { DappVariants } from '../../../../../framework/Constants';
import WalletView from '../../../../../pages/wallet/WalletView';
import NetworkListModal from '../../../../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../../../../pages/Network/NetworkEducationModal';
import NetworkNonPemittedBottomSheet from '../../../../../pages/Network/NetworkNonPemittedBottomSheet';
import TestDApp from '../../../../../pages/Browser/TestDApp';
import ConnectBottomSheet from '../../../../../pages/Browser/ConnectBottomSheet';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;
const ETHEREUM_MAIN_NET_NETWORK_NAME =
  NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME;

describe(
  SmokeNetworkExpansion('Chain Permission System, non-permitted chain, '),
  () => {
    // These tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
    const isRemoveGlobalNetworkSelectorEnabled =
      process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
    const itif = (condition) => (condition ? it : it.skip);

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should request permission when switching to non-permitted chain from dapp',
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
              .withPopularNetworks()
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            // Switch to non-permitted network on dapp
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await TestDApp.tapOpenNetworkPicker();
            await TestDApp.tapNetworkByName(SEPOLIA);
            const expectedText = `Use your enabled networks Requesting for ${SEPOLIA}`;
            await Assertions.expectElementToHaveLabel(
              ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
              expectedText,
              {
                description: `edit networks permissions button should show "${expectedText}"`,
              },
            );
            await Assertions.expectElementToBeVisible(
              ConnectBottomSheet.connectButton,
            );
            await ConnectBottomSheet.tapConnectButton();
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
              .withChainPermission()
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            // Add network permission
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();

            // Verify the permission was added by checking that disconnecting both networks shows disconnect all button
            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
            await ConnectedAccountsModal.tapManagePermissionsButton();
            await ConnectedAccountsModal.tapPermissionsSummaryTab();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              SEPOLIA,
            );
            await NetworkConnectMultiSelector.tapUpdateButton();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              ETHEREUM_MAIN_NET_NETWORK_NAME,
            );
            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              SEPOLIA,
            );
            await Assertions.expectElementToBeVisible(
              ConnectedAccountsModal.disconnectNetworksButton,
            );
          },
        );
      },
    );
  },
);

describe(
  RegressionNetworkExpansion('Chain Permission System, non-permitted chain, '),
  () => {
    // These tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
    const isRemoveGlobalNetworkSelectorEnabled =
      process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
    const itif = (condition) => (condition ? it : it.skip);

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should not request permission when switching to permitted chain in dApp',
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
              .withPopularNetworks()
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            // Switch to permitted network on dapp
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');
            await TestDApp.tapOpenNetworkPicker();
            await TestDApp.tapNetworkByName(SEPOLIA);
            await Assertions.expectElementToNotBeVisible(
              ConnectBottomSheet.connectButton,
            );

            if (device.getPlatform() === 'ios') {
              await Browser.tapHomeButton();
              await Browser.navigateToTestDApp();
            } else {
              await Browser.reloadTab();
            }
            await TestDApp.verifyCurrentNetworkText(SEPOLIA);
          },
        );
      },
    );

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should not switch network in dapp when switching network in wallet',
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
              .withPopularNetworks()
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            // Switch to permitted network on dapp
            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();
            await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');

            await TabBarComponent.tapWallet();
            await WalletView.tapTokenNetworkFilter();
            await NetworkListModal.tapOnCustomTab();
            await NetworkListModal.changeNetworkTo('Sepolia');

            await TabBarComponent.tapBrowser();
            if (device.getPlatform() === 'ios') {
              await Browser.tapHomeButton();
              await Browser.navigateToTestDApp();
            } else {
              await Browser.reloadTab();
            }
            await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');
          },
        );
      },
    );
  },
);

describe(
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

    itif(isRemoveGlobalNetworkSelectorEnabled)(
      'should add network permission when requested',
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
      },
    );

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
