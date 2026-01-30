import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import NetworkManager from '../../pages/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../../tests/framework/Assertions';
import { DappVariants } from '../../../tests/framework/Constants';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Browser from '../../pages/Browser/BrowserView';
import TestDApp from '../../pages/Browser/TestDApp';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import { CustomNetworks } from '../../resources/networks.e2e';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

const isMultichainAccountsState2Enabled =
  process.env.MM_ENABLE_MULTICHAIN_ACCOUNTS_STATE_2 === 'true';

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  (isMultichainAccountsState2Enabled ? it : it.skip)(
    'should filter by Solana',
    async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withSolanaFixture()
            .withTokensForAllPopularNetworks([
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                name: 'Dai Stablecoin',
              },
            ])
            .withTokens(
              [
                {
                  address: 'So11111111111111111111111111111111111111112',
                  symbol: 'SOL',
                  decimals: 9,
                  name: 'SOL',
                },
              ],
              '1151111081099710', // Solana chain ID
            )
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

          // Select Solana network
          await NetworkManager.tapNetwork(NetworkToCaipChainId.SOLANA);

          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.SOLANA,
          );

          // Verify tokens that should be visible on Solana
          const expectedVisibleTokens = ['SOL'];
          for (const token of expectedVisibleTokens) {
            await NetworkManager.checkTokenIsVisible(token);
          }

          // Verify EVM tokens that should not be visible (from other networks)
          const expectedHiddenTokens = [
            'PALM',
            'AVAX',
            'BNB',
            'ETH',
            'USDC',
            'DAI',
          ];
          for (const token of expectedHiddenTokens) {
            await NetworkManager.checkTokenIsNotVisible(token);
          }
        },
      );
    },
  );

  it('should filter tokens by selected network from list of enabled popular networks', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokensForAllPopularNetworks([
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
            },
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              name: 'Dai Stablecoin',
            },
          ])
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
        const expectedVisibleTokens = ['ETH', 'USDC', 'DAI'];
        for (const token of expectedVisibleTokens) {
          await NetworkManager.checkTokenIsVisible(token);
        }

        // Verify tokens that should not be visible (from other networks)
        const expectedHiddenTokens = ['SOL', 'Linea'];
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
          .withTokensForAllPopularNetworks([
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
            },
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'SepoliaETH',
              decimals: 18,
              name: 'SepoliaETH',
            },
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'LineaETH',
              decimals: 18,
              name: 'LineaETH',
            },
          ])
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
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM_SEPOLIA);

        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM_SEPOLIA,
        );

        // Verify tokens that should not be visible (from popular networks)
        await NetworkManager.checkTokenIsNotVisible('PALM');

        // Check for either Ethereum or SepoliaETH (depending on environment)
        try {
          await NetworkManager.checkTokenIsVisible('Ethereum');
        } catch {
          // If Ethereum is not visible, try SepoliaETH
          await NetworkManager.checkTokenIsVisible('SepoliaETH');
        }
      },
    );
  });

  it.skip('should preserve existing enabled networks when adding a network via dapp', async () => {
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
        await navigateToBrowserView();
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

        // Wait for browser screen to be visible after connection modal dismisses
        await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
          description: 'Browser screen should be visible after connecting',
        });

        // Step 4: Close browser to reveal app tab bar, then return to wallet
        await Browser.tapCloseBrowserButton();
        await TabBarComponent.tapWallet();

        // Verify Ethereum is still the active network (preservation)
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );
      },
    );
  });
});
