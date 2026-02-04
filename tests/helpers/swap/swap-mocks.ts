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
  GET_QUOTE_USDC_USDT_RESPONSE,
  GET_TOKENS_MAINNET_RESPONSE,
  GET_POPULAR_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_API_USDC_RESPONSE,
  GET_TOKENS_API_USDT_RESPONSE,
} from './constants';

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await setupMockRequest(mockServer, {
    url: 'https://price.api.cx.metamask.io/v3/spot-prices?assetIds=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,eip155:1/slip44:60&vsCurrency=usd',
    response: {
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        usd: 0.999806,
      },
      'eip155:1/slip44:60': { usd: 4583.48 },
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  // Mock ETH->USDC
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE,
    responseCode: 200,
  });

  // Mock ETH->DAI
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F/i,
    response: GET_QUOTE_ETH_DAI_RESPONSE,
    responseCode: 200,
  });

  // Mock USDC->USDT with default 2% slippage
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7.*slippage=2/i,
    response: GET_QUOTE_USDC_USDT_RESPONSE,
    responseCode: 200,
  });

  // Mock USDC->USDT with 3.5% custom slippage
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7.*slippage=3.5/i,
    response: GET_QUOTE_ETH_USDC_RESPONSE_CUSTOM_SLIPPAGE,
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

  await interceptProxyUrl(
    mockServer,
    (url) => url.includes('getQuote') && url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
