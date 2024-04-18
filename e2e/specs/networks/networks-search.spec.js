'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import SettingsView from '../../pages/Settings/SettingsView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';

const SHORT_HAND_NETWORK_TEXT = 'ava';
const INVALID_NETWORK_TEXT = 'cccM';
describe(Regression('Networks Search'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`Remove ${PopularNetworksList.Avalanche.providerConfig.nickname} network from the list, ensuring its absent in search results`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapSettings();
        await SettingsView.tapNetworks();
        await NetworkView.SearchNetworkName(INVALID_NETWORK_TEXT);
        await Assertions.checkIfVisible(NetworkView.noMatchingText);
        await NetworkView.tapClearSearch();
        await NetworkView.SearchNetworkName(SHORT_HAND_NETWORK_TEXT);
        await NetworkView.tapNetworkByName(
          PopularNetworksList.Avalanche.providerConfig.nickname,
        );
        await NetworkView.tapDeleteButton();
        await Assertions.checkIfVisible(NetworkView.noMatchingText);
        await NetworkView.tapClearSearch();
        await Assertions.checkIfNotVisible(
          NetworkView.getnetworkName(
            PopularNetworksList.Avalanche.providerConfig.nickname,
          ),
        );
        await NetworkView.tapAddNetworkButton();
        await Assertions.checkIfVisible(
          NetworkView.getnetworkName(
            PopularNetworksList.Avalanche.providerConfig.nickname,
          ),
        );
      },
    );
  });
});
