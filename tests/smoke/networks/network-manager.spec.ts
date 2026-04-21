import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../framework/Assertions';

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should reflect the correct enabled networks state in the network manager', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await NetworkManager.openNetworkManagerFromHomepage();

        await Assertions.expectElementToBeVisible(
          NetworkManager.popularNetworksContainer,
        );

        // Verify individual popular networks are in the "not selected" state
        // (since "Select All" is selected, individual rows show as not-selected)
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
      },
      async () => {
        await loginToApp();
        await NetworkManager.navigateToTokensFullView();
        await NetworkManager.navigateBackFromTokensFullView();
        await NetworkManager.openNetworkManagerFromHomepage();
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
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        // Navigate to TokensFullView then open network manager
        await NetworkManager.openNetworkManagerFromHomepage();

        // await NetworkManager.checkAllPopularNetworksIsSelected();

        // Select Ethereum — sheet closes, lands back on TokensFullView
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Re-open network manager (already in TokensFullView)
        await NetworkManager.openNetworkManager();

        await NetworkManager.checkNetworkIsSelected(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Select Linea and check if Ethereum is deselected
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LINEA,
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
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        // Navigate to TokensFullView then open network manager
        await NetworkManager.openNetworkManagerFromHomepage();
        await NetworkManager.checkPopularNetworksContainerIsVisible();

        // Tap custom networks tab and check custom networks container is visible
        await NetworkManager.tapCustomNetworksTab();
        await NetworkManager.checkCustomNetworksContainerIsVisible();

        // Tap localhost network — sheet closes, lands back on TokensFullView
        await NetworkManager.tapNetwork(NetworkToCaipChainId.LOCALHOST);

        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.LOCALHOST,
        );

        // Re-open network manager (already in TokensFullView)
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
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManagerFromHomepage();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
      },
    );
  });
});
