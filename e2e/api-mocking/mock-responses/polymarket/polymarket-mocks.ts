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
} from './polymarket-constants';

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
        // Return Spurs vs Pelicans event details (real API response)
        return {
          statusCode: 200,
          json: {
            id: '62553',
            ticker: 'nba-sas-nop-2025-10-24',
            slug: 'nba-sas-nop-2025-10-24',
            title: 'Spurs vs. Pelicans',
            description:
              'In the upcoming NBA game, scheduled for October 24 at 8:00PM ET:\nIf the Spurs win, the market will resolve to "Spurs".\nIf the Pelicans win, the market will resolve to "Pelicans".\nIf the game is postponed, this market will remain open until the game has been completed.\nIf the game is canceled entirely, with no make-up game, this market will resolve 50-50.\nThe result will be determined based on the final score including any overtime periods.',
            resolutionSource: 'https://www.nba.com/',
            startDate: '2025-10-20T19:48:16.12238Z',
            creationDate: '2025-10-25T00:00:00Z',
            endDate: '2025-10-25T00:00:00Z',
            image:
              'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
            icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
            active: true,
            closed: false,
            archived: false,
            new: false,
            featured: false,
            restricted: true,
            liquidity: 286736.0313,
            volume: 810829.632579,
            openInterest: 0,
            createdAt: '2025-10-20T19:44:18.517198Z',
            updatedAt: '2025-10-24T20:16:37.479733Z',
            competitive: 0.9999750006249843,
            volume24hr: 601663.0284430003,
            volume1wk: 619816.1113160002,
            volume1mo: 619816.1113160002,
            volume1yr: 619816.1113160002,
            enableOrderBook: true,
            liquidityClob: 286736.0313,
            negRisk: false,
            commentCount: 133,
            markets: [
              {
                id: '641723',
                question: 'Spurs vs. Pelicans',
                conditionId:
                  '0x12899fadc50f47afa5f8e145380a9c6f0262d75ea12749bbbcb4f8b50f96cf6b',
                slug: 'nba-sas-nop-2025-10-24',
                resolutionSource: 'https://www.nba.com/',
                endDate: '2025-10-25T00:00:00Z',
                liquidity: '180671.5616',
                startDate: '2025-10-20T19:45:23.832649Z',
                image:
                  'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
                icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
                description:
                  'In the upcoming NBA game, scheduled for October 24 at 8:00PM ET:\nIf the Spurs win, the market will resolve to "Spurs".\nIf the Pelicans win, the market will resolve to "Pelicans".\nIf the game is postponed, this market will remain open until the game has been completed.\nIf the game is canceled entirely, with no make-up game, this market will resolve 50-50.\nThe result will be determined based on the final score including any overtime periods.',
                outcomes: '["Spurs", "Pelicans"]',
                outcomePrices: '["0.615", "0.385"]',
                volume: '524574.695034',
                active: true,
                closed: false,
                marketMakerAddress: '',
                createdAt: '2025-10-20T19:44:19.000671Z',
                updatedAt: '2025-10-24T20:23:49.423914Z',
                new: false,
                featured: false,
                submitted_by: '0x91430CaD2d3975766499717fA0D66A78D814E5c5',
                archived: false,
                resolvedBy: '0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7',
                restricted: true,
                groupItemThreshold: '0',
                questionID:
                  '0xa42fab8d0df30928181953f2f77de88bbb0b1244a9bb2781d86f22d91553bc4a',
                enableOrderBook: true,
                orderPriceMinTickSize: 0.01,
                orderMinSize: 5,
                volumeNum: 524574.695034,
                liquidityNum: 180671.5616,
                endDateIso: '2025-10-25',
                startDateIso: '2025-10-20',
                hasReviewedDates: true,
                volume24hr: 316414.12729000027,
                volume1wk: 334567.2101630003,
                volume1mo: 334567.2101630003,
                volume1yr: 334567.2101630003,
                gameStartTime: '2025-10-25 00:00:00+00',
                secondsDelay: 3,
                clobTokenIds:
                  '["110743925263777693447488608878982152642205002490046349037358337248548507433643", "38489710206351002266036612280230748165102516187175290608628298208123746725814"]',
                umaBond: '500',
                umaReward: '2',
                volume24hrClob: 316414.12729000027,
                volume1wkClob: 334567.2101630003,
                volume1moClob: 334567.2101630003,
                volume1yrClob: 334567.2101630003,
                volumeClob: 524574.695034,
                liquidityClob: 180671.5616,
                customLiveness: 0,
                acceptingOrders: true,
                negRisk: false,
                negRiskRequestID: '',
                ready: false,
                funded: false,
                acceptingOrdersTimestamp: '2025-10-20T19:45:03Z',
                cyom: false,
                competitive: 0.9869476177551876,
                pagerDutyNotificationEnabled: false,
                approved: true,
                rewardsMinSize: 0,
                rewardsMaxSpread: 0,
                spread: 0.01,
                oneDayPriceChange: 0.04,
                lastTradePrice: 0.62,
                bestBid: 0.61,
                bestAsk: 0.62,
                automaticallyActive: true,
                clearBookOnStart: true,
                manualActivation: false,
                negRiskOther: false,
                sportsMarketType: 'moneyline',
                umaResolutionStatuses: '[]',
                pendingDeployment: false,
                deploying: false,
                deployingTimestamp: '2025-10-20T19:44:33.4803Z',
                rfqEnabled: false,
                holdingRewardsEnabled: false,
                feesEnabled: false,
              },
            ],
            outcomes: [
              {
                id: 'Spurs',
                title: 'Spurs',
                price: 0.615,
                tokens: [
                  {
                    id: '110743925263777693447488608878982152642205002490046349037358337248548507433643',
                    price: 0.615,
                  },
                ],
              },
              {
                id: 'Pelicans',
                title: 'Pelicans',
                price: 0.385,
                tokens: [
                  {
                    id: '38489710206351002266036612280230748165102516187175290608628298208123746725814',
                    price: 0.385,
                  },
                ],
              },
            ],
            series: [
              {
                id: '10345',
                ticker: 'nba-2026',
                slug: 'nba-2026',
                title: 'NBA 2026',
                seriesType: 'single',
                recurrence: 'daily',
                image:
                  'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
                icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/super+cool+basketball+in+red+and+blue+wow.png',
                active: true,
                closed: false,
                archived: false,
                featured: false,
                restricted: true,
                createdAt: '2025-10-02T17:23:18.780864Z',
                updatedAt: '2025-10-24T20:16:46.054922Z',
                volume: 7028670.008665,
                liquidity: 4244286.0135,
                commentCount: 297,
              },
            ],
            tags: [
              {
                id: '1',
                label: 'Sports',
                slug: 'sports',
                forceShow: false,
                publishedAt: '2023-10-24 22:37:50.296+00',
                updatedBy: 15,
                createdAt: '2023-10-24T22:37:50.31Z',
                updatedAt: '2024-07-05T21:07:21.800664Z',
                forceHide: true,
              },
              {
                id: '745',
                label: 'NBA',
                slug: 'nba',
                forceShow: false,
                publishedAt: '2023-12-18 18:24:38.08+00',
                createdAt: '2023-12-18T18:24:38.098Z',
                updatedAt: '2024-06-18T14:52:57.582861Z',
              },
              {
                id: '100639',
                label: 'Games',
                slug: 'games',
                forceShow: false,
                createdAt: '2024-09-23T22:41:37.670714Z',
              },
              {
                id: '28',
                label: 'Basketball',
                slug: 'basketball',
                forceShow: false,
                publishedAt: '2023-11-02 21:04:25.152+00',
                createdAt: '2023-11-02T21:04:25.158Z',
                updatedAt: '2024-07-26T21:06:45.637044Z',
              },
            ],
            cyom: false,
            showAllOutcomes: true,
            showMarketImages: false,
            enableNegRisk: false,
            automaticallyActive: true,
            eventDate: '2025-10-24',
            startTime: '2025-10-25T00:00:00Z',
            eventWeek: 3,
            seriesSlug: 'nba-2026',
            negRiskAugmented: false,
            pendingDeployment: false,
            deploying: false,
            gameId: 20022560,
            homeTeamName: 'Pelicans',
            awayTeamName: 'Spurs',
          },
        };
      }

      // Default to Blue Jays vs Mariners for other event IDs
      return {
        statusCode: 200,
        json: POLYMARKET_EVENT_DETAILS_RESPONSE,
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
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          if (isUSDCBalanceCall) {
            // USDC balance call intercepted
          }
          return isUSDCBalanceCall;
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
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Uses default balance
  await POLYMARKET_EVENT_DETAILS_MOCKS(mockServer);
  await POLYMARKET_ORDER_BOOK_MOCKS(mockServer);
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  // Only user-specific data (positions, activity, UpNL) should be mocked
};

/**
 * Post-claim mock for USDC balance update
 * This mock should be triggered after claim button is tapped
 * Returns updated USDC balance reflecting claimed positions
 */
export const POLYMARKET_POST_CLAIM_MOCKS = async (mockServer: Mockttp) => {
  // Update USDC balance to claim amount using the reusable function
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI);

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
 * Post-cash-out mock for USDC balance update
 * This mock should be triggered after cash out button is tapped
 * Returns updated USDC balance reflecting cashed out positions
 */
export const POLYMARKET_POST_CASH_OUT_MOCKS = async (mockServer: Mockttp) => {
  // Add a general mock for any clob.polymarket.com POST request for debugging
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes('clob.polymarket.com'));
    })
    .asPriority(1000) // Higher priority to catch all clob requests
    .thenCallback(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

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

      // If this is an order submission (not just auth), trigger additional balance calls
      if (urlParam?.includes('clob.polymarket.com/order') && body?.order) {
        // Simulate the app making additional balance calls after cash out
        // This mimics real app behavior where balance is refreshed after transactions
        setTimeout(async () => {
          // The global balance variable is already updated, so any new eth_call requests will return 58.66 USDC
        }, 1000);
      }

      return response;
    });

  // Update the global USDC balance to cash out amount
  await POLYMARKET_USDC_BALANCE_MOCKS(
    mockServer,
    POST_CASH_OUT_USDC_BALANCE_WEI,
  );

  // Add comprehensive mock for polygon-rpc.com to catch any unmocked requests
  await mockServer
    .forPost()
    .matching((request) => request.url.includes('polygon-rpc.com'))
    .asPriority(1007)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      // Return appropriate mock response based on the call
      let result = '0x';

      if (body?.method === 'eth_call') {
        const toAddress = body?.params?.[0]?.to;

        if (toAddress?.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()) {
          // USDC contract call - return current global balance
          result = currentUSDCBalance;
        } else if (
          toAddress?.toLowerCase() === SAFE_FACTORY_ADDRESS.toLowerCase()
        ) {
          // Safe Factory call - return proxy wallet address
          result = MOCK_RPC_RESPONSES.SAFE_FACTORY_RESULT;
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

  // Add a high-priority mock to catch any additional USDC balance calls after cash out
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(urlParam?.includes('polygon'));

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          if (isUSDCBalanceCall) {
            // Additional USDC balance call after cash out
          }

          return isUSDCBalanceCall;
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1005) // Highest priority to ensure this catches any additional balance calls
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 50,
        jsonrpc: '2.0',
        result: POST_CASH_OUT_USDC_BALANCE_WEI,
      },
    }));
};

/**
 * Force additional USDC balance calls after navigation
 * This simulates the app refreshing the balance when navigating between screens
 * @param mockServer - The mockttp server instance
 */
export const POLYMARKET_FORCE_BALANCE_REFRESH_MOCKS = async (
  mockServer: Mockttp,
) => {
  // Add comprehensive mock for polygon-rpc.com to catch any unmocked requests
  await mockServer
    .forPost()
    .matching((request) => request.url.includes('polygon-rpc.com'))
    .asPriority(1008)
    .thenCallback(async (request) => {
      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : undefined;

      // Return appropriate mock response based on the call
      let result = '0x';

      if (body?.method === 'eth_call') {
        const toAddress = body?.params?.[0]?.to;

        if (toAddress?.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()) {
          // USDC contract call - return cash out balance
          result = POST_CASH_OUT_USDC_BALANCE_WEI;
        } else if (
          toAddress?.toLowerCase() === SAFE_FACTORY_ADDRESS.toLowerCase()
        ) {
          // Safe Factory call - return proxy wallet address
          result = MOCK_RPC_RESPONSES.SAFE_FACTORY_RESULT;
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

  // Add a high-priority mock to catch any additional USDC balance calls after navigation
  // The app automatically calls loadBalance({ isRefresh: true }) after successful cash out
  await mockServer
    .forPost('/proxy')
    .matching(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const isPolygonRPC = Boolean(urlParam?.includes('polygon'));

      if (isPolygonRPC) {
        try {
          const bodyText = await request.body.getText();
          const body = bodyText ? JSON.parse(bodyText) : undefined;
          const isUSDCBalanceCall =
            body?.method === 'eth_call' &&
            body?.params?.[0]?.to?.toLowerCase() ===
              USDC_CONTRACT_ADDRESS.toLowerCase();

          if (isUSDCBalanceCall) {
            // Force refresh USDC balance call intercepted
          }

          return isUSDCBalanceCall;
        } catch (error) {
          return false;
        }
      }
      return false;
    })
    .asPriority(1006) // High priority to ensure this catches balance refresh calls
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        id: 51,
        jsonrpc: '2.0',
        result: POST_CASH_OUT_USDC_BALANCE_WEI,
      },
    }));
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
