import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { PREDEFINED_TOKENS } from '../../framework/fixtures/mmpay-token-holdings-registry.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import ImportTokensView from '../../page-objects/wallet/ImportTokenFlow/ImportTokensView.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';

const HIDDEN_USDC = {
  ...PREDEFINED_TOKENS.ETHEREUM.USDC,
  amount: '12.5',
};

const hiddenAssetId = `eip155:1/erc20:${HIDDEN_USDC.address.toLowerCase()}`;
const ownedRowKey = `eip155:1:${DEFAULT_FIXTURE_ACCOUNT}|${hiddenAssetId}`;

const v6Balances = () => ({
  statusCode: 200,
  json: {
    balances: [
      {
        accountId: `eip155:1:${DEFAULT_FIXTURE_ACCOUNT}`,
        object: 'token',
        type: 'erc20',
        assetId: hiddenAssetId,
        name: 'USD Coin',
        symbol: HIDDEN_USDC.symbol,
        decimals: HIDDEN_USDC.decimals,
        balance: HIDDEN_USDC.amount,
        price: '1',
        labels: ['stable_coin'],
      },
    ],
    unprocessedNetworks: [],
    unprocessedIncludeAssetIds: [],
  },
});

appiumTest.describe(SmokeWalletPlatform('Tokens I own import'), () => {
  appiumTest(
    'unhides a token the account already holds and shows it in the wallet list',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixture = new FixtureBuilder()
        .withTokenHoldings([HIDDEN_USDC])
        .build();
      const assetsState = fixture.state.engine.backgroundState.AssetsController;
      if (typeof assetsState !== 'object' || assetsState === null) {
        throw new Error('Fixture is missing AssetsController');
      }
      const assetsController = assetsState as {
        assetPreferences?: Record<string, { hidden?: boolean }>;
      };
      assetsController.assetPreferences = {
        ...(assetsController.assetPreferences ?? {}),
        [hiddenAssetId]: { hidden: true },
      };

      await withFixtures(
        {
          fixture,
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ownedTokensImportEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            });
            const reply = v6Balances();
            await mockServer
              .forGet(
                /accounts\.api\.cx\.metamask\.io\/v6\/multiaccount\/balances/,
              )
              .asPriority(1100)
              .thenCallback(() => reply);
            await mockServer
              .forGet('/proxy')
              .asPriority(1100)
              .matching((request) => {
                const url = new URL(request.url).searchParams.get('url') || '';
                return url.includes('/v6/multiaccount/balances');
              })
              .thenCallback(() => reply);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await NetworkManager.checkTokenDoesNotExist(HIDDEN_USDC.symbol);
          await WalletView.tapImportTokensButton();
          await ImportTokensView.tapTokensIOwn();
          await ImportTokensView.tapOwnedToken(ownedRowKey);
          await ImportTokensView.tapAddOwnedTokens();
          await ImportTokensView.tapBack();

          await NetworkManager.checkTokenExists(HIDDEN_USDC.symbol);
        },
      );
    },
  );
});
