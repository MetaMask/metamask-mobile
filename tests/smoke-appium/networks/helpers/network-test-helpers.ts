import type { Mockttp } from 'mockttp';
import FixtureBuilder, {
  DEFAULT_SOLANA_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder.js';
import type { TokenInfo } from '../../../framework/fixtures/types.ts';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import type { AssetsControllerState } from '@metamask/assets-controller';
import type {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
import { SolScope } from '@metamask/keyring-api';

export type NetworkTokenFixture = TokenInfo;

export const ETH_TOKEN: TokenInfo = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ethereum',
};

export const USDC_TOKEN: TokenInfo = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
};

export const DAI_TOKEN: TokenInfo = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  symbol: 'DAI',
  decimals: 18,
  name: 'Dai Stablecoin',
};

const SOLANA_ACCOUNT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SOL_ASSET_ID = `${SolScope.Mainnet}/slip44:501`;
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';

const INFURA_DIRECT_POST_PATTERN =
  /^https:\/\/[a-z0-9-]+\.infura\.io\/v3\/.*$/u;

const getDecodedProxiedURL = (url: string): string => {
  try {
    return decodeURIComponent(String(new URL(url).searchParams.get('url')));
  } catch {
    return '';
  }
};

const createGenericInfuraRpcHandler =
  () =>
  async (request: { body: { getText: () => Promise<string | undefined> } }) => {
    try {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : null;

      const buildResult = (method?: string) => {
        if (method === 'eth_blockNumber') {
          return '0x1234567';
        }
        if (method === 'eth_chainId') {
          return '0x1';
        }
        if (method === 'net_version') {
          return '1';
        }
        return '0x1';
      };

      const respond = (payload: { id?: number; method?: string }) => ({
        jsonrpc: '2.0',
        id: payload?.id ?? 1,
        result: buildResult(payload?.method),
      });

      if (Array.isArray(body)) {
        return {
          statusCode: 200,
          body: JSON.stringify(body.map((entry) => respond(entry))),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(respond(body)),
      };
    } catch {
      return {
        statusCode: 200,
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', result: '0x1' }),
      };
    }
  };

/**
 * Mocks direct Infura RPC calls triggered by popular-network fixtures.
 * DEFAULT_MOCKS only cover proxied `/proxy?url=` traffic; enabled networks
 * also hit Infura directly and fail live-request validation without this.
 */
export async function setupNetworksTestMocks(
  mockServer: Mockttp,
): Promise<void> {
  await setupRemoteFeatureFlagsMock(mockServer, {});

  const infuraHandler = createGenericInfuraRpcHandler();

  await mockServer
    .forPost(INFURA_DIRECT_POST_PATTERN)
    .asPriority(1000)
    .thenCallback(infuraHandler);

  await mockServer
    .forPost('/proxy')
    .matching((request) =>
      getDecodedProxiedURL(request.url).includes('.infura.io'),
    )
    .asPriority(1000)
    .thenCallback(infuraHandler);
}

function getEvmAssetId(token: TokenInfo): string {
  return token.address === ETH_TOKEN.address
    ? MAINNET_NATIVE_ASSET_ID
    : `eip155:1/erc20:${token.address.toLowerCase()}`;
}

function getTokenAmount(token: TokenInfo): string {
  if (token.symbol === 'ETH') {
    return '10';
  }
  if (token.symbol === 'DAI') {
    return '5000';
  }
  return '10000';
}

function getTokenPrice(token: TokenInfo): number {
  return token.symbol === 'ETH' ? 3000 : 1;
}

export function seedUnifiedEvmAssets(
  fixture: ReturnType<FixtureBuilder['build']>,
  tokens: TokenInfo[],
): void {
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

export function createHomepageTokensFilterFixture(): ReturnType<
  FixtureBuilder['build']
> {
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
