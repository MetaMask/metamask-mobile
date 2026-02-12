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
  GET_QUOTE_USDC_GOOGLEON_RESPONSE,
} from './constants';

const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI_MAINNET = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDT_MAINNET = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const WETH_MAINNET = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const GOOGLEON_MAINNET = '0xba47214edd2bb43099611b208f75e4b42fdcfedc';

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock spot prices with regex to catch all price requests (prevents NaN balance issues).
  // Include `price` so balance display (balance * price) does not show NaN.
  // Include both lowercase and checksummed assetId keys for reliable lookup.
  const spotPricesResponse: Record<string, { price: number; usd: number }> = {
    'eip155:1/slip44:60': { price: 1926.42, usd: 1926.42 },
    [`eip155:1/erc20:${USDC_MAINNET}`]: { price: 0.999806, usd: 0.999806 },
    [`eip155:1/erc20:${DAI_MAINNET}`]: { price: 0.9998, usd: 0.9998 },
    [`eip155:1/erc20:${USDT_MAINNET}`]: { price: 1.0001, usd: 1.0001 },
    [`eip155:1/erc20:${WETH_MAINNET}`]: { price: 1926.42, usd: 1926.42 },
    [`eip155:1/erc20:${GOOGLEON_MAINNET}`]: { price: 312.79, usd: 312.79 },
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
    [`eip155:1/erc20:${toChecksumHexAddress(GOOGLEON_MAINNET)}`]: {
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

  // Mock ETH->USDC with default 2% slippage
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=2/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE,
    responseCode: 200,
  });

  // Mock ETH->USDC with 3.5% custom slippage
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*slippage=3.5/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE,
    responseCode: 200,
  });

  // Mock ETH->DAI
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F/i,
    response: GET_QUOTE_ETH_DAI_RESPONSE,
    responseCode: 200,
  });

  // Mock USDC->USDT
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7/i,
    response: GET_QUOTE_USDC_USDT_RESPONSE,
    responseCode: 200,
  });

  // No need quote when destination is mUSD
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    response: [],
    responseCode: 200,
  });

  // Mock USDC->ETH (ETH native token address is 0x0000...0000)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
    response: GET_QUOTE_USDC_ETH_RESPONSE,
    responseCode: 200,
  });

  // Mock ETH->WETH (wrapped native)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    response: GET_QUOTE_ETH_WETH_RESPONSE,
    responseCode: 200,
  });

  // Mock WETH->ETH (same-chain unwrap for E2E)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*srcTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.*destTokenAddress=0x0000000000000000000000000000000000000000/i,
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

  // Mock USDC->GOOGLEON
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xba47214edd2bb43099611b208f75e4b42fdcfedc/i,
    response: GET_QUOTE_USDC_GOOGLEON_RESPONSE,
    responseCode: 200,
  });

  await interceptProxyUrl(
    mockServer,
    (url) => url.includes('getQuote') && url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
