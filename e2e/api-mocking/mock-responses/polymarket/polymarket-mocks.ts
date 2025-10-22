/**
 * Comprehensive mock responses for all Polymarket API endpoints
 * Imports response data from separate files for better organization
 */

import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../helpers/mockHelpers';
import {
  POLYMARKET_CURRENT_POSITIONS_RESPONSE,
  POLYMARKET_REDEEMABLE_POSITIONS_RESPONSE,
} from './polymarket-positions-response';
import { POLYMARKET_EVENT_DETAILS_RESPONSE } from './polymarket-event-details-response';
import { POLYMARKET_UPNL_RESPONSE } from './polymarket-upnl-response';
import { POLYMARKET_ACTIVITY_RESPONSE } from './polymarket-activity-response';
import {
  PROXY_WALLET_ADDRESS,
  USER_WALLET_ADDRESS,
  SAFE_FACTORY_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  MULTICALL_CONTRACT_ADDRESS,
  CONDITIONAL_TOKENS_CONTRACT_ADDRESS,
} from './polymarket-constants';
import { MOCK_RPC_RESPONSES } from './polymarket-rpc-response';

/**
 * Mock for Polymarket API returning 500 error
 * This simulates the Polymarket API being down
 */
export const POLYMARKET_API_DOWN = async (mockServer: Mockttp) => {
  // Mock specific Polymarket endpoints first (more specific patterns)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/\d+/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/clob\.polymarket\.com\/prices-history/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });

  // Mock broader patterns last (less specific patterns)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/clob\.polymarket\.com/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });
};

/**
 * Mock for Polymarket API returning successful responses
 * Returns empty arrays for basic functionality
 */
export const POLYMARKET_API_SUCCESS_MOCKS = async (mockServer: Mockttp) => {
  // Mock specific Polymarket endpoints first (more specific patterns)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination/,
    responseCode: 200,
    response: [],
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/\d+/,
    responseCode: 200,
    response: {},
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/clob\.polymarket\.com\/prices-history/,
    responseCode: 200,
    response: [],
  });

  // Mock broader patterns last (less specific patterns)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com/,
    responseCode: 200,
    response: [],
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/clob\.polymarket\.com/,
    responseCode: 200,
    response: [],
  });
};

/**
 * Mock for Polymarket event details API
 * Returns event details for Blue Jays vs. Mariners (event ID 60362)
 */
export const POLYMARKET_EVENT_DETAILS_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/gamma-api\.polymarket\.com\/events\/[0-9]+$/.test(url),
      );
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: POLYMARKET_EVENT_DETAILS_RESPONSE,
    }));
};

/**
 * Mock for Polymarket positions API with test user positions
 * Returns positions data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_POSITIONS_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/data-api\.polymarket\.com\/positions\?.*user=0x[a-fA-F0-9]{40}.*$/.test(
            url,
          ),
      );
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Update the mock response with the actual user address
      const dynamicResponse = POLYMARKET_CURRENT_POSITIONS_RESPONSE.map(
        (position) => ({
          ...position,
          proxyWallet: userAddress,
        }),
      );

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for Polymarket redeemable positions API
 * Returns redeemable positions data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_REDEEMABLE_POSITIONS_MOCKS = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      // More flexible pattern - just check if it's a positions endpoint with redeemable=true
      const matches = Boolean(
        url &&
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('redeemable=true'),
      );
      return matches;
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Update the mock response with the actual user address
      const dynamicResponse = POLYMARKET_REDEEMABLE_POSITIONS_RESPONSE.map(
        (position) => ({
          ...position,
          proxyWallet: userAddress,
        }),
      );

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for Polymarket activity API with test user trading activity
 * Returns trading activity data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_ACTIVITY_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/data-api\.polymarket\.com\/activity\?user=0x[a-fA-F0-9]{40}$/.test(
            url,
          ),
      );
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Update the mock response with the actual user address
      const dynamicResponse = POLYMARKET_ACTIVITY_RESPONSE.map((activity) => ({
        ...activity,
        proxyWallet: userAddress,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for Polymarket UpNL API with test user unrealized P&L data
 * Returns unrealized P&L data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_UPNL_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/data-api\.polymarket\.com\/upnl\?user=0x[a-fA-F0-9]{40}$/.test(
            url,
          ),
      );
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Update the mock response with the actual user address
      const dynamicResponse = POLYMARKET_UPNL_RESPONSE.map((upnl) => ({
        ...upnl,
        user: userAddress,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for both Polymarket positions endpoints (regular and redeemable)
 * Returns both types of positions data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_ALL_POSITIONS_MOCKS = async (mockServer: Mockttp) => {
  await POLYMARKET_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_REDEEMABLE_POSITIONS_MOCKS(mockServer);
};

/**
 * Mock for USDC balance calls on Polygon
 * Returns mock USDC balance for the test user
 */
export const POLYMARKET_USDC_BALANCE_MOCKS = async (mockServer: Mockttp) => {
  // Add a catch-all mock for any eth_call to Polygon RPC (including polygon-rpc.com)
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(urlParam?.includes('polygon'));
      const isEthereumRPC = Boolean(
        urlParam?.includes('mainnet') || urlParam?.includes('ethereum'),
      );
      const isInfuraRPC = Boolean(urlParam?.includes('infura'));

      if (isPolygonRPC || isEthereumRPC || isInfuraRPC) {
        try {
          await request.body.getText();
          // Return true to intercept this request
          return true;
        } catch (error) {
          return false;
        }
      }

      return false;
    })
    .asPriority(999) // High priority to ensure this mock takes precedence
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      // Return appropriate mock response based on the call
      let result = '0x';

      if (body?.method === 'eth_call') {
        const toAddress = body?.params?.[0]?.to;

        if (toAddress?.toLowerCase() === SAFE_FACTORY_ADDRESS.toLowerCase()) {
          // Safe Factory call - return proxy wallet address
          result = MOCK_RPC_RESPONSES.SAFE_FACTORY_RESULT;
        } else if (
          toAddress?.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()
        ) {
          // USDC contract call - return mock balance
          result = MOCK_RPC_RESPONSES.USDC_BALANCE_RESULT;
        } else if (
          toAddress?.toLowerCase() === MULTICALL_CONTRACT_ADDRESS.toLowerCase()
        ) {
          // Multicall contract - return empty result for now
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        } else if (
          toAddress?.toLowerCase() ===
          CONDITIONAL_TOKENS_CONTRACT_ADDRESS.toLowerCase()
        ) {
          // Conditional Tokens contract - return mock approval result
          result = MOCK_RPC_RESPONSES.APPROVAL_RESULT;
        } else {
          // Unknown contract - return empty result for now
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      } else if (body?.method === 'eth_blockNumber') {
        // Return a mock block number
        result = MOCK_RPC_RESPONSES.BLOCK_NUMBER_RESULT;
      } else if (body?.method === 'eth_getBalance') {
        // Return a mock ETH balance
        result = MOCK_RPC_RESPONSES.ETH_BALANCE_RESULT;
      } else if (body?.method === 'eth_getCode') {
        // Return mock contract code for deployed contracts
        const address = body?.params?.[0];
        if (address?.toLowerCase() === PROXY_WALLET_ADDRESS.toLowerCase()) {
          // Return mock contract code for the proxy wallet (indicating it's deployed)
          result = MOCK_RPC_RESPONSES.CONTRACT_CODE_RESULT;
        } else {
          // Return empty code for other addresses (indicating they're not contracts)
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result,
        }),
      };
    });
};

/**
 * Mock for all Polymarket endpoints (positions, redeemable positions, activity, UpNL, and value)
 * Returns data for proxy wallet: 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_COMPLETE_MOCKS = async (mockServer: Mockttp) => {
  await POLYMARKET_ALL_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_ACTIVITY_MOCKS(mockServer);
  await POLYMARKET_UPNL_MOCKS(mockServer);
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Re-enabled for predictions testing
  await POLYMARKET_EVENT_DETAILS_MOCKS(mockServer);

  // Note: Gamma API mocks removed - feed data should come from real Polymarket API
  // Only user-specific data (positions, activity, UpNL) should be mocked
};
