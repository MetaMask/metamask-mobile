import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../../framework';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import {
  GET_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_BASE_RESPONSE,
  GET_QUOTE_ETH_BASE_GASLESS_RESPONSE,
  GET_TOP_ASSETS_BASE_RESPONSE,
} from './constants';

export const gaslessTestSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock Ethereum token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1/i,
    response: GET_TOKENS_MAINNET_RESPONSE,
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

  // Mock gasless quote response MUSD(Ethereum)->ETH(BASE)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*srcTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA.*destChainId=8453/i,
    response: GET_QUOTE_ETH_BASE_GASLESS_RESPONSE,
    responseCode: 200,
  });

  // Mock Sentinel API /networks endpoint for sendBundle support check
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('tx-sentinel') && urlParam.includes('/networks');
    })
    .asPriority(1000)
    .thenCallback(() => ({
      statusCode: 200,
      body: JSON.stringify({
        '1': {
          name: 'Ethereum Mainnet',
          group: 'ethereum',
          chainID: 1,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          network: 'mainnet',
          explorer: 'https://etherscan.io',
          confirmations: true,
          smartTransactions: true,
          relayTransactions: true,
          hidden: false,
          sendBundle: true,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }));

  // Mock Smart Transaction submission - returns UUID
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return (
        urlParam.includes('transactions.api.cx.metamask.io') &&
        urlParam.includes('/submitTransaction')
      );
    })
    .asPriority(1000)
    .thenCallback(async () => ({
      statusCode: 200,
      body: JSON.stringify({
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }));
};
