import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder, {
  DEFAULT_SOLANA_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensFullView from '../../page-objects/wallet/HomeSections';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import Assertions from '../../framework/Assertions';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
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

describe(
  SmokeWalletPlatform('Homepage Tokens Section - Network Filter'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(170000);
    });

    it('navigates from homepage tokens section to tokens full view', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTokensForAllPopularNetworks([ETH_TOKEN])
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet homepage should be visible',
          });

          // Tap the Tokens section header to navigate to TokensFullView
          await WalletView.tapOnNewTokensSection();

          // Verify the TokensFullView is visible (back button + network filter present)
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
    });

    it('filters tokens by selected network in tokens full view', async () => {
      await withFixtures(
        {
          // Seed ETH/USDC/DAI on both Ethereum and Linea so we have tokens on
          // two chains. withNetworkEnabledMap enables both chains so both appear
          // in the full view when "all networks" is the filter. Selecting
          // Ethereum-only should show ETH/USDC/DAI; switching to Linea-only
          // should hide them (Linea has no native ETH balance seeded).
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
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          // Navigate to TokensFullView
          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          // Open network manager and select Ethereum
          await NetworkManager.openNetworkManager();
          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);

          // Verify the control bar now shows Ethereum filter
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );

          // Ethereum tokens should be visible
          await NetworkManager.checkTokenIsVisible('ETH');
          await NetworkManager.checkTokenIsVisible('USDC');
          await NetworkManager.checkTokenIsVisible('DAI');

          // Switch to Linea filter — no native balance seeded on Linea so
          // the Ethereum tokens should no longer appear
          await NetworkManager.openNetworkManager();
          await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.LINEA,
          );

          await NetworkManager.checkTokenIsNotVisible('ETH');
        },
      );
    });

    it('shows all tokens on homepage regardless of network filter set in tokens full view', async () => {
      await withFixtures(
        {
          fixture: createHomepageTokensFilterFixture(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            });
          },
        },
        async () => {
          await loginToApp();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet homepage should be visible',
          });

          // Navigate to TokensFullView and apply a Linea-only filter.
          // No tokens were seeded on Linea, so the full view becomes empty.
          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          await NetworkManager.openNetworkManager();

          await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.LINEA,
          );

          // Full view: Ethereum tokens should not be visible (filtered to Linea only)
          await NetworkManager.checkTokenIsNotVisible('ETH');

          // Return to the homepage
          await TokensFullView.tapBackButton();

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description:
              'Wallet homepage should be visible after navigating back',
          });

          // Homepage tokens section shows ALL tokens regardless of the Linea-only filter
          await NetworkManager.checkTokenIsVisible('SOL');
          await NetworkManager.checkTokenIsVisible('ETH');
        },
      );
    });
  },
);
