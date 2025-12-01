/**
 * File containing mock functionality for all Polymarket API endpoints
 */

import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../helpers/mockHelpers';
import {
  POLYMARKET_CURRENT_POSITIONS_RESPONSE,
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
  POLYMARKET_NEW_OPEN_POSITION_CELTICS_NETS_RESPONSE,
} from './polymarket-positions-response';
import {
  POLYMARKET_EVENT_DETAILS_BLUE_JAYS_MARINERS_RESPONSE,
  POLYMARKET_EVENT_DETAILS_SPURS_PELICANS_RESPONSE,
  POLYMARKET_EVENT_DETAILS_CELTICS_NETS_RESPONSE,
} from './polymarket-event-details-response';
import { POLYMARKET_UPNL_RESPONSE } from './polymarket-upnl-response';
import {
  POLYMARKET_ACTIVITY_RESPONSE,
  POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE,
  POLYMARKET_OPENED_POSITION_ACTIVITY_RESPONSE,
} from './polymarket-activity-response';
import {
  POLYMARKET_ORDER_BOOK_RESPONSE,
  POLYMARKET_ZOHRAN_ORDER_BOOK_RESPONSE,
  POLYMARKET_CHIEFS_ORDER_BOOK_RESPONSE,
  POLYMARKET_CUOMO_ORDER_BOOK_RESPONSE,
  POLYMARKET_BILLS_ORDER_BOOK_RESPONSE,
  POLYMARKET_SPURS_ORDER_BOOK_RESPONSE,
  POLYMARKET_PELICANS_ORDER_BOOK_RESPONSE,
  POLYMARKET_CELTICS_ORDER_BOOK_RESPONSE,
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
  POST_OPEN_POSITION_USDC_BALANCE_WEI,
  POLYGON_EIP7702_CONTRACT_ADDRESS,
  EIP7702_CODE_FORMAT,
} from './polymarket-constants';
import { createTransactionSentinelResponse } from './polymarket-transaction-sentinel-response';

/**
 * Mock for Polymarket API returning 500 error
 * This simulates the Polymarket API being down
 */

// Global variable to track current USDC balance
let currentUSDCBalance = MOCK_RPC_RESPONSES.USDC_BALANCE_RESULT;

// Global Set to track when Celtics vs Nets orders have been submitted
const celticsOrderSubmitted = new Set<string>();

/**
 * Mock Priority System
 * Higher numbers = checked first (higher priority)
 *
 * 999  - Base mocks (catch-all for all RPC calls, set up once in POLYMARKET_COMPLETE_MOCKS)
 * 1000 - API overrides (position removal, CLOB API)
 * 1005 - Balance refresh mocks for /proxy calls (claim, cash-out, withdraw)
 * 1006 - Balance refresh mocks for withdraw flow (separate to avoid conflicts)
 * 1007 - Balance refresh mocks for direct polygon-rpc.com calls (claim, cash-out)
 */
const PRIORITY = {
  BASE: 999,
  API_OVERRIDE: 1000,
  BALANCE_REFRESH_PROXY: 1005,
  BALANCE_REFRESH_WITHDRAW: 1006,
  BALANCE_REFRESH_DIRECT: 1007,
} as const;

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
      return Boolean(url?.includes('gamma-api.polymarket.com/events/'));
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

      if (eventId === '79682') {
        // Return Celtics vs Nets event details from mock response file
        return {
          statusCode: 200,
          json: POLYMARKET_EVENT_DETAILS_CELTICS_NETS_RESPONSE,
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
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.BASE)
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
 * Winning positions (redeemable=true) should be in resolved markets, not current positions
 */
export const POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS = async (
  mockServer: Mockttp,
  includeWinnings: boolean = false,
) => {
  // Mock for current positions (redeemable=false) - never include winning positions here
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x') &&
          !url.includes('redeemable=true'),
      );
    })
    .asPriority(PRIORITY.BASE)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Check if eventId parameter is present for filtering
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Current positions should never include winning positions
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

  // Mock for resolved markets (redeemable=true) - add winning positions here if includeWinnings is true
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x') &&
          url.includes('redeemable=true'),
      );
    })
    .asPriority(PRIORITY.BASE)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Check if eventId parameter is present for filtering
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Combine lost positions with winning positions if includeWinnings is true
      let resolvedMarkets = POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE;
      let winningPositions = includeWinnings
        ? POLYMARKET_WINNING_POSITIONS_RESPONSE
        : [];

      // Filter by eventId if provided
      if (eventId) {
        resolvedMarkets = resolvedMarkets.filter(
          (position) => position.eventId === eventId,
        );
        winningPositions = winningPositions.filter(
          (position) => position.eventId === eventId,
        );
      }

      const resolvedMarketsWithAddress = resolvedMarkets.map((position) => ({
        ...position,
        proxyWallet: userAddress,
      }));

      const winningPositionsWithAddress = winningPositions.map((position) => ({
        ...position,
        proxyWallet: userAddress,
      }));

      const resolvedPositions = [
        ...resolvedMarketsWithAddress,
        ...winningPositionsWithAddress,
      ];

      return {
        statusCode: 200,
        json: resolvedPositions,
      };
    });
};

/**
 * Mock for Polymarket CLOB prices API
 * Returns BUY (best ask) and SELL (best bid) prices for outcome tokens
 * This is used to display current market prices in the UI
 */
export const POLYMARKET_PRICES_MOCKS = async (mockServer: Mockttp) => {
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      if (!urlParam?.includes('clob.polymarket.com/prices')) {
        return false;
      }

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;
        // Check if it's an array of price queries
        return Array.isArray(body) && body.length > 0;
      } catch {
        return false;
      }
    })
    .asPriority(PRIORITY.BASE)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : [];

      // Extract unique token IDs from the request
      const tokenIds = new Set<string>();
      body.forEach((query: { token_id: string; side: string }) => {
        if (query.token_id) {
          tokenIds.add(query.token_id);
        }
      });

      // Build response with prices for each token
      const pricesResponse: Record<string, { BUY: string; SELL: string }> = {};

      tokenIds.forEach((tokenId) => {
        // Spurs token
        if (
          tokenId ===
          '110743925263777693447488608878982152642205002490046349037358337248548507433643'
        ) {
          // Best ask (BUY) = 0.62, Best bid (SELL) = 0.61
          pricesResponse[tokenId] = {
            BUY: '0.62', // Best ask - what you'd pay to buy
            SELL: '0.61', // Best bid - what you'd receive to sell
          };
        }
        // Pelicans token
        else if (
          tokenId ===
          '38489710206351002266036612280230748165102516187175290608628298208123746725814'
        ) {
          // Best ask (BUY) = 0.38, Best bid (SELL) = 0.37
          pricesResponse[tokenId] = {
            BUY: '0.38', // Best ask - what you'd pay to buy
            SELL: '0.37', // Best bid - what you'd receive to sell
          };
        }
        // Celtics token (Celtics vs Nets market)
        else if (
          tokenId ===
          '51851880223290407825872150827934296608070009371891114025629582819868766043137'
        ) {
          // Best ask (BUY) = 0.84, Best bid (SELL) = 0.83 (from HAR file)
          pricesResponse[tokenId] = {
            BUY: '0.84', // Best ask - what you'd pay to buy
            SELL: '0.83', // Best bid - what you'd receive to sell
          };
        }
        // Nets token (Celtics vs Nets market)
        else if (
          tokenId ===
          '51090123154876409384652748958994213129207000557350215937559106819875795938227'
        ) {
          // Best ask (BUY) = 0.17, Best bid (SELL) = 0.17
          // The app displays the SELL price (entry.sell), so both should be 0.17 to show 17¢
          pricesResponse[tokenId] = {
            BUY: '0.17', // Best ask - what you'd pay to buy
            SELL: '0.17', // Best bid - what you'd receive to sell (this is what's displayed)
          };
        }
        // Default prices for other tokens (can be extended as needed)
        else {
          pricesResponse[tokenId] = {
            BUY: '0.50',
            SELL: '0.50',
          };
        }
      });

      return {
        statusCode: 200,
        json: pricesResponse,
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
          url.includes('clob.polymarket.com/book') &&
          url.includes('token_id='),
      );
    })
    .asPriority(PRIORITY.BASE)
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
      } else if (
        tokenId ===
        '51851880223290407825872150827934296608070009371891114025629582819868766043137'
      ) {
        // Celtics token (Celtics vs Nets)
        orderBookResponse = POLYMARKET_CELTICS_ORDER_BOOK_RESPONSE;
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
    .asPriority(PRIORITY.BASE)
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Check if eventId parameter is present for filtering
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Filter positions by eventId if provided
      let filteredPositions = POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE;
      if (eventId) {
        filteredPositions = POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE.filter(
          (position) => position.eventId === eventId,
        );
      }

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
          url.includes('data-api.polymarket.com/activity') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.BASE)
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
          url.includes('data-api.polymarket.com/upnl') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.BASE)
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
    .asPriority(PRIORITY.BASE)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      // Return appropriate mock response based on the call
      // Can be string (hex) or object (transaction receipt)
      let result: string | object = '0x';

      if (body?.method === 'eth_call') {
        const toAddress = body?.params?.[0]?.to;
        const callData = body?.params?.[0]?.data;

        if (toAddress?.toLowerCase() === SAFE_FACTORY_ADDRESS.toLowerCase()) {
          // Safe Factory call - return proxy wallet address
          result = MOCK_RPC_RESPONSES.SAFE_FACTORY_RESULT;
        } else if (
          toAddress?.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()
        ) {
          // USDC contract call - check function selector
          if (callData?.toLowerCase()?.startsWith('0x70a08231')) {
            // balanceOf(address) selector - return current global balance
            result = currentUSDCBalance;
          } else if (callData?.toLowerCase()?.startsWith('0xdd62ed3e')) {
            // allowance(address,address) selector - return max allowance (uint256 max)
            // This indicates full allowance is granted
            result =
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
          } else {
            // Other USDC contract calls - return current global balance as fallback
            result = currentUSDCBalance;
          }
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
      } else if (body?.method === 'eth_getTransactionReceipt') {
        // Return a mock transaction receipt indicating the transaction is confirmed
        // This is critical for TransactionController to mark transactions as confirmed
        // TransactionController polls for receipts to determine transaction status
        result = MOCK_RPC_RESPONSES.TRANSACTION_RECEIPT_RESULT;
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
        url?.includes('gamma-api.polymarket.com/events/pagination'),
      );
    })
    .asPriority(PRIORITY.BASE)
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
      return Boolean(url?.includes('gamma-api.polymarket.com/public-search'));
    })
    .asPriority(PRIORITY.BASE)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        events: POLYMARKET_TRENDING_FEED.data,
        pagination: POLYMARKET_TRENDING_FEED.pagination,
      },
    }));
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
    .forPost('https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/') //
    .asPriority(PRIORITY.BASE)
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

/**
 * Mock for adding Celtics vs Nets position to positions list after order is submitted
 * This override adds the Celtics vs Nets position only after the open position flow is completed
 *
 * Mocks endpoint: https://data-api.polymarket.com/positions?limit=100&offset=0&user=...&sortBy=CURRENT&redeemable=false&eventId=79682
 * - Always uses PROXY_WALLET_ADDRESS for the proxyWallet field (regardless of user in URL)
 * - When eventId=79682 (Celtics vs Nets), returns only the Celtics position
 * - When no eventId, returns all positions including Celtics (if order was submitted)
 * - Also mocks the position appearing in the main positions list on the predict page
 *
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_ADD_CELTICS_POSITION_MOCKS = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x') &&
          !url.includes('redeemable=true'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the base positions mock
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const eventIdMatch = url?.match(/eventId=([0-9]+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : null;

      // Check if Celtics vs Nets order has been submitted
      const proxyAddressLower = PROXY_WALLET_ADDRESS.toLowerCase();
      const celticsOrderSubmittedForProxy =
        celticsOrderSubmitted.has(proxyAddressLower);

      // If eventId=79682 (Celtics vs Nets), return only the Celtics position
      if (eventId === '79682') {
        if (!celticsOrderSubmittedForProxy) {
          // Return empty array if order hasn't been submitted yet
          return {
            statusCode: 200,
            json: [],
          };
        }

        // Return Celtics vs Nets position with PROXY_WALLET_ADDRESS
        const dynamicResponse =
          POLYMARKET_NEW_OPEN_POSITION_CELTICS_NETS_RESPONSE.map(
            (position) => ({
              ...position,
              proxyWallet: PROXY_WALLET_ADDRESS,
            }),
          );

        return {
          statusCode: 200,
          json: dynamicResponse,
        };
      }

      // For main positions list (no eventId filter), combine existing positions with Celtics position
      // only if Celtics order was submitted. Put Celtics position at the top of the list.
      let allPositions = [...POLYMARKET_CURRENT_POSITIONS_RESPONSE];
      if (celticsOrderSubmittedForProxy) {
        allPositions = [
          ...POLYMARKET_NEW_OPEN_POSITION_CELTICS_NETS_RESPONSE,
          ...POLYMARKET_CURRENT_POSITIONS_RESPONSE,
        ];
      }

      // Filter positions by eventId if provided (for other eventIds)
      let filteredPositions = allPositions;
      if (eventId) {
        filteredPositions = allPositions.filter(
          (position) => position.eventId === eventId,
        );
      }

      // Always use PROXY_WALLET_ADDRESS for proxyWallet field
      const dynamicResponse = filteredPositions.map((position) => ({
        ...position,
        proxyWallet: PROXY_WALLET_ADDRESS,
      }));

      return {
        statusCode: 200,
        json: dynamicResponse,
      };
    });
};

/**
 * Mock for adding Celtics vs Nets activity entry to activity list after order is submitted
 * This override adds the Celtics vs Nets BUY activity only after the open position flow is completed
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_ADD_CELTICS_ACTIVITY_MOCKS = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/activity') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the base activity mock
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Check if Celtics vs Nets order has been submitted
      const proxyAddressLower = PROXY_WALLET_ADDRESS.toLowerCase();
      const celticsOrderSubmittedForProxy =
        celticsOrderSubmitted.has(proxyAddressLower);

      // Combine existing activity with Celtics activity only if Celtics order was submitted
      // Put Celtics activity at the top (most recent first)
      let allActivity = [...POLYMARKET_ACTIVITY_RESPONSE];
      if (celticsOrderSubmittedForProxy) {
        allActivity = [
          ...POLYMARKET_OPENED_POSITION_ACTIVITY_RESPONSE,
          ...POLYMARKET_ACTIVITY_RESPONSE,
        ];
      }

      // Update the mock response with the actual user address
      const dynamicResponse = allActivity.map((activity) => ({
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
 * Sets up mocks for USDC balance refresh calls after claim or cash-out operations
 * This mock should be triggered after claim/cash-out transactions to update the displayed balance
 * - Updates global USDC balance variable (like POLYMARKET_USDC_BALANCE_MOCKS)
 * - Mocks balance refresh calls via /proxy endpoint (Polygon RPC)
 * - Mocks direct polygon-rpc.com calls for USDC balance queries
 * - Mocks eth_getTransactionCount calls (needed for claim flow transaction construction)
 * - Returns the appropriate balance based on positionType ('claim' or 'cash-out')
 * @param mockServer - The Mockttp server instance to configure mocks on
 * @param positionType - The type of operation: 'claim' (returns 48.16 USDC) or 'cash-out' (returns 58.66 USDC)
 */
export const POLYMARKET_UPDATE_USDC_BALANCE_MOCKS = async (
  mockServer: Mockttp,
  positionType: string,
) => {
  // Update global balance based on position type (similar to POLYMARKET_USDC_BALANCE_MOCKS pattern)
  let balance: string;
  if (positionType === 'claim') {
    balance = POST_CLAIM_USDC_BALANCE_WEI; // 48.16 USDC
  } else if (positionType === 'cash-out') {
    balance = POST_CASH_OUT_USDC_BALANCE_WEI; // 58.66 USDC
  } else if (positionType === 'open-position') {
    balance = POST_OPEN_POSITION_USDC_BALANCE_WEI; // 17.76 USDC
  } else {
    throw new Error(`Unknown positionType: ${positionType}`);
  }

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(
        urlParam?.includes('polygon') || urlParam?.includes('infura'),
      );
    })
    .asPriority(PRIORITY.BALANCE_REFRESH_PROXY) // Higher priority (1005) to catch balance refresh calls before base mocks
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      let result: string | object = '0x';

      // Handle USDC balance calls
      if (body?.method === 'eth_call') {
        const toAddress = body?.params?.[0]?.to?.toLowerCase();
        const callData = body?.params?.[0]?.data;
        if (toAddress === USDC_CONTRACT_ADDRESS.toLowerCase()) {
          // USDC contract call - check function selector
          if (callData?.toLowerCase()?.startsWith('0x70a08231')) {
            // balanceOf(address) selector - return updated balance
            result = balance;
          } else if (callData?.toLowerCase()?.startsWith('0xdd62ed3e')) {
            // allowance(address,address) selector - return max allowance (uint256 max)
            result =
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
          } else {
            // Other USDC contract calls - return updated balance as fallback
            result = balance;
          }
        } else {
          // For other eth_call, return empty result (let base mocks handle if needed)
          result = MOCK_RPC_RESPONSES.EMPTY_RESULT;
        }
      } else if (body?.method === 'eth_getTransactionCount') {
        // Return a valid nonce (transaction count) - needed for claim flow
        // This is critical for transaction construction, must be a valid hex number
        result = MOCK_RPC_RESPONSES.TRANSACTION_COUNT_RESULT;
      } else if (body?.method === 'eth_getTransactionReceipt') {
        // Return a mock transaction receipt indicating the transaction is confirmed
        // This is CRITICAL for TransactionController to mark transactions as confirmed
        // TransactionController polls for receipts to determine transaction status
        // Without this, transactions will remain in "pending" status
        result = MOCK_RPC_RESPONSES.TRANSACTION_RECEIPT_RESULT;
      }
      // For other methods, return empty result (base mocks will handle them)

      return {
        statusCode: 200,
        json: {
          id: body?.id ?? 50,
          jsonrpc: '2.0',
          result,
        },
      };
    });
};

/**
 * Mocks for cash-out transaction and balance update
 * This mock should be triggered before tapping the cash-out button
 * - Mocks the MetaMask relayer endpoint (predict.dev-api.cx.metamask.io/order)
 * - Mocks the CLOB API (polymarket order submission) as fallback
 * - Updates global USDC balance to post-cash-out amount (58.66 USDC)
 */
export const POLYMARKET_POST_CASH_OUT_MOCKS = async (mockServer: Mockttp) => {
  // Mock MetaMask relayer endpoint for order submission (cash-out uses SELL orders)
  // In e2e, all requests go through /proxy with the actual URL in the url query parameter
  // Matches request payload structure with PROXY_WALLET_ADDRESS as maker and USER_WALLET_ADDRESS as signer
  // Response uses decimal string format (not wei)
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      try {
        const urlParam = new URL(request.url).searchParams.get('url');
        if (
          !urlParam ||
          !urlParam.includes('predict.') ||
          !urlParam.includes('api.cx.metamask.io/order')
        ) {
          return false;
        }

        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const order = body?.order;

        // Verify the request matches cash-out order structure
        // Only check consistent fields - allow variable values for dynamic fields (salt, tokenId, amounts, signature, owner)
        return (
          order &&
          body.orderType === 'FOK' &&
          order.maker?.toLowerCase() === PROXY_WALLET_ADDRESS.toLowerCase() &&
          order.signer?.toLowerCase() === USER_WALLET_ADDRESS.toLowerCase() &&
          order.taker === '0x0000000000000000000000000000000000000000' &&
          order.expiration === '0' &&
          order.nonce === '0' &&
          order.feeRateBps === '0' &&
          order.side === 'SELL' &&
          order.signatureType === 2 &&
          typeof order.salt === 'number' &&
          typeof order.tokenId === 'string' &&
          order.tokenId.length > 0 &&
          typeof order.makerAmount === 'string' &&
          order.makerAmount.length > 0 &&
          typeof order.takerAmount === 'string' &&
          order.takerAmount.length > 0 &&
          typeof order.signature === 'string' &&
          order.signature.startsWith('0x') &&
          order.signature.length > 10
        );
      } catch {
        return false;
      }
    })
    .asPriority(PRIORITY.API_OVERRIDE)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        success: true,
        orderID:
          '0xa16ab020abcd8e48100463d7bcbe75e3a3e659dcee1c42e09ef2ef8cecb0ce2c',
        transactionsHashes: [
          '0x24ca9d1399d72efc9c5f83b0f37c88fb7d42e61095cf657f9dcfa857249adf6f',
        ],
        takingAmount: '30.50',
        makingAmount: '5.00',
      },
    }));

  // Mock CLOB API for cash-out order submission (fallback for direct CLOB calls)
  // Response uses decimal string format (not wei)
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes('clob.polymarket.com'));
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to catch all clob requests
    .thenCallback(async () => {
      // Return success for any clob request
      const response = {
        statusCode: 200,
        json: {
          success: true,
          orderID:
            '0xa16ab020abcd8e48100463d7bcbe75e3a3e659dcee1c42e09ef2ef8cecb0ce2c',
          transactionsHashes: [
            '0x24ca9d1399d72efc9c5f83b0f37c88fb7d42e61095cf657f9dcfa857249adf6f',
          ],
          takingAmount: '30.50',
          makingAmount: '5.00',
        },
      };

      return response;
    });

  await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'cash-out');
};

/**
 * Mocks for opening a position (BUY order) and balance update
 * This mock should be triggered before placing the order
 * - Mocks the MetaMask relayer endpoint (predict.dev-api.cx.metamask.io/order)
 * - Updates global USDC balance to post-open-position amount (18.11 USDC)
 * - Adds position and activity only AFTER the order is successfully submitted
 * Note: Celtics vs Nets is available in the sports feed, so no search mock is needed
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_POST_OPEN_POSITION_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Track whether the order has been successfully submitted
  // This ensures the position only appears AFTER the order is placed
  const orderSubmitted = new Set<string>();

  // Mock MetaMask relayer endpoint for order submission (BUY orders)
  // In e2e, all requests go through /proxy with the actual URL in the url query parameter
  // Matches request payload structure with PROXY_WALLET_ADDRESS as maker and USER_WALLET_ADDRESS as signer
  // Response uses decimal string format (not wei)
  // Uses flexible matching: requires BUY order to relayer endpoint, with optional strict field validation
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      try {
        const urlParam = new URL(request.url).searchParams.get('url');
        if (
          !urlParam ||
          !urlParam.includes('predict.') ||
          !urlParam.includes('api.cx.metamask.io/order')
        ) {
          return false;
        }

        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const order = body?.order;

        // Flexible matching: require BUY order to relayer endpoint
        // Validates key fields when present, but doesn't require all fields to match strict pattern
        // This handles both well-formed orders and edge cases with missing/optional fields
        if (!order || order.side !== 'BUY') {
          return false;
        }

        // Validate orderType if present (should be FOK for open positions)
        if (body.orderType !== undefined && body.orderType !== 'FOK') {
          return false;
        }

        // Validate addresses if present (should match expected addresses for open positions)
        if (order.maker !== undefined && order.signer !== undefined) {
          const makerMatch =
            order.maker?.toLowerCase() === PROXY_WALLET_ADDRESS.toLowerCase();
          const signerMatch =
            order.signer?.toLowerCase() === USER_WALLET_ADDRESS.toLowerCase();
          if (!makerMatch || !signerMatch) {
            return false;
          }
        }

        // If order has signature field, validate it's a valid signature format
        if (order.signature !== undefined) {
          if (
            typeof order.signature !== 'string' ||
            !order.signature.startsWith('0x') ||
            order.signature.length < 10
          ) {
            return false;
          }
        }

        return true;
      } catch {
        return false;
      }
    })
    .asPriority(PRIORITY.API_OVERRIDE)
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const order = body?.order;
        const userAddress =
          order?.signer?.toLowerCase() || USER_WALLET_ADDRESS.toLowerCase();
        const proxyAddress =
          order?.maker?.toLowerCase() || PROXY_WALLET_ADDRESS.toLowerCase();

        // Check if it's a Celtics vs Nets token
        const isCelticsToken =
          order?.tokenId ===
          '51851880223290407825872150827934296608070009371891114025629582819868766043137';

        // Track both addresses - positions/activity may use either
        orderSubmitted.add(userAddress);
        orderSubmitted.add(proxyAddress);

        // Track Celtics orders separately for position addition
        if (isCelticsToken) {
          celticsOrderSubmitted.add(userAddress);
          celticsOrderSubmitted.add(proxyAddress);
        }

        return {
          statusCode: 200,
          json: {
            success: true,
            errorMsg: '',
            status: 'matched',
            orderID:
              '0x3bd7640f8ec62a31ab9f95f0b94582d3a7fb159dbaed773eb5fcca45c43bcdb9',
            transactionsHashes: [
              '0x6a14089acbb670682a700ba57e10c9b1f46d188ae8eebd75cd9c62ec9ad06f8d',
            ],
            takingAmount: '11.904758', // Shares received for $10 investment
            makingAmount: '9.999996',
          },
        };
      } catch {
        // Fallback response if parsing fails - still track the addresses
        const userAddress = USER_WALLET_ADDRESS.toLowerCase();
        const proxyAddress = PROXY_WALLET_ADDRESS.toLowerCase();
        orderSubmitted.add(userAddress);
        orderSubmitted.add(proxyAddress);
        // Note: Can't check tokenId in catch block, so don't add to celticsOrderSubmitted

        return {
          statusCode: 200,
          json: {
            success: true,
            errorMsg: '',
            status: 'matched',
            orderID:
              '0x3bd7640f8ec62a31ab9f95f0b94582d3a7fb159dbaed773eb5fcca45c43bcdb9',
            transactionsHashes: [
              '0x6a14089acbb670682a700ba57e10c9b1f46d188ae8eebd75cd9c62ec9ad06f8d',
            ],
            takingAmount: '11.904758',
            makingAmount: '9.999996',
          },
        };
      }
    });

  // Mock CLOB API order endpoint (called after relayer endpoint)
  // This handles both POST /order and POST /book?token_id=... endpoints
  // Higher priority to ensure it catches order requests before the broad cash-out CLOB mock
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(
        urlParam &&
          (urlParam.includes('clob.polymarket.com/order') ||
            (urlParam.includes('clob.polymarket.com/book') &&
              urlParam.includes('token_id='))),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE + 2) // Higher priority than cash-out CLOB mock
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const order = body?.order;

        // Check if it's a BUY order (for opening positions)
        const isBuyOrder = order?.side === 'BUY';
        const isCelticsToken =
          order?.tokenId ===
          '51851880223290407825872150827934296608070009371891114025629582819868766043137';

        if (isBuyOrder) {
          const userAddress =
            order?.signer?.toLowerCase() || USER_WALLET_ADDRESS.toLowerCase();
          const proxyAddress =
            order?.maker?.toLowerCase() || PROXY_WALLET_ADDRESS.toLowerCase();

          // Only track Celtics vs Nets orders for positions/activity
          if (isCelticsToken) {
            orderSubmitted.add(userAddress);
            orderSubmitted.add(proxyAddress);
            celticsOrderSubmitted.add(userAddress);
            celticsOrderSubmitted.add(proxyAddress);
          }

          // Return success for any BUY order
          // Use the amounts from the order if available, otherwise use defaults
          const makingAmount = order?.makerAmount
            ? (parseInt(order.makerAmount, 10) / 1000000).toString()
            : '9.999996';
          const takingAmount = order?.takerAmount
            ? (parseInt(order.takerAmount, 10) / 1000000).toString()
            : '11.904758';

          return {
            statusCode: 200,
            json: {
              errorMsg: '',
              orderID:
                '0x3bd7640f8ec62a31ab9f95f0b94582d3a7fb159dbaed773eb5fcca45c43bcdb9',
              takingAmount, // Shares received
              makingAmount, // Amount spent
              status: 'matched',
              transactionsHashes: [
                '0x6a14089acbb670682a700ba57e10c9b1f46d188ae8eebd75cd9c62ec9ad06f8d',
              ],
              success: true,
            },
          };
        }

        // For non-BUY orders, let other mocks handle them
        return {
          statusCode: 200,
          json: {
            success: false,
            errorMsg: 'Order not matched',
          },
        };
      } catch {
        return {
          statusCode: 200,
          json: {
            success: false,
            errorMsg: 'Invalid request',
          },
        };
      }
    });
  await POLYMARKET_ADD_CELTICS_POSITION_MOCKS(mockServer);
  await POLYMARKET_ADD_CELTICS_ACTIVITY_MOCKS(mockServer);

  // Update balance after opening position
  // await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'open-position');
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
    .asPriority(PRIORITY.BALANCE_REFRESH_WITHDRAW) // High priority for withdraw balance calls (different from cash-out)
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
 * Removes claimed positions from redeemable positions (resolved markets)
 * After claiming, redeemable positions should be removed so the UI updates correctly
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Override redeemable positions (resolved markets) to remove winning positions after claiming
  // This removes all resolved market positions (including winning positions) so the UI updates correctly
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x') &&
          url.includes('redeemable=true'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the original redeemable positions mock
    .thenCallback(() => ({
      // Return empty array - all resolved market positions (including winning positions) are removed after claiming
      statusCode: 200,
      json: [],
    }));
};

/**
 * Post-claim mock that adds REDEEM transactions to the activity endpoint
 * After claiming, REDEEM type transactions should appear in the activity feed
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Override the activity mock to include REDEEM transactions for claimed positions
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url &&
          url.includes('data-api.polymarket.com/activity') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the original activity mock
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url');
      const userMatch = url?.match(/user=(0x[a-fA-F0-9]{40})/);
      const userAddress = userMatch ? userMatch[1] : USER_WALLET_ADDRESS;

      // Map claimed positions to use the actual user address
      const claimedPositionsWithUserAddress =
        POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE.map((activity) => ({
          ...activity,
          proxyWallet: userAddress,
        }));

      // Map existing activity to use the actual user address
      const existingActivityWithUserAddress = POLYMARKET_ACTIVITY_RESPONSE.map(
        (activity) => ({
          ...activity,
          proxyWallet: userAddress,
        }),
      );

      // Add the REDEEM transactions at the beginning of the activity array (most recent first)
      const activityWithClaims = [
        ...claimedPositionsWithUserAddress,
        ...existingActivityWithUserAddress,
      ];

      return {
        statusCode: 200,
        json: activityWithClaims,
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
          url.includes('data-api.polymarket.com/positions') &&
          url.includes('user=0x') &&
          !url.includes('redeemable=true'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the original positions mock
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
          url.includes('data-api.polymarket.com/activity') &&
          url.includes('user=0x'),
      );
    })
    .asPriority(PRIORITY.API_OVERRIDE) // Higher priority to override the original activity mock
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

/**
 * Mock for both Polymarket positions endpoints (current and resolved positions)
 * Returns both types of positions data for user 0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72
 */
export const POLYMARKET_ALL_POSITIONS_MOCKS = async (mockServer: Mockttp) => {
  await POLYMARKET_CURRENT_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_RESOLVED_MARKETS_POSITIONS_MOCKS(mockServer);
};

/**
 * This can be considered the default user profile
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
  await POLYMARKET_PRICES_MOCKS(mockServer); // Mock for CLOB prices API
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
};
