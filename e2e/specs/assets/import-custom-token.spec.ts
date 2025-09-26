import { RegressionAssets } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

describe(RegressionAssets('Import custom token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should Import custom token with auto-population', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .build(),
        restartDevice: true,
        smartContracts: [SMART_CONTRACTS.HST],
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          SMART_CONTRACTS.HST,
        );

        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.switchToCustomTab();
        await ImportTokensView.tapOnNetworkInput();
        await ImportTokensView.swipeNetworkList();
        await ImportTokensView.tapNetworkOption('Localhost');
        await ImportTokensView.typeTokenAddress(hstAddress);
        await Assertions.expectElementToHaveText(
          ImportTokensView.symbolInput,
          'TST',
          {
            timeout: 5000,
            description: 'Symbol field should auto-populate with TST',
          },
        );
        await ImportTokensView.tapOnNextButton('Import Token');
        await ConfirmAddAssetView.tapOnConfirmButton();
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
      },
    );
  });
});
