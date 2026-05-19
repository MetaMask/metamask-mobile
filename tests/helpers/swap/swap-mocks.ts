import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';
import {
  interceptProxyUrl,
  setupMockRequest,
  setupMockPostRequest,
  setupSSEMockRequest,
} from '../../api-mocking/helpers/mockHelpers';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers';
import {
  GET_QUOTE_ETH_USDC_RESPONSE,
  GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE,
  GET_QUOTE_ETH_DAI_RESPONSE,
  GET_QUOTE_USDC_ETH_RESPONSE,
  GET_QUOTE_USDC_USDT_RESPONSE,
  GET_QUOTE_ETH_WETH_RESPONSE,
  GET_QUOTE_WETH_ETH_SAME_CHAIN_RESPONSE,
  GET_TOKENS_MAINNET_RESPONSE,
  GET_POPULAR_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_API_USDC_RESPONSE,
  GET_TOKENS_API_USDT_RESPONSE,
  GET_TOKENS_API_MUSD_RESPONSE,
  GET_QUOTE_USDC_GOOGLON_RESPONSE,
  POST_SUBMIT_ORDER_USDC_GOOGLON_REQUEST,
  POST_SUBMIT_ORDER_USDC_GOOGLON_RESPONSE,
  GET_ORDER_STATUS_USDC_GOOGLON_RESPONSE,
  GET_TOKENS_API_GOOGLON_RESPONSE,
  GET_QUOTE_GOOGLON_USDC_RESPONSE,
  POST_SUBMIT_ORDER_GOOGLON_USDC_REQUEST,
  POST_SUBMIT_ORDER_GOOGLON_USDC_RESPONSE,
  GET_ORDER_STATUS_GOOGLON_USDC_RESPONSE,
  GET_QUOTE_GOOGLON_SPYON_RESPONSE,
  POST_SUBMIT_ORDER_GOOGLON_SPYON_REQUEST,
  POST_SUBMIT_ORDER_GOOGLON_SPYON_RESPONSE,
  GET_ORDER_STATUS_GOOGLON_SPYON_RESPONSE,
  GET_TOKENS_API_SPYON_RESPONSE,
  toSSEResponse,
} from './constants';

const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI_MAINNET = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDT_MAINNET = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const WETH_MAINNET = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const GOOGLON_MAINNET = '0xba47214edd2bb43099611b208f75e4b42fdcfedc';
const MUSD_MAINNET = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const SPYON_MAINNET = '0xfedc5f4a6c38211c1338aa411018dfaf26612c08';

/** SocialService leaderboard response shape (empty list is valid for E2E). */
const SOCIAL_LEADERBOARD_EMPTY_RESPONSE = { traders: [] };

/**
 * Mock spot prices so balance display (balance * price) does not show NaN.
 * Shared by swap and bridge E2E tests.
 */
export async function setupSpotPricesMock(mockServer: Mockttp): Promise<void> {
  const spotPricesResponse: Record<string, { price: number; usd: number }> = {
    'eip155:1/slip44:60': { price: 1926.42, usd: 1926.42 },
    [`eip155:1/erc20:${USDC_MAINNET}`]: { price: 0.999806, usd: 0.999806 },
    [`eip155:1/erc20:${DAI_MAINNET}`]: { price: 0.9998, usd: 0.9998 },
    [`eip155:1/erc20:${USDT_MAINNET}`]: { price: 1.0001, usd: 1.0001 },
    [`eip155:1/erc20:${WETH_MAINNET}`]: { price: 1926.42, usd: 1926.42 },
    [`eip155:1/erc20:${GOOGLON_MAINNET}`]: { price: 401.79, usd: 401.79 },
    [`eip155:1/erc20:${toChecksumHexAddress(USDC_MAINNET)}`]: {
      price: 0.999806,
      usd: 0.999806,
    },
    [`eip155:1/erc20:${toChecksumHexAddress(DAI_MAINNET)}`]: {
      price: 0.9998,
      usd: 0.9998,
    },
    [`eip155:1/erc20:${toChecksumHexAddress(USDT_MAINNET)}`]: {
      price: 1.0001,
      usd: 1.0001,
    },
    [`eip155:1/erc20:${toChecksumHexAddress(WETH_MAINNET)}`]: {
      price: 1926.42,
      usd: 1926.42,
    },
    [`eip155:1/erc20:${toChecksumHexAddress(GOOGLON_MAINNET)}`]: {
      price: 401.79,
      usd: 401.79,
    },
    [`eip155:1/erc20:${MUSD_MAINNET}`]: { price: 1.0, usd: 1.0 },
    [`eip155:1/erc20:${toChecksumHexAddress(MUSD_MAINNET)}`]: {
      price: 1.0,
      usd: 1.0,
    },
    [`eip155:1/erc20:${SPYON_MAINNET}`]: { price: 741.5, usd: 741.5 },
    [`eip155:1/erc20:${toChecksumHexAddress(SPYON_MAINNET)}`]: {
      price: 741.5,
      usd: 741.5,
    },
  };

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: spotPricesResponse,
    requestMethod: 'GET',
    responseCode: 200,
  });
}

/**
 * Social leaderboard + compliance batch — used by swap `testSpecificMock` and
 * bridge/trending specs that do not use swap-mocks’ full mock bundle.
 */
export async function setupSwapSocialAndComplianceMocks(
  mockServer: Mockttp,
): Promise<void> {
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /social\.api\.cx\.metamask\.io\/api\/v1\/leaderboard/,
      response: SOCIAL_LEADERBOARD_EMPTY_RESPONSE,
      responseCode: 200,
    },
    1001,
  );

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      try {
        const decodedUrl = getDecodedProxiedURL(request.url);
        return /compliance\.(dev-api|api|uat-api)\.cx\.metamask\.io\/v1\/wallet\/batch/.test(
          decodedUrl,
        );
      } catch {
        return false;
      }
    })
    .asPriority(1001)
    .thenCallback(async (request) => {
      let addresses: string[] = [];
      try {
        const text = await request.body.getText();
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

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await setupSpotPricesMock(mockServer);
  await setupSwapSocialAndComplianceMocks(mockServer);

  // Catch-all for getQuoteStream with no slippage param (initial render before
  // useInitialSlippage fires). Registered first so specific mocks below at
  // priority 999 take precedence. Prevents real network calls that cause
  // Error: Aborted when the bridge controller aborts the in-flight request.
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream/i,
    toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE),
    1, // lower priority than the specific mocks below (999)
  );

  // Mock ETH->USDC with default 2% slippage (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0x0000000000000000000000000000000000000000.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=2/i,
    toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE),
  );

  // Mock ETH->USDC with 3.5% custom slippage (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0x0000000000000000000000000000000000000000.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=3\.5/i,
    toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE),
  );

  // Mock ETH->DAI (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F/i,
    toSSEResponse(GET_QUOTE_ETH_DAI_RESPONSE),
  );

  // Mock USDC->USDT (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7/i,
    toSSEResponse(GET_QUOTE_USDC_USDT_RESPONSE),
  );

  // No quote when destination is mUSD (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    '',
  );

  // Mock USDC->ETH (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    toSSEResponse(GET_QUOTE_USDC_ETH_RESPONSE),
  );

  // Mock ETH->WETH (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    toSSEResponse(GET_QUOTE_ETH_WETH_RESPONSE),
  );

  // Mock WETH->ETH (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    toSSEResponse(GET_QUOTE_WETH_ETH_SAME_CHAIN_RESPONSE),
  );

  // Mock Ethereum token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1/i,
    response: GET_TOKENS_MAINNET_RESPONSE,
    responseCode: 200,
  });

  // Mock popular tokens (POST - for token selector)
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: /getTokens\/popular/i,
    response: GET_POPULAR_TOKENS_MAINNET_RESPONSE,
    responseCode: 200,
  });

  // Mock API tokens for USDC
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    response: GET_TOKENS_API_USDC_RESPONSE,
    responseCode: 200,
  });

  // Mock API tokens for USDT
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
    response: GET_TOKENS_API_USDT_RESPONSE,
    responseCode: 200,
  });

  // Mock API tokens for MUSD
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    response: GET_TOKENS_API_MUSD_RESPONSE,
    responseCode: 200,
  });

  // Mock USDC->GOOGLON (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*destTokenAddress=0xba47214edd2bb43099611b208f75e4b42fdcfedc/i,
    toSSEResponse(GET_QUOTE_USDC_GOOGLON_RESPONSE),
  );

  // Mock submitOrder for USDC->GOOGLON
  await setupMockPostRequest(
    mockServer,
    /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/submitOrder$/i,
    POST_SUBMIT_ORDER_USDC_GOOGLON_REQUEST,
    POST_SUBMIT_ORDER_USDC_GOOGLON_RESPONSE,
    {
      statusCode: 200,
      ignoreFields: ['signature', 'order'],
    },
  );

  // Mock getOrderStatus for USDC->GOOGLON
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/getOrderStatus.*orderId=0x1177970263/i,
    response: GET_ORDER_STATUS_USDC_GOOGLON_RESPONSE,
    responseCode: 200,
  });

  // Mock API tokens for GOOGLON
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0xba47214edd2bb43099611b208f75e4b42fdcfedc',
    response: GET_TOKENS_API_GOOGLON_RESPONSE,
    responseCode: 200,
  });

  // Mock GOOGLON->USDC (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*srcTokenAddress=0xba47214edd2bb43099611b208f75e4b42fdcfedc.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/i,
    toSSEResponse(GET_QUOTE_GOOGLON_USDC_RESPONSE),
  );

  // Mock submitOrder for GOOGLON->USDC
  await setupMockPostRequest(
    mockServer,
    /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/submitOrder$/i,
    POST_SUBMIT_ORDER_GOOGLON_USDC_REQUEST,
    POST_SUBMIT_ORDER_GOOGLON_USDC_RESPONSE,
    {
      statusCode: 200,
      ignoreFields: ['signature', 'order'],
    },
  );

  // Mock getOrderStatus for GOOGLON->USDC
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/getOrderStatus.*orderId=0x1181258256/i,
    response: GET_ORDER_STATUS_GOOGLON_USDC_RESPONSE,
    responseCode: 200,
  });

  // Mock GOOGLON->SPYON (SSE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xFeDC5f4a6c38211c1338aa411018DFAf26612c08/i,
    toSSEResponse(GET_QUOTE_GOOGLON_SPYON_RESPONSE),
  );

  // Mock submitOrder for GOOGLON->SPYON
  await setupMockPostRequest(
    mockServer,
    /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/submitOrder$/i,
    POST_SUBMIT_ORDER_GOOGLON_SPYON_REQUEST,
    POST_SUBMIT_ORDER_GOOGLON_SPYON_RESPONSE,
    {
      statusCode: 200,
      ignoreFields: ['signature', 'order'],
    },
  );

  // Mock getOrderStatus for GOOGLON->SPYON
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /bridge\.(dev-api|api|uat-api)\.cx\.metamask\.io\/getOrderStatus.*orderId=0x1182073544/i,
    response: GET_ORDER_STATUS_GOOGLON_SPYON_RESPONSE,
    responseCode: 200,
  });

  // Mock API tokens for SPYON
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0xFeDC5f4a6c38211c1338aa411018DFAf26612c08',
    response: GET_TOKENS_API_SPYON_RESPONSE,
    responseCode: 200,
  });

  await interceptProxyUrl(
    mockServer,
    (url) =>
      url.includes('getQuote') &&
      !url.includes('getQuoteStream') &&
      url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
