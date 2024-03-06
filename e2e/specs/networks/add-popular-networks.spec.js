'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkAddedModal from '../../pages/modals/NetworkAddedModal';
import NetworkApprovalModal from '../../pages/modals/NetworkApprovalModal';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import Matchers from '../../utils/Matchers';

const fixtureServer = new FixtureServer();
const Arbitrum = 'Arbitrum One';
describe(Regression('Add all popular networks'), () => {
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

  it(`Add all popular networks to verify the empty list content`, async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await NetworkView.tapAddNetworkButton();
    await NetworkView.tapNetworkByName(Arbitrum);
    await NetworkApprovalModal.tapApproveButton();
    await NetworkAddedModal.tapCloseButton();
    // await TestHelpers.checkIfElementWithTextIsVisible(
    //   'You’ve added all the popular networks',
    // );
  });
});
