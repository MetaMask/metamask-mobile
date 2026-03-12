/**
 * mUSD conversion E2E API mocks.
 * Sets up feature flags, geolocation, ramp tokens, price APIs, token API,
 * Merkl rewards, Accounts API balance overrides, and Relay quote/status.
 */

import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../helpers/remoteFeatureFlagsHelper.ts';
import { setupMockRequest } from '../../helpers/mockHelpers.ts';
import { getDecodedProxiedURL } from '../../../smoke/notifications/utils/helpers.ts';
import {
  mockRelayQuoteMainnetMusd,
  mockRelayStatus,
} from '../transaction-pay.ts';
import { USDC_MAINNET, MUSD_MAINNET } from '../../../constants/musd-mainnet.ts';
import { MUSD_RAMP_TOKENS_RESPONSE } from './musd-ramp-tokens-response.ts';
import {
  MUSD_SPOT_PRICES_V3_RESPONSE,
  MUSD_CHAINS_SPOT_PRICES_V2_RESPONSE,
  MUSD_EXCHANGE_RATES_V1_RESPONSE,
  MUSD_HISTORICAL_PRICES_RESPONSE,
} from './musd-price-responses.ts';
import { MUSD_TOKEN_API_RESPONSE } from './musd-token-response.ts';
import { DEFAULT_FIXTURE_ACCOUNT_CHECKSUM } from '../../../framework/fixtures/FixtureBuilder.ts';

/** Lowercase test-account address used in Accounts API CAIP-10 identifiers. */
const TEST_ACCOUNT = DEFAULT_FIXTURE_ACCOUNT_CHECKSUM.toLowerCase();

/**
 * Build a V4 multiaccount/balances response.
 * Always includes 10 ETH + 10 000 USDC on Mainnet.
 * When `includeMusd` is true, also includes MUSD with the given balance
 * so that `hasMusdBalanceOnAnyChain` is satisfied for the token-list CTA.
 */
function buildAccountsApiV4Response(includeMusd = false, musdBalance = 100) {
  const balances = [
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
      balance: '10000.000000',
      accountAddress: `eip155:1:${TEST_ACCOUNT}`,
    },
  ];

  if (includeMusd) {
    balances.push({
      object: 'token',
      address: MUSD_MAINNET,
      symbol: 'MUSD',
      name: 'MUSD',
      type: 'erc20',
      decimals: 6,
      chainId: 1,
      balance: `${musdBalance}.000000`,
      accountAddress: `eip155:1:${TEST_ACCOUNT}`,
    });
  }

  return { balances, unprocessedNetworks: [] };
}

/**
 * Build a V2 single-account balances response.
 * Same token set as V4 but without CAIP-10 accountAddress fields.
 */
function buildAccountsApiV2Response(includeMusd = false, musdBalance = 100) {
  const balances = [
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
      balance: '10000.0',
    },
  ];

  if (includeMusd) {
    balances.push({
      object: 'token',
      address: MUSD_MAINNET,
      symbol: 'MUSD',
      name: 'MUSD',
      type: 'erc20',
      timestamp: '2024-01-01T00:00:00.000Z',
      decimals: 6,
      chainId: 1,
      balance: `${musdBalance}.0`,
    });
  }

  return { count: balances.length, balances, unprocessedNetworks: [] };
}

export interface MusdMockOptions {
  hasMusdBalance?: boolean;
  musdBalance?: number;
}

export async function setupMusdMocks(
  mockServer: Mockttp,
  options: MusdMockOptions = {},
): Promise<void> {
  const { hasMusdBalance = false, musdBalance = 100 } = options;
  await setupRemoteFeatureFlagsMock(mockServer, {
    earnMusdConversionFlowEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdCtaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    earnMusdConversionTokenListItemCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionAssetOverviewCtaEnabled: {
      enabled: true,
      minimumVersion: '0.0.0',
    },
    earnMusdConversionCtaTokens: { '*': ['USDC'] },
    earnMusdConvertibleTokensAllowlist: { '*': ['USDC'] },
    earnMusdConversionMinAssetBalanceRequired: 0.01,
    earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB'] },
  });

  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
    response: buildAccountsApiV4Response(hasMusdBalance, musdBalance),
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances/,
    response: buildAccountsApiV2Response(hasMusdBalance, musdBalance),
    requestMethod: 'GET',
    responseCode: 200,
  });

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return /on-ramp\.(dev-api|uat-api|api)\.cx\.metamask\.io\/geolocation/.test(
        url,
      );
    })
    .asPriority(998)
    .thenCallback(() => ({
      statusCode: 200,
      body: 'US',
      headers: { 'content-type': 'text/plain' },
    }));

  await setupMockRequest(mockServer, {
    url: /on-ramp-cache\.(uat-api|api)\.cx\.metamask\.io\/regions\/.*\/tokens/,
    response: MUSD_RAMP_TOKENS_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: MUSD_SPOT_PRICES_V3_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices/,
    response: MUSD_CHAINS_SPOT_PRICES_V2_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v1\/exchange-rates/,
    response: MUSD_EXCHANGE_RATES_V1_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/historical-prices/,
    response: MUSD_HISTORICAL_PRICES_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: new RegExp(
      `token\\.api\\.cx\\.metamask\\.io/token/1\\?address=${MUSD_MAINNET}`,
      'i',
    ),
    response: MUSD_TOKEN_API_RESPONSE,
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /api\.merkl\.xyz\/v4\/users\/0x[a-fA-F0-9]+\/rewards\?chainId=/,
    response: [],
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /transaction\.api\.cx\.metamask\.io\/networks\/\d+\/getFees/,
    response: {
      blockNumber: '0x1',
      baseFeePerGas: '0x3B9ACA00',
      priorityFeeRange: ['0x3B9ACA00', '0x77359400'],
      estimatedBaseFees: {
        medium: [
          { maxPriorityFeePerGas: '0x3B9ACA00', maxFeePerGas: '0x77359400' },
        ],
      },
    },
    requestMethod: 'POST',
    responseCode: 200,
  });

  await mockRelayQuoteMainnetMusd(mockServer);
  await mockRelayStatus(mockServer);
}
