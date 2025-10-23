/**
 * Comprehensive mock responses for all Polymarket API endpoints
 * Imports response data from separate files for better organization
 */

import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../helpers/mockHelpers';
import {
  POLYMARKET_CURRENT_POSITIONS_RESPONSE,
  POLYMARKET_RESOLVED_MARKETS_POSITIONS_RESPONSE,
  createPositionsWithWinnings,
} from './polymarket-positions-response';
import { POLYMARKET_EVENT_DETAILS_RESPONSE } from './polymarket-event-details-response';
import { POLYMARKET_UPNL_RESPONSE } from './polymarket-upnl-response';
import { POLYMARKET_ACTIVITY_RESPONSE } from './polymarket-activity-response';
import { POLYMARKET_ORDER_BOOK_RESPONSE } from './polymarket-order-book-response';
import { POLYMARKET_SPORTS_FEED } from './market-feed-responses/polymarket-sports-feed';
import { POLYMARKET_CRYPTO_FEED } from './market-feed-responses/polymarket-crypto-feed';
import { POLYMARKET_POLITICS_FEED } from './market-feed-responses/polymarket-politics-feed';
import { POLYMARKET_TRENDING_FEED } from './market-feed-responses/polymarket-trending-feed';
import { POLYMARKET_NEW_FEED } from './market-feed-responses/polymarket-new-feed';
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
export const POLYMARKET_CURRENT_POSITIONS_MOCKS = async (
  mockServer: Mockttp,
) => {
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
 * Mock for Polymarket positions API with controllable winning positions
 * Returns positions data for user with optional winning positions
 * This mock will trigger the CLAIM button
 */
export const POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS = async (
  mockServer: Mockttp,
  includeWinnings: boolean = false,
) => {
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

      // Use the new function to control whether to include winning positions
      const positionsData = createPositionsWithWinnings(includeWinnings);

      // Update the mock response with the actual user address
      const dynamicResponse = positionsData.map((position) => ({
        ...position,
        proxyWallet: userAddress,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for Polymarket CLOB order book API
 * Returns order book data for specific token IDs
 */
export const POLYMARKET_ORDER_BOOK_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/clob\.polymarket\.com\/book\?token_id=\d+$/.test(url),
      );
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const tokenIdMatch = url?.match(/token_id=(\d+)/);
      const tokenId = tokenIdMatch ? tokenIdMatch[1] : '';

      // Use the imported order book response and update the asset_id
      const orderBookResponse = {
        ...POLYMARKET_ORDER_BOOK_RESPONSE,
        asset_id: tokenId,
      };

      return {
        statusCode: 200,
        json: orderBookResponse,
      };
    });
};

/**
 * Mock for Polymarket redeemable positions API
 * Returns redeemable positions data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_RESOLVED_MARKETS_POSITIONS_MOCKS = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
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

      const dynamicResponse =
        POLYMARKET_RESOLVED_MARKETS_POSITIONS_RESPONSE.map((position) => ({
          ...position,
          proxyWallet: userAddress,
        }));

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
  await POLYMARKET_CURRENT_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_RESOLVED_MARKETS_POSITIONS_MOCKS(mockServer);
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
          return true;
        } catch (error) {
          return false;
        }
      }

      return false;
    })
    .asPriority(999)
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
          result = MOCK_RPC_RESPONSES.APPROVAL_RESULT;
        } else {
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      } else if (body?.method === 'eth_blockNumber') {
        result = MOCK_RPC_RESPONSES.BLOCK_NUMBER_RESULT;
      } else if (body?.method === 'eth_getBalance') {
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
 * Mock for all Polymarket endpoints (positions, redeemable positions, activity, UpNL, order book, and value)
 * Mock for Polymarket market feeds API
 * Returns market feed data using the proxy pattern (consistent with other mocks)
 * Intercepts proxy calls to gamma-api.polymarket.com/events/pagination
 */
export const POLYMARKET_MARKET_FEEDS_MOCKS = async (mockServer: Mockttp) => {
  // Mock proxy calls to gamma-api.polymarket.com (consistent with other mocks)
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination/.test(url),
      );
    })
    .asPriority(999)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');

      // Parse the actual Polymarket API URL to get query parameters
      const polymarketUrl = new URL(url || '');
      const tagSlug = polymarketUrl.searchParams.get('tag_slug');
      const order = polymarketUrl.searchParams.get('order');
      const excludeTagId = polymarketUrl.searchParams.get('exclude_tag_id');

      // Return appropriate feed based on query parameters
      let selectedFeed;
      if (tagSlug) {
        // Categories that use tag_slug parameter
        switch (tagSlug) {
          case 'sports':
            selectedFeed = POLYMARKET_SPORTS_FEED;
            break;
          case 'crypto':
            selectedFeed = POLYMARKET_CRYPTO_FEED;
            break;
          case 'politics':
            selectedFeed = POLYMARKET_POLITICS_FEED;
            break;
          default:
            selectedFeed = POLYMARKET_TRENDING_FEED;
            break;
        }
      } else if (order === 'volume24hr' && excludeTagId === '100639') {
        // Trending category: order=volume24hr&exclude_tag_id=100639
        selectedFeed = POLYMARKET_TRENDING_FEED;
      } else if (order === 'startDate' && excludeTagId === '100639') {
        // New category: order=startDate&exclude_tag_id=100639&exclude_tag_id=102169
        selectedFeed = POLYMARKET_NEW_FEED;
      } else {
        // Default fallback
        selectedFeed = POLYMARKET_TRENDING_FEED;
      }

      // Return the feed data in the correct API structure
      return {
        statusCode: 200,
        json: {
          data: selectedFeed.data,
          pagination: selectedFeed.pagination,
        },
      };
    });

  // Also mock the search endpoint for market feeds
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url && /^https:\/\/gamma-api\.polymarket\.com\/public-search/.test(url),
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        events: POLYMARKET_TRENDING_FEED.data,
        pagination: POLYMARKET_TRENDING_FEED.pagination,
      },
    }));
};

/**
 * Mock for all Polymarket endpoints (positions, redeemable positions, activity, UpNL, and value)
 * Returns data for proxy wallet: 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_COMPLETE_MOCKS = async (mockServer: Mockttp) => {
  await POLYMARKET_ALL_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_ACTIVITY_MOCKS(mockServer);
  await POLYMARKET_UPNL_MOCKS(mockServer);
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
  await POLYMARKET_EVENT_DETAILS_MOCKS(mockServer);
  await POLYMARKET_ORDER_BOOK_MOCKS(mockServer);
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  // Only user-specific data (positions, activity, UpNL) should be mocked
};
