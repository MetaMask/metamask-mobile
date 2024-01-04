'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/WalletView';
import ImportTokensView from '../../pages/ImportTokensView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import { loginToApp } from '../../viewHelper';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Import Tokens'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should add a token via token autocomplete', async () => {
    await WalletView.tapImportTokensButton();
    // Search for XRPL but select XRP20
    await ImportTokensView.typeInTokenName('XRPL');
    await TestHelpers.delay(2000);
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await TestHelpers.delay(500);
    await ImportTokensView.tapImportButton();
    await WalletView.isVisible();
    await TestHelpers.delay(8000); // to prevent flakey behavior in bitrise
    await WalletView.isTokenVisibleInWallet('0 XRP');
  });

  it('should hide token from Wallet view', async () => {
    await WalletView.removeTokenFromWallet('0 XRP');
    await TestHelpers.delay(1500);
    await WalletView.tokenIsNotVisibleInWallet('XRP');
  });
});
