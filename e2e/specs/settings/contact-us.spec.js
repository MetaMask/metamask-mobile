'use strict';
import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import SettingsView from '../../pages/Settings/SettingsView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();

describe(Regression('Settings'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('Open contact support', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToContactSupportButton();
    await SettingsView.tapContactSupport();

    await Assertions.checkIfVisible(SettingsView.contactSupportSectionTitle);
  });
});
