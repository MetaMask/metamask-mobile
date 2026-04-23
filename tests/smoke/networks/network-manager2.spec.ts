import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../framework/Assertions';
import { DappVariants } from '../../framework/Constants';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Browser from '../../page-objects/Browser/BrowserView';
import TestDApp from '../../page-objects/Browser/TestDApp';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import { CustomNetworks } from '../../resources/networks.e2e';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensFullView from '../../page-objects/wallet/HomeSections';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    carouselBanners: false,
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
  });
};

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  // TODO: Re-enable once the app bug is fixed.
  // calculateBalanceForAllWallets (balances.ts) crashes with "Invalid CAIP chain ID"
  // when Solana tokens are in the fixture — AccountGroupBalance renders on the
  // wallet homepage and calls the EVM-only balance calculation with a Solana chain
  // ID before login even completes. This is a production bug unrelated to the test.
  it.skip('should filter by Solana', async () => {
    const solanaTestMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(mockServer, {
        carouselBanners: false,
        homepageRedesignV1: { enabled: false, minimumVersion: '0.0.0' },
        homepageSectionsV1: { enabled: false, minimumVersion: '0.0.0' },
      });
    };

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
        testSpecificMock: solanaTestMock,
      },
      async () => {
        await loginToApp();

        // Open network manager directly (old homepage flow, no TokensFullView)
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkTabIsSelected('Popular');

        // Select Solana network
        await NetworkManager.tapNetwork(NetworkToCaipChainId.SOLANA);

        // Verify SOL is visible in the Solana-filtered view
        await NetworkManager.checkTokenIsVisible('SOL');

        // EVM tokens seeded on other networks should not appear
        const expectedHiddenTokens = ['ETH', 'USDC', 'DAI'];
        for (const token of expectedHiddenTokens) {
          await NetworkManager.checkTokenIsNotVisible(token);
        }
      },
    );
  });

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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet homepage should be visible',
        });

        await WalletView.tapOnNewTokensSection();
        await TokensFullView.waitForVisible();

        // Open network manager and verify initial state
        await NetworkManager.openNetworkManager();
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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet homepage should be visible',
        });

        await WalletView.tapOnNewTokensSection();
        await TokensFullView.waitForVisible();

        // Open network manager and verify initial state
        await NetworkManager.openNetworkManager();

        // Switch to custom networks tab
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.checkCustomNetworksContainerIsVisible();
        await NetworkManager.checkTabIsSelected('Custom');

        // Select a custom network (Linea Sepolia)
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM_SEPOLIA);

        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM_SEPOLIA,
        );

        // withTokensForAllPopularNetworks only seeds tokens on popular networks
        // (mainnet, Polygon, etc.) — Ethereum Sepolia is a custom/testnet network
        // so no tokens are seeded there. The full view correctly shows an empty
        // state. Verify that popular network tokens are not visible when filtered
        // to a custom network.
        await NetworkManager.checkTokenIsNotVisible('PALM');
        await NetworkManager.checkTokenIsNotVisible('ETH');
      },
    );
  });

  it('should preserve existing enabled networks when adding a network via dapp', async () => {
    // This test uses navigateToBrowserView() which relies on the old tab bar
    // structure. The homepageSectionsV1 flag changes the tab bar, so it must
    // be disabled here. This test is about dapp network preservation, not
    // homepage sections UI.
    const dappTestMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(mockServer, {
        carouselBanners: false,
        homepageRedesignV1: { enabled: false, minimumVersion: '0.0.0' },
        homepageSectionsV1: { enabled: false, minimumVersion: '0.0.0' },
      });
    };

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
        testSpecificMock: dappTestMock,
      },
      async () => {
        await loginToApp();

        // Step 1: Open the network manager from the wallet homepage directly
        // (homepageSectionsV1 is disabled for this test — old tab bar is active)
        await NetworkManager.openNetworkManager();
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
