import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import NetworkManager from '../../pages/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { DappVariants } from '../../framework/Constants';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import { CustomNetworks } from '../../resources/networks.e2e';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

// Shared configuration
const isRemoveGlobalNetworkSelectorEnabled =
  process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
console.log(
  'isRemoveGlobalNetworkSelectorEnabled',
  isRemoveGlobalNetworkSelectorEnabled,
);

// const itif = (condition: boolean) => (condition ? it : it.skip);

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should reflect the correct enabled networks state in the network manager', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await NetworkManager.openNetworkManager();

        await Assertions.expectElementToBeVisible(
          NetworkManager.popularNetworksContainer,
        );
        await Assertions.expectElementToBeVisible(
          NetworkManager.selectAllPopularNetworksSelected,
        );

        // Verify all popular networks are not selected (since "Select All" is selected)
        const popularNetworks = [
          NetworkToCaipChainId.ETHEREUM,
          NetworkToCaipChainId.LINEA,
          NetworkToCaipChainId.AVALANCHE,
          NetworkToCaipChainId.BNB,
          NetworkToCaipChainId.ZKSYNC_ERA,
          NetworkToCaipChainId.BASE,
          NetworkToCaipChainId.OPTIMISM,
          NetworkToCaipChainId.POLYGON,
          NetworkToCaipChainId.PALM,
        ];

        for (const network of popularNetworks) {
          await NetworkManager.getNotSelectedNetworkByCaipChainId(network);
        }
      },
    );
  });

  it('should reflect the enabled networks state in the network manager, when all popular networks are selected', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        // verify popular networks container is visible
        await NetworkManager.checkPopularNetworksContainerIsVisible();

        // verify all popular networks are selected
        await NetworkManager.checkAllPopularNetworksIsSelected();
      },
    );
  });

  it('should select a network and deselect the previous selected network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();

        await NetworkManager.checkAllPopularNetworksIsSelected();

        // Select and check the network in the base control bar
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Open the network manager and check the network is selected
        await NetworkManager.openNetworkManager();

        await NetworkManager.checkNetworkIsSelected(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Select Avalanche and check if Ethereum is not selected
        await NetworkManager.tapNetwork(NetworkToCaipChainId.AVALANCHE);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.AVALANCHE,
        );

        // validate that Ethereum is not selected
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkNetworkIsNotSelected(
          NetworkToCaipChainId.ETHEREUM,
        );
      },
    );
  });

  it('should default to custom tab when custom network is enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkEnabledMap({
            eip155: { '0xaa36a7': false },
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        // Open network manager and check popular networks container is visible
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkPopularNetworksContainerIsVisible();

        // Tap custom networks tab and check custom networks container is visible
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.checkCustomNetworksContainerIsVisible();

        // Tap localhost network and check base control bar text
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LOCALHOST);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LOCALHOST,
        );

        // Open network manager and check custom networks container is visible
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkCustomNetworksContainerIsVisible();
      },
    );
  });

  it('should default to default tab when default network is enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkEnabledMap({
            eip155: { '0xaa36a7': false },
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
      },
    );
  });

  it('should filter tokens by popular enabled networks', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkEnabledMap({
            eip155: { '0xaa36a7': false }, // Sepolia disabled
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Open network manager and verify initial state
        await NetworkManager.openNetworkManager();
        await NetworkManager.waitForNetworkManagerToLoad();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
        await NetworkManager.checkTabIsSelected('Popular');

        // Select Ethereum network
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Verify tokens that should be visible on Ethereum
        const expectedVisibleTokens = ['Ethereum', 'USDC', 'DAI'];
        for (const token of expectedVisibleTokens) {
          await NetworkManager.checkTokenIsVisible(token);
        }

        // Verify tokens that should not be visible (from other networks)
        const expectedHiddenTokens = ['PALM', 'AVAX', 'BNB'];
        for (const token of expectedHiddenTokens) {
          await NetworkManager.checkTokenIsNotVisible(token);
        }
      },
    );
  });

  it('should filter tokens by custom enabled networks', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkEnabledMap({
            eip155: { '0xaa36a7': false }, // Sepolia disabled
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Open network manager and verify initial state
        await NetworkManager.openNetworkManager();
        await NetworkManager.waitForNetworkManagerToLoad();
        await NetworkManager.checkPopularNetworksContainerIsVisible();

        // Switch to custom networks tab
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.checkCustomNetworksContainerIsVisible();
        await NetworkManager.checkTabIsSelected('Custom');

        // Select a custom network (Linea Sepolia)
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA_SEPOLIA);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LINEA_SEPOLIA,
        );

        // Verify tokens that should not be visible (from popular networks)
        const expectedHiddenTokens = ['PALM', 'AVAX', 'BNB'];
        for (const token of expectedHiddenTokens) {
          await NetworkManager.checkTokenIsNotVisible(token);
        }

        // Verify tokens that should be visible on custom networks
        const expectedVisibleTokens = ['Ethereum'];
        for (const token of expectedVisibleTokens) {
          await NetworkManager.checkTokenIsVisible(token);
        }
      },
    );
  });

  it('should preserve existing enabled networks when adding a network via dapp', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withNetworkEnabledMap({
            eip155: { '0x1': true }, // Ethereum Mainnet enabled
          })
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .withPopularNetworks()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Step 1: Verify initial state - Ethereum should be enabled
        await NetworkManager.openNetworkManager();
        await NetworkManager.waitForNetworkManagerToLoad();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
        await NetworkManager.checkTabIsSelected('Popular');

        // Select Ethereum as the active network
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Step 2: Navigate to dapp and request network addition
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();
        await TestDApp.tapOpenNetworkPicker();
        await TestDApp.tapNetworkByName(POLYGON);

        // Verify the permission request UI
        const expectedText = `Use your enabled networks Requesting for ${POLYGON} Mainnet`;
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

        // Step 3: Approve the network addition
        await ConnectBottomSheet.tapConnectButton();

        // Step 4: Return to wallet and verify network preservation
        await TabBarComponent.tapWallet();

        // Verify Ethereum is still the active network (preservation)
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );
      },
    );
  });
});
