import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';
import {
  interceptProxyUrl,
  setupMockRequest,
} from '../../api-mocking/helpers/mockHelpers';
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
  GET_QUOTE_USDC_GOOGLON_RESPONSE,
  toSSEResponse,
} from './constants';

const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI_MAINNET = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDT_MAINNET = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const WETH_MAINNET = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const GOOGLON_MAINNET = '0xba47214edd2bb43099611b208f75e4b42fdcfedc';

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
    [`eip155:1/erc20:${GOOGLON_MAINNET}`]: { price: 312.79, usd: 312.79 },
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
      price: 312.79,
      usd: 312.79,
    },
  };

  await setupMockRequest(mockServer, {
    url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
    response: spotPricesResponse,
    requestMethod: 'GET',
    responseCode: 200,
  });
}

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await setupSpotPricesMock(mockServer);

  // ── SSE path (bridge-controller SSE feature flag ON) ──────────────────────
  // Catch-all for getQuoteStream with no slippage param (initial render before
  // useInitialSlippage fires). Registered first so specific mocks below at
  // priority 999 take precedence. Prevents real network calls that cause
  // Error: Aborted when the bridge controller aborts the in-flight request.
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /getQuoteStream/i,
      response: toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE),
      responseCode: 200,
    },
    1, // lower priority than the specific mocks below (999)
  );

  // Mock ETH->USDC with default 2% slippage (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=2/i,
    response: toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE),
    responseCode: 200,
  });

  // Mock ETH->USDC with 3.5% custom slippage (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=3\.5/i,
    response: toSSEResponse(GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE),
    responseCode: 200,
  });

  // Mock ETH->DAI (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F/i,
    response: toSSEResponse(GET_QUOTE_ETH_DAI_RESPONSE),
    responseCode: 200,
  });

  // Mock USDC->USDT (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7/i,
    response: toSSEResponse(GET_QUOTE_USDC_USDT_RESPONSE),
    responseCode: 200,
  });

  // No quote when destination is mUSD (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    response: '',
    responseCode: 200,
  });

  // Mock USDC->ETH (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    response: toSSEResponse(GET_QUOTE_USDC_ETH_RESPONSE),
    responseCode: 200,
  });

  // Mock ETH->WETH (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    response: toSSEResponse(GET_QUOTE_ETH_WETH_RESPONSE),
    responseCode: 200,
  });

  // Mock WETH->ETH (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*srcTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    response: toSSEResponse(GET_QUOTE_WETH_ETH_SAME_CHAIN_RESPONSE),
    responseCode: 200,
  });

  // ── JSON path (bridge-controller SSE feature flag OFF) ─────────────────────
  // The bridge controller falls back to fetchBridgeQuotes → /getQuote? (no
  // "Stream" suffix) returning plain JSON when sse.enabled is false (e.g. local
  // dev with BRIDGE_USE_DEV_APIS=true). Use /\/getQuote\?/i so the regex matches
  // "getQuote?" but NOT "getQuoteStream?".

  // Catch-all for getQuote (no slippage / initial render)
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /\/getQuote\?/i,
      response: GET_QUOTE_ETH_USDC_RESPONSE,
      responseCode: 200,
    },
    1, // lower priority than specific mocks below (999)
  );

  // Mock ETH->USDC with default 2% slippage (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=2/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE,
    responseCode: 200,
  });

  // Mock ETH->USDC with 3.5% custom slippage (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=3\.5/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE,
    responseCode: 200,
  });

  // Mock ETH->DAI (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F/i,
    response: GET_QUOTE_ETH_DAI_RESPONSE,
    responseCode: 200,
  });

  // Mock USDC->USDT (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7/i,
    response: GET_QUOTE_USDC_USDT_RESPONSE,
    responseCode: 200,
  });

  // No quote when destination is mUSD (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    response: [],
    responseCode: 200,
  });

  // Mock USDC->ETH (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    response: GET_QUOTE_USDC_ETH_RESPONSE,
    responseCode: 200,
  });

  // Mock ETH->WETH (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    response: GET_QUOTE_ETH_WETH_RESPONSE,
    responseCode: 200,
  });

  // Mock WETH->ETH (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*srcTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    response: GET_QUOTE_WETH_ETH_SAME_CHAIN_RESPONSE,
    responseCode: 200,
  });

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

  // Mock USDC->GOOGLON (SSE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStream.*destTokenAddress=0xba47214edd2bb43099611b208f75e4b42fdcfedc/i,
    response: toSSEResponse(GET_QUOTE_USDC_GOOGLON_RESPONSE),
    responseCode: 200,
  });

  // Mock USDC->GOOGLON (JSON)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /\/getQuote\?.*destTokenAddress=0xba47214edd2bb43099611b208f75e4b42fdcfedc/i,
    response: GET_QUOTE_USDC_GOOGLON_RESPONSE,
    responseCode: 200,
  });

  await interceptProxyUrl(
    mockServer,
    (url) => url.includes('getQuote') && url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
