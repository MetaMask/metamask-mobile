import { RegressionAssets } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';

const TOKEN_ADDRESS = '0x2d1aDB45Bb1d7D2556c6558aDb76CFD4F9F4ed16';

describe(RegressionAssets('Import custom token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should Import custom token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },

      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.switchToCustomTab();
        await ImportTokensView.tapOnNetworkInput();
        await ImportTokensView.swipeNetworkList();
        await ImportTokensView.tapNetworkOption('Base');
        await ImportTokensView.typeTokenAddress(TOKEN_ADDRESS);
        await ImportTokensView.tapOnNextButtonWithFallback();
        await ConfirmAddAssetView.tapOnConfirmButton();
        await Assertions.expectElementToNotBeVisible(WalletView.container);
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo('Base');
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 USDT'),
        );
      },
    );
  });
});
