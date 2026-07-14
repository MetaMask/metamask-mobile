import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import FixtureBuilder, {
  DEFAULT_SOLANA_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import Assertions from '../../framework/Assertions.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { SolScope } from '@metamask/keyring-api';
import type { AssetsControllerState } from '@metamask/assets-controller';
import type {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';

const ETH_TOKEN = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ethereum',
};

const USDC_TOKEN = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
};

const DAI_TOKEN = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  symbol: 'DAI',
  decimals: 18,
  name: 'Dai Stablecoin',
};

const SOLANA_ACCOUNT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SOL_ASSET_ID = `${SolScope.Mainnet}/slip44:501`;
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';

function getEvmAssetId(token: typeof ETH_TOKEN) {
  return token.address === ETH_TOKEN.address
    ? MAINNET_NATIVE_ASSET_ID
    : `eip155:1/erc20:${token.address.toLowerCase()}`;
}

function getTokenAmount(token: typeof ETH_TOKEN) {
  if (token.symbol === 'ETH') {
    return '10';
  }
  if (token.symbol === 'DAI') {
    return '5000';
  }
  return '10000';
}

function getTokenPrice(token: typeof ETH_TOKEN) {
  return token.symbol === 'ETH' ? 3000 : 1;
}

function seedUnifiedEvmAssets(
  fixture: ReturnType<FixtureBuilder['build']>,
  tokens: (typeof ETH_TOKEN)[],
) {
  const backgroundState = fixture.state.engine.backgroundState;
  const selectedAccountId =
    backgroundState.AccountsController.internalAccounts.selectedAccount;
  const existingAssetsController = (backgroundState.AssetsController ??
    {}) as Partial<AssetsControllerState>;
  const existingCustomAssets =
    existingAssetsController.customAssets?.[selectedAccountId] ?? [];
  const now = Date.now();

  backgroundState.AssetsController = {
    ...existingAssetsController,
    selectedCurrency: 'usd',
    assetsInfo: {
      ...existingAssetsController.assetsInfo,
      ...Object.fromEntries(
        tokens.map((token) => [
          getEvmAssetId(token),
          {
            type:
              token.address === ETH_TOKEN.address
                ? ('native' as const)
                : ('erc20' as const),
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          },
        ]),
      ),
    },
    assetsBalance: {
      ...existingAssetsController.assetsBalance,
      [selectedAccountId]: {
        ...existingAssetsController.assetsBalance?.[selectedAccountId],
        ...Object.fromEntries(
          tokens.map((token) => [
            getEvmAssetId(token),
            {
              amount: getTokenAmount(token),
            },
          ]),
        ),
      },
    },
    assetsPrice: {
      ...existingAssetsController.assetsPrice,
      ...Object.fromEntries(
        tokens.map((token) => [
          getEvmAssetId(token),
          {
            assetPriceType: 'fungible' as const,
            price: getTokenPrice(token),
            usdPrice: getTokenPrice(token),
            lastUpdated: now,
          },
        ]),
      ),
    },
    customAssets: {
      ...existingAssetsController.customAssets,
      [selectedAccountId]: [
        ...new Set([
          ...existingCustomAssets,
          ...tokens
            .filter((token) => token.address !== ETH_TOKEN.address)
            .map(getEvmAssetId),
        ]),
      ],
    },
  };
}

function createHomepageTokensFilterFixture() {
  const fixture = new FixtureBuilder()
    .withTokensForAllPopularNetworks([ETH_TOKEN, USDC_TOKEN])
    .withNetworkEnabledMap({
      eip155: { '0x1': true },
      solana: { [SolScope.Mainnet]: true },
    })
    .withAccountTreeController()
    .build();

  seedUnifiedEvmAssets(fixture, [ETH_TOKEN, USDC_TOKEN]);

  const backgroundState = fixture.state.engine.backgroundState;

  backgroundState.AccountsController.internalAccounts.accounts[
    SOLANA_ACCOUNT_ID
  ] = {
    address: DEFAULT_SOLANA_FIXTURE_ACCOUNT,
    id: SOLANA_ACCOUNT_ID,
    metadata: {
      name: 'Account 1',
      importTime: 1684232000456,
      keyring: {
        type: 'Snap Keyring',
      },
    },
    options: {},
    methods: [
      'signAndSendTransaction',
      'signTransaction',
      'signMessage',
      'signIn',
    ],
    type: 'solana:data-account',
    scopes: [SolScope.Mainnet],
  };
  backgroundState.AccountsController.accountIdByAddress[
    DEFAULT_SOLANA_FIXTURE_ACCOUNT
  ] = SOLANA_ACCOUNT_ID;

  const existingMultichainAssetsController =
    (backgroundState.MultichainAssetsController ??
      {}) as Partial<MultichainAssetsControllerState>;
  backgroundState.MultichainAssetsController = {
    ...existingMultichainAssetsController,
    accountsAssets: {
      ...existingMultichainAssetsController.accountsAssets,
      [SOLANA_ACCOUNT_ID]: [SOL_ASSET_ID],
    },
    assetsMetadata: {
      ...existingMultichainAssetsController.assetsMetadata,
      [SOL_ASSET_ID]: {
        fungible: true,
        iconUrl: '',
        units: [
          {
            decimals: 9,
            symbol: 'SOL',
            name: 'Solana',
          },
        ],
        symbol: 'SOL',
        name: 'Solana',
      },
    },
  };

  const existingMultichainBalancesController =
    (backgroundState.MultichainBalancesController ??
      {}) as Partial<MultichainBalancesControllerState>;
  backgroundState.MultichainBalancesController = {
    ...existingMultichainBalancesController,
    balances: {
      ...existingMultichainBalancesController.balances,
      [SOLANA_ACCOUNT_ID]: {
        [SOL_ASSET_ID]: {
          amount: '1',
          unit: 'SOL',
        },
      },
    },
  };

  const existingMultichainAssetsRatesController =
    (backgroundState.MultichainAssetsRatesController ??
      {}) as Partial<MultichainAssetsRatesControllerState>;
  backgroundState.MultichainAssetsRatesController = {
    ...existingMultichainAssetsRatesController,
    conversionRates: {
      ...existingMultichainAssetsRatesController.conversionRates,
      [SOL_ASSET_ID]: {
        rate: '200',
      },
    },
  };

  return fixture;
}

appiumTest.describe(
  SmokeWalletPlatform('Homepage Tokens Section - Network Filter'),
  () => {
    appiumTest(
      'navigates from homepage tokens section to tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withTokensForAllPopularNetworks([ETH_TOKEN])
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();

            await TokensFullView.waitForVisible();
            await Assertions.expectElementToBeVisible(
              TokensFullView.networkFilterButton,
              {
                elemDescription:
                  'Network filter button should be visible in Tokens Full View',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'filters tokens by selected network in tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: (() => {
              const fixture = new FixtureBuilder()
                .withTokensForAllPopularNetworks([
                  ETH_TOKEN,
                  USDC_TOKEN,
                  DAI_TOKEN,
                ])
                .withNetworkEnabledMap({
                  eip155: { '0x1': true, '0xe708': true },
                })
                .build();
              seedUnifiedEvmAssets(fixture, [ETH_TOKEN, USDC_TOKEN, DAI_TOKEN]);
              return fixture;
            })(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.ETHEREUM,
            );

            await NetworkManager.checkTokenIsVisible('ETH');
            await NetworkManager.checkTokenIsVisible('USDC');
            await NetworkManager.checkTokenIsVisible('DAI');

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            await NetworkManager.checkTokenIsNotVisible('ETH');
          },
        );
      },
    );

    appiumTest(
      'shows all tokens on homepage regardless of network filter set in tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: createHomepageTokensFilterFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();

            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            await NetworkManager.checkTokenIsNotVisible('ETH');

            await TokensFullView.tapBackButton();
            await waitForWalletHomePlaywright();

            await NetworkManager.checkTokenIsVisible('SOL');
            await NetworkManager.checkTokenIsVisible('ETH');
          },
        );
      },
    );
  },
);
