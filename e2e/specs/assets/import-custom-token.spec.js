'use strict';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import Assertions from '../../utils/Assertions';
import { PopularNetworksList } from '../../resources/networks.e2e';
import { Regression } from '../../tags';

describe(Regression('Import Custom token'), () => {
  it('allows importing using contract address and not current network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(PopularNetworksList.Polygon)
          .withTokenListController({
            tokensChainsCache: {
              '0x89': {
                data: [
                  {
                    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': {
                      name: 'USDT',
                      aggregators: ['Lifi', 'Coinmarketcap', 'Rango'],
                      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                      decimals: 6,
                      iconUrl:
                        'https://static.cx.metamask.io/api/v1/tokenIcons/137/0xc2132D05D31c914a87C6611C10748AEb04B58e8F.png',
                      occurrences: 3,
                      symbol: 'USDT',
                    },
                  },
                ],
              },
            },
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.switchToCustomTab();
        await ImportTokensView.tapOnNetworkInput();

        await ImportTokensView.tapNetworkOption('Polygon Mainnet');
        await ImportTokensView.typeTokenAddress(
          '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        );
        // await ImportTokensView.tapSymbolInput();
        // await ImportTokensView.typeSymbol('USDT');
        //await ImportTokensView.tapTokenSymbolText();

        // await ImportTokensView.scrollDownOnImportCustomTokens();

        await ImportTokensView.tapOnNextButton();

        await TestHelpers.delay(500);
        await Assertions.checkIfVisible(ConfirmAddAssetView.container);

        await ConfirmAddAssetView.tapOnConfirmButton();

        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.tokenInWallet('0 USDT'));
        await Assertions.checkIfVisible(
          WalletView.tokenInWallet('(Pos) Tether USD'),
        );
      },
    );
  });
});
