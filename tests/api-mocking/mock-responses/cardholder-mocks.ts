import { TestSpecificMock } from '../../framework/types.ts';
import { setupMockRequest } from '../helpers/mockHelpers.ts';
import { createGeolocationResponse } from './ramps/responses/ramps-geolocation.ts';
import { RAMPS_NETWORKS_RESPONSE } from './ramps/responses/ramps-networks-response.ts';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.ts';

/**
 * Mock responses for cardholder API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

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
            enabled: true,
            foxConnectAddresses: {
              us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
              global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            },
          },
        },
      },
      cardLinkApi: {
        enabled: true,
        minimumVersion: '0.0.0',
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
  /** Minimal Baanx registration settings so Card login can render a country. */
  const BAANX_REGISTRATION_SETTINGS = {
    countries: [
      {
        id: 'es',
        name: 'Spain',
        iso3166alpha2: 'ES',
        callingCode: '34',
        canSignUp: true,
      },
    ],
    usStates: [],
    links: {
      us: {
        termsAndConditions: 'https://example.com/us/terms',
        accountOpeningDisclosure: 'https://example.com/us/account-opening',
        noticeOfPrivacy: 'https://example.com/us/privacy',
        eSignConsentDisclosure: 'https://example.com/us/esign',
      },
      intl: {
        termsAndConditions: 'https://example.com/intl/terms',
        rightToInformation: 'https://example.com/intl/right-to-information',
      },
    },
    config: {
      us: {
        emailSpecialCharactersDomainsException: '',
        consentSmsNumber: '',
        supportEmail: 'support@example.com',
      },
      intl: {
        emailSpecialCharactersDomainsException: '',
        consentSmsNumber: '',
        supportEmail: 'support@example.com',
      },
    },
  };

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

  // Public Linea RPC through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('rpc.linea.build');
    })
    .asPriority(1000)
    .thenCallback(createRpcCallback());

  // Card login loads registration settings before the country select is usable.
  // The e2e build calls the dev Baanx host; UAT and production are covered so a
  // different build target does not leak a live request.
  const isBaanxRegistrationSettings = (url: string): boolean =>
    /https:\/\/(foxdev2-ag\.foxcard\.io|dev\.api\.baanx\.com|api\.baanx\.com)\/v1\/auth\/settings\/?/.test(
      url,
    );

  await mockServer
    .forGet()
    .matching((request) => isBaanxRegistrationSettings(request.url))
    .asPriority(1000)
    .thenJson(200, BAANX_REGISTRATION_SETTINGS);

  await mockServer
    .forGet('/proxy')
    .matching((request) =>
      isBaanxRegistrationSettings(getDecodedProxiedURL(request.url)),
    )
    .asPriority(1000)
    .thenJson(200, BAANX_REGISTRATION_SETTINGS);

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
    url: /^https:\/\/card\.(dev-api|uat-api|api)\.cx\.metamask\.io\/v1\/card\/links$/,
    response: [
      {
        provider: 'baanx',
        status: 'active',
        linkedAccountRef: null,
        closedReason: null,
        migratedToProvider: null,
        linkedAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    responseCode: 200,
  });

  // Card dashboard — opened in an in-app browser by card tests
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/card\.metamask\.io(\/.*)?$/,
    response:
      '<html><head><title>Card</title></head><body>Card Dashboard</body></html>',
    responseCode: 200,
  });

  // Token API single-token metadata on Linea (chainId 59144). When Card Home
  // opens, ensureCardFundingTokensImported adds each configured funding token
  // via TokensController.addToken, which fetches metadata from
  // token.api.cx.metamask.io/token/59144?address=...&includeRwaData=true.
  // Mock all such lookups so they don't hit live services and fail the
  // unmocked-request guard during cleanup. The response echoes the requested
  // address, mapping known card tokens to their symbol/decimals/name.
  const LINEA_TOKEN_METADATA: Record<
    string,
    { symbol: string; decimals: number; name: string }
  > = {
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff': {
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
    },
    '0xa219439258ca9da29e9cc4ce5596924745e12b93': {
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
    },
    '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f': {
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped Ether',
    },
    '0x3ff47c5bf409c86533fe1f4907524d304062428d': {
      symbol: 'EURe',
      decimals: 18,
      name: 'EURe',
    },
    '0x3bce82cf1a2bc357f956dd494713fe11dc54780f': {
      symbol: 'GBPe',
      decimals: 18,
      name: 'GBPe',
    },
    '0x374d7860c4f2f604de0191298dd393703cce84f3': {
      symbol: 'aUSDC',
      decimals: 6,
      name: 'Aave USDC',
    },
  };

  const buildLineaTokenResponse = (address: string) => {
    const meta = LINEA_TOKEN_METADATA[address] ?? {
      symbol: 'UNKNOWN',
      decimals: 18,
      name: 'Unknown Token',
    };
    return {
      address,
      symbol: meta.symbol,
      decimals: meta.decimals,
      name: meta.name,
    };
  };

  const lineaTokenApiRegex =
    /^https:\/\/token\.api\.cx\.metamask\.io\/token\/59144\?.*address=/i;

  // Direct GET requests to the Token API
  await mockServer
    .forGet(lineaTokenApiRegex)
    .asPriority(1000)
    .thenCallback((request) => {
      const address = (
        new URL(request.url).searchParams.get('address') ?? ''
      ).toLowerCase();
      return {
        statusCode: 200,
        json: buildLineaTokenResponse(address),
      };
    });

  // Proxied GET requests to the Token API
  await mockServer
    .forGet('/proxy')
    .matching((request) =>
      getDecodedProxiedURL(request.url).includes(
        'token.api.cx.metamask.io/token/59144',
      ),
    )
    .asPriority(1000)
    .thenCallback((request) => {
      const proxiedUrl = getDecodedProxiedURL(request.url);
      const address = (
        new URL(proxiedUrl).searchParams.get('address') ?? ''
      ).toLowerCase();
      return {
        statusCode: 200,
        json: buildLineaTokenResponse(address),
      };
    });
};
