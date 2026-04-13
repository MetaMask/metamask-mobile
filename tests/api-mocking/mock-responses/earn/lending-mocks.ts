/**
 * Stablecoin lending E2E API mocks.
 * Sets up feature flags, Accounts API balance overrides, lending markets,
 * lending positions, gas fees, and Merkl rewards.
 */

import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../helpers/mockHelpers';
import { DEFAULT_FIXTURE_ACCOUNT_CHECKSUM } from '../../../framework/fixtures/FixtureBuilder';

/** Lowercase test-account address used in Accounts API CAIP-10 identifiers. */
const TEST_ACCOUNT = DEFAULT_FIXTURE_ACCOUNT_CHECKSUM.toLowerCase();

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const AAVE_USDC_OUTPUT_TOKEN = '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c';

const AAVE_POOL_ADDRESS = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

export interface LendingMockOptions {
  /** If true, mock an existing lending position for the withdrawal test. */
  hasExistingPosition?: boolean;
  /** USDC balance to report in Accounts API (default: 10 000). */
  usdcBalance?: number;
}

function buildAccountsApiV4Response(usdcBalance: number) {
  return {
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
  };
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
  };
}

const LENDING_MARKET_USDC = {
  protocol: 'aave',
  underlying: {
    address: USDC_MAINNET,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    chainId: 1,
  },
  outputToken: {
    address: AAVE_USDC_OUTPUT_TOKEN,
    symbol: 'aEthUSDC',
    decimals: 6,
    name: 'Aave Ethereum USDC',
    chainId: 1,
  },
  supplyRate: '0.045',
  totalSupply: '1000000000000',
  poolAddress: AAVE_POOL_ADDRESS,
};

function buildLendingPositionsResponse(hasPosition: boolean) {
  if (!hasPosition) {
    return { positions: [] };
  }
  return {
    positions: [
      {
        protocol: 'aave',
        underlying: {
          address: USDC_MAINNET,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId: 1,
        },
        outputToken: {
          address: AAVE_USDC_OUTPUT_TOKEN,
          symbol: 'aEthUSDC',
          decimals: 6,
          name: 'Aave Ethereum USDC',
          chainId: 1,
        },
        balance: '500000000', // 500 USDC in minimal units
        balanceFormatted: '500.0',
        supplyRate: '0.045',
        poolAddress: AAVE_POOL_ADDRESS,
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
  });

  // Accounts API v4 (multiaccount balances)
  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
    response: buildAccountsApiV4Response(usdcBalance),
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Accounts API v2 (single-account balances)
  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances/,
    response: buildAccountsApiV2Response(usdcBalance),
    requestMethod: 'GET',
    responseCode: 200,
  });

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

  // Merkl rewards (empty — no pending claims)
  await setupMockRequest(mockServer, {
    url: /api\.merkl\.xyz\/v4\/users\/0x[a-fA-F0-9]+\/rewards\?chainId=/,
    response: [],
    requestMethod: 'GET',
    responseCode: 200,
  });
}
