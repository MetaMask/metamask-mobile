'use strict';
import { SmokeAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import { loginToApp } from '../../viewHelper';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import Assertions from '../../utils/Assertions';
import Utilities from '../../utils/Utilities';

const fixtureServer = new FixtureServer();

describe(SmokeAssets('Import Tokens'), () => {
  beforeAll(async () => {
    await Utilities.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await Utilities.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should add a token via token autocomplete', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.searchToken('SNX');
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await ImportTokensView.tapOnNextButton();

    await Utilities.delay(500);
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);

    await ConfirmAddAssetView.tapOnConfirmButton();

    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfVisible(WalletView.tokenInWallet('0 SNX'));
  });

  it('should cancel add a token via token autocomplete', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.searchToken('SNX');
    await Utilities.delay(2000);
    await ImportTokensView.tapOnToken();
    await Utilities.delay(500);
    await ImportTokensView.tapOnNextButton();

    await Utilities.delay(500);
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);

    await ConfirmAddAssetView.tapOnCancelButton();
    await Assertions.checkIfVisible(ConfirmAddAssetView.cancelModal);
    await ConfirmAddAssetView.tapOnConfirmModalButton();
  });

  it('should hide token from Wallet view', async () => {
    await WalletView.removeTokenFromWallet('0 SNX');
    await Assertions.checkIfNotVisible(WalletView.tokenInWallet('SNX'));
  });

  it('should add a token via token footer link', async () => {
    await Utilities.delay(2000); // Wait for the footer link to be visible
    await WalletView.tapImportTokensFooterLink();
    await ImportTokensView.searchToken('SNX');
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await ImportTokensView.tapOnNextButton();

    await Utilities.delay(500);
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);

    await ConfirmAddAssetView.tapOnConfirmButton();

    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfVisible(WalletView.tokenInWallet('0 SNX'));
  });
});
