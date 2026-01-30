import { RegressionAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import SortModal from '../../pages/wallet/TokenSortBottomSheet';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import { MockApiEndpoint } from '../../../tests/framework';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../tests/api-mocking/helpers/mockHelpers';

const AAVE_MAINNET_DETAILS = {
  address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  symbol: 'AAVE',
  decimals: 18,
  name: 'Aave',
};

const TOKEN_RESPONSE: MockApiEndpoint = {
  urlEndpoint: `https://token.api.cx.metamask.io/token/1?address=${AAVE_MAINNET_DETAILS.address}`,
  response: {
    address: `${AAVE_MAINNET_DETAILS.address}`,
    symbol: 'AAVE',
    decimals: 18,
    name: 'Aave',
    iconUrl:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9.png',
    type: 'erc20',
    aggregators: [
      'uniswapLabs',
      'metamask',
      'aave',
      'cmc',
      'coinGecko',
      'coinMarketCap',
      'openSwap',
      'zerion',
      'oneInch',
      'liFi',
      'xSwap',
      'socket',
      'squid',
      'rango',
      'sonarwatch',
      'sushiSwap',
      'pmm',
      'bancor',
    ],
    occurrences: 18,
    erc20Permit: true,
    storage: {
      balance: 0,
      approval: 1,
    },
    fees: {
      avgFee: 0,
      maxFee: 0,
      minFee: 0,
    },
  },
  responseCode: 200,
};

describe(RegressionAssets('Import Tokens'), () => {
  it('should add a aave token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: TOKEN_RESPONSE.urlEndpoint,
            response: TOKEN_RESPONSE.response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.searchToken('AAVE');
        await ImportTokensView.tapOnToken(); // taps the first token in the returned list
        await ImportTokensView.tapOnNextButton();

        await Assertions.expectElementToBeVisible(
          ConfirmAddAssetView.container,
        );

        await ConfirmAddAssetView.tapOnConfirmButton();

        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });

  it('should sort tokens alphabetically', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokens([AAVE_MAINNET_DETAILS])
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: TOKEN_RESPONSE.urlEndpoint,
            response: TOKEN_RESPONSE.response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapSortBy();
        await SortModal.tapSortAlphabetically();

        // Just verify that tokens are still visible after sorting
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 AAVE'),
          {
            description: 'AAVE token should be visible after alphabetical sort',
          },
        );
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 ETH'),
          {
            description: 'ETH token should be visible after alphabetical sort',
          },
        );
      },
    );
  });

  it('should sort tokens by fiat amount', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokens([AAVE_MAINNET_DETAILS])
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: TOKEN_RESPONSE.urlEndpoint,
            response: TOKEN_RESPONSE.response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapSortBy();
        await SortModal.tapSortFiatAmount();

        // Just verify that tokens are still visible after sorting
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 AAVE'),
          {
            description: 'AAVE token should be visible after fiat amount sort',
          },
        );
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('0 ETH'),
          { description: 'ETH token should be visible after fiat amount sort' },
        );
      },
    );
  });
});
