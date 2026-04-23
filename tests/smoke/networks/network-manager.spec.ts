import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensFullView from '../../page-objects/wallet/HomeSections';

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(mockServer, {
      ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    });
  };

  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should reflect the correct enabled networks state in the network manager', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
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

        await NetworkManager.openNetworkManager();

        await Assertions.expectElementToBeVisible(
          NetworkManager.popularNetworksContainer,
        );
        // Default fixture starts with Polygon as the active chain, so a single
        // network is selected rather than "all networks"
        await Assertions.expectElementToBeVisible(
          NetworkManager.selectAllPopularNetworksNotSelected,
        );

        // Verify individual networks reflect their selected/not-selected state
        const popularNetworks = [
          NetworkToCaipChainId.ETHEREUM,
          NetworkToCaipChainId.LINEA,
          NetworkToCaipChainId.SOLANA,
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
        fixture: new FixtureBuilder().build(),
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

        await NetworkManager.openNetworkManager();

        // Default fixture starts with Polygon selected — tap "Select All" to
        // move into the all-networks-selected state. This dismisses the sheet.
        await NetworkManager.tapSelectAllPopularNetworks();

        // Re-open to verify the all-selected state persisted
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkAllPopularNetworksIsSelected();
      },
    );
  });

  it('should select a network and deselect the previous selected network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
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

        // Default fixture starts with Polygon selected (known bug with
        // homepageSectionsV1 flag). Select Ethereum and verify the control bar.
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Re-open and verify Ethereum is marked as selected
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkNetworkIsSelected(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Switch to Linea and verify the control bar updates
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LINEA,
        );

        // Re-open and verify Ethereum is now deselected
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
        fixture: new FixtureBuilder().build(),
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

        await NetworkManager.openNetworkManager();

        // Tap custom networks tab and check custom networks container is visible
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.checkCustomNetworksContainerIsVisible();

        // Tap localhost network and check base control bar text
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LOCALHOST);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LOCALHOST,
        );

        // Re-open and verify network manager defaults back to custom tab
        // since the last selected network was a custom network
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkCustomNetworksContainerIsVisible();
      },
    );
  });

  it('should default to default tab when default network is enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
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

        await NetworkManager.openNetworkManager();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
      },
    );
  });
});
