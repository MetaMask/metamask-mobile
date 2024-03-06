'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import SettingsView from '../../pages/Settings/SettingsView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';

const fixtureServer = new FixtureServer();
const SHORT_HAND_NETWORK_TEXT = 'ava';
const INVALID_NETWORK_TEXT = 'cccM';
describe(Regression('Networks Search'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withPopularNetworks().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp();
    await loginToApp();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it(`Remove ${PopularNetworksList.Avalanche.providerConfig.nickname} network from the list, ensuring its absent in search results`, async () => {
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
  });
});
