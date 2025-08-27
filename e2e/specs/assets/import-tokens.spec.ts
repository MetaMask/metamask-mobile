import { RegressionAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';

describe(RegressionAssets('Import Tokens'), () => {
  it('should add and remove a token via token autocomplete', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.searchToken('SNX');
        await ImportTokensView.tapOnToken(); // taps the first token in the returned list
        await ImportTokensView.tapOnNextButton();

        await Assertions.expectElementToBeVisible(
          ConfirmAddAssetView.container,
        );

        await ConfirmAddAssetView.tapOnConfirmButton();

        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 SNX'),
        );
        await WalletView.removeTokenFromWallet('0 SNX');
        await Assertions.expectElementToNotBeVisible(
          WalletView.tokenInWallet('SNX'),
        );
      },
    );
  });

  it('should cancel add a token via token autocomplete', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.searchToken('SNX');
        await ImportTokensView.tapOnToken();
        await ImportTokensView.tapOnNextButton();

        await Assertions.expectElementToBeVisible(
          ConfirmAddAssetView.container,
        );

        await ConfirmAddAssetView.tapOnCancelButton();
        await Assertions.expectElementToBeVisible(
          ConfirmAddAssetView.cancelModal,
        );
        await ConfirmAddAssetView.tapOnConfirmModalButton();
        await Assertions.expectElementToNotBeVisible(
          WalletView.tokenInWallet('SNX'),
        );
      },
    );
  });

  it('allows importing multiple tokens from search', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.searchToken('CHAIN');
    await ImportTokensView.tapOnToken();
    await ImportTokensView.searchToken('CHANGE');
    await ImportTokensView.tapOnToken();
    await ImportTokensView.tapOnNextButton();

    await TestHelpers.delay(500);
    await Assertions.expectElementToBeVisible(ConfirmAddAssetView.container);

    await ConfirmAddAssetView.tapOnConfirmButton();

    await Assertions.expectElementToBeVisible(WalletView.container);
    await Assertions.expectElementToBeVisible(
      WalletView.tokenInWallet('0 LINK'),
    );
    await Assertions.expectTextDisplayed('Change Token');
  });
});
