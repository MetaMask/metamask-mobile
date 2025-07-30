import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';

const SHORT_HAND_NETWORK_TEXT = 'Ava';
const INVALID_NETWORK_TEXT = 'cccM';

describe(SmokeNetworkAbstractions('Networks Search'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it(`Remove ${PopularNetworksList.Avalanche.providerConfig.nickname} network from the list, ensuring its absent in search results`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.SearchNetworkName(INVALID_NETWORK_TEXT);
        await NetworkListModal.tapClearSearch();
        await NetworkListModal.SearchNetworkName(SHORT_HAND_NETWORK_TEXT);
        await NetworkListModal.longPressOnNetwork(
          PopularNetworksList.Avalanche.providerConfig.nickname,
        );
        if (device.getPlatform() === 'android') {
          await device.disableSynchronization();
        }

        // delete avalanche network
        await NetworkListModal.deleteNetwork();

        await NetworkListModal.tapDeleteButton();

        await Assertions.expectElementToBeVisible(
          NetworkListModal.addPopularNetworkButton,
        );
      },
    );
  });
});
