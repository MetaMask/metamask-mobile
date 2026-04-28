import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensFullView from '../../page-objects/wallet/HomeSections';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import Assertions from '../../framework/Assertions';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';

const ETH_TOKEN = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ethereum',
};

const USDC_TOKEN = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
};

const DAI_TOKEN = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  symbol: 'DAI',
  decimals: 18,
  name: 'Dai Stablecoin',
};

describe(
  SmokeWalletPlatform('Homepage Tokens Section - Network Filter'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(170000);
    });

    it('navigates from homepage tokens section to tokens full view', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTokensForAllPopularNetworks([ETH_TOKEN])
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet homepage should be visible',
          });

          // Tap the Tokens section header to navigate to TokensFullView
          await WalletView.tapOnNewTokensSection();

          // Verify the TokensFullView is visible (back button + network filter present)
          await TokensFullView.waitForVisible();
          await Assertions.expectElementToBeVisible(
            TokensFullView.networkFilterButton,
            {
              elemDescription:
                'Network filter button should be visible in Tokens Full View',
            },
          );
        },
      );
    });

    it('filters tokens by selected network in tokens full view', async () => {
      await withFixtures(
        {
          // Seed ETH/USDC/DAI on both Ethereum and Linea so we have tokens on
          // two chains. withNetworkEnabledMap enables both chains so both appear
          // in the full view when "all networks" is the filter. Selecting
          // Ethereum-only should show ETH/USDC/DAI; switching to Linea-only
          // should hide them (Linea has no native ETH balance seeded).
          fixture: new FixtureBuilder()
            .withTokensForAllPopularNetworks([ETH_TOKEN, USDC_TOKEN, DAI_TOKEN])
            .withNetworkEnabledMap({ eip155: { '0x1': true, '0xe708': true } })
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          // Navigate to TokensFullView
          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          // Open network manager and select Ethereum
          await NetworkManager.openNetworkManager();
          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);

          // Verify the control bar now shows Ethereum filter
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );

          // Ethereum tokens should be visible
          await NetworkManager.checkTokenIsVisible('ETH');
          await NetworkManager.checkTokenIsVisible('USDC');
          await NetworkManager.checkTokenIsVisible('DAI');

          // Switch to Linea filter — no native balance seeded on Linea so
          // the Ethereum tokens should no longer appear
          await NetworkManager.openNetworkManager();
          await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.LINEA,
          );

          await NetworkManager.checkTokenIsNotVisible('ETH');
        },
      );
    });

    it('shows all tokens on homepage regardless of network filter set in tokens full view', async () => {
      await withFixtures(
        {
          // withTokensForAllPopularNetworks seeds both TokensController.allTokens
          // AND TokenBalancesController (required for ERC-20s to show in the selector).
          // withNetworkEnabledMap restricts popularChainIds to Ethereum only, so the
          // homepage selector returns exactly 2 tokens (ETH + USDC from Ethereum) —
          // well within MAX_TOKENS_DISPLAYED = 5. Linea has no tokens seeded, so
          // selecting Linea in the full view's NetworkManager makes it appear empty
          // while the homepage (scoped to Ethereum) still shows both tokens.
          fixture: new FixtureBuilder()
            .withTokensForAllPopularNetworks([ETH_TOKEN, USDC_TOKEN])
            .withNetworkEnabledMap({ eip155: { '0x1': true } })
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet homepage should be visible',
          });

          // Navigate to TokensFullView and apply a Linea-only filter.
          // No tokens were seeded on Linea, so the full view becomes empty.
          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          await NetworkManager.openNetworkManager();

          await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.LINEA,
          );

          // Full view: Ethereum tokens should not be visible (filtered to Linea only)
          await NetworkManager.checkTokenIsNotVisible('ETH');

          // Return to the homepage
          await TokensFullView.tapBackButton();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description:
              'Wallet homepage should be visible after navigating back',
          });

          // Homepage tokens section shows ALL tokens regardless of the Linea-only filter
          await NetworkManager.checkTokenIsVisible('SOL');
          await NetworkManager.checkTokenIsVisible('ETH');
        },
      );
    });
  },
);
