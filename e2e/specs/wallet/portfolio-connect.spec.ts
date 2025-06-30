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
import Assertions from '../../utils/Assertions';

const fixtureServer: FixtureServer = new FixtureServer();

describe(SmokeNetworkAbstractions('Connect account to Portfolio'), (): void => {
  beforeAll(async (): Promise<void> => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withKeyringController().build();
    // TypeScript workaround: FixtureBuilder doesn't expose state.user types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fixture as any).state.user.seedphraseBackedUp = false;
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
  });

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
  });

  it('should close all browser tabs', async (): Promise<void> => {
    await loginToApp();
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapBrowser();
    await BrowserView.tapOpenAllTabsButton();
    await BrowserView.tapCloseTabsButton();
    await Assertions.checkIfVisible(BrowserView.noTabsMessage);
  });
});
