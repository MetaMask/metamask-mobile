import { SmokeNetworkAbstractions } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../../e2e/pages/wallet/NetworkManager';
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
        fixture: new FixtureBuilder().build(),
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
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
      },
    );
  });
});
