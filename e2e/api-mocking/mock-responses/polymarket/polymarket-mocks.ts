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
import {
  POLYMARKET_EVENT_DETAILS_BLUE_JAYS_MARINERS_RESPONSE,
  POLYMARKET_EVENT_DETAILS_SPURS_PELICANS_RESPONSE,
} from './polymarket-event-details-response';
import { POLYMARKET_UPNL_RESPONSE } from './polymarket-upnl-response';
import { POLYMARKET_ACTIVITY_RESPONSE } from './polymarket-activity-response';
import {
  POLYMARKET_ORDER_BOOK_RESPONSE,
  POLYMARKET_ZOHRAN_ORDER_BOOK_RESPONSE,
  POLYMARKET_CHIEFS_ORDER_BOOK_RESPONSE,
  POLYMARKET_CUOMO_ORDER_BOOK_RESPONSE,
  POLYMARKET_BILLS_ORDER_BOOK_RESPONSE,
  POLYMARKET_SPURS_ORDER_BOOK_RESPONSE,
  POLYMARKET_PELICANS_ORDER_BOOK_RESPONSE,
} from './polymarket-order-book-response';
import { POLYMARKET_SPORTS_FEED } from './market-feed-responses/polymarket-sports-feed';
import { POLYMARKET_CRYPTO_FEED } from './market-feed-responses/polymarket-crypto-feed';
import { POLYMARKET_POLITICS_FEED } from './market-feed-responses/polymarket-politics-feed';
import { POLYMARKET_TRENDING_FEED } from './market-feed-responses/polymarket-trending-feed';
import { MOCK_RPC_RESPONSES } from './polymarket-rpc-response';
import { POLYMARKET_NEW_FEED } from './market-feed-responses/polymarket-new-feed';
import {
  PROXY_WALLET_ADDRESS,
  USER_WALLET_ADDRESS,
  SAFE_FACTORY_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  MULTICALL_CONTRACT_ADDRESS,
  CONDITIONAL_TOKENS_CONTRACT_ADDRESS,
  POST_CASH_OUT_USDC_BALANCE_WEI,
  POST_CLAIM_USDC_BALANCE_WEI,
  POLYGON_EIP7702_CONTRACT_ADDRESS,
  EIP7702_CODE_FORMAT,
} from './polymarket-constants';
import { createTransactionSentinelResponse } from './polymarket-transaction-sentinel-response';

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
 * Mock for Polymarket geoblock endpoint
 * This simulates the user being in a geo-restricted region
 */
export const POLYMARKET_GEO_BLOCKED_MOCKS = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: true },
  });
};

/**
 * Mock for Polymarket event details API
 * Returns event details based on the requested event ID
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
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const eventIdMatch = url?.match(/\/events\/([0-9]+)$/);
      const eventId = eventIdMatch ? eventIdMatch[1] : '60362';

      if (eventId === '62553') {
        // Return Spurs vs Pelicans event details from mock response file
        return {
          statusCode: 200,
          json: POLYMARKET_EVENT_DETAILS_SPURS_PELICANS_RESPONSE,
        };
      }

      // Default to Blue Jays vs Mariners for other event IDs
      return {
        statusCode: 200,
        json: POLYMARKET_EVENT_DETAILS_BLUE_JAYS_MARINERS_RESPONSE,
      };
    });
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

      // Check if eventId parameter is present for filtering
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Filter positions by eventId if provided
      let filteredPositions = POLYMARKET_CURRENT_POSITIONS_RESPONSE;
      if (eventId) {
        filteredPositions = POLYMARKET_CURRENT_POSITIONS_RESPONSE.filter(
          (position) => position.eventId === eventId,
        );
      }

      // Update the mock response with the actual user address
      const dynamicResponse = filteredPositions.map((position) => ({
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

      // Check if eventId parameter is present for filtering
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Use the new function to control whether to include winning positions
      const positionsData = createPositionsWithWinnings(includeWinnings);

      // Filter positions by eventId if provided
      let filteredPositions = positionsData;
      if (eventId) {
        filteredPositions = positionsData.filter(
          (position) => position.eventId === eventId,
        );
      }

      // Update the mock response with the actual user address
      const dynamicResponse = filteredPositions.map((position) => ({
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
 * Returns order book data for specific token IDs with correct market mapping
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

      // Select the correct order book response based on token ID
      let orderBookResponse;

      if (
        tokenId ===
        '36588252805891405622192021663682911922795750993518578680902576500086169492917'
      ) {
        // 76ers token
        orderBookResponse = POLYMARKET_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '33945469250963963541781051637999677727672635213493648594066577298999471399137'
      ) {
        // Zohran Mamdani token
        orderBookResponse = POLYMARKET_ZOHRAN_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '11584273833068499329017832956188664326032555278943683999231427554688326830185'
      ) {
        // Chiefs Super Bowl token
        orderBookResponse = POLYMARKET_CHIEFS_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '72685162394098505217895638060393901041260225434938300730127268362092284806692'
      ) {
        // Andrew Cuomo token
        orderBookResponse = POLYMARKET_CUOMO_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '19740329944962592380580142050369523795065853055987745520766432334608119837023'
      ) {
        // Bills Super Bowl token
        orderBookResponse = POLYMARKET_BILLS_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '110743925263777693447488608878982152642205002490046349037358337248548507433643'
      ) {
        // Spurs token
        orderBookResponse = POLYMARKET_SPURS_ORDER_BOOK_RESPONSE;
      } else if (
        tokenId ===
        '38489710206351002266036612280230748165102516187175290608628298208123746725814'
      ) {
        // Pelicans token
        orderBookResponse = POLYMARKET_PELICANS_ORDER_BOOK_RESPONSE;
      } else {
        // Default to 76ers for unknown token IDs
        orderBookResponse = POLYMARKET_ORDER_BOOK_RESPONSE;
      }

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

// Global variable to track current USDC balance
let currentUSDCBalance = MOCK_RPC_RESPONSES.USDC_BALANCE_RESULT;

/**
 * Mock for USDC balance calls on Polygon
 * Returns mock USDC balance for the test user
 * @param mockServer - The mockttp server instance
 * @param customBalance - Optional custom USDC balance in wei (hex string)
 */
export const POLYMARKET_USDC_BALANCE_MOCKS = async (
  mockServer: Mockttp,
  customBalance?: string,
) => {
  // Update global balance if custom balance provided
  if (customBalance) {
    currentUSDCBalance = customBalance;
  }

  // The app makes balance calls through the proxy, not direct Infura calls
  // Our existing proxy mock below will handle these calls

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
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isEthCall = body?.method === 'eth_call';

          if (isEthCall) {
            const toAddress = body?.params?.[0]?.to?.toLowerCase();
            const isUSDCBalanceCall =
              toAddress === USDC_CONTRACT_ADDRESS.toLowerCase();
            const isProxyWalletCall =
              toAddress === PROXY_WALLET_ADDRESS.toLowerCase() ||
              toAddress === '0x254955be605cf7c4e683e92b157187550bd5e639';

            // Match USDC balance calls, proxy wallet calls, and other contract calls
            return isUSDCBalanceCall || isProxyWalletCall || Boolean(toAddress);
          }

          // Also match other RPC methods like eth_getCode, eth_getBalance, etc.
          return Boolean(body?.method);
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
        const callData = body?.params?.[0]?.data;

        if (toAddress?.toLowerCase() === SAFE_FACTORY_ADDRESS.toLowerCase()) {
          // Safe Factory call - return proxy wallet address
          result = MOCK_RPC_RESPONSES.SAFE_FACTORY_RESULT;
        } else if (
          toAddress?.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()
        ) {
          // USDC contract call - return current global balance
          result = currentUSDCBalance;
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
        } else if (
          toAddress?.toLowerCase() === PROXY_WALLET_ADDRESS.toLowerCase() ||
          toAddress?.toLowerCase() ===
            '0x254955be605cf7c4e683e92b157187550bd5e639'
        ) {
          // Proxy wallet contract calls (handle both proxy wallet addresses)
          if (callData?.toLowerCase()?.startsWith('0xaffed0e0')) {
            // Function selector 0xaffed0e0 - likely checking batch support or version
            // Return 0x6 (6 in decimal) as seen in HAR file
            result =
              '0x0000000000000000000000000000000000000000000000000000000000000006';
          } else {
            result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
          }
        } else {
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      } else if (body?.method === 'eth_blockNumber') {
        result = MOCK_RPC_RESPONSES.BLOCK_NUMBER_RESULT;
      } else if (body?.method === 'eth_getBalance') {
        result = MOCK_RPC_RESPONSES.ETH_BALANCE_RESULT;
      } else if (body?.method === 'eth_getTransactionCount') {
        // Return a valid nonce (transaction count) - needed for claim flow
        // This is critical for transaction construction, must be a valid hex number
        result = MOCK_RPC_RESPONSES.TRANSACTION_COUNT_RESULT;
      } else if (body?.method === 'eth_getCode') {
        // Return mock contract code for deployed contracts
        const address = body?.params?.[0];
        if (address?.toLowerCase() === PROXY_WALLET_ADDRESS.toLowerCase()) {
          // Return mock contract code for the proxy wallet (indicating it's deployed)
          result = MOCK_RPC_RESPONSES.CONTRACT_CODE_RESULT;
        } else if (
          address?.toLowerCase() === USER_WALLET_ADDRESS.toLowerCase()
        ) {
          // Return EIP-7702 format for user's EOA (indicating EIP-7702 upgrade)
          // Format: 0xef01 (magic byte) + 00 (padding) + contract address
          result = EIP7702_CODE_FORMAT(POLYGON_EIP7702_CONTRACT_ADDRESS);
        } else {
          // Return empty code for other addresses (indicating they're not contracts)
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      } else if (body?.method === 'eth_estimateGas') {
        // Return a reasonable gas estimate
        result = '0xa49f3'; // ~675,683 gas
      }
      // Note: We don't mock eth_gasPrice for Polygon - the app should use the gas API
      // (already mocked in DEFAULT_GAS_API_MOCKS) which provides EIP-1559 fields.
      // Mocking eth_gasPrice can cause the app to include gasPrice in type "0x4" transactions,
      // which is invalid for EIP-1559 networks.

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
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Uses default balance
  await POLYMARKET_EVENT_DETAILS_MOCKS(mockServer);
  await POLYMARKET_ORDER_BOOK_MOCKS(mockServer);
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  // Only user-specific data (positions, activity, UpNL) should be mocked
};

/**
 * Mocks transaction sentinel for Polygon transactions
 * Mocks the infura_simulateTransactions method for transaction simulation
 * @param mockServer - The mockttp server instance
 * @param fromAddress - Optional address to use in the response (defaults to USER_WALLET_ADDRESS)
 */
export const POLYMARKET_TRANSACTION_SENTINEL_MOCKS = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forPost('https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/')
    .asPriority(999)
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const transactions = body?.params?.[0]?.transactions || [];
        const firstTx = transactions[0] || {};
        const fromAddress =
          firstTx.from?.toLowerCase() || USER_WALLET_ADDRESS.toLowerCase();

        // Return a mock simulation response similar to the HAR file
        // The response includes gas estimates and state diffs
        return {
          statusCode: 200,
          json: createTransactionSentinelResponse(fromAddress),
        };
      } catch (error) {
        // Return a basic success response if parsing fails
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            result: {
              transactions: [
                {
                  return: '0x',
                  status: '0x1',
                  gasUsed: '0x94670',
                  gasLimit: '0xa49f3',
                  stateDiff: {},
                },
              ],
              blockNumber: '0x4a9637e',
            },
            id: '7',
          },
        };
      }
    });
};

export const MOCK_BATCH_TRANSACTIONS = async (mockServer: Mockttp) => {
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  // Only user-specific data (positions, activity, UpNL) should be mocked
};

/**
 * Post-claim mock for USDC balance update
 * This mock should be triggered after claim button is tapped
 * Returns updated USDC balance reflecting claimed positions
 * Also sets up EIP-7702 and transaction sentinel mocks specifically for claim flow
 */
export const POLYMARKET_POST_CLAIM_MOCKS = async (mockServer: Mockttp) => {
  // Update USDC balance to claim amount using the reusable function
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI);

  // Mock EIP-7702 eth_getCode for user wallet address (claim flow requires this)
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(urlParam?.includes('polygon'));

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          if (body?.method === 'eth_getCode') {
            const address = body?.params?.[0];
            return address?.toLowerCase() === USER_WALLET_ADDRESS.toLowerCase();
          }
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1000) // High priority for claim flow
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 1,
        jsonrpc: '2.0',
        result: EIP7702_CODE_FORMAT(POLYGON_EIP7702_CONTRACT_ADDRESS),
      },
    }));

  // Mock proxy wallet eth_call (0xaffed0e0 selector) for claim flow
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(urlParam?.includes('polygon'));

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          if (body?.method === 'eth_call') {
            const toAddress = body?.params?.[0]?.to;
            const callData = body?.params?.[0]?.data;
            return (
              (toAddress?.toLowerCase() ===
                PROXY_WALLET_ADDRESS.toLowerCase() ||
                toAddress?.toLowerCase() ===
                  '0x254955bE605cf7c4E683E92b157187550bd5e639'.toLowerCase()) &&
              callData === '0xaffed0e0'
            );
          }
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1000) // High priority for claim flow
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 1,
        jsonrpc: '2.0',
        result:
          '0x0000000000000000000000000000000000000000000000000000000000000006',
      },
    }));

  // Mock transaction sentinel for Polygon claim transactions
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);

  // Mock updated UPNL reflecting claimed positions
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = request.url;
      return Boolean(
        url && /^https:\/\/data-api\.polymarket\.com\/upnl/.test(url),
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: [
        {
          user: '0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72',
          cashUpnl: 30.282462133473, // Increased by claimed amount
          percentUpnl: 60.02623256406863,
        },
      ],
    }));
};

/**
 * Mocks for cash-out transaction and balance update
 * This mock should be triggered before tapping the cash-out button
 * - Mocks the CLOB API (polymarket order submission)
 * - Updates global USDC balance to post-cash-out amount (58.66 USDC)
 * - Sets up high-priority mocks for balance refresh calls
 */
export const POLYMARKET_POST_CASH_OUT_MOCKS = async (mockServer: Mockttp) => {
  // Mock CLOB API for cash-out order submission
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes('clob.polymarket.com'));
    })
    .asPriority(1000) // Higher priority to catch all clob requests
    .thenCallback(async () => {
      // Return success for any clob request
      const response = {
        statusCode: 200,
        json: {
          errorMsg: '',
          orderID:
            '0x58531391ac95ce6430875c66d13187bc7813c2dab20c9217ce51b57ce7d215bf',
          takingAmount: '30.50',
          makingAmount: '5.00',
          status: 'matched',
          transactionsHashes: [
            '0x935d74ec29bcbe63d2144430669b250c1fd476ac38cba7c0ecab97774cbc152e',
          ],
          success: true,
        },
      };

      return response;
    });

  // Update the global USDC balance to cash out amount (58.66 USDC)
  // This updates currentUSDCBalance so all base RPC mocks return the updated balance
  await POLYMARKET_USDC_BALANCE_MOCKS(
    mockServer,
    POST_CASH_OUT_USDC_BALANCE_WEI,
  );

  // High-priority mock to catch balance refresh calls after cash-out via /proxy
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(
        urlParam?.includes('polygon') || urlParam?.includes('infura'),
      );

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          return isUSDCBalanceCall;
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1005) // High priority to catch cash-out balance refresh calls
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 50,
        jsonrpc: '2.0',
        result: POST_CASH_OUT_USDC_BALANCE_WEI, // 58.66 USDC
      },
    }));

  // Also mock direct polygon-rpc.com calls for cash-out balance refresh
  await mockServer
    .forPost()
    .matching((request) => request.url.includes('polygon-rpc.com'))
    .asPriority(1007)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      if (
        body?.method === 'eth_call' &&
        body?.params?.[0]?.to?.toLowerCase() ===
          USDC_CONTRACT_ADDRESS.toLowerCase()
      ) {
        // Return cash-out balance for USDC balance calls
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result: POST_CASH_OUT_USDC_BALANCE_WEI, // 58.66 USDC
          }),
        };
      }

      // For other calls, return empty result
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result: '0x',
        }),
      };
    });
};

/**
 * @deprecated Use POLYMARKET_POST_CASH_OUT_MOCKS instead
 * This function is kept for backward compatibility but is now integrated into POLYMARKET_POST_CASH_OUT_MOCKS
 */
export const POLYMARKET_CASH_OUT_BALANCE_LOAD_MOCKS = async (
  _mockServer: Mockttp,
) => {
  // No-op: Functionality moved to POLYMARKET_POST_CASH_OUT_MOCKS
};

/**
 * Dedicated mock for loading USDC balance specifically for withdraw flow
 * This ensures balance refresh for withdraw/deposit flows doesn't interfere with cash-out
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS = async (
  mockServer: Mockttp,
) => {
  // High-priority mock to catch balance refresh calls for withdraw flow
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(
        urlParam?.includes('polygon') || urlParam?.includes('infura'),
      );

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          return isUSDCBalanceCall;
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1006) // High priority for withdraw balance calls (different from cash-out)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 51,
        jsonrpc: '2.0',
        // Return current balance for withdraw flow (not updated balance)
        // Withdraw flow should use the existing balance, not a post-action balance
        result: currentUSDCBalance,
      },
    }));
};

/**
 * Force additional USDC balance calls after navigation
 * This simulates the app refreshing the balance when navigating between screens
 * @param mockServer - The mockttp server instance
 * @deprecated Use POLYMARKET_POST_CASH_OUT_MOCKS instead, which includes balance refresh logic
 */
export const POLYMARKET_FORCE_BALANCE_REFRESH_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Inline the balance refresh logic that was previously in POLYMARKET_CASH_OUT_BALANCE_LOAD_MOCKS
  // This is kept for backward compatibility but should use POLYMARKET_POST_CASH_OUT_MOCKS instead
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(
        urlParam?.includes('polygon') || urlParam?.includes('infura'),
      );

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          return isUSDCBalanceCall;
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1005)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 50,
        jsonrpc: '2.0',
        result: POST_CASH_OUT_USDC_BALANCE_WEI, // 58.66 USDC
      },
    }));

  await mockServer
    .forPost()
    .matching((request) => request.url.includes('polygon-rpc.com'))
    .asPriority(1007)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      if (
        body?.method === 'eth_call' &&
        body?.params?.[0]?.to?.toLowerCase() ===
          USDC_CONTRACT_ADDRESS.toLowerCase()
      ) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result: POST_CASH_OUT_USDC_BALANCE_WEI, // 58.66 USDC
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result: '0x',
        }),
      };
    });
};

/**
 * Post-cash-out mock that removes the cashed out position from positions endpoint
 * and adds a SELL transaction to the activity endpoint
 * This simulates the real-world behavior where after cashing out, the position is no longer in your current positions
 * and a SELL transaction appears in your activity feed
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Override the positions mock to exclude the Spurs vs. Pelicans position
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          /^https:\/\/data-api\.polymarket\.com\/positions\?.*user=0x[a-fA-F0-9]{40}.*$/.test(
            url,
          ) &&
          !url.includes('redeemable=true'),
      );
    })
    .asPriority(1000) // Higher priority to override the original positions mock
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Filter out the Spurs vs. Pelicans position (eventId: '62553')
      const positionsWithoutSpurs =
        POLYMARKET_CURRENT_POSITIONS_RESPONSE.filter(
          (position) => position.eventId !== '62553',
        );

      // Filter positions by eventId if provided
      let filteredPositions = positionsWithoutSpurs;
      if (eventId) {
        filteredPositions = positionsWithoutSpurs.filter(
          (position) => position.eventId === eventId,
        );
      }

      // Update the mock response with the actual user address
      const dynamicResponse = filteredPositions.map((position) => ({
        ...position,
        proxyWallet: userAddress,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });

  // Override the activity mock to include a SELL transaction for Spurs vs. Pelicans
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
    .asPriority(1000) // Higher priority to override the original activity mock
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Create SELL transaction for Spurs vs. Pelicans cash out
      const sellTransaction = {
        proxyWallet: userAddress,
        timestamp: Math.floor(Date.now() / 1000), // Current timestamp
        conditionId:
          '0x12899fadc50f47afa5f8e145380a9c6f0262d75ea12749bbbcb4f8b50f96cf6b',
        type: 'TRADE',
        size: 50, // Total position size
        usdcSize: 30.75, // Current value of the position
        transactionHash:
          '0xa8f915c0b4c3808fb790456dd32869c8ac373f40a1f539e87b395a763de27bc6',
        price: 0.615, // Current price from the position
        asset:
          '110743925263777693447488608878982152642205002490046349037358337248548507433643',
        side: 'SELL',
        outcomeIndex: 0,
        title: 'Spurs vs. Pelicans',
        slug: 'nba-sas-nop-2025-10-24',
        icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
        eventSlug: 'nba-sas-nop-2025-10-24',
        outcome: 'Spurs',
        name: 'cropMaster',
        pseudonym: 'Nonstop-Suitcase',
        bio: '',
        profileImage: '',
        profileImageOptimized: '',
      };

      // Add the SELL transaction at the beginning of the activity array
      const activityWithSell = [
        sellTransaction,
        ...POLYMARKET_ACTIVITY_RESPONSE,
      ];

      // Update the mock response with the actual user address
      const dynamicResponse = activityWithSell.map((activity) => ({
        ...activity,
        proxyWallet: userAddress,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};
