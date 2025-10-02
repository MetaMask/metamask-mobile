import { RegressionAssets } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkManager from '../../pages/wallet/NetworkManager';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkView from '../../pages/Settings/NetworksView';
import Gestures from '../../framework/Gestures';
import { getGanachePort } from '../../framework/fixtures/FixtureUtils';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

describe(RegressionAssets('Connect to a Test Network'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('connects to Sepolia test network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokens(
            [
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'SepoliaETH',
                decimals: 18,
                name: 'SepoliaETH',
              },
            ],
            '0xaa36a7',
          )
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        // Open the new network manager and select Sepolia
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM_SEPOLIA);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM_SEPOLIA,
        );
        await Assertions.expectElementToBeVisible(WalletView.container);
        // Validate Sepolia token appears
        await NetworkManager.checkTokenIsVisible('SepoliaETH');
        // Verify network manager reflects the selected network
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkNetworkIsSelected(
          NetworkToCaipChainId.ETHEREUM_SEPOLIA,
        );
      },
    );
  });

  it('adds a custom test network (Custom Localhost 1338) and selects it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: 'https://chainid.network/chains.json',
            response: [],
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        // Add a different custom network via Settings → Networks, with explicit scroll
        await TabBarComponent.tapSettings();
        await Gestures.scrollToElement(
          SettingsView.networksButton,
          SettingsView.scrollViewIdentifier,
          { elemDescription: 'Scroll to Networks button' },
        );
        await SettingsView.tapNetworks();
        await Assertions.expectElementToBeVisible(
          NetworkView.networkContainer,
          { description: 'Network Container should be visible' },
        );

        await NetworkView.tapAddNetworkButton();
        // Ensure Add Network form is visible
        await Assertions.expectElementToBeVisible(
          NetworkView.networkFormContainer,
          { description: 'Add Network form should be visible' },
        );
        await NetworkView.switchToCustomNetworks();
        // Expand RPC section and add a new RPC field
        await NetworkView.tapRpcDropDownButton();
        await NetworkView.tapAddRpcButton();

        const CUSTOM_NETWORK_NAME = 'Custom Localhost 1338';
        const CUSTOM_RPC_URL = `http://localhost:${getGanachePort()}`;
        const CUSTOM_CHAIN_ID = '1338';
        const CUSTOM_SYMBOL = 'ETH';

        // Ensure focus on each input before typing
        await Gestures.waitAndTap(NetworkView.networkNameInput, {
          elemDescription: 'Focus Network Name Input',
        });
        await Gestures.typeText(
          NetworkView.networkNameInput,
          CUSTOM_NETWORK_NAME,
          {
            hideKeyboard: true,
            clearFirst: false,
            elemDescription: 'Type Network Name',
          },
        );
        await Gestures.waitAndTap(NetworkView.rpcURLInput, {
          elemDescription: 'Focus RPC URL Input',
        });
        await Gestures.typeText(NetworkView.rpcURLInput, CUSTOM_RPC_URL, {
          hideKeyboard: true,
          clearFirst: false,
          elemDescription: 'Type RPC URL',
        });
        await Gestures.waitAndTap(NetworkView.chainIDInput, {
          elemDescription: 'Focus Chain ID Input',
        });
        await Gestures.typeText(NetworkView.chainIDInput, CUSTOM_CHAIN_ID, {
          hideKeyboard: true,
          clearFirst: false,
          elemDescription: 'Type Chain ID',
        });
        await Gestures.waitAndTap(NetworkView.networkSymbolInput, {
          elemDescription: 'Focus Network Symbol Input',
        });
        await Gestures.typeText(NetworkView.networkSymbolInput, CUSTOM_SYMBOL, {
          hideKeyboard: true,
          clearFirst: false,
          elemDescription: 'Type Network Symbol',
        });
        await NetworkView.tapSave();

        // Return to wallet and select the newly added Localhost network
        await TabBarComponent.tapWallet();
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapCustomNetworksTab();
        await Gestures.waitAndTap(
          NetworkManager.getNetworkByName(CUSTOM_NETWORK_NAME),
          { elemDescription: `Tap ${CUSTOM_NETWORK_NAME}` },
        );
        await NetworkManager.verifyActiveNetwork(CUSTOM_NETWORK_NAME);
        // Verify selection persists in Network Manager
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkNetworkExists(CUSTOM_NETWORK_NAME);
      },
    );
  });
});
