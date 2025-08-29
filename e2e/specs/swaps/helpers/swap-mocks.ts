import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../framework';
import {
  interceptProxyUrl,
  setupMockRequest,
} from '../../../api-mocking/helpers/mockHelpers';
import {
  GET_QUOTE_ETH_USDC_RESPONSE,
  GET_QUOTE_ETH_WETH_RESPONSE,
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

  // Mock ETH->WETH
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    response: GET_QUOTE_ETH_WETH_RESPONSE,
    responseCode: 200,
  });

  await interceptProxyUrl(
    mockServer,
    (url) => url.includes('getQuote') && url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
