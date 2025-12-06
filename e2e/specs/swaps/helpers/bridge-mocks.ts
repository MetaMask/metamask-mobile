import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../framework';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  GET_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_SOLANA_RESPONSE,
  GET_TOKENS_BASE_RESPONSE,
  GET_QUOTE_ETH_SOLANA_RESPONSE,
  GET_QUOTE_ETH_BASE_RESPONSE,
  GET_TOP_ASSETS_BASE_RESPONSE,
  GET_POPULAR_TOKENS_MAINNET_RESPONSE,
  GET_POPULAR_TOKENS_BASE_RESPONSE,
} from './constants';

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Set up feature flags with chainRanking for network pills
  await setupRemoteFeatureFlagsMock(mockServer, {
    bridgeConfigV2: {
      chainRanking: [
        { chainId: 'eip155:1' },
        { chainId: 'eip155:10' },
        { chainId: 'eip155:137' },
        { chainId: 'eip155:8453' },
        { chainId: 'eip155:42161' },
        { chainId: 'eip155:43114' },
        { chainId: 'eip155:59144' },
        { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
      ],
    },
  });
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

  // Mock popular tokens (POST - for token selector)
  // This combines responses from all networks as the API returns tokens for all requested chainIds
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: /getTokens\/popular/i,
    response: [
      ...GET_POPULAR_TOKENS_MAINNET_RESPONSE,
      ...GET_POPULAR_TOKENS_BASE_RESPONSE,
    ],
    responseCode: 200,
  });
};
