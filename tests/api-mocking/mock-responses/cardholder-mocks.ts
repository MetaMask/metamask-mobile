import { TestSpecificMock } from '../../framework/types.ts';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder.ts';
import { setupMockRequest } from '../helpers/mockHelpers.ts';
import { createGeolocationResponse } from './ramps/ramps-geolocation.ts';
import { RAMPS_NETWORKS_RESPONSE } from './ramps/ramps-mocks.ts';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.ts';
import { ethers } from 'ethers';

/**
 * Mock responses for cardholder API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

// Balance scanner contract address on Linea
const LINEA_BALANCE_SCANNER = '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a';

// Static mock responses for Linea RPC calls
const LINEA_MOCK_RESPONSES: Record<string, unknown> = {
  eth_chainId: '0xe708', // Linea chain ID (59144)
  eth_getBalance: '0x0',
  eth_call: '0x', // Default empty response
  eth_estimateGas: '0x5208',
  eth_gasPrice: '0x9c7652400',
  eth_getTransactionCount: '0x0',
  eth_blockNumber: '0x1234567',
  eth_getBlockByNumber: {
    number: '0x1234567',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
    gasLimit: '0x1c9c380',
    gasUsed: '0x5208',
    transactions: [],
  },
  net_version: '59144',
};

/**
 * Generate ABI-encoded response for spendersAllowancesForTokens
 * Returns Result[][] where Result is (bool success, bytes data)
 * Each token has 2 spenders (global and US), each returning allowance of 0
 */
const generateSpendersAllowancesResponse = (numTokens: number): string => {
  // ABI encode uint256(0) for allowance data
  const zeroAllowanceData = ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [0],
  );

  // Create Result tuples: (true, encodedZeroAllowance) for each spender
  // 2 spenders per token: [global, us]
  const resultTuple = [true, zeroAllowanceData];

  // Create inner arrays (one per token, each with 2 Result tuples)
  const innerArrays: [boolean, string][][] = [];
  for (let i = 0; i < numTokens; i++) {
    innerArrays.push([resultTuple, resultTuple] as [boolean, string][]);
  }

  // ABI encode the outer array of Result[][]
  // Result is tuple(bool, bytes)
  const encoded = ethers.utils.defaultAbiCoder.encode(
    ['tuple(bool,bytes)[][]'],
    [innerArrays],
  );

  return encoded;
};

// Pre-compute the response for 6 tokens (matching clientConfig mock)
const SPENDERS_ALLOWANCES_RESPONSE = generateSpendersAllowancesResponse(6);

const clientConfig = {
  urlEndpoint:
    /^https:\/\/client-config\.api\.cx\.metamask\.io\/v1\/flags\?client=mobile&distribution=main&environment=(dev|test|prod)$/,
  response: [
    {
      depositConfig: {
        active: true,
        entrypoints: {
          walletActions: true,
        },
        minimumVersion: '1.0.0',
        providerApiKey: 'DUMMY_VALUE',
        providerFrontendAuth: 'DUMMY_VALUE',
      },
      cardFeature: {
        constants: {
          accountsApiUrl: 'https://accounts.api.cx.metamask.io',
          onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
        },
        chains: {
          'eip155:59144': {
            tokens: [
              {
                symbol: 'USDC',
                address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
                decimals: 6,
                enabled: true,
                name: 'USD Coin',
              },
              {
                enabled: true,
                name: 'Tether USD',
                symbol: 'USDT',
                address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
                decimals: 6,
              },
              {
                address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
                decimals: 18,
                enabled: true,
                name: 'Wrapped Ether',
                symbol: 'WETH',
              },
              {
                decimals: 18,
                enabled: true,
                name: 'EURe',
                symbol: 'EURe',
                address: '0x3ff47c5Bf409C86533FE1f4907524d304062428D',
              },
              {
                name: 'GBPe',
                symbol: 'GBPe',
                address: '0x3Bce82cf1A2bc357F956dd494713Fe11DC54780f',
                decimals: 18,
                enabled: true,
              },
              {
                decimals: 6,
                enabled: true,
                name: 'Aave USDC',
                symbol: 'aUSDC',
                address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
              },
            ],
            balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
            enabled: true,
            foxConnectAddresses: {
              us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
              global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            },
          },
        },
      },
    },
  ],
  responseCode: 200,
};

/**
 * Helper function to handle Linea RPC request body and return appropriate mock response
 */
const handleLineaRpcRequest = (
  body: {
    id?: number;
    method?: string;
    params?: unknown[];
  } | null,
): { id: number; jsonrpc: string; result: unknown } => {
  const method = body?.method;

  // Special handling for balance scanner eth_call
  if (method === 'eth_call') {
    const params = body?.params as { to?: string; data?: string }[] | undefined;
    const to = params?.[0]?.to?.toLowerCase();

    if (to === LINEA_BALANCE_SCANNER) {
      // Return properly ABI-encoded spendersAllowancesForTokens response
      // This is Result[][] where Result is (bool success, bytes data)
      // 6 tokens with 2 spenders each, all returning allowance of 0
      return {
        id: body?.id ?? 1,
        jsonrpc: '2.0',
        result: SPENDERS_ALLOWANCES_RESPONSE,
      };
    }
  }

  const result = method
    ? (LINEA_MOCK_RESPONSES as Record<string, unknown>)[method] || '0x'
    : '0x';

  return {
    id: body?.id ?? 1,
    jsonrpc: '2.0',
    result,
  };
};

export const testSpecificMock: TestSpecificMock = async (mockServer) => {
  // Mock Linea Tenderly RPC endpoint - handles both proxy and direct requests
  const LINEA_TENDERLY_RPC =
    'https://virtual.linea.rpc.tenderly.co/2c429ceb-43db-45bc-9d84-21a40d21e0d2';

  // Helper to get decoded URL from proxy request
  const getDecodedProxiedURL = (url: string): string => {
    try {
      return decodeURIComponent(String(new URL(url).searchParams.get('url')));
    } catch {
      return '';
    }
  };

  // Helper function to create RPC mock callback
  const createRpcCallback =
    () =>
    async (request: {
      body: { getText: () => Promise<string | undefined> };
    }) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : null;

        // Handle batch requests
        if (Array.isArray(body)) {
          const results = body.map(handleLineaRpcRequest);
          return {
            statusCode: 200,
            body: JSON.stringify(results),
          };
        }

        // Handle single request
        return {
          statusCode: 200,
          body: JSON.stringify(handleLineaRpcRequest(body)),
        };
      } catch {
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: '0x',
          }),
        };
      }
    };

  // Mock direct POST requests to Tenderly RPC (for direct fetch calls)
  await mockServer
    .forPost(LINEA_TENDERLY_RPC)
    .asPriority(1000)
    .thenCallback(createRpcCallback());

  // Mock Linea Infura RPC endpoint (used by CardSDK directly)
  // The CardSDK uses its own ethers provider with the Infura URL from constants
  await mockServer
    .forPost(/^https:\/\/linea-mainnet\.infura\.io\/v3\/.*$/)
    .asPriority(1000)
    .thenCallback(createRpcCallback());

  // Mock Linea Tenderly RPC through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('virtual.linea.rpc.tenderly.co');
    })
    .asPriority(1000)
    .thenCallback(createRpcCallback());

  // Mock Linea Infura RPC through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('linea-mainnet.infura.io');
    })
    .asPriority(1000)
    .thenCallback(createRpcCallback());

  // Geolocation mocks - set to Spain (all envs)
  for (const mock of createGeolocationResponse(
    RampsRegions[RampsRegionsEnum.SPAIN],
  )) {
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: mock.urlEndpoint,
      response: mock.response,
      responseCode: mock.responseCode,
    });
  }

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/networks\?.*$/,
    response: RAMPS_NETWORKS_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
    response: RAMPS_NETWORKS_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: clientConfig.urlEndpoint,
    response: clientConfig.response,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v1\/metadata\?.*$/,
    response: {
      is: [`eip155:0:${DEFAULT_FIXTURE_ACCOUNT.toLowerCase()}`],
    },
    responseCode: 200,
  });
};
