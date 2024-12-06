import { SmokeMultiChain } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { stopFixtureServer, withFixtures } from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { CustomNetworks } from '../../resources/networks.e2e';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';

const fixtureServer = new FixtureServer();
const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;
const MAINNET_CHAIN_ID = '0x1';

describe(
  SmokeMultiChain('Network Permission System, non-permitted chain'),
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

    it('should show bottom sheet when switching to non-permitted network', async () => {
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
              MAINNET_CHAIN_ID,
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
          await Browser.navigateToTestDApp();
          await Assertions.checkIfNotVisible(
            NetworkNonPemittedBottomSheet.addThisNetworkTitle,
          );
        },
      );
    });

    it('should add network permission when requested', async () => {
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
          await Browser.navigateToTestDApp();
          await NetworkNonPemittedBottomSheet.tapAddThisNetworkButton();

          // Verify permission was added by checking that disconnecting both networks shows disconnect all button
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
  },
);
