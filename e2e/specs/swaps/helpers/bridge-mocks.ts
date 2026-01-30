import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../../tests/framework';
import { setupMockRequest } from '../../../../tests/api-mocking/helpers/mockHelpers';
import {
  GET_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_SOLANA_RESPONSE,
  GET_TOKENS_BASE_RESPONSE,
  GET_QUOTE_ETH_SOLANA_RESPONSE,
  GET_QUOTE_ETH_BASE_RESPONSE,
  GET_TOP_ASSETS_BASE_RESPONSE,
} from './constants';

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock Ethereum token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1/i,
    response: GET_TOKENS_MAINNET_RESPONSE,
    responseCode: 200,
  });

  // Mock Solana token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1151111081099710/i,
    response: GET_TOKENS_SOLANA_RESPONSE,
    responseCode: 200,
  });

  // Mock Base token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=8453/i,
    response: GET_TOKENS_BASE_RESPONSE,
    responseCode: 200,
  });

  // Mock Base top assets list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /networks\/8453\/topAssets\/?/i,
    response: GET_TOP_ASSETS_BASE_RESPONSE,
    responseCode: 200,
  });

  // Mock quote response ETH(Ethereum)->SOL(Solana)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destChainId=1151111081099710/i,
    response: GET_QUOTE_ETH_SOLANA_RESPONSE,
    responseCode: 200,
  });

  // Mock quote response ETH(Ethereum)->ETH(BASE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destChainId=8453/i,
    response: GET_QUOTE_ETH_BASE_RESPONSE,
    responseCode: 200,
  });
};
