'use strict';
import { SmokeAssets } from '../../tags';
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
import ConfirmAddAssetView from '../../pages/ConfirmAddAsset';

const fixtureServer = new FixtureServer();

describe(SmokeAssets('Import Tokens'), () => {
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
    // Search for SNX
    await ImportTokensView.typeInTokenName('SNX');
    await TestHelpers.delay(2000);
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await TestHelpers.delay(500);
    await ImportTokensView.tapOnNextButton();

    await TestHelpers.delay(500);
    await ConfirmAddAssetView.isVisible();

    await ConfirmAddAssetView.tapOnConfirmButton();

    await WalletView.isVisible();
    await TestHelpers.delay(8000); // to prevent flakey behavior in bitrise
    await WalletView.isTokenVisibleInWallet('0 SNX');
  });

  it('should cancel add a token via token autocomplete', async () => {
    await WalletView.tapImportTokensButton();
    // Search for SNX
    await ImportTokensView.typeInTokenName('SNX');
    await TestHelpers.delay(2000);
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await TestHelpers.delay(500);
    await ImportTokensView.tapOnNextButton();

    await TestHelpers.delay(500);
    await ConfirmAddAssetView.isVisible();

    await ConfirmAddAssetView.tapOnCancelButton();
    await ConfirmAddAssetView.cancelModalIsVisible();

    await ConfirmAddAssetView.tapOnConfirmModalButton();
  });

  it('should hide token from Wallet view', async () => {
    await WalletView.removeTokenFromWallet('0 SNX');
    await TestHelpers.delay(1500);
    await WalletView.tokenIsNotVisibleInWallet('SNX');
  });
});
