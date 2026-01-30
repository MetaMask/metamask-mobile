import { RegressionAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import Assertions from '../../../tests/framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../tests/api-mocking/helpers/mockHelpers';

describe(RegressionAssets('Import Tokens'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupMockRequest(mockServer, {
      url: 'https://token.api.cx.metamask.io/token/1?address=0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
      requestMethod: 'GET',
      responseCode: 200,
      response: {
        address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        symbol: 'SNX',
        decimals: 18,
        name: 'Synthetix Network Token',
        iconUrl:
          'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
      },
    });
  };
  it('should add and remove a token via token autocomplete', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
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
        testSpecificMock,
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
    const multiTokenMocks = async (mockServer: Mockttp) => {
      // Mock LINK token metadata
      await setupMockRequest(mockServer, {
        url: 'https://token.api.cx.metamask.io/token/1?address=0x514910771AF9Ca656af840dff83E8264EcF986CA',
        requestMethod: 'GET',
        responseCode: 200,
        response: {
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          symbol: 'LINK',
          decimals: 18,
          name: 'ChainLink Token',
          iconUrl:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1337/0x514910771af9ca656af840dff83e8264ecf986ca.png',
        },
      });

      // Mock CNG token metadata
      await setupMockRequest(mockServer, {
        url: 'https://token.api.cx.metamask.io/token/1?address=0x8704304af98a15ba0Fb36e58fB69C7Cb6B00e1D1',
        requestMethod: 'GET',
        responseCode: 200,
        response: {
          address: '0x8704304af98a15ba0fb36e58fb69c7cb6b00e1d1',
          symbol: 'CNG',
          decimals: 18,
          name: 'Change Token',
          iconUrl:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1337/0x8704304af98a15ba0fb36e58fb69c7cb6b00e1d1.png',
        },
      });
    };

    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: multiTokenMocks,
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.searchToken('CHAIN');
        await ImportTokensView.tapOnToken();
        await ImportTokensView.searchToken('CHANGE');
        await ImportTokensView.tapOnToken();
        await ImportTokensView.tapOnNextButton();
        await Assertions.expectElementToBeVisible(
          ConfirmAddAssetView.container,
        );
        await ConfirmAddAssetView.tapOnConfirmButton();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 LINK'),
        );
        await Assertions.expectTextDisplayed('Change Token');
      },
    );
  });
});
