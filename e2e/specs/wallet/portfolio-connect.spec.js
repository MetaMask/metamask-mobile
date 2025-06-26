'use strict';
import { SmokeNetworkAbstractions } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import BrowserView from '../../pages/Browser/BrowserView';
import PortfolioHomePage from '../../pages/Browser/PortfolioHomePage';
import Assertions from '../../utils/Assertions';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
const fixtureServer = new FixtureServer();

describe(SmokeNetworkAbstractions('Connect account to Portfolio'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withKeyringController().build();
    fixture.state.user.seedphraseBackedUp = false;
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
  });
  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });
  const itif = (condition) => (condition ? it : it.skip);

  it('should close all browser tabs', async () => {
    await loginToApp();
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapBrowser();
    await BrowserView.tapOpenAllTabsButton();
    await BrowserView.tapCloseTabsButton();
    await Assertions.checkIfVisible(BrowserView.noTabsMessage);
  });
});
