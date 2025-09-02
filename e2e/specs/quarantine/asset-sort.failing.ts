import { RegressionAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import SortModal from '../../pages/wallet/TokenSortBottomSheet';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import Tenderly from '../../tenderly';
import { CustomNetworks } from '../../resources/networks.e2e';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import TestHelpers from '../../helpers';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import { MockApiEndpoint } from '../../framework';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

const AAVE_TENDERLY_MAINNET_DETAILS = {
  address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  symbol: 'AAVE',
  decimals: 18,
  name: 'Aave',
};

const TOKEN_RESPONSE: MockApiEndpoint = {
  urlEndpoint: `https://token.api.cx.metamask.io/token/1?address=${AAVE_TENDERLY_MAINNET_DETAILS.address}`,
  response: {
    address: `${AAVE_TENDERLY_MAINNET_DETAILS.address}`,
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
  beforeAll(async () => {
    await Tenderly.addFunds(
      CustomNetworks.Tenderly.Mainnet.providerConfig.rpcUrl,
      DEFAULT_FIXTURE_ACCOUNT,
    );
  });

  it('should add a aave token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
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
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withTokens([AAVE_TENDERLY_MAINNET_DETAILS])
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
        // Relaunching the app since the tree is not re-rendered with FlashList v2.
        await device.terminateApp();
        await TestHelpers.launchApp({
          launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
        });
        await loginToApp();

        const tokens =
          (await WalletView.getTokensInWallet()) as IndexableNativeElement;
        const tokensAttributes = await tokens.getAttributes();
        const label = (tokensAttributes as { label: string }).label;

        // Ensure `label` contains "Aave" followed (somewhere) by "Ethereum".
        const textOrderRegex = new RegExp('Aave([\\s\\S]*?)Ethereum', 'i');
        const isMatch = label.match(textOrderRegex);
        if (!isMatch) {
          throw new Error('Expected label to match the regex, but it did not.');
        }
      },
    );
  });

  it('should sort tokens by fiat amount', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withTokens([AAVE_TENDERLY_MAINNET_DETAILS])
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

        const tokens =
          (await WalletView.getTokensInWallet()) as IndexableNativeElement;
        const tokensAttributes = await tokens.getAttributes();
        const label = (tokensAttributes as { label: string }).label;

        // Ensure `label` contains "Ethereum" followed (somewhere) by "Aave".
        const textOrderRegex = new RegExp('Ethereum([\\s\\S]*?)Aave', 'i');
        const isMatch = label.match(textOrderRegex);
        if (!isMatch) {
          throw new Error('Expected label to match the regex, but it did not.');
        }
      },
    );
  });
});
