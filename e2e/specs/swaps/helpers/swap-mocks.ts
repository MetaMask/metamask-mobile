import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../framework';
import {
  interceptProxyUrl,
  mockProxyGet,
} from '../../../api-mocking/mockHelpers';
import {
  GET_QUOTE_ETH_USDC_RESPONSE,
  GET_QUOTE_ETH_WETH_RESPONSE,
} from './constants';

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock ETH->USDC
  await mockProxyGet(
    mockServer,
    /getQuote.*destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/i,
    GET_QUOTE_ETH_USDC_RESPONSE,
  );

  // Mock ETH->WETH
  await mockProxyGet(
    mockServer,
    /getQuote.*destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/i,
    GET_QUOTE_ETH_WETH_RESPONSE,
  );

  await interceptProxyUrl(
    mockServer,
    (url) => url.includes('getQuote') && url.includes('insufficientBal=false'),
    (url) => url.replace('insufficientBal=false', 'insufficientBal=true'),
  );
};
