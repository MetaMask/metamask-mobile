'use strict';
import TestHelpers from '../../helpers';
import { SmokeNetworkAbstractions } from '../../tags';

import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';

const SHORT_HAND_NETWORK_TEXT = 'Ava';
const INVALID_NETWORK_TEXT = 'cccM';
describe(SmokeNetworkAbstractions('Networks Search'), () => {
  // These tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition) => (condition ? it.skip : it);

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    `Remove ${PopularNetworksList.Avalanche.providerConfig.nickname} network from the list, ensuring its absent in search results`,
    async () => {
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

          await TestHelpers.delay(2000);
          await NetworkListModal.tapDeleteButton();

          await Assertions.checkIfVisible(
            NetworkListModal.addPopularNetworkButton,
          );
        },
      );
    },
  );
});
