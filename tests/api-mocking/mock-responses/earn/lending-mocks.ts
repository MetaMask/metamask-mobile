/**
 * Stablecoin lending E2E API mocks.
 * Sets up feature flags, Accounts API balance overrides, lending markets,
 * lending positions, and gas fees.
 */

import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../helpers/mockHelpers';
import {
  accountsBalancesV2,
  accountsMultiaccountBalancesV4,
  accountsMultiaccountBalancesV5,
  accountsMultiaccountBalancesV6,
  priceSpotPricesV3,
  spotPrice,
  tokenSupportedNetworksV2,
  tokensAssetsV3,
} from '../../api-mocks';
import { getDecodedProxiedURL } from '../../../smoke-appium/notifications/utils/helpers';
import { safeGetBodyText } from '../../MockServerE2E';
import { DEFAULT_FIXTURE_ACCOUNT_CHECKSUM } from '../../../framework/fixtures/FixtureBuilder';
import type {
  AccountsBalancesV2Response,
  AccountsMultiaccountBalancesV4Response,
  AccountsMultiaccountBalancesV5Response,
} from '../../api-response-types';

/** Lowercase test-account address used in Accounts API CAIP-10 identifiers. */
const TEST_ACCOUNT = DEFAULT_FIXTURE_ACCOUNT_CHECKSUM.toLowerCase();

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const AAVE_USDC_OUTPUT_TOKEN = '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c';

const AAVE_POOL_ADDRESS = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';
const USDC_ASSET_ID = `eip155:1/erc20:${USDC_MAINNET.toLowerCase()}`;
const AAVE_USDC_ASSET_ID = `eip155:1/erc20:${AAVE_USDC_OUTPUT_TOKEN.toLowerCase()}`;

export interface LendingMockOptions {
  /** If true, mock an existing lending position for the withdrawal test. */
  hasExistingPosition?: boolean;
  /** USDC balance to report in Accounts API (default: 10 000). */
  usdcBalance?: number;
}

function buildAccountsApiV4Response(usdcBalance: number) {
  return {
    count: 2,
    balances: [
      {
        object: 'token',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        type: 'native',
        decimals: 18,
        chainId: 1,
        balance: '10.000000000000000000',
        accountAddress: `eip155:1:${TEST_ACCOUNT}`,
      },
      {
        object: 'token',
        address: USDC_MAINNET,
        symbol: 'USDC',
        name: 'USD Coin',
        type: 'erc20',
        decimals: 6,
        chainId: 1,
        balance: `${usdcBalance}.000000`,
        accountAddress: `eip155:1:${TEST_ACCOUNT}`,
      },
    ],
    unprocessedNetworks: [],
  } satisfies AccountsMultiaccountBalancesV4Response;
}

function buildAccountsApiV2Response(usdcBalance: number) {
  return {
    count: 2,
    balances: [
      {
        object: 'token',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        type: 'native',
        timestamp: '2015-07-30T15:26:13.000Z',
        decimals: 18,
        chainId: 1,
        balance: '10.0',
      },
      {
        object: 'token',
        address: USDC_MAINNET,
        symbol: 'USDC',
        name: 'USD Coin',
        type: 'erc20',
        timestamp: '2018-05-28T00:00:00.000Z',
        decimals: 6,
        chainId: 1,
        balance: `${usdcBalance}.0`,
      },
    ],
    unprocessedNetworks: [],
  } satisfies AccountsBalancesV2Response;
}

function buildAccountsApiV5Response(usdcBalance: number, hasPosition: boolean) {
  const aaveUsdcBalance: AccountsMultiaccountBalancesV5Response['balances'][number] =
    {
      object: 'token',
      assetId: AAVE_USDC_ASSET_ID,
      symbol: 'aEthUSDC',
      name: 'Aave Ethereum USDC',
      type: 'erc20',
      decimals: 6,
      balance: `${usdcBalance / 2}.000000`,
      accountId: `eip155:1:${TEST_ACCOUNT}`,
    };
  const balances: AccountsMultiaccountBalancesV5Response['balances'] = [
    {
      object: 'token',
      assetId: MAINNET_NATIVE_ASSET_ID,
      symbol: 'ETH',
      name: 'Ether',
      type: 'native',
      decimals: 18,
      balance: '10.000000000000000000',
      accountId: `eip155:1:${TEST_ACCOUNT}`,
    },
    {
      object: 'token',
      assetId: USDC_ASSET_ID,
      symbol: 'USDC',
      name: 'USD Coin',
      type: 'erc20',
      decimals: 6,
      balance: `${usdcBalance}.000000`,
      accountId: `eip155:1:${TEST_ACCOUNT}`,
    },
    ...(hasPosition ? [aaveUsdcBalance] : []),
  ];

  return {
    count: balances.length,
    balances,
    unprocessedNetworks: [],
  } satisfies AccountsMultiaccountBalancesV5Response;
}

const LENDING_MARKET_USDC = {
  id: `${AAVE_POOL_ADDRESS.toLowerCase()}-${USDC_MAINNET.toLowerCase()}`,
  chainId: 1,
  protocol: 'aave',
  name: 'Aave Ethereum USDC',
  address: AAVE_POOL_ADDRESS.toLowerCase(),
  tvlUnderlying: '1000000000000',
  netSupplyRate: 4.5,
  totalSupplyRate: 4.5,
  underlying: {
    chainId: 1,
    address: USDC_MAINNET.toLowerCase(),
  },
  outputToken: {
    chainId: 1,
    address: AAVE_USDC_OUTPUT_TOKEN.toLowerCase(),
  },
  rewards: [],
};

// Shape: LendingPosition from @metamask/stake-sdk = { id, chainId, market: LendingMarket, assets }
function buildLendingPositionsResponse(hasPosition: boolean) {
  if (!hasPosition) {
    return { positions: [] };
  }
  return {
    positions: [
      {
        id: `${LENDING_MARKET_USDC.id}-position`,
        chainId: 1,
        market: LENDING_MARKET_USDC,
        assets: '5000000000',
      },
    ],
  };
}

export async function setupLendingMocks(
  mockServer: Mockttp,
  options: LendingMockOptions = {},
): Promise<void> {
  const { hasExistingPosition = false, usdcBalance = 10000 } = options;

  // Feature flags
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnStablecoinLendingEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMoneyTokenListItemCtaEnabled: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    homepageRedesignV1: { enabled: true, minimumVersion: '0.0.0' },
  });

  await accountsMultiaccountBalancesV4.register(mockServer, () =>
    buildAccountsApiV4Response(usdcBalance),
  );

  await accountsBalancesV2.register(mockServer, () =>
    buildAccountsApiV2Response(usdcBalance),
  );

  const accountsApiV5OrV6BalancesResponse = buildAccountsApiV5Response(
    usdcBalance,
    hasExistingPosition,
  );
  await accountsMultiaccountBalancesV5.register(
    mockServer,
    () => accountsApiV5OrV6BalancesResponse,
    undefined,
    { priority: 1000 },
  );
  await accountsMultiaccountBalancesV6.register(
    mockServer,
    () => ({
      balances: accountsApiV5OrV6BalancesResponse.balances,
      unprocessedNetworks:
        accountsApiV5OrV6BalancesResponse.unprocessedNetworks,
      unprocessedIncludeAssetIds: [],
    }),
    undefined,
    { priority: 1000 },
  );

  await tokenSupportedNetworksV2.register(
    mockServer,
    { fullSupport: ['eip155:1'], partialSupport: [] },
    undefined,
    { priority: 1000 },
  );

  await tokensAssetsV3.register(
    mockServer,
    () => [
      {
        assetId: USDC_ASSET_ID,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      ...(hasExistingPosition
        ? [
            {
              assetId: AAVE_USDC_ASSET_ID,
              symbol: 'aEthUSDC',
              name: 'Aave Ethereum USDC',
              decimals: 6,
            },
          ]
        : []),
    ],
    undefined,
    { priority: 1000 },
  );

  await priceSpotPricesV3.register(
    mockServer,
    () => ({
      [MAINNET_NATIVE_ASSET_ID]: spotPrice(MAINNET_NATIVE_ASSET_ID, 3000),
      [USDC_ASSET_ID]: spotPrice(USDC_ASSET_ID, 1),
      ...(hasExistingPosition
        ? { [AAVE_USDC_ASSET_ID]: spotPrice(AAVE_USDC_ASSET_ID, 1) }
        : {}),
    }),
    undefined,
    { priority: 1000 },
  );

  // Priority 1000 overrides the default STAKING_MOCKS (priority 999)
  // which return empty markets/positions

  // Lending markets (chain-specific)
  await setupMockRequest(
    mockServer,
    {
      url: /staking\.api\.cx\.metamask\.io\/v1\/lending\/\d+\/markets$/,
      response: { markets: [LENDING_MARKET_USDC] },
      requestMethod: 'GET',
      responseCode: 200,
    },
    1000,
  );

  // Lending markets (global)
  await setupMockRequest(
    mockServer,
    {
      url: /staking\.api\.cx\.metamask\.io\/v1\/lending\/markets$/,
      response: { markets: [LENDING_MARKET_USDC] },
      requestMethod: 'GET',
      responseCode: 200,
    },
    1000,
  );

  // Lending positions
  await setupMockRequest(
    mockServer,
    {
      url: /staking\.api\.cx\.metamask\.io\/v1\/lending\/positions\/.*/,
      response: buildLendingPositionsResponse(hasExistingPosition),
      requestMethod: 'GET',
      responseCode: 200,
    },
    1000,
  );

  // Gas fee estimation
  await setupMockRequest(mockServer, {
    url: /transaction\.api\.cx\.metamask\.io\/networks\/\d+\/getFees/,
    response: {
      blockNumber: '0x1',
      baseFeePerGas: '0x3B9ACA00',
      priorityFeeRange: ['0x3B9ACA00', '0x77359400'],
      estimatedBaseFees: {
        medium: [
          {
            maxPriorityFeePerGas: '0x3B9ACA00',
            maxFeePerGas: '0x77359400',
          },
        ],
      },
    },
    requestMethod: 'POST',
    responseCode: 200,
  });

  // Token metadata for output token (aEthUSDC) — TokensController looks this up
  await setupMockRequest(mockServer, {
    url: new RegExp(
      `token\\.api\\.cx\\.metamask\\.io\\/token\\/\\d+\\?.*address=${AAVE_USDC_OUTPUT_TOKEN.toLowerCase()}`,
      'i',
    ),
    response: {
      address: AAVE_USDC_OUTPUT_TOKEN,
      symbol: 'aEthUSDC',
      decimals: 6,
      name: 'Aave Ethereum USDC',
      iconUrl: '',
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      try {
        const url = getDecodedProxiedURL(request.url);
        return /compliance\.(dev-api|api|uat-api)\.cx\.metamask\.io\/v1\/wallet\/batch/.test(
          url,
        );
      } catch {
        return false;
      }
    })
    .asPriority(1001)
    .thenCallback(async (request) => {
      let addresses: string[] = [];
      try {
        const text = await safeGetBodyText(request);
        if (text) {
          const parsed = JSON.parse(text) as unknown;
          if (Array.isArray(parsed)) {
            addresses = parsed.filter(
              (a): a is string => typeof a === 'string',
            );
          }
        }
      } catch {
        /* ignore malformed body */
      }
      return {
        statusCode: 200,
        json: addresses.map((address) => ({ address, blocked: false })),
      };
    });
}
