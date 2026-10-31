import {
  CHAIN_IDS,
  TransactionType,
  type GasFeeToken,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Interface, parseUnits } from 'ethers/lib/utils';
import { analytics } from '../../../../../util/analytics/analytics';
import { UserProfileProperty } from '../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_HIDDEN_MARKETS_FLAG,
  DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  DEFAULT_WIMBLEDON_TAB_FLAG,
} from '../../constants/flags';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import type { OrderPreview } from '../types';
import {
  PredictPositionStatus,
  PredictPriceHistoryInterval,
  Side,
  type PredictActivity,
  type PredictPosition,
} from '../../types';
import type { PredictFeatureFlags } from '../../types/flags';
import {
  ACCOUNT_STATE_CACHE_TTL_MS,
  ACCOUNT_STATE_NOT_DEPLOYED_CACHE_TTL_MS,
  PolymarketProvider,
} from './PolymarketProvider';
import { OrderType, SignatureType } from './types';
import {
  executeDepositWalletBatch,
  getDepositWalletRelayerTransactionId,
  requestDepositWalletCreate,
  resolveDepositWalletAddress,
  syncDepositWalletCollateralBalanceAllowance,
  syncDepositWalletPositionBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletDeployed,
  waitForDepositWalletTransaction,
} from './depositWallet';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYMARKET_PROVIDER_ID,
  USDC_E_ADDRESS,
} from './constants';
import { OperationType } from './safe/types';
import {
  computeProxyAddress,
  createPermit2FeeAuthorization,
  getDeployProxyWalletTransaction,
  getSafeTransferAmount,
  getSafeTransferAmountRaw,
} from './safe/utils';
import {
  createApiKey,
  encodeErc20Transfer,
  fetchCarouselFromPolymarketApi,
  fetchChildEventsFromGammaApi,
  fetchEventsFromPolymarketApi,
  fetchMarketsFromPolymarketApi,
  fetchRelatedTagsFromPolymarketApi,
  getBalance,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderBook,
  getRawBalance,
  parsePolymarketActivity,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewMaxBuyOrder,
  previewOrder,
  searchEventsFromPolymarketApi,
} from './utils';
import { submitProtocolClobOrder } from './protocol/transport';
import {
  PolymarketRequestCancelledError,
  PolymarketRequestTimeoutError,
} from './fetchWithTimeout';
import {
  buildClaimTransaction,
  planDepositWalletClaim,
} from './preflight/claim';
import { buildDepositMaintenanceTransaction } from './preflight/deposit';
import type { SignedSafeExecution } from './preflight/core';
import { planDepositWalletPreflight } from './preflight/depositWallet';
import { buildLegacySafeMigrationSweepTransaction } from './preflight/legacySafeMigration';
import { buildTradeAllowancesTx } from './preflight/trade';
import {
  buildUnsignedWithdrawTransaction,
  buildWithdrawTransaction,
} from './preflight/withdraw';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: { identify: jest.fn(), trackEvent: jest.fn() },
}));

jest.mock('../../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
  isSmartContractAddress: jest.fn(),
}));

jest.mock('./safe/utils', () => ({
  computeProxyAddress: jest.fn(),
  createPermit2FeeAuthorization: jest.fn(),
  getDeployProxyWalletTransaction: jest.fn(),
  getSafeTransferAmount: jest.fn(),
  getSafeTransferAmountRaw: jest.fn(),
}));

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    createApiKey: jest.fn(),
    encodeErc20Transfer: jest.fn(),
    fetchCarouselFromPolymarketApi: jest.fn(),
    fetchChildEventsFromGammaApi: jest.fn(),
    fetchEventsFromPolymarketApi: jest.fn(),
    fetchMarketsFromPolymarketApi: jest.fn(),
    fetchRelatedTagsFromPolymarketApi: jest.fn(),
    searchEventsFromPolymarketApi: jest.fn(),
    getBalance: jest.fn(),
    getL2Headers: jest.fn(),
    getOrderBook: jest.fn(),
    getRawBalance: jest.fn(),
    getMarketDetailsFromGammaApi: jest.fn(),
    getPolymarketEndpoints: jest.fn(() => ({
      DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
      GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
      CLOB_ENDPOINT: 'https://clob.polymarket.com',
      CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
      GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
      CRYPTO_PRICE_ENDPOINT: 'https://polymarket.com/api/crypto/crypto-price',
      CRYPTO_PRICE_HISTORY_ENDPOINT:
        'https://polymarket.com/api/crypto/price-history',
    })),
    parsePolymarketActivity: jest.fn(),
    parsePolymarketEvents: jest.fn(),
    parsePolymarketPositions: jest.fn(),
    previewMaxBuyOrder: jest.fn(),
    previewOrder: jest.fn(),
  };
});

const mockWebSocketManagerInstance = {
  subscribeToGame: jest.fn(),
  subscribeToMarketPrices: jest.fn(),
  subscribeToOrderbook: jest.fn(),
  subscribeToCryptoPrices: jest.fn(),
  useCryptoFeed: jest.fn(),
  seedOrderbookSnapshot: jest.fn(),
  getConnectionStatus: jest.fn(() => ({
    sportsConnected: false,
    marketConnected: false,
    rtdsConnected: false,
    gameSubscriptionCount: 0,
    priceSubscriptionCount: 0,
    cryptoPriceSubscriptionCount: 0,
    orderbookSubscriptionCount: 0,
  })),
};

jest.mock('./WebSocketManager', () => ({
  WebSocketManager: {
    getInstance: jest.fn(() => mockWebSocketManagerInstance),
  },
}));

jest.mock('./protocol/transport', () => ({
  submitProtocolClobOrder: jest.fn(),
}));

jest.mock('./depositWallet', () => ({
  executeDepositWalletBatch: jest.fn(),
  getDepositWalletRelayerTransactionId: jest.fn(),
  requestDepositWalletCreate: jest.fn(),
  resolveDepositWalletAddress: jest.fn(),
  syncDepositWalletCollateralBalanceAllowance: jest.fn(),
  syncDepositWalletPositionBalanceAllowance: jest.fn(),
  toDepositWalletCalls: jest.fn(),
  waitForDepositWalletDeployed: jest.fn(),
  waitForDepositWalletTransaction: jest.fn(),
}));

jest.mock('./preflight/claim', () => ({
  buildClaimTransaction: jest.fn(),
  planDepositWalletClaim: jest.fn(),
}));

jest.mock('./preflight/deposit', () => ({
  buildDepositMaintenanceTransaction: jest.fn(),
}));

jest.mock('./preflight/depositWallet', () => ({
  planDepositWalletPreflight: jest.fn(),
}));

jest.mock('./preflight/legacySafeMigration', () => ({
  buildLegacySafeMigrationSweepTransaction: jest.fn(),
}));

jest.mock('./preflight/trade', () => ({
  buildTradeAllowancesTx: jest.fn(),
}));

jest.mock('./preflight/withdraw', () => ({
  buildUnsignedWithdrawTransaction: jest.fn(),
  buildWithdrawTransaction: jest.fn(),
}));

const mockAnalyticsIdentify = jest.mocked(analytics.identify);
const mockAnalyticsTrackEvent = jest.mocked(analytics.trackEvent);
const mockComputeProxyAddress = jest.mocked(computeProxyAddress);
const mockCreateApiKey = jest.mocked(createApiKey);
const mockExecuteDepositWalletBatch = jest.mocked(executeDepositWalletBatch);
const mockGetDepositWalletRelayerTransactionId = jest.mocked(
  getDepositWalletRelayerTransactionId,
);
const mockCreatePermit2FeeAuthorization = jest.mocked(
  createPermit2FeeAuthorization,
);
const mockEncodeErc20Transfer = jest.mocked(encodeErc20Transfer);
const mockGenerateTransferData = jest.mocked(generateTransferData);
const mockFetchEventsFromPolymarketApi = jest.mocked(
  fetchEventsFromPolymarketApi,
);
const mockFetchCarouselFromPolymarketApi = jest.mocked(
  fetchCarouselFromPolymarketApi,
);
const mockFetchChildEventsFromGammaApi = jest.mocked(
  fetchChildEventsFromGammaApi,
);
const mockFetchMarketsFromPolymarketApi = jest.mocked(
  fetchMarketsFromPolymarketApi,
);
const mockFetchRelatedTagsFromPolymarketApi = jest.mocked(
  fetchRelatedTagsFromPolymarketApi,
);
const mockSearchEventsFromPolymarketApi = jest.mocked(
  searchEventsFromPolymarketApi,
);
const mockGetBalance = jest.mocked(getBalance);
const mockGetDeployProxyWalletTransaction = jest.mocked(
  getDeployProxyWalletTransaction,
);
const mockGetL2Headers = jest.mocked(getL2Headers);
const mockGetMarketDetailsFromGammaApi = jest.mocked(
  getMarketDetailsFromGammaApi,
);
const mockGetOrderBook = jest.mocked(getOrderBook);
const mockGetRawBalance = jest.mocked(getRawBalance);
const mockGetSafeTransferAmount = jest.mocked(getSafeTransferAmount);
const mockGetSafeTransferAmountRaw = jest.mocked(getSafeTransferAmountRaw);
const mockIsSmartContractAddress = jest.mocked(isSmartContractAddress);
const mockParsePolymarketActivity = jest.mocked(parsePolymarketActivity);
const mockParsePolymarketEvents = jest.mocked(parsePolymarketEvents);
const mockParsePolymarketPositions = jest.mocked(parsePolymarketPositions);
const mockPreviewOrder = jest.mocked(previewOrder);
const mockPreviewMaxBuyOrder = jest.mocked(previewMaxBuyOrder);
const mockResolveDepositWalletAddress = jest.mocked(
  resolveDepositWalletAddress,
);
const mockSubmitProtocolClobOrder = jest.mocked(submitProtocolClobOrder);
const mockBuildClaimTransaction = jest.mocked(buildClaimTransaction);
const mockPlanDepositWalletClaim = jest.mocked(planDepositWalletClaim);
const mockBuildDepositMaintenanceTransaction = jest.mocked(
  buildDepositMaintenanceTransaction,
);
const mockPlanDepositWalletPreflight = jest.mocked(planDepositWalletPreflight);
const mockSyncDepositWalletPositionBalanceAllowance = jest.mocked(
  syncDepositWalletPositionBalanceAllowance,
);
const mockBuildLegacySafeMigrationSweepTransaction = jest.mocked(
  buildLegacySafeMigrationSweepTransaction,
);
const mockRequestDepositWalletCreate = jest.mocked(requestDepositWalletCreate);
const mockSyncDepositWalletCollateralBalanceAllowance = jest.mocked(
  syncDepositWalletCollateralBalanceAllowance,
);
const mockToDepositWalletCalls = jest.mocked(toDepositWalletCalls);
const mockWaitForDepositWalletDeployed = jest.mocked(
  waitForDepositWalletDeployed,
);
const mockWaitForDepositWalletTransaction = jest.mocked(
  waitForDepositWalletTransaction,
);
const mockBuildTradeAllowancesTx = jest.mocked(buildTradeAllowancesTx);
// The trade-protocol matchers for the shared preflight planners: the CTF
// path routes with key 'v2', the positions path with key 'positions'.
const ctfTradeProtocol = expect.objectContaining({ key: 'v2' });
const positionsTradeProtocol = expect.objectContaining({ key: 'positions' });
const mockBuildWithdrawTransaction = jest.mocked(buildWithdrawTransaction);
const mockBuildUnsignedWithdrawTransaction = jest.mocked(
  buildUnsignedWithdrawTransaction,
);

const depositWalletAddress = '0x2222222222222222222222222222222222222222';
const legacySafeAddress = '0x9999999999999999999999999999999999999999';
const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

const erc20Interface = new Interface([
  'function transfer(address to, uint256 value)',
]);

function createDepositTransactionMeta({
  recipient,
  tokenAddress = MATIC_CONTRACTS_V2.collateral,
  type = TransactionType.predictDeposit,
}: {
  recipient: string;
  tokenAddress?: string;
  type?: TransactionType;
}): TransactionMeta {
  return {
    id: 'tx-1',
    txParams: {
      from: signer.address,
      to: tokenAddress,
      value: '0x0',
      data: '0x',
    },
    nestedTransactions: [
      {
        type,
        to: tokenAddress,
        data: erc20Interface.encodeFunctionData('transfer', [recipient, 0]),
      },
    ],
  } as TransactionMeta;
}

function createClaimPosition(
  overrides: Partial<PredictPosition> = {},
): PredictPosition {
  return {
    id: 'position-1',
    providerId: POLYMARKET_PROVIDER_ID,
    marketId: 'market-1',
    outcomeId:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    outcome: 'Yes',
    outcomeTokenId: 'token-1',
    currentValue: 1,
    title: 'Market',
    icon: '',
    amount: 1,
    price: 1,
    status: 'open',
    size: 1,
    outcomeIndex: 0,
    percentPnl: 0,
    cashPnl: 0,
    claimable: true,
    initialValue: 1,
    avgPrice: 1,
    endDate: new Date(0).toISOString(),
    negRisk: false,
    ...overrides,
  } as PredictPosition;
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const basePreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  outcomeTokenId: '123',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 19,
  slippage: 0.03,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  feeRateBps: '99',
};

const defaultFeatureFlags: PredictFeatureFlags = {
  feeCollection: DEFAULT_FEE_COLLECTION_FLAG,
  liveSportsLeagues: [],
  extendedSportsMarketsLeagues: [],
  enabledSportsMarketTypes: [],
  nonRegTimeSportsMarketTypes: [],
  marketHighlightsFlag: {
    enabled: false,
    highlights: [],
    minimumVersion: '7.64.0',
  },
  hiddenMarketsFlag: DEFAULT_HIDDEN_MARKETS_FLAG,
  fakOrdersEnabled: false,
  predictWithAnyTokenEnabled: false,
  predictUpDownEnabled: false,
  predictPortfolioEnabled: false,
  predictHomeRedesignEnabled: false,
  predictSportCardLivePricesEnabled: true,
  isMembershipFeeWaiverEnabled: false,
  disablePolymarketV2Markets: false,
  predictSportsFeed: DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  predictHomeCategories: DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
  predictWimbledonTab: DEFAULT_WIMBLEDON_TAB_FLAG,
};

function createProvider(
  featureFlags?: Partial<PredictFeatureFlags>,
  getSelectedAddress: () => string | undefined = () => undefined,
) {
  return new PolymarketProvider({
    getFeatureFlags: () => ({ ...defaultFeatureFlags, ...featureFlags }),
    getSelectedAddress,
  });
}

describe('PolymarketProvider', () => {
  const originalBuilderCode = process.env.MM_PREDICT_BUILDER_CODE;

  describe('markets', () => {
    it('returns keyset market result from feed events', async () => {
      const provider = createProvider();
      const events = [{ id: 'event-1' }];
      const markets = [{ id: 'market-1', outcomes: [{ id: 'outcome-1' }] }];

      mockFetchEventsFromPolymarketApi.mockResolvedValue({
        events: events as never,
        category: 'trending',
        nextCursor: 'next-cursor',
      });
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(
        provider.getMarkets({ category: 'trending' }),
      ).resolves.toEqual({
        markets,
        nextCursor: 'next-cursor',
      });
      expect(mockFetchEventsFromPolymarketApi).toHaveBeenCalledWith({
        category: 'trending',
      });
      expect(mockSearchEventsFromPolymarketApi).not.toHaveBeenCalled();
    });

    it('does not fetch child events when listing markets', async () => {
      const provider = createProvider({
        liveSportsLeagues: ['nba'],
        extendedSportsMarketsLeagues: ['nba'],
        enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
      });
      const parentEvent = {
        id: 'parent-event',
        slug: 'nba-nyk-sas-2026-06-13',
        tags: [{ id: 'games', label: 'Games', slug: 'games' }],
        markets: [{ id: 'moneyline-market', sportsMarketType: 'moneyline' }],
      };
      const markets = [{ id: 'market-1', outcomes: [{ id: 'outcome-1' }] }];

      mockFetchEventsFromPolymarketApi.mockResolvedValue({
        events: [parentEvent],
        category: 'trending',
        nextCursor: null,
      } as never);
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(
        provider.getMarkets({ category: 'trending' }),
      ).resolves.toEqual({
        markets,
        nextCursor: null,
      });
      expect(mockFetchChildEventsFromGammaApi).not.toHaveBeenCalled();
      expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
        [parentEvent],
        expect.any(Object),
      );
    });

    it('merges child events into parent market details for extended sports leagues', async () => {
      const provider = createProvider({
        liveSportsLeagues: ['nba'],
        extendedSportsMarketsLeagues: ['nba'],
        enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
      });
      const parentEvent = {
        id: '567958',
        slug: 'nba-nyk-sas-2026-06-13',
        tags: [{ id: 'games', label: 'Games', slug: 'games' }],
        teams: [
          { abbreviation: 'nyk', league: 'nba' },
          { abbreviation: 'sas', league: 'nba' },
        ],
        markets: [
          { id: 'moneyline', active: true, sportsMarketType: 'moneyline' },
        ],
      };
      const childEvent = {
        id: 'child-event',
        parentEventId: parentEvent.id,
        markets: [{ id: 'props', active: true, sportsMarketType: 'points' }],
      };
      const parsedMarket = { id: parentEvent.id, outcomes: [] };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce(
        parentEvent as never,
      );
      mockFetchChildEventsFromGammaApi.mockResolvedValueOnce([
        parentEvent,
        childEvent,
      ] as never);
      mockParsePolymarketEvents.mockReturnValueOnce([parsedMarket] as never);

      const result = await provider.getMarketDetails({
        marketId: parentEvent.id,
      });

      expect(mockFetchChildEventsFromGammaApi).toHaveBeenCalledWith({
        parentEventId: parentEvent.id,
      });
      expect(result).toEqual({
        ...parsedMarket,
        childMarketIds: [parentEvent.id, childEvent.id],
      });
    });

    it('keeps directly opened child events with ungroupable active markets', async () => {
      const provider = createProvider({
        liveSportsLeagues: ['elc'],
        extendedSportsMarketsLeagues: ['elc'],
        enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
      });
      const childEvent = {
        id: 'child-event',
        parentEventId: 'parent-event',
        slug: 'elc-hul-mid-2026-05-23-more-markets',
        tags: [{ id: 'games', label: 'Games', slug: 'games' }],
        teams: [
          { abbreviation: 'hul', league: 'elc' },
          { abbreviation: 'mid', league: 'elc' },
        ],
        markets: [
          { active: true, sportsMarketType: 'spreads' },
          { active: true, sportsMarketType: 'total_corners' },
        ],
      };
      const parsedMarket = { id: 'child-market', outcomes: [] };

      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce(
        childEvent as never,
      );
      mockParsePolymarketEvents.mockReturnValueOnce([parsedMarket] as never);

      const result = await provider.getMarketDetails({
        marketId: childEvent.id,
      });

      expect(result).toEqual(parsedMarket);
      expect(mockFetchChildEventsFromGammaApi).not.toHaveBeenCalled();
      expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
        [childEvent],
        expect.any(Object),
      );
    });

    it('resolves directly opened child events when every active market is groupable', async () => {
      const provider = createProvider({
        liveSportsLeagues: ['elc'],
        extendedSportsMarketsLeagues: ['elc'],
        enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
      });
      const childEvent = {
        id: 'child-event',
        parentEventId: 'parent-event',
        slug: 'elc-hul-mid-2026-05-23-more-markets',
        tags: [{ id: 'games', label: 'Games', slug: 'games' }],
        teams: [
          { abbreviation: 'hul', league: 'elc' },
          { abbreviation: 'mid', league: 'elc' },
        ],
        markets: [
          { active: true, sportsMarketType: 'spreads' },
          { active: false, sportsMarketType: 'total_corners' },
        ],
      };
      const parsedMarket = { id: 'child-market', outcomes: [] };

      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce(
        childEvent as never,
      );
      mockFetchChildEventsFromGammaApi.mockRejectedValueOnce(
        new Error('Parent fetch failed'),
      );
      mockParsePolymarketEvents.mockReturnValueOnce([parsedMarket] as never);

      const result = await provider.getMarketDetails({
        marketId: childEvent.id,
      });

      expect(result).toEqual(parsedMarket);
      expect(mockFetchChildEventsFromGammaApi).toHaveBeenCalledWith({
        parentEventId: childEvent.parentEventId,
      });
    });

    it('resolves NFL child events when player props are enabled', async () => {
      const provider = createProvider({
        liveSportsLeagues: ['nfl'],
        extendedSportsMarketsLeagues: ['nfl'],
        enabledSportsMarketTypes: [
          'moneyline',
          'spreads',
          'totals',
          'anytime_touchdowns',
        ],
      });
      const parentEvent = {
        id: 'parent-event',
        slug: 'nfl-ne-den-2026-09-10',
        tags: [
          { id: 'games', label: 'Games', slug: 'games' },
          { id: 'nfl', label: 'NFL', slug: 'nfl' },
        ],
        teams: [
          { abbreviation: 'ne', league: 'nfl' },
          { abbreviation: 'den', league: 'nfl' },
        ],
        markets: [{ active: true, sportsMarketType: 'moneyline' }],
      };
      const childEvent = {
        id: 'child-event',
        parentEventId: parentEvent.id,
        slug: 'nfl-ne-den-2026-09-10-player-props',
        tags: parentEvent.tags,
        teams: parentEvent.teams,
        markets: [{ active: true, sportsMarketType: 'anytime_touchdowns' }],
      };
      const parsedMarket = { id: 'nfl-market', outcomes: [] };

      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce(
        childEvent as never,
      );
      mockFetchChildEventsFromGammaApi.mockResolvedValueOnce([
        parentEvent,
        childEvent,
      ] as never);
      mockParsePolymarketEvents.mockReturnValueOnce([parsedMarket] as never);

      const result = await provider.getMarketDetails({
        marketId: childEvent.id,
      });

      expect(mockFetchChildEventsFromGammaApi).toHaveBeenCalledWith({
        parentEventId: parentEvent.id,
      });
      expect(result).toEqual({
        ...parsedMarket,
        childMarketIds: [parentEvent.id, childEvent.id],
      });
    });

    it('lists markets from keyset events with normalized shape', async () => {
      const provider = createProvider();
      const events = [{ id: 'event-1' }];
      const markets = [{ id: 'market-1', outcomes: [{ id: 'outcome-1' }] }];

      mockFetchMarketsFromPolymarketApi.mockResolvedValue({
        events: events as never,
        nextCursor: 'next-cursor',
      });
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(
        provider.listMarkets({ order: 'liquidity' }),
      ).resolves.toEqual({
        markets,
        nextCursor: 'next-cursor',
      });
      expect(mockFetchMarketsFromPolymarketApi).toHaveBeenCalledWith({
        order: 'liquidity',
      });
      expect(mockFetchChildEventsFromGammaApi).not.toHaveBeenCalled();
    });

    it('propagates list market failures to the query error state', async () => {
      const provider = createProvider();
      mockFetchMarketsFromPolymarketApi.mockRejectedValue(new Error('Failed'));

      await expect(provider.listMarkets({})).rejects.toThrow('Failed');
    });

    it('lists filter options from related tags, defaulting the slug to "all"', async () => {
      const provider = createProvider();
      mockFetchRelatedTagsFromPolymarketApi.mockResolvedValue([
        { id: '1', label: 'NBA', slug: 'nba' },
        { id: '2', label: 'Politics', slug: 'politics' },
      ]);

      await expect(
        provider.listFilterOptions({ source: 'hot-tags' }),
      ).resolves.toEqual([
        {
          id: 'nba',
          label: 'NBA',
          source: 'hot-tags',
          params: { tagSlugs: ['nba'], order: 'volume24hr', status: 'open' },
        },
        {
          id: 'politics',
          label: 'Politics',
          source: 'hot-tags',
          params: {
            tagSlugs: ['politics'],
            order: 'volume24hr',
            status: 'open',
          },
        },
      ]);
      expect(mockFetchRelatedTagsFromPolymarketApi).toHaveBeenCalledWith('all');
    });

    it('uses a feed-specific base tag slug when provided', async () => {
      const provider = createProvider();
      mockFetchRelatedTagsFromPolymarketApi.mockResolvedValue([]);

      await provider.listFilterOptions({
        source: 'hot-tags',
        baseTagSlug: 'politics',
      });

      expect(mockFetchRelatedTagsFromPolymarketApi).toHaveBeenCalledWith(
        'politics',
      );
    });

    it('returns an empty list when no related tags are returned', async () => {
      const provider = createProvider();
      mockFetchRelatedTagsFromPolymarketApi.mockResolvedValue([]);

      await expect(
        provider.listFilterOptions({ source: 'hot-tags' }),
      ).resolves.toEqual([]);
    });

    it('returns an empty list (best-effort) when fetching related tags throws', async () => {
      const provider = createProvider();
      mockFetchRelatedTagsFromPolymarketApi.mockRejectedValue(
        new Error('network down'),
      );

      await expect(
        provider.listFilterOptions({ source: 'hot-tags' }),
      ).resolves.toEqual([]);
    });

    it('searches markets through public-search events and filters empty outcomes', async () => {
      const provider = createProvider();
      const events = [{ id: 'event-1' }];
      const markets = [
        { id: 'market-1', outcomes: [{ id: 'outcome-1' }] },
        { id: 'market-2', outcomes: [] },
      ];

      mockSearchEventsFromPolymarketApi.mockResolvedValue({
        events,
        totalResults: 1,
      } as never);
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(provider.searchMarkets({ q: ' bitcoin ' })).resolves.toEqual(
        { markets: [markets[0]], totalResults: 1 },
      );
      expect(mockSearchEventsFromPolymarketApi).toHaveBeenCalledWith({
        q: 'bitcoin',
      });
      expect(mockFetchEventsFromPolymarketApi).not.toHaveBeenCalled();
    });

    it('returns empty search results without fetching for whitespace query', async () => {
      const provider = createProvider();

      await expect(provider.searchMarkets({ q: '   ' })).resolves.toEqual({
        markets: [],
        totalResults: 0,
      });
      expect(mockSearchEventsFromPolymarketApi).not.toHaveBeenCalled();
    });

    it('propagates feed failures to the query error state', async () => {
      const provider = createProvider();
      mockFetchEventsFromPolymarketApi.mockRejectedValue(new Error('Failed'));

      await expect(
        provider.getMarkets({ category: 'trending' }),
      ).rejects.toThrow('Failed');
    });

    it('does not report expected market request timeouts to Sentry', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger').default;
      const timeoutError = new PolymarketRequestTimeoutError(
        new Error('The operation was aborted'),
      );
      mockFetchEventsFromPolymarketApi.mockRejectedValue(timeoutError);

      await expect(
        createProvider().getMarkets({ category: 'trending' }),
      ).rejects.toBe(timeoutError);

      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        'Predict markets request ended by expected timeout/cancellation:',
        timeoutError.message,
        expect.any(Object),
      );
    });

    it('reports unowned native market aborts to Sentry', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger').default;
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetchEventsFromPolymarketApi.mockRejectedValue(abortError);

      await expect(
        createProvider().getMarkets({ category: 'trending' }),
      ).rejects.toBe(abortError);

      expect(Logger.error).toHaveBeenCalledWith(abortError, expect.any(Object));
    });

    it('prefers team-to-advance outcomes for World Cup carousel markets', async () => {
      const provider = createProvider();
      const moneylineOutcome = {
        id: 'moneyline',
        sportsMarketType: 'moneyline',
      };
      const teamToAdvanceOutcome = {
        id: 'team-to-advance',
        sportsMarketType: 'soccer_team_to_advance',
      };
      const markets = [
        {
          id: 'market-1',
          status: 'open',
          game: { league: 'fifwc' },
          outcomes: [moneylineOutcome, teamToAdvanceOutcome],
        },
      ];

      mockFetchCarouselFromPolymarketApi.mockResolvedValue([
        { event: { id: 'event-1', ended: false } },
      ] as never);
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(provider.getCarouselMarkets()).resolves.toEqual([
        {
          ...markets[0],
          outcomes: [teamToAdvanceOutcome],
        },
      ]);
    });

    it('fetches market series from keyset endpoint', async () => {
      const provider = createProvider();
      const events = [{ id: 'event-1' }];
      const markets = [{ id: 'market-1', outcomes: [{ id: 'outcome-1' }] }];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events, next_cursor: null }),
      });
      mockParsePolymarketEvents.mockReturnValue(markets as never);

      await expect(
        provider.getMarketSeries({
          seriesId: 'series-1',
          endDateMin: '2026-01-01',
          endDateMax: '2026-12-31',
        }),
      ).resolves.toEqual(markets);

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('https://gamma-api.polymarket.com/events/keyset?');
      expect(url).toContain('series_id=series-1');
    });

    it('propagates market series failures to the query error state', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        provider.getMarketSeries({
          seriesId: 'series-1',
          endDateMin: '2026-01-01',
          endDateMax: '2026-12-31',
        }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('Protocol V2 markets kill switch', () => {
    const events = [{ id: 'event-1', markets: [] }];
    const markets = [
      { id: 'market-1', status: 'open', outcomes: [{ id: 'outcome-1' }] },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockParsePolymarketEvents.mockReturnValue(markets as never);
    });

    it.each([false, true])(
      'passes hideV2Markets=%s to the category feed',
      async (disablePolymarketV2Markets) => {
        mockFetchEventsFromPolymarketApi.mockResolvedValue({
          events,
          category: 'trending',
          nextCursor: null,
        } as never);

        await createProvider({ disablePolymarketV2Markets }).getMarkets({
          category: 'trending',
        });

        expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
          events,
          expect.objectContaining({
            hideV2Markets: disablePolymarketV2Markets,
          }),
        );
      },
    );

    it.each([false, true])(
      'passes hideV2Markets=%s to search',
      async (disablePolymarketV2Markets) => {
        mockSearchEventsFromPolymarketApi.mockResolvedValue({
          events,
          totalResults: 1,
        } as never);

        await createProvider({ disablePolymarketV2Markets }).searchMarkets({
          q: 'bitcoin',
        });

        expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
          events,
          expect.objectContaining({
            hideV2Markets: disablePolymarketV2Markets,
          }),
        );
      },
    );

    it.each([false, true])(
      'passes hideV2Markets=%s to the carousel',
      async (disablePolymarketV2Markets) => {
        mockFetchCarouselFromPolymarketApi.mockResolvedValue([
          { event: events[0] },
        ] as never);

        await createProvider({
          disablePolymarketV2Markets,
        }).getCarouselMarkets();

        expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
          events,
          expect.objectContaining({
            hideV2Markets: disablePolymarketV2Markets,
          }),
        );
      },
    );

    it.each([false, true])(
      'passes hideV2Markets=%s to market series',
      async (disablePolymarketV2Markets) => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ events, next_cursor: null }),
        });

        await createProvider({ disablePolymarketV2Markets }).getMarketSeries({
          seriesId: 'series-1',
          endDateMin: '2026-01-01',
          endDateMax: '2026-12-31',
        });

        expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
          events,
          expect.objectContaining({
            hideV2Markets: disablePolymarketV2Markets,
          }),
        );
      },
    );

    it.each([false, true])(
      'passes hideV2Markets=%s to highlighted markets',
      async (disablePolymarketV2Markets) => {
        mockGetMarketDetailsFromGammaApi.mockResolvedValue(events[0] as never);

        await createProvider({ disablePolymarketV2Markets }).getMarketsByIds([
          'event-1',
        ]);

        expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
          events,
          expect.objectContaining({
            hideV2Markets: disablePolymarketV2Markets,
          }),
        );
      },
    );

    it('drops a highlighted market that is hidden because every market is v2', async () => {
      mockGetMarketDetailsFromGammaApi.mockResolvedValue(events[0] as never);
      mockParsePolymarketEvents.mockReturnValue([]);

      await expect(
        createProvider({
          disablePolymarketV2Markets: true,
        }).getMarketsByIds(['event-1']),
      ).resolves.toEqual([]);
    });

    it('never hides v2 markets in market details', async () => {
      mockGetMarketDetailsFromGammaApi.mockResolvedValue(events[0] as never);

      await expect(
        createProvider({
          disablePolymarketV2Markets: true,
        }).getMarketDetails({ marketId: 'event-1' }),
      ).resolves.toEqual(markets[0]);

      expect(mockParsePolymarketEvents).toHaveBeenCalledWith(
        events,
        expect.objectContaining({ hideV2Markets: false }),
      );
    });
  });

  describe('getPrices', () => {
    it('maps Polymarket SELL to the ask (entry.buy) and BUY to the bid (entry.sell)', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ 'tok-1': { BUY: '0.34', SELL: '0.92' } }),
      });

      const result = await provider.getPrices({
        queries: [
          { marketId: 'm-1', outcomeId: 'o-1', outcomeTokenId: 'tok-1' },
        ],
      });

      // entry.buy = best ask (price to buy), entry.sell = best bid (price to sell)
      expect(result.results[0].entry).toEqual({ buy: 0.92, sell: 0.34 });
    });

    it('defaults missing price data to zero on both sides', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await provider.getPrices({
        queries: [
          { marketId: 'm-1', outcomeId: 'o-1', outcomeTokenId: 'tok-1' },
        ],
      });

      expect(result.results[0].entry).toEqual({ buy: 0, sell: 0 });
    });

    it('coerces malformed (non-numeric) prices to zero instead of NaN', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          'tok-1': { BUY: 'not-a-number', SELL: '0.92' },
        }),
      });

      const result = await provider.getPrices({
        queries: [
          { marketId: 'm-1', outcomeId: 'o-1', outcomeTokenId: 'tok-1' },
        ],
      });

      // Valid ask is kept; malformed bid falls back to 0 (never NaN).
      expect(result.results[0].entry.buy).toBe(0.92);
      expect(result.results[0].entry.sell).toBe(0);
      expect(Number.isNaN(result.results[0].entry.sell)).toBe(false);
    });

    it('throws when queries are empty', async () => {
      const provider = createProvider();
      await expect(provider.getPrices({ queries: [] })).rejects.toThrow(
        'queries parameter is required and must not be empty',
      );
    });
  });

  describe('getCryptoTargetPrice', () => {
    it('requests the matching TWAP price for TWAP markets', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ openPrice: 64544.60401529397 }),
      });

      const result = await provider.getCryptoTargetPrice({
        symbol: 'BTC',
        eventStartTime: '2026-08-18T22:30:00Z',
        variant: 'fiveminute',
        endDate: '2026-08-18T22:35:00Z',
        twapWindowSeconds: 60,
      });

      expect(result).toBe(64544.60401529397);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('twapEnabled=true');
      expect(url).toContain('twapLookbackSeconds=60');
    });

    it('omits TWAP parameters for spot-price markets', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ openPrice: 64551.57 }),
      });

      await provider.getCryptoTargetPrice({
        symbol: 'BTC',
        eventStartTime: '2026-08-18T22:30:00Z',
        variant: 'fiveminute',
        endDate: '2026-08-18T22:35:00Z',
      });

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).not.toContain('twapEnabled');
      expect(url).not.toContain('twapLookbackSeconds');
    });

    it('requests a 60 second lookback for a 30 second market', async () => {
      const provider = createProvider();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ openPrice: 64000 }),
      });

      await provider.getCryptoTargetPrice({
        symbol: 'BTC',
        eventStartTime: '2026-08-18T22:30:00Z',
        variant: 'fiveminute',
        endDate: '2026-08-18T22:35:00Z',
        twapWindowSeconds: 30,
      });

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('twapLookbackSeconds=60');
    });
  });

  beforeAll(() => {
    process.env.MM_PREDICT_BUILDER_CODE =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  afterAll(() => {
    if (originalBuilderCode === undefined) {
      delete process.env.MM_PREDICT_BUILDER_CODE;
      return;
    }

    process.env.MM_PREDICT_BUILDER_CODE = originalBuilderCode;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockComputeProxyAddress.mockReturnValue(legacySafeAddress);
    mockResolveDepositWalletAddress.mockResolvedValue(depositWalletAddress);
    mockCreateApiKey.mockResolvedValue({
      apiKey: 'api-key',
      secret: 'secret',
      passphrase: 'passphrase',
    });
    mockGetL2Headers.mockResolvedValue({
      POLY_ADDRESS: signer.address,
      POLY_SIGNATURE: 'sig',
      POLY_TIMESTAMP: '1',
      POLY_API_KEY: 'api-key',
      POLY_PASSPHRASE: 'passphrase',
    });
    mockParsePolymarketPositions.mockResolvedValue([]);
    mockSubmitProtocolClobOrder.mockResolvedValue({
      success: true,
      response: {
        success: true,
        orderID: 'order-1',
        makingAmount: '10',
        takingAmount: '19',
      },
    });
    mockPreviewOrder.mockResolvedValue(basePreview);
    mockPreviewMaxBuyOrder.mockResolvedValue(basePreview);
    mockBuildTradeAllowancesTx.mockImplementation(async ({ tradeProtocol }) =>
      tradeProtocol?.key === 'positions'
        ? {
            to: '0x8888888888888888888888888888888888888888',
            data: '0xpositionsAllowances',
          }
        : {
            to: '0x9999999999999999999999999999999999999999',
            data: '0xallowances',
          },
    );
    mockSyncDepositWalletPositionBalanceAllowance.mockResolvedValue(undefined);
    mockGenerateTransferData.mockReturnValue('0xtransferData');
    mockIsSmartContractAddress.mockResolvedValue(true);
    mockGetDeployProxyWalletTransaction.mockResolvedValue({
      params: { to: '0xFactory', data: '0xdeploy' },
      type: TransactionType.contractInteraction,
    });
    mockBuildClaimTransaction.mockResolvedValue({
      params: {
        to: legacySafeAddress as `0x${string}`,
        data: '0xsignedClaim' as `0x${string}`,
      },
      type: TransactionType.predictClaim,
    });
    mockPlanDepositWalletClaim.mockResolvedValue([
      {
        target: MATIC_CONTRACTS_V2.collateral,
        value: '0',
        data: '0xclaim',
      },
    ]);
    mockBuildDepositMaintenanceTransaction.mockResolvedValue(undefined);
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(undefined);
    mockGetDepositWalletRelayerTransactionId.mockImplementation(
      (response) => response.transactionID ?? response.id,
    );
    mockRequestDepositWalletCreate.mockResolvedValue({
      transactionID: 'create-1',
    });
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [],
      transactions: [],
    });
    mockToDepositWalletCalls.mockImplementation((transactions) =>
      transactions.map((transaction) => ({
        target: transaction.to,
        value: transaction.value,
        data: transaction.data,
      })),
    );
    mockExecuteDepositWalletBatch.mockResolvedValue({
      transactionID: 'batch-1',
    });
    mockWaitForDepositWalletDeployed.mockResolvedValue(undefined);
    mockWaitForDepositWalletTransaction.mockResolvedValue(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    mockSyncDepositWalletCollateralBalanceAllowance.mockResolvedValue(
      undefined,
    );
    mockEncodeErc20Transfer.mockReturnValue('0xtransfer');
    mockGetRawBalance.mockResolvedValue(0n);
    mockGetSafeTransferAmount.mockReturnValue(1);
    mockGetSafeTransferAmountRaw.mockReturnValue(1_000_000n);
    mockBuildWithdrawTransaction.mockResolvedValue({
      params: {
        to: '0x9999999999999999999999999999999999999999',
        data: '0xsignedWithdraw',
      },
      type: TransactionType.predictWithdraw,
    });
    mockBuildUnsignedWithdrawTransaction.mockResolvedValue({
      to: '0x9999999999999999999999999999999999999999',
      data: '0xpreValidatedWithdraw',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [{}] }),
    });
    signer.signTypedMessage.mockResolvedValue('0xsigned-order');
  });

  describe('isEligible', () => {
    const mockJson = (payload: unknown, ok = true, status = 200) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok,
        status,
        json: jest.fn().mockResolvedValue(payload),
      });
    };

    it('returns eligible for a complete unblocked response', async () => {
      mockJson({ blocked: false, country: 'PT' });

      await expect(createProvider().isEligible()).resolves.toEqual({
        isEligible: true,
        country: 'PT',
      });
    });

    it('returns ineligible for a complete blocked response', async () => {
      mockJson({ blocked: true, country: 'DE' });

      await expect(createProvider().isEligible()).resolves.toEqual({
        isEligible: false,
        country: 'DE',
      });
    });

    it('throws when country is missing', async () => {
      mockJson({ blocked: false });

      await expect(createProvider().isEligible()).rejects.toThrow(
        'incomplete response',
      );
    });

    it('throws when blocked is missing', async () => {
      mockJson({ country: 'PT' });

      await expect(createProvider().isEligible()).rejects.toThrow(
        'incomplete response',
      );
    });

    it('throws when the payload is malformed JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Unexpected token')),
      });

      await expect(createProvider().isEligible()).rejects.toThrow(
        'malformed JSON',
      );
    });

    it('throws when the response is not 2xx', async () => {
      mockJson({ blocked: false, country: 'PT' }, false, 500);

      await expect(createProvider().isEligible()).rejects.toThrow('status 500');
    });

    it('propagates a request timeout', async () => {
      const timeoutError = new PolymarketRequestTimeoutError(
        new Error('The operation was aborted'),
      );
      global.fetch = jest.fn().mockRejectedValue(timeoutError);

      await expect(createProvider().isEligible()).rejects.toBe(timeoutError);
    });

    it('propagates a network failure without reporting it', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger').default;
      const networkError = new TypeError('Network request failed');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      await expect(createProvider().isEligible()).rejects.toBe(networkError);
      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('propagates expected cancellation without reporting it as a Sentry error', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger').default;
      const cancellationError = new PolymarketRequestCancelledError(
        new Error('The operation was aborted'),
      );
      global.fetch = jest.fn().mockRejectedValue(cancellationError);

      await expect(createProvider().isEligible()).rejects.toBe(
        cancellationError,
      );
      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).not.toHaveBeenCalled();
    });
  });

  it('exposes the Polymarket provider id', () => {
    expect(createProvider().providerId).toBe(POLYMARKET_PROVIDER_ID);
  });

  it('routes to deposit wallet when legacy Safe is not deployed', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: depositWalletAddress,
      isDeployed: true,
      walletType: 'deposit-wallet',
    });
    expect(mockResolveDepositWalletAddress).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockIsSmartContractAddress).toHaveBeenNthCalledWith(
      1,
      legacySafeAddress,
      '0x89',
    );
    expect(mockIsSmartContractAddress).toHaveBeenNthCalledWith(
      2,
      depositWalletAddress,
      '0x89',
    );
  });

  it('keeps legacy Safe users only when raw Activity API has activity', async () => {
    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: legacySafeAddress,
      isDeployed: true,
      walletType: 'safe',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `https://data-api.polymarket.com/v2/activity?user=${legacySafeAddress}&limit=1`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockResolveDepositWalletAddress).not.toHaveBeenCalled();
  });

  it('routes deployed legacy Safe with empty raw activity to deposit wallet', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: depositWalletAddress,
      isDeployed: false,
      walletType: 'deposit-wallet',
    });
    expect(mockResolveDepositWalletAddress).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
  });

  it('keeps funded legacy Safe users when raw activity is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockGetRawBalance.mockImplementation(async ({ tokenAddress }) =>
      tokenAddress === USDC_E_ADDRESS ? 100_000_000n : 0n,
    );
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: legacySafeAddress,
      isDeployed: true,
      walletType: 'safe',
    });
    expect(mockResolveDepositWalletAddress).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
  });

  it('fails closed when raw Activity API fails for a deployed legacy Safe', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });

    await expect(
      createProvider().getAccountState({ ownerAddress: signer.address }),
    ).rejects.toThrow('Failed to fetch Polymarket activity');
  });

  it('serves cached account state within the TTL without refetching', async () => {
    const provider = createProvider();

    const first = await provider.getAccountState({
      ownerAddress: signer.address,
    });
    const second = await provider.getAccountState({
      ownerAddress: signer.address,
    });

    expect(second).toEqual(first);
    expect(mockIsSmartContractAddress).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches account state once the deployed-wallet TTL expires', async () => {
    const provider = createProvider();
    const start = 1_700_000_000_000;
    // The global test setup replaces Date.now with a jest.fn — reassign (and
    // restore) rather than spyOn, since mockRestore would wipe the global mock.
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => start);

    try {
      await provider.getAccountState({ ownerAddress: signer.address });

      Date.now = jest.fn(() => start + ACCOUNT_STATE_CACHE_TTL_MS + 1);
      await provider.getAccountState({ ownerAddress: signer.address });

      expect(mockIsSmartContractAddress).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('expires not-deployed account states on the shorter TTL', async () => {
    mockIsSmartContractAddress.mockResolvedValue(false);
    const provider = createProvider();
    const start = 1_700_000_000_000;
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => start);

    try {
      const accountState = await provider.getAccountState({
        ownerAddress: signer.address,
      });
      expect(accountState.isDeployed).toBe(false);
      expect(mockResolveDepositWalletAddress).toHaveBeenCalledTimes(1);

      // Still cached within the not-deployed TTL.
      Date.now = jest.fn(
        () => start + ACCOUNT_STATE_NOT_DEPLOYED_CACHE_TTL_MS - 1,
      );
      await provider.getAccountState({ ownerAddress: signer.address });
      expect(mockResolveDepositWalletAddress).toHaveBeenCalledTimes(1);

      // Expired past the not-deployed TTL — must refetch.
      Date.now = jest.fn(
        () => start + ACCOUNT_STATE_NOT_DEPLOYED_CACHE_TTL_MS + 1,
      );
      await provider.getAccountState({ ownerAddress: signer.address });
      expect(mockResolveDepositWalletAddress).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = originalDateNow;
    }
  });

  describe('getActivity', () => {
    const rawActivity = [
      {
        type: 'TRADE',
        side: 'BUY',
        size: 20,
        price: 0.5,
        usdc_size: 10,
        timestamp: 1700000000,
        transaction_hash: '0xabc',
        condition_id: '0xcondition',
        outcome_index: 0,
        title: 'Market',
        outcome: 'Yes',
        icon: 'icon.png',
        slug: 'market-slug',
        event_slug: 'event-slug',
      },
    ];
    const mappedActivity = [
      {
        type: 'TRADE',
        side: 'BUY',
        size: 20,
        price: 0.5,
        usdcSize: 10,
        timestamp: 1700000000,
        transactionHash: '0xabc',
        conditionId: '0xcondition',
        outcomeIndex: 0,
        title: 'Market',
        outcome: 'Yes',
        icon: 'icon.png',
        slug: 'market-slug',
        eventSlug: 'event-slug',
      },
    ];
    const parsedActivity: PredictActivity[] = [
      {
        id: 'activity-1',
        providerId: POLYMARKET_PROVIDER_ID,
        entry: { type: 'claimWinnings', timestamp: 1, amount: 10 },
        title: 'Activity',
      },
    ];

    const mockLegacySafeAccountStateFetch = () => ({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [{}] }),
    });

    const mockActivityFetch = (body: unknown, ok = true) => ({
      ok,
      json: jest.fn().mockResolvedValue(body),
    });

    beforeEach(() => {
      mockParsePolymarketActivity.mockReturnValue(parsedActivity);
    });

    it('requests v2 activity with supplied limit and cursor', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: rawActivity,
            pagination: { next_cursor: 'cursor-next' },
          }),
        );

      await expect(
        createProvider().getActivity({
          address: signer.address,
          limit: 10,
          cursor: 'cursor-abc',
        }),
      ).resolves.toEqual({
        activities: parsedActivity,
        nextCursor: 'cursor-next',
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/activity?user=${legacySafeAddress}&limit=10&cursor=cursor-abc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        },
      );
      expect(mockParsePolymarketActivity).toHaveBeenCalledWith(mappedActivity);
    });

    it('defaults activity pagination to the first 20 items', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: rawActivity,
            pagination: { next_cursor: null },
          }),
        );

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).resolves.toEqual({
        activities: parsedActivity,
        nextCursor: undefined,
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/activity?user=${legacySafeAddress}&limit=20`,
        expect.any(Object),
      );
    });

    it('filters lost redeems (REDEEM rows with zero payout) client-side', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: [
              ...rawActivity,
              { ...rawActivity[0], type: 'REDEEM', usdc_size: 0 },
              { ...rawActivity[0], type: 'REDEEM', usdc_size: 25 },
            ],
            pagination: { next_cursor: null },
          }),
        );

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).resolves.toEqual({
        activities: parsedActivity,
        nextCursor: undefined,
      });

      expect(mockParsePolymarketActivity).toHaveBeenCalledWith([
        ...mappedActivity,
        { ...mappedActivity[0], type: 'REDEEM', usdcSize: 25 },
      ]);
    });

    it('follows the cursor when a page filters to only lost redeems', async () => {
      // First page is entirely lost redeems: it maps to an empty activities
      // list but its envelope still carries a next_cursor, so the provider
      // must hop to the next page itself.
      mockParsePolymarketActivity
        .mockReturnValueOnce([])
        .mockReturnValueOnce(parsedActivity);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: [{ ...rawActivity[0], type: 'REDEEM', usdc_size: 0 }],
            pagination: { next_cursor: 'cursor-1' },
          }),
        )
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: rawActivity,
            pagination: { next_cursor: 'cursor-2' },
          }),
        );

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).resolves.toEqual({
        activities: parsedActivity,
        // Cursor of the LAST fetched page, so the UI continues from there.
        nextCursor: 'cursor-2',
      });

      expect(mockParsePolymarketActivity).toHaveBeenNthCalledWith(1, []);
      expect(mockParsePolymarketActivity).toHaveBeenNthCalledWith(
        2,
        mappedActivity,
      );
      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/activity?user=${legacySafeAddress}&limit=20&cursor=cursor-1`,
        expect.any(Object),
      );
    });

    it('returns an empty page with no cursor when paging is exhausted after empty hops', async () => {
      mockParsePolymarketActivity.mockReturnValue([]);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: [{ ...rawActivity[0], type: 'REDEEM', usdc_size: 0 }],
            pagination: { next_cursor: 'cursor-1' },
          }),
        )
        .mockResolvedValueOnce(
          mockActivityFetch({
            data: [],
            pagination: { next_cursor: null },
          }),
        );

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).resolves.toEqual({
        activities: [],
        nextCursor: undefined,
      });

      // Exactly two activity fetches: the initial page plus one hop; the null
      // cursor on the second page ends paging instead of hopping again.
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('stops hopping after the empty-page hop cap', async () => {
      mockParsePolymarketActivity.mockReturnValue([]);

      const emptyRedeemPage = (nextCursor: string) => ({
        data: [{ ...rawActivity[0], type: 'REDEEM', usdc_size: 0 }],
        pagination: { next_cursor: nextCursor },
      });

      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce(mockLegacySafeAccountStateFetch());
      // Initial page + 5 hops, each returning only lost redeems with another
      // cursor. The 6th response is never requested because the cap is hit.
      for (let hop = 1; hop <= 6; hop += 1) {
        mockFetch.mockResolvedValueOnce(
          mockActivityFetch(emptyRedeemPage(`cursor-${hop}`)),
        );
      }

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).resolves.toEqual({
        activities: [],
        nextCursor: 'cursor-6',
      });

      // 1 account-state fetch + 1 initial activity page + 5 hops (the capped
      // maximum). A 7th activity page is never requested.
      expect(mockFetch).toHaveBeenCalledTimes(7);
      expect(mockFetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/activity?user=${legacySafeAddress}&limit=20&cursor=cursor-5`,
        expect.any(Object),
      );
    });

    it('throws when the activity request is not ok', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(mockActivityFetch([], false));

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).rejects.toThrow('Failed to get activity');
    });

    it('throws when the activity response is not the v2 envelope', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockResolvedValueOnce(mockActivityFetch(rawActivity));

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).rejects.toThrow('Invalid activity response');
      expect(mockParsePolymarketActivity).not.toHaveBeenCalled();
    });

    it('throws when the activity request fails', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockLegacySafeAccountStateFetch())
        .mockRejectedValueOnce(new Error('Network failed'));

      await expect(
        createProvider().getActivity({ address: signer.address }),
      ).rejects.toThrow('Network failed');
    });
  });

  // Raw Gamma event fixtures for the version cache: a v1 market carries no
  // version field and exposes CTF token ids; a v2 market carries version
  // 'v2' and exposes PositionManager token ids.
  const v1MarketEvent = {
    id: 'market-1',
    markets: [{ clobTokenIds: '["123","456"]' }],
  };
  const v2MarketEvent = {
    id: 'market-1',
    markets: [{ version: 'v2', positionIds: ['123', '456'] }],
  };

  // Builds a preview the way production does: the version cache is warm
  // from market fetches — here the Gamma event fixture stands in for them —
  // so placeOrder later routes from the cache without fetching.
  const previewWithWarmVersionCache = async (
    provider: PolymarketProvider,
    event: { id: string; markets: unknown[] },
  ) => {
    mockGetMarketDetailsFromGammaApi.mockResolvedValue(event as never);
    return provider.previewOrder({ ...basePreview, size: 10, signer });
  };

  it('previews orders through canonical CLOB v2 with zero fee-rate bps', async () => {
    mockGetMarketDetailsFromGammaApi.mockResolvedValue(v1MarketEvent as never);
    const provider = createProvider();

    const preview = await provider.previewOrder({
      ...basePreview,
      size: 10,
      signer,
    });

    expect(preview.feeRateBps).toBe('0');
    expect(mockPreviewOrder).toHaveBeenCalledWith(
      expect.objectContaining({ feeCollection: DEFAULT_FEE_COLLECTION_FLAG }),
    );
  });

  it('resolves a sell market version from Gamma when building the preview', async () => {
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    expect(mockGetMarketDetailsFromGammaApi).toHaveBeenCalledWith({
      marketId: 'market-1',
    });
  });

  it('fails the sell preview when the Gamma version lookup fails', async () => {
    mockGetMarketDetailsFromGammaApi.mockRejectedValue(new Error('Gamma down'));
    const provider = createProvider();

    await expect(
      provider.previewOrder({
        ...basePreview,
        size: 10,
        side: Side.SELL,
        signer,
      }),
    ).rejects.toThrow('Gamma down');
  });

  it('previews the maximum fully fillable buy through the provider', async () => {
    mockGetMarketDetailsFromGammaApi.mockResolvedValue(v1MarketEvent as never);
    const provider = createProvider();

    const preview = await provider.previewMaxBuyOrder({
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'token-1',
      availableBalance: 100,
      signer,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        maxAmountSpent: basePreview.maxAmountSpent,
        feeRateBps: '0',
        outcomeVersion: 'v1',
      }),
    );
    expect(mockPreviewMaxBuyOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        availableBalance: 100,
        feeCollection: DEFAULT_FEE_COLLECTION_FLAG,
      }),
    );
  });

  it('submits orders through the protocol CLOB v2 relayer path', async () => {
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(true);
    expect(mockCreateApiKey).toHaveBeenCalledWith({ address: signer.address });
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      expect.any(Object),
      SignTypedDataVersion.V4,
    );
    expect(mockGetL2Headers).toHaveBeenCalledWith(
      expect.objectContaining({ address: signer.address }),
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({
          key: 'v2',
          transport: expect.objectContaining({
            clobBaseUrl: DEFAULT_CLOB_BASE_URL,
            clobVersionHeader: '2',
          }),
        }),
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            maker: legacySafeAddress,
            signer: signer.address,
            signatureType: SignatureType.POLY_GNOSIS_SAFE,
          }),
        }),
        allowancesTx: {
          to: '0x9999999999999999999999999999999999999999',
          data: '0xallowances',
        },
      }),
    );
  });

  it('includes the membership builder code in the signed CLOB order', async () => {
    const membershipBuilderCode =
      '0x4444444444444444444444444444444444444444444444444444444444444444';
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        feePolicy: {
          builderCode: membershipBuilderCode,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      {
        from: signer.address,
        data: expect.objectContaining({
          primaryType: 'Order',
          message: expect.objectContaining({
            builder: membershipBuilderCode,
          }),
        }),
      },
      SignTypedDataVersion.V4,
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            builder: membershipBuilderCode,
          }),
        }),
      }),
    );
  });

  it('routes v2 market buys through the positions protocol path', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    // The two calls are the preview's version lookup (a cache miss on the
    // first preview) and the optimistic position update's market fetch —
    // the order route itself reads the cache and never fetches.
    expect(mockGetMarketDetailsFromGammaApi).toHaveBeenCalledTimes(2);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: positionsTradeProtocol,
      }),
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'positions' }),
        allowancesTx: {
          to: '0x8888888888888888888888888888888888888888',
          data: '0xpositionsAllowances',
        },
      }),
    );
  });

  it('includes the membership builder code in the signed positions order', async () => {
    const membershipBuilderCode =
      '0x4444444444444444444444444444444444444444444444444444444444444444';
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        feePolicy: {
          builderCode: membershipBuilderCode,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      {
        from: signer.address,
        data: expect.objectContaining({
          primaryType: 'Order',
          message: expect.objectContaining({
            builder: membershipBuilderCode,
          }),
        }),
      },
      SignTypedDataVersion.V4,
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'positions' }),
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            builder: membershipBuilderCode,
          }),
        }),
      }),
    );
  });

  it('routes v1 market buys through the CTF path without fetching Gamma at order time', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    // The two calls are the preview's version lookup (a cache miss on the
    // first preview) and the optimistic position update's market fetch —
    // a third call would mean the route fetched, which it never does.
    expect(mockGetMarketDetailsFromGammaApi).toHaveBeenCalledTimes(2);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: ctfTradeProtocol,
      }),
    );
  });

  it('routes sells through the positions path when the event market is v2', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: positionsTradeProtocol,
      }),
    );
  });

  it('routes sells through the CTF path when the event market is v1', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: ctfTradeProtocol,
      }),
    );
  });

  it('resolves the sell market version from Gamma once per market', async () => {
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);
    const callsAfterFirstPreview =
      mockGetMarketDetailsFromGammaApi.mock.calls.length;

    await provider.previewOrder({
      ...preview,
      size: 10,
      side: Side.SELL,
      signer,
    });

    // The second preview hits the version cache — no second fetch.
    expect(mockGetMarketDetailsFromGammaApi.mock.calls.length).toBe(
      callsAfterFirstPreview,
    );
  });

  it('retries the version resolution when the Gamma lookup fails', async () => {
    mockGetMarketDetailsFromGammaApi.mockRejectedValue(new Error('Gamma down'));
    const provider = createProvider();

    await expect(
      provider.previewOrder({ ...basePreview, size: 10, signer }),
    ).rejects.toThrow('Gamma down');
    const callsAfterFirstPreview =
      mockGetMarketDetailsFromGammaApi.mock.calls.length;

    await expect(
      provider.previewOrder({ ...basePreview, size: 10, signer }),
    ).rejects.toThrow('Gamma down');

    // A failed lookup is not pinned for the session — the next preview
    // fetches again.
    expect(mockGetMarketDetailsFromGammaApi.mock.calls.length).toBeGreaterThan(
      callsAfterFirstPreview,
    );
  });

  it('answers a sell preview from the cache warmed by a buy on the same market', async () => {
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);
    const callsAfterBuy = mockGetMarketDetailsFromGammaApi.mock.calls.length;

    await provider.previewOrder({
      ...preview,
      size: 10,
      side: Side.SELL,
      signer,
    });

    // The buy preview warmed the cache, so the sell resolves its version
    // without fetching Gamma at all.
    expect(mockGetMarketDetailsFromGammaApi.mock.calls.length).toBe(
      callsAfterBuy,
    );
  });

  it('populates the version cache when markets are parsed', async () => {
    mockGetMarketDetailsFromGammaApi.mockResolvedValue(v2MarketEvent as never);
    mockParsePolymarketEvents.mockReturnValue([{ id: 'market-1' }] as never);
    const provider = createProvider();

    await provider.getMarketDetails({ marketId: 'market-1' });
    const callsAfterDetailsFetch =
      mockGetMarketDetailsFromGammaApi.mock.calls.length;

    await provider.previewOrder({
      ...basePreview,
      size: 10,
      side: Side.SELL,
      signer,
    });

    // The market detail fetch already cached the token's version — the
    // sell preview resolves it without fetching.
    expect(mockGetMarketDetailsFromGammaApi.mock.calls.length).toBe(
      callsAfterDetailsFetch,
    );
  });

  it('routes sells through the positions path when the matching event market is v2 among v1 siblings', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, {
      id: 'market-1',
      markets: [
        { clobTokenIds: '["777","778"]' },
        { version: 'v2', positionIds: ['123', '456'] },
      ],
    });

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: positionsTradeProtocol,
      }),
    );
  });

  it('routes sells through the CTF path when the matching event market is v1 among v2 siblings', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, {
      id: 'market-1',
      markets: [
        { version: 'v2', positionIds: ['777', '778'] },
        { clobTokenIds: '["123","456"]' },
      ],
    });

    const result = await provider.placeOrder({ signer, preview });

    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: ctfTradeProtocol,
      }),
    );
  });

  it('skips markets with malformed token ids when warming the version cache', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, {
      id: 'market-1',
      markets: [
        { clobTokenIds: 'not-json' },
        { version: 'v2', positionIds: '{"oops":true}' },
        { clobTokenIds: '["123","456"]' },
      ],
    });

    const result = await provider.placeOrder({ signer, preview });

    // The malformed markets are skipped, not fatal — the good market still
    // caches its version and the sell routes through the CTF path.
    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({ safeAddress: legacySafeAddress }),
    );
  });

  it('falls back to the CTF path when no event market matches the sell outcome', async () => {
    const provider = createProvider();
    const preview = await previewWithWarmVersionCache(provider, {
      id: 'market-1',
      markets: [{ version: 'v2', positionIds: ['777', '778'] }],
    });

    const result = await provider.placeOrder({ signer, preview });

    // A token the fetched event does not describe is unknown — the CTF
    // path, same as a market whose payload omits the version.
    expect(result.success).toBe(true);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: legacySafeAddress,
        tradeProtocol: ctfTradeProtocol,
      }),
    );
  });

  it.each([
    ['v1', v1MarketEvent],
    ['v2', v2MarketEvent],
  ])(
    'stamps the %s market version on the order preview',
    async (version, event) => {
      const provider = createProvider();

      const preview = await previewWithWarmVersionCache(provider, event);

      expect(preview.outcomeVersion).toBe(version);
    },
  );

  it('routes a max-buy preview through the positions path on a cold version cache', async () => {
    mockGetMarketDetailsFromGammaApi.mockResolvedValue(v2MarketEvent as never);
    const provider = createProvider();

    const preview = await provider.previewMaxBuyOrder({
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: '123',
      availableBalance: 100,
      signer,
    });
    const result = await provider.placeOrder({
      signer,
      preview: preview as OrderPreview,
    });

    expect(preview?.outcomeVersion).toBe('v2');
    expect(result.success).toBe(true);
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: positionsTradeProtocol,
      }),
    );
  });

  it('routes from the preview version, not the version cache', async () => {
    const provider = createProvider();
    await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: { ...basePreview, outcomeVersion: 'v2' },
    });

    expect(result.success).toBe(true);
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: positionsTradeProtocol,
      }),
    );
  });

  it('fails an order whose preview carries no market version', async () => {
    const provider = createProvider();

    const result = await provider.placeOrder({ signer, preview: basePreview });

    // Every provider preview carries its version — a preview without one is
    // a programming error, and a loud failure beats silently routing an
    // unknown version down the CTF path.
    expect(result.success).toBe(false);
    expect(result.error).toContain('No market version on the preview');
    expect(mockSubmitProtocolClobOrder).not.toHaveBeenCalled();
  });

  it('authorizes v2 fees on pUSD through the positions path', async () => {
    mockCreatePermit2FeeAuthorization.mockResolvedValue({
      type: 'safe-permit2',
      authorization: {
        permit: {
          permitted: { token: MATIC_CONTRACTS_V2.collateral, amount: '100000' },
          nonce: '1',
          deadline: '2',
        },
        spender: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
      },
    });

    const provider = createProvider({
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x2222222222222222222222222222222222222222'],
      },
    });

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        fees: {
          metamaskFee: 0.05,
          providerFee: 0.05,
          totalFee: 0.1,
          totalFeePercentage: 1,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x2222222222222222222222222222222222222222'],
          permit2Enabled: true,
        },
      },
    });

    expect(mockCreatePermit2FeeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenAddress: MATIC_CONTRACTS_V2.collateral,
      }),
    );
    expect(mockBuildTradeAllowancesTx).not.toHaveBeenCalledWith(
      expect.objectContaining({ tradeProtocol: ctfTradeProtocol }),
    );
  });

  it('passes the legacy Safe migration sweep as allowancesTx for deposit-wallet v2 orders', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const sweepTransaction: SignedSafeExecution = {
      params: {
        to: legacySafeAddress as `0x${string}`,
        data: '0xsweep' as `0x${string}`,
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(
      sweepTransaction,
    );

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(true);
    // The sweep keeps the CTF-anchored tokens even on the positions path.
    expect(mockBuildLegacySafeMigrationSweepTransaction).toHaveBeenCalledWith({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'positions' }),
        allowancesTx: sweepTransaction.params,
      }),
    );
  });

  it('fails a v2 order when the positions allowances transaction cannot be built', async () => {
    mockBuildTradeAllowancesTx.mockRejectedValueOnce(
      new Error('allowance build failed'),
    );

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to prepare positions trade preflight');
  });

  it('fails a v1 order when the CTF allowances transaction cannot be built', async () => {
    mockBuildTradeAllowancesTx.mockRejectedValueOnce(
      new Error('allowance build failed'),
    );

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to prepare v2 trade preflight');
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledTimes(1);
    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith(
      expect.objectContaining({ tradeProtocol: ctfTradeProtocol }),
    );
    expect(mockSubmitProtocolClobOrder).not.toHaveBeenCalled();
  });

  it('builds v1 Safe trade allowances with the CTF protocol', async () => {
    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    await provider.placeOrder({
      signer,
      preview: { ...preview, side: Side.SELL },
    });

    expect(mockBuildTradeAllowancesTx).toHaveBeenCalledWith({
      signer,
      safeAddress: legacySafeAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
      tradeProtocol: ctfTradeProtocol,
      safeUsdceBalance: expect.any(BigInt),
    });
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'v2' }),
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            side: Side.SELL,
            signatureType: SignatureType.POLY_GNOSIS_SAFE,
          }),
        }),
      }),
    );
  });

  it('skips the balance sync for deposit-wallet v1 sells when the wallet setup is unchanged', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [],
      transactions: [],
    });

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: { ...preview, side: Side.SELL },
    });

    expect(result.success).toBe(true);
    expect(mockPlanDepositWalletPreflight).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
      protocol: ctfTradeProtocol,
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(
      mockSyncDepositWalletPositionBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'v2' }),
      }),
    );
  });

  it.each([
    ['v1', v1MarketEvent],
    ['v2', v2MarketEvent],
  ])(
    'maps relayer rejections to Predict error codes for %s orders',
    async (_version, event) => {
      const provider = createProvider();
      const preview = await previewWithWarmVersionCache(provider, event);

      mockSubmitProtocolClobOrder.mockResolvedValueOnce({
        success: false,
        error: "order couldn't be fully filled",
      } as never);
      const buyResult = await provider.placeOrder({
        signer,
        preview,
      });

      mockSubmitProtocolClobOrder.mockResolvedValueOnce({
        success: false,
        error: "order couldn't be fully filled",
      } as never);
      const sellResult = await provider.placeOrder({
        signer,
        preview: { ...preview, side: Side.SELL },
      });

      mockSubmitProtocolClobOrder.mockResolvedValueOnce({
        success: false,
        error: 'not available in your region',
      } as never);
      const regionResult = await provider.placeOrder({
        signer,
        preview,
      });

      expect(buyResult.error).toBe(
        PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED,
      );
      expect(sellResult.error).toBe(
        PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED,
      );
      expect(regionResult.error).toBe(PREDICT_ERROR_CODES.NOT_ELIGIBLE);
    },
  );

  it('submits deposit-wallet orders with POLY_1271 payload and no Safe trade preflight fields', async () => {
    const innerSignature = `0x${'11'.repeat(65)}`;
    signer.signTypedMessage.mockResolvedValueOnce(innerSignature);
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const provider = createProvider({
      fakOrdersEnabled: true,
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x4444444444444444444444444444444444444444'],
      },
    });

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        fees: {
          metamaskFee: 0.05,
          providerFee: 0.05,
          totalFee: 0.1,
          totalFeePercentage: 1,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x4444444444444444444444444444444444444444'],
          permit2Enabled: true,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(mockCreateApiKey).toHaveBeenCalledWith({ address: signer.address });
    expect(mockBuildTradeAllowancesTx).not.toHaveBeenCalled();
    expect(mockCreatePermit2FeeAuthorization).not.toHaveBeenCalled();
    expect(mockGetL2Headers).toHaveBeenCalledWith(
      expect.objectContaining({ address: signer.address }),
    );
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      {
        from: signer.address,
        data: expect.objectContaining({
          primaryType: 'TypedDataSign',
          message: expect.objectContaining({
            verifyingContract: depositWalletAddress,
          }),
        }),
      },
      SignTypedDataVersion.V4,
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clobOrder: expect.objectContaining({
          orderType: OrderType.FAK,
          order: expect.objectContaining({
            maker: depositWalletAddress,
            signer: depositWalletAddress,
            signatureType: SignatureType.POLY_1271,
            signature: expect.stringMatching(/^0x11+/u),
          }),
        }),
        feeAuthorization: undefined,
        executor: undefined,
        allowancesTx: undefined,
      }),
    );
  });

  it('runs deposit-wallet setup before submitting deposit-wallet orders', async () => {
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(true);
    expect(mockRequestDepositWalletCreate).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: repairTransaction.to,
          data: repairTransaction.data,
          value: repairTransaction.value,
        },
      ],
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: expect.objectContaining({ apiKey: 'api-key' }),
    });
    expect(
      mockExecuteDepositWalletBatch.mock.invocationCallOrder[0],
    ).toBeLessThan(mockSubmitProtocolClobOrder.mock.invocationCallOrder[0]);
  });

  it('syncs the CONDITIONAL-V2 position balance for deposit-wallet v2 sells', async () => {
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    mockIsSmartContractAddress.mockResolvedValue(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: { ...preview, side: Side.SELL },
    });

    expect(result.success).toBe(true);
    expect(mockPlanDepositWalletPreflight).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
      protocol: positionsTradeProtocol,
    });
    expect(mockSyncDepositWalletPositionBalanceAllowance).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'positions' }),
      signerAddress: signer.address,
      apiKey: expect.objectContaining({ apiKey: 'api-key' }),
      tokenId: '123',
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
  });

  it('keeps the collateral sync for deposit-wallet v2 buys', async () => {
    mockIsSmartContractAddress.mockResolvedValue(false);

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(true);
    expect(
      mockSyncDepositWalletPositionBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: expect.objectContaining({ apiKey: 'api-key' }),
    });
  });

  it('syncs the position balance for v2 sells even when the wallet setup is unchanged', async () => {
    // The deposit wallet is already deployed and the positions preflight
    // plans no repair transactions, so the wallet setup did not change — a
    // sell still needs the CONDITIONAL-V2 position balance refreshed before
    // the relayer accepts the order.
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [],
      transactions: [],
    });

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v2MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview: { ...preview, side: Side.SELL },
    });

    expect(result.success).toBe(true);
    expect(mockPlanDepositWalletPreflight).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
      protocol: positionsTradeProtocol,
    });
    expect(mockSyncDepositWalletPositionBalanceAllowance).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'positions' }),
      signerAddress: signer.address,
      apiKey: expect.objectContaining({ apiKey: 'api-key' }),
      tokenId: '123',
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({ key: 'positions' }),
      }),
    );
  });

  it('passes legacy Safe migration sweep as allowancesTx for deposit-wallet orders', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const sweepTransaction: SignedSafeExecution = {
      params: {
        to: legacySafeAddress as `0x${string}`,
        data: '0xsweep' as `0x${string}`,
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(
      sweepTransaction,
    );

    const provider = createProvider();

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    const result = await provider.placeOrder({
      signer,
      preview,
    });

    expect(result.success).toBe(true);
    expect(mockBuildLegacySafeMigrationSweepTransaction).toHaveBeenCalledWith({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            maker: depositWalletAddress,
            signer: depositWalletAddress,
            signatureType: SignatureType.POLY_1271,
          }),
        }),
        allowancesTx: sweepTransaction.params,
      }),
    );
  });

  it('uses pUSD Permit2 fee authorization when fees are present', async () => {
    mockCreatePermit2FeeAuthorization.mockResolvedValue({
      type: 'safe-permit2',
      authorization: {
        permit: {
          permitted: { token: MATIC_CONTRACTS_V2.collateral, amount: '100000' },
          nonce: '1',
          deadline: '2',
        },
        spender: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
      },
    });

    const provider = createProvider({
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x2222222222222222222222222222222222222222'],
      },
    });

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        fees: {
          metamaskFee: 0.05,
          providerFee: 0.05,
          totalFee: 0.1,
          totalFeePercentage: 1,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x2222222222222222222222222222222222222222'],
          permit2Enabled: true,
        },
      },
    });

    expect(mockCreatePermit2FeeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: '0x9999999999999999999999999999999999999999',
        tokenAddress: MATIC_CONTRACTS_V2.collateral,
      }),
    );
  });

  it('authorizes the remaining provider fee with pUSD Permit2 for membership orders', async () => {
    const providerFee = 0.05;
    const feeAuthorization = {
      type: 'safe-permit2' as const,
      authorization: {
        permit: {
          permitted: { token: MATIC_CONTRACTS_V2.collateral, amount: '50000' },
          nonce: '1',
          deadline: '2',
        },
        spender: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
      },
    };
    mockCreatePermit2FeeAuthorization.mockResolvedValue(feeAuthorization);

    const provider = createProvider({
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x2222222222222222222222222222222222222222'],
      },
    });

    const preview = await previewWithWarmVersionCache(provider, v1MarketEvent);

    await provider.placeOrder({
      signer,
      preview: {
        ...preview,
        fees: {
          metamaskFee: 0,
          providerFee,
          totalFee: providerFee,
          totalFeePercentage: 0.5,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x2222222222222222222222222222222222222222'],
          permit2Enabled: true,
        },
        feePolicy: {
          builderCode:
            '0x4444444444444444444444444444444444444444444444444444444444444444',
        },
      },
    });

    expect(mockCreatePermit2FeeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: '0x9999999999999999999999999999999999999999',
        tokenAddress: MATIC_CONTRACTS_V2.collateral,
        amount: BigInt(parseUnits(providerFee.toString(), 6).toString()),
        spender: '0x2222222222222222222222222222222222222222',
      }),
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        feeAuthorization,
        executor: '0x2222222222222222222222222222222222222222',
      }),
    );
  });

  it('prepares pUSD deposits and optional legacy sweep maintenance', async () => {
    mockBuildDepositMaintenanceTransaction.mockResolvedValue({
      params: {
        to: '0x9999999999999999999999999999999999999999',
        data: '0xmaintenance',
      },
      type: TransactionType.contractInteraction,
    });

    const result = await createProvider().prepareDeposit({ signer });

    expect(result.chainId).toBe(CHAIN_IDS.POLYGON);
    expect(mockGetDeployProxyWalletTransaction).not.toHaveBeenCalled();
    expect(result.transactions).toEqual([
      {
        params: {
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransferData',
        },
        type: TransactionType.predictDeposit,
      },
      expect.objectContaining({
        params: {
          to: '0x9999999999999999999999999999999999999999',
          data: '0xmaintenance',
        },
      }),
    ]);
  });

  it('prepares deposit-wallet deposits with optional legacy Safe sweep first', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sweepTransaction: SignedSafeExecution = {
      params: {
        to: legacySafeAddress,
        data: '0xsweep',
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(
      sweepTransaction,
    );

    const result = await createProvider().prepareDeposit({ signer });

    expect(result.chainId).toBe(CHAIN_IDS.POLYGON);
    expect(mockBuildLegacySafeMigrationSweepTransaction).toHaveBeenCalledWith({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(result.transactions).toEqual([
      sweepTransaction,
      {
        params: {
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransferData',
        },
        type: TransactionType.predictDeposit,
      },
    ]);
    expect(mockRequestDepositWalletCreate).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).not.toHaveBeenCalled();
  });

  it('reads displayed Predict balance from pUSD plus legacy USDC.e', async () => {
    mockGetBalance.mockResolvedValue(12.5);
    mockGetRawBalance.mockResolvedValue(2_500_000n);

    const balance = await createProvider().getBalance({
      address: signer.address,
    });

    expect(balance).toBe(15);
    expect(mockGetBalance).toHaveBeenCalledTimes(1);
    expect(mockGetBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: MATIC_CONTRACTS_V2.collateral,
    });
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: USDC_E_ADDRESS,
    });
  });

  it('caches zero legacy USDC.e balances in memory', async () => {
    mockGetBalance.mockResolvedValue(12.5);
    mockGetRawBalance.mockResolvedValue(0n);
    const provider = createProvider();

    await provider.getBalance({ address: signer.address });
    await provider.getBalance({ address: signer.address });

    expect(mockGetBalance).toHaveBeenCalledTimes(2);
    expect(mockGetRawBalance).toHaveBeenCalledTimes(1);
  });

  it('reads deposit-wallet collateral while checking whether the legacy Safe exists', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const provider = createProvider();
    await provider.getAccountState({ ownerAddress: signer.address });
    mockIsSmartContractAddress.mockClear();
    mockGetRawBalance.mockClear();

    let resolveDeployment: (deployed: boolean) => void = () => undefined;
    let resolveDepositBalance: (balance: bigint) => void = () => undefined;
    mockIsSmartContractAddress.mockReturnValue(
      new Promise((resolve) => {
        resolveDeployment = resolve;
      }),
    );
    mockGetRawBalance.mockReturnValue(
      new Promise((resolve) => {
        resolveDepositBalance = resolve;
      }),
    );

    const pendingBalance = provider.getBalance({ address: signer.address });
    await flushPromises();

    expect(mockGetRawBalance).toHaveBeenCalledTimes(1);
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: depositWalletAddress,
      tokenAddress: MATIC_CONTRACTS_V2.collateral,
    });
    expect(mockIsSmartContractAddress).toHaveBeenCalledTimes(1);
    expect(mockIsSmartContractAddress).toHaveBeenCalledWith(
      legacySafeAddress,
      '0x89',
    );

    resolveDeployment(false);
    resolveDepositBalance(1_500_000n);

    await expect(pendingBalance).resolves.toBe(1.5);
    expect(mockGetRawBalance).toHaveBeenCalledTimes(1);
  });

  it('adds deployed legacy Safe collateral to the deposit-wallet balance', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    const provider = createProvider();
    await provider.getAccountState({ ownerAddress: signer.address });

    mockIsSmartContractAddress.mockResolvedValue(true);
    mockGetRawBalance.mockImplementation(async ({ address, tokenAddress }) => {
      if (address === depositWalletAddress) {
        return 1_000_000n;
      }
      if (tokenAddress === USDC_E_ADDRESS) {
        return 3_000_000n;
      }
      return 2_000_000n;
    });

    const balance = await provider.getBalance({ address: signer.address });

    expect(balance).toBe(6);
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: depositWalletAddress,
      tokenAddress: MATIC_CONTRACTS_V2.collateral,
    });
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: legacySafeAddress,
      tokenAddress: MATIC_CONTRACTS_V2.collateral,
    });
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: legacySafeAddress,
      tokenAddress: USDC_E_ADDRESS,
    });
  });

  it('runs deposit-wallet beforePublish deployment and allowance preflight', async () => {
    const provider = createProvider();
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });

    const result = await provider.beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: depositWalletAddress,
      }),
      getSigner: () => signer,
    });

    expect(result).toBe(true);
    expect(mockResolveDepositWalletAddress).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(mockRequestDepositWalletCreate).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenNthCalledWith(1, {
      transactionID: 'create-1',
      requireCompletion: true,
    });
    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledTimes(1);
    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
    });
    expect(mockAnalyticsIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CREATED_POLYMARKET_ACCOUNT_VIA_MM]: true,
    });
    const walletCreationEvent = mockAnalyticsTrackEvent.mock.calls
      .map((call) => call[0])
      .find(
        (event) =>
          event?.properties?.transaction_type ===
            'mm_predict_wallet_creation' &&
          event?.properties?.status === 'succeeded',
      );
    expect(walletCreationEvent).toBeDefined();
    expect(walletCreationEvent?.properties?.entry_point).toBe('background');
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: repairTransaction.to,
          value: repairTransaction.value,
          data: repairTransaction.data,
        },
      ],
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenNthCalledWith(2, {
      transactionID: 'batch-1',
      requireCompletion: true,
    });
  });

  it('tracks failed wallet creation when the relayer create request fails', async () => {
    const provider = createProvider();
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    mockRequestDepositWalletCreate.mockRejectedValueOnce(
      new Error('relayer unavailable'),
    );

    await expect(
      provider.beforePublishDepositWalletDeposit({
        transactionMeta: createDepositTransactionMeta({
          recipient: depositWalletAddress,
        }),
        getSigner: () => signer,
      }),
    ).rejects.toThrow('relayer unavailable');

    const walletCreationEvent = mockAnalyticsTrackEvent.mock.calls
      .map((call) => call[0])
      .find(
        (event) =>
          event?.properties?.transaction_type ===
            'mm_predict_wallet_creation' &&
          event?.properties?.status === 'failed',
      );
    expect(walletCreationEvent).toBeDefined();
    expect(walletCreationEvent?.properties?.failure_reason).toBe(
      'relayer unavailable',
    );
  });

  it('does not track failed wallet creation when waiting fails after the relayer accepted', async () => {
    const provider = createProvider();
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    // The relayer accepted the create request, but local polling failed
    // afterwards — the wallet may still have been created remotely.
    mockWaitForDepositWalletTransaction.mockRejectedValueOnce(
      new Error('polling timed out'),
    );

    await expect(
      provider.beforePublishDepositWalletDeposit({
        transactionMeta: createDepositTransactionMeta({
          recipient: depositWalletAddress,
        }),
        getSigner: () => signer,
      }),
    ).rejects.toThrow('polling timed out');

    const walletCreationEvents = mockAnalyticsTrackEvent.mock.calls
      .map((call) => call[0])
      .filter(
        (event) =>
          event?.properties?.transaction_type === 'mm_predict_wallet_creation',
      );
    expect(walletCreationEvents).toHaveLength(1);
    expect(walletCreationEvents[0]?.properties?.status).toBe('succeeded');
  });

  it('waits for WALLET-CREATE polling before submitting allowance batch', async () => {
    const provider = createProvider();
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    let resolveCreateWait: () => void = jest.fn();
    const createWaitPromise = new Promise<`0x${string}`>((resolve) => {
      resolveCreateWait = () =>
        resolve(
          '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        );
    });
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });
    mockWaitForDepositWalletTransaction
      .mockImplementationOnce(() => createWaitPromise)
      .mockResolvedValueOnce(
        '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      );

    const publishPromise = provider.beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: depositWalletAddress,
      }),
      getSigner: () => signer,
    });

    await flushPromises();

    expect(mockRequestDepositWalletCreate).toHaveBeenCalled();
    expect(mockWaitForDepositWalletDeployed).not.toHaveBeenCalled();
    expect(mockExecuteDepositWalletBatch).not.toHaveBeenCalled();

    resolveCreateWait();
    await publishPromise;

    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalled();
    const deployedCallOrder =
      mockWaitForDepositWalletDeployed.mock.invocationCallOrder[0] ?? 0;
    const executeCallOrder =
      mockExecuteDepositWalletBatch.mock.invocationCallOrder[0] ?? 0;
    expect(deployedCallOrder).toBeLessThan(executeCallOrder);
  });

  it('does not run deposit-wallet beforePublish for Safe deposits', async () => {
    const result = await createProvider().beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: legacySafeAddress,
      }),
      getSigner: () => signer,
    });

    expect(result).toBe(true);
    expect(mockRequestDepositWalletCreate).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).not.toHaveBeenCalled();
  });

  describe('prepareClaim', () => {
    const gammaConditionId =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    it('passes resolved gamma market versions into the claim build', async () => {
      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce({
        markets: [
          {
            conditionId: gammaConditionId,
            version: 'v2',
          },
        ],
      } as never);
      const provider = createProvider();

      const result = await provider.prepareClaim({
        positions: [createClaimPosition()],
        signer,
      });

      expect(mockGetMarketDetailsFromGammaApi).toHaveBeenCalledWith({
        marketId: 'market-1',
      });
      expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          marketVersions: { [gammaConditionId]: 'v2' },
        }),
      );
      expect(result.marketVersions).toEqual({ [gammaConditionId]: 'v2' });
    });

    it('keeps the CTF claim when the gamma market has no v2 version', async () => {
      mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce({
        markets: [
          {
            conditionId: gammaConditionId,
          },
        ],
      } as never);
      const provider = createProvider();

      await provider.prepareClaim({
        positions: [createClaimPosition()],
        signer,
      });

      expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          marketVersions: { [gammaConditionId]: undefined },
        }),
      );
    });

    it('keeps the CTF claim when the gamma lookup fails', async () => {
      mockGetMarketDetailsFromGammaApi.mockRejectedValueOnce(
        new Error('gamma unavailable'),
      );
      const provider = createProvider();

      const result = await provider.prepareClaim({
        positions: [createClaimPosition()],
        signer,
      });

      expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          marketVersions: { [gammaConditionId]: undefined },
        }),
      );
      expect(result.marketVersions).toEqual({ [gammaConditionId]: undefined });
    });

    describe('Protocol V2 markets kill switch', () => {
      const v1ConditionId = gammaConditionId;
      const v2ConditionId =
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const v1Position = createClaimPosition({
        id: 'v1-position',
        outcomeId: v1ConditionId,
        status: PredictPositionStatus.WON,
      });
      const v2Position = createClaimPosition({
        id: 'v2-position',
        outcomeId: v2ConditionId,
        status: PredictPositionStatus.WON,
      });

      beforeEach(() => {
        jest.clearAllMocks();
        mockGetMarketDetailsFromGammaApi.mockResolvedValue({
          markets: [
            { conditionId: v1ConditionId, version: 'v1' },
            { conditionId: v2ConditionId, version: 'v2' },
          ],
        } as never);
      });

      it('claims only the CTF positions of a mixed batch when the kill switch is on', async () => {
        const result = await createProvider({
          disablePolymarketV2Markets: true,
        }).prepareClaim({ positions: [v1Position, v2Position], signer });

        expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ positions: [v1Position] }),
        );
        expect(result.positions).toEqual([v1Position]);
        expect(result.marketVersions).toEqual({
          [v1ConditionId]: undefined,
          [v2ConditionId]: 'v2',
        });
      });

      it('throws MARKET_UNAVAILABLE when every position is v2 and the kill switch is on', async () => {
        await expect(
          createProvider({ disablePolymarketV2Markets: true }).prepareClaim({
            positions: [v2Position],
            signer,
          }),
        ).rejects.toThrow(PREDICT_ERROR_CODES.MARKET_UNAVAILABLE);
        expect(mockBuildClaimTransaction).not.toHaveBeenCalled();
      });

      it('throws MARKET_UNAVAILABLE when only losing CTF positions are left after skipping v2', async () => {
        const lostV1Position = {
          ...v1Position,
          status: PredictPositionStatus.LOST,
        };

        await expect(
          createProvider({ disablePolymarketV2Markets: true }).prepareClaim({
            positions: [lostV1Position, v2Position],
            signer,
          }),
        ).rejects.toThrow(PREDICT_ERROR_CODES.MARKET_UNAVAILABLE);
        expect(mockBuildClaimTransaction).not.toHaveBeenCalled();
      });

      it('claims a CTF-only batch unchanged when the kill switch is on', async () => {
        const positions = [v1Position];

        const result = await createProvider({
          disablePolymarketV2Markets: true,
        }).prepareClaim({ positions, signer });

        expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ positions }),
        );
        expect(result.positions).toEqual(positions);
      });

      it('claims every position of a mixed batch when the kill switch is off', async () => {
        const positions = [v1Position, v2Position];

        const result = await createProvider({
          disablePolymarketV2Markets: false,
        }).prepareClaim({ positions, signer });

        expect(mockBuildClaimTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            positions,
            marketVersions: {
              [v1ConditionId]: undefined,
              [v2ConditionId]: 'v2',
            },
          }),
        );
        expect(result.positions).toBe(positions);
      });
    });
  });

  it('marks deposit-wallet claim transactions as externally signed before signing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const provider = createProvider();
    const transactionMeta = {
      id: 'claim-tx',
      txParams: {
        from: signer.address,
        nonce: '0x1',
      },
    } as TransactionMeta;

    const result = await provider.beforeSignClaim({
      transactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result?.updateTransaction).toBeDefined();

    result?.updateTransaction?.(transactionMeta);
    expect(transactionMeta.isExternalSign).toBe(true);
    expect(transactionMeta.isGasFeeTokenIgnoredIfBalance).toBe(false);
    expect(transactionMeta.selectedGasFeeToken).toBeUndefined();
    expect(transactionMeta.txParams.nonce).toBeUndefined();
  });

  it('passes through Safe claims before signing when gas fee tokens are pending', async () => {
    const result = await createProvider().beforeSignClaim({
      transactionMeta: {
        id: 'claim-tx',
        txParams: { from: signer.address },
        selectedGasFeeToken: MATIC_CONTRACTS_V2.collateral,
        isGasFeeTokenIgnoredIfBalance: true,
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toBeUndefined();
  });

  it('passes through Safe claims when the selected gas fee token is missing from gasFeeTokens', async () => {
    const result = await createProvider().beforeSignClaim({
      transactionMeta: {
        id: 'claim-tx',
        txParams: { from: signer.address },
        selectedGasFeeToken: MATIC_CONTRACTS_V2.collateral,
        isGasFeeTokenIgnoredIfBalance: true,
        gasFeeTokens: [] as GasFeeToken[],
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toBeUndefined();
  });

  it('passes through Safe claims when gasFeeTokens does not include the selected token', async () => {
    const result = await createProvider().beforeSignClaim({
      transactionMeta: {
        id: 'claim-tx',
        txParams: { from: signer.address },
        selectedGasFeeToken: MATIC_CONTRACTS_V2.collateral,
        isGasFeeTokenIgnoredIfBalance: true,
        gasFeeTokens: [
          {
            tokenAddress: '0x1111111111111111111111111111111111111111',
          },
        ] as unknown as GasFeeToken[],
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toBeUndefined();
  });

  it('passes through Safe claim publishing', async () => {
    const result = await createProvider().publishClaim({
      transactionMeta: {
        id: 'claim-tx',
        isExternalSign: true,
        txParams: { from: signer.address },
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toEqual({ transactionHash: undefined });
    expect(mockPlanDepositWalletClaim).not.toHaveBeenCalled();
    expect(mockExecuteDepositWalletBatch).not.toHaveBeenCalled();
  });

  it('publishes deposit-wallet claims through the relayer batch and returns once a hash is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    mockWaitForDepositWalletTransaction.mockResolvedValue(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    );

    const positions = [createClaimPosition()];
    mockGetMarketDetailsFromGammaApi.mockResolvedValueOnce({
      markets: [
        {
          conditionId: positions[0].outcomeId,
          version: 'v2',
        },
      ],
    } as never);

    const result = await createProvider().publishClaim({
      transactionMeta: {
        id: 'claim-tx',
        isExternalSign: true,
        txParams: { from: signer.address },
      } as TransactionMeta,
      signer,
      positions,
    });

    expect(mockPlanDepositWalletClaim).toHaveBeenCalledWith({
      positions,
      walletAddress: depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
      marketVersions: { [positions[0].outcomeId]: 'v2' },
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: MATIC_CONTRACTS_V2.collateral,
          value: '0',
          data: '0xclaim',
        },
      ],
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenCalledWith({
      transactionID: 'batch-1',
    });
    expect(result).toEqual({
      transactionHash:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    });
  });

  it('requires external-sign metadata before publishing deposit-wallet claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      createProvider().publishClaim({
        transactionMeta: {
          id: 'claim-tx',
          txParams: { from: signer.address },
        } as TransactionMeta,
        signer,
        positions: [createClaimPosition()],
      }),
    ).rejects.toThrow(
      'Deposit wallet claim publish requires external-sign transaction',
    );
  });

  it('syncs deposit-wallet CLOB balance allowance after confirmed claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    createProvider().confirmClaim({
      positions: [createClaimPosition()],
      signer,
    });
    await flushPromises();

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
  });

  it('does not sync claim balance allowance for Safe users', async () => {
    createProvider().confirmClaim({
      positions: [createClaimPosition()],
      signer,
    });
    await flushPromises();

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
  });

  it('syncs deposit-wallet CLOB balance allowance after matching deposits', async () => {
    await createProvider().syncDepositWalletBalanceAllowanceForDepositTransaction(
      {
        transactionMeta: createDepositTransactionMeta({
          recipient: depositWalletAddress,
        }),
        signerAddress: signer.address,
      },
    );

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
  });

  it('skips CLOB sync for Safe deposits', async () => {
    await createProvider().syncDepositWalletBalanceAllowanceForDepositTransaction(
      {
        transactionMeta: createDepositTransactionMeta({
          recipient: legacySafeAddress,
        }),
        signerAddress: signer.address,
      },
    );

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
  });

  it('prepares editable pUSD withdraw transfers', async () => {
    const result = await createProvider().prepareWithdraw({ signer });

    expect(result.predictAddress).toBe(
      '0x9999999999999999999999999999999999999999',
    );
    expect(result.transaction).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransfer',
        }),
        type: TransactionType.predictWithdraw,
      }),
    );
  });

  it('signs pUSD Safe withdraw executions', async () => {
    const result = await createProvider().signWithdraw?.({
      signer,
      callData: '0xtransfer',
    });

    expect(mockBuildWithdrawTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        signer,
        safeAddress: '0x9999999999999999999999999999999999999999',
        requestedAmountRaw: 1_000_000n,
        protocol: expect.objectContaining({ key: 'v2' }),
      }),
    );
    expect(result).toEqual({
      callData: '0xsignedWithdraw',
      amount: 1,
      walletType: 'safe',
    });
  });

  it('leaves deposit-wallet withdrawals for external signing', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const provider = createProvider();
    await provider.prepareWithdraw({ signer });

    const result = await provider.signWithdraw?.({
      signer,
      callData: '0xtransfer',
    });

    expect(mockBuildWithdrawTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      callData: '0xtransfer',
      amount: 1,
      walletType: 'deposit-wallet',
    });
  });

  it('builds the Safe withdraw simulation call with the requested amount', async () => {
    const result = await createProvider().getWithdrawSimulation({
      signer,
      amountRaw: 2_000_000n,
    });

    expect(mockBuildUnsignedWithdrawTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        signer,
        safeAddress: '0x9999999999999999999999999999999999999999',
        requestedAmountRaw: 2_000_000n,
        protocol: expect.objectContaining({ key: 'v2' }),
        safeLegacyUsdceBalance: 0n,
      }),
    );
    expect(result).toEqual({
      chainId: CHAIN_IDS.POLYGON,
      from: signer.address,
      to: '0x9999999999999999999999999999999999999999',
      data: '0xpreValidatedWithdraw',
    });
  });

  it('returns no withdraw simulation for deposit wallets', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await createProvider().getWithdrawSimulation({
      signer,
      amountRaw: 2_000_000n,
    });

    expect(mockBuildUnsignedWithdrawTransaction).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('gets spot crypto price history from the current Polymarket price history API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { timestamp: 999000, value: 9 },
        { timestamp: 1000000, value: 10 },
        { timestamp: 1060000, value: 11 },
        { timestamp: 'invalid', value: 12 },
      ]),
    });

    const result = await createProvider().getCryptoPriceHistory({
      symbol: ' btc ',
      eventStartTime: '1000',
      variant: 'hourly',
      endDate: '1120',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://polymarket.com/api/crypto/price-history?symbol=BTC&eventStartTime=1000&variant=hourly&endDate=1120',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual([
      { timestamp: 999000, value: 9 },
      { timestamp: 1000000, value: 10 },
      { timestamp: 1060000, value: 11 },
    ]);
  });

  it('gets TWAP price history from the current Polymarket price history API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { timestamp: 1787158800000, value: 68449.07681200188 },
        { timestamp: 1787158805000, value: 68450.56902128145 },
        { timestamp: 'invalid', value: 68455 },
      ]),
    });
    const params = {
      symbol: ' btc ',
      eventStartTime: '2026-08-19T17:00:00Z',
      variant: 'fiveminute',
      endDate: '2026-08-19T17:05:00Z',
      twapWindowSeconds: 60 as const,
    };

    const result = await createProvider().getCryptoPriceHistory(params);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://polymarket.com/api/crypto/price-history?symbol=BTC&eventStartTime=2026-08-19T17%3A00%3A00Z&variant=fiveminute&endDate=2026-08-19T17%3A05%3A00Z&twapEnabled=true&twapLookbackSeconds=60',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual([
      { timestamp: 1787158800000, value: 68449.07681200188 },
      { timestamp: 1787158805000, value: 68450.56902128145 },
    ]);
  });

  it.each(['fiveminute', 'fifteen', 'hourly', 'fourhour', 'daily'])(
    'forwards the %s variant to the current price history API',
    async (variant) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      const provider = createProvider();
      const eventStartTime = '1970-01-01T00:00:00.000Z';

      await provider.getCryptoPriceHistory({
        symbol: 'BTC',
        eventStartTime,
        variant,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `https://polymarket.com/api/crypto/price-history?symbol=BTC&eventStartTime=1970-01-01T00%3A00%3A00.000Z&variant=${variant}`,
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );

  it('rethrows crypto price history errors after logging', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });

    await expect(
      createProvider().getCryptoPriceHistory({
        symbol: 'BTC',
        eventStartTime: '2025-01-01T00:00:00Z',
        variant: 'hourly',
      }),
    ).rejects.toThrow('Failed to get crypto price history');
  });

  it('downgrades transient network failures to a breadcrumb instead of a Sentry error', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger').default;
    (Logger.error as jest.Mock).mockClear();
    (Logger.log as jest.Mock).mockClear();
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));

    await expect(
      createProvider().getCryptoPriceHistory({
        symbol: 'BTC',
        eventStartTime: '2025-01-01T00:00:00Z',
        variant: 'hourly',
      }),
    ).rejects.toThrow('Network request failed');

    expect(Logger.error).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      'Predict crypto price history fetch failed (transient network/availability):',
      'Network request failed',
      expect.any(Object),
    );
  });

  it('still reports unexpected (non-network) crypto price history errors to Sentry', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger').default;
    (Logger.error as jest.Mock).mockClear();
    (Logger.log as jest.Mock).mockClear();
    const unexpectedError = new Error('Unexpected parsing failure');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(unexpectedError),
    });

    await expect(
      createProvider().getCryptoPriceHistory({
        symbol: 'BTC',
        eventStartTime: '2025-01-01T00:00:00Z',
        variant: 'hourly',
      }),
    ).rejects.toThrow('Unexpected parsing failure');

    expect(Logger.error).toHaveBeenCalledWith(
      unexpectedError,
      expect.any(Object),
    );
  });

  describe('getPriceHistory (Data API v2)', () => {
    const PRICES_HISTORY_URL =
      'https://data-api.polymarket.com/v2/prices-history';

    const createPriceHistoryPage = (
      data: unknown[],
      nextCursor: string | null = null,
    ) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({
        data,
        pagination: {
          limit: 10000,
          offset: 0,
          has_more: nextCursor !== null,
          next_cursor: nextCursor,
        },
      }),
    });

    const createErrorResponse = (
      status: number,
      headers: Record<string, string> = {},
    ) => ({
      ok: false,
      status,
      headers: new Headers(headers),
      json: jest.fn().mockResolvedValue({
        error: 'error',
        code: 'invalid_request',
      }),
    });

    const getRequestedUrl = (callIndex = 0): URL =>
      new URL((global.fetch as jest.Mock).mock.calls[callIndex][0]);

    let Logger: { error: jest.Mock; log: jest.Mock };

    beforeEach(() => {
      Logger = jest.requireMock('../../../../../util/Logger').default;
      Logger.error.mockClear();
    });

    it('requests the Data API v2 route with token_id, interval and bucket_seconds', async () => {
      global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

      await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        fidelity: 5,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const url = getRequestedUrl();
      expect(`${url.origin}${url.pathname}`).toBe(PRICES_HISTORY_URL);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        token_id: 'token-123',
        interval: '1h',
        bucket_seconds: '300',
      });
    });

    it('never calls the deprecated CLOB prices-history route', async () => {
      global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

      await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: 60,
      });

      expect(
        String((global.fetch as jest.Mock).mock.calls[0][0]),
      ).not.toContain('clob.polymarket.com');
    });

    it.each([
      [PredictPriceHistoryInterval.ONE_HOUR, 5, '300'],
      [PredictPriceHistoryInterval.SIX_HOUR, 15, '900'],
      [PredictPriceHistoryInterval.ONE_DAY, 60, '3600'],
      [PredictPriceHistoryInterval.ONE_WEEK, 240, '14400'],
      [PredictPriceHistoryInterval.ONE_MONTH, 720, '43200'],
      [PredictPriceHistoryInterval.MAX, 1440, '86400'],
    ])(
      'converts %s fidelity %i minutes to bucket_seconds %s',
      async (interval, fidelity, bucketSeconds) => {
        global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

        await createProvider().getPriceHistory({
          marketId: 'token-123',
          interval,
          fidelity,
        });

        expect(getRequestedUrl().searchParams.get('interval')).toBe(interval);
        expect(getRequestedUrl().searchParams.get('bucket_seconds')).toBe(
          bucketSeconds,
        );
      },
    );

    it.each([
      [0.5, '60'],
      [2880, '86400'],
    ])(
      'clamps fidelity %d minutes to bucket_seconds %s',
      async (fidelity, bucketSeconds) => {
        global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

        await createProvider().getPriceHistory({
          marketId: 'token-123',
          interval: PredictPriceHistoryInterval.ONE_DAY,
          fidelity,
        });

        expect(getRequestedUrl().searchParams.get('bucket_seconds')).toBe(
          bucketSeconds,
        );
      },
    );

    it('omits bucket_seconds when no fidelity is given', async () => {
      global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

      await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_DAY,
      });

      expect(getRequestedUrl().searchParams.has('bucket_seconds')).toBe(false);
    });

    it('sends start/end instead of interval for an explicit window', async () => {
      global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

      await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        startTs: 1_700_000_000,
        endTs: 1_700_010_800,
      });

      expect(Object.fromEntries(getRequestedUrl().searchParams)).toEqual({
        token_id: 'token-123',
        start: '1700000000',
        end: '1700010800',
      });
    });

    it('falls back to interval when only one end of the window is set', async () => {
      global.fetch = jest.fn().mockResolvedValue(createPriceHistoryPage([]));

      await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        startTs: 1_700_000_000,
      });

      const params = getRequestedUrl().searchParams;
      expect(params.get('interval')).toBe('1h');
      expect(params.has('start')).toBe(false);
    });

    it('returns an empty series without a request when no window is given', async () => {
      global.fetch = jest.fn();

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        fidelity: 2,
      });

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('throws when marketId is missing', async () => {
      await expect(
        createProvider().getPriceHistory({ marketId: '' }),
      ).rejects.toThrow('marketId parameter is required');
    });

    it('maps data points to timestamp and price, dropping malformed rows', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          createPriceHistoryPage([
            { timestamp: 1_700_000_000, price: 0.42, resolution_seconds: 300 },
            { timestamp: 1_700_000_300, price: 0.45, resolution_seconds: 300 },
            { timestamp: '1700000600', price: 0.5, resolution_seconds: 300 },
            { timestamp: 1_700_000_900, price: null, resolution_seconds: 300 },
            null,
            { timestamp: 1_700_000_973, price: 0.47, resolution_seconds: 0 },
          ]),
        );

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        fidelity: 5,
      });

      expect(result).toEqual([
        { timestamp: 1_700_000_000, price: 0.42 },
        { timestamp: 1_700_000_300, price: 0.45 },
        { timestamp: 1_700_000_973, price: 0.47 },
      ]);
    });

    it('returns an empty series when the response has no data array', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ history: [{ t: 1, p: 0.5 }] }),
      });

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
      });

      expect(result).toEqual([]);
    });

    it('follows next_cursor with the original query until it is null', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          createPriceHistoryPage(
            [{ timestamp: 100, price: 0.1, resolution_seconds: 43200 }],
            'cursor-2',
          ),
        )
        .mockResolvedValueOnce(
          createPriceHistoryPage([
            { timestamp: 200, price: 0.2, resolution_seconds: 0 },
          ]),
        );

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.MAX,
        fidelity: 1440,
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(getRequestedUrl(0).searchParams.has('cursor')).toBe(false);
      expect(Object.fromEntries(getRequestedUrl(1).searchParams)).toEqual({
        token_id: 'token-123',
        interval: 'max',
        bucket_seconds: '86400',
        cursor: 'cursor-2',
      });
      expect(result).toEqual([
        { timestamp: 100, price: 0.1 },
        { timestamp: 200, price: 0.2 },
      ]);
    });

    it('stops following cursors after the page cap', async () => {
      global.fetch = jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            createPriceHistoryPage(
              [{ timestamp: 100, price: 0.1, resolution_seconds: 60 }],
              'cursor-next',
            ),
          ),
        );

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.MAX,
      });

      expect(global.fetch).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(5);
    });

    it('returns an empty series on 429 without retrying, logging status and Retry-After', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(createErrorResponse(429, { 'Retry-After': '30' }));

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: 60,
      });

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to get price history (HTTP 429)',
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              method: 'getPriceHistory',
              marketId: 'token-123',
              status: 429,
              retryAfter: '30',
            }),
          }),
        }),
      );
    });

    it('stops the cursor walk and discards partial pages on 503', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          createPriceHistoryPage(
            [{ timestamp: 100, price: 0.1, resolution_seconds: 43200 }],
            'cursor-2',
          ),
        )
        .mockResolvedValueOnce(
          createErrorResponse(503, { 'Retry-After': '5' }),
        );

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.MAX,
      });

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to get price history (HTTP 503)',
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({ status: 503, retryAfter: '5' }),
          }),
        }),
      );
    });

    it('returns an empty series on 400 and logs a null Retry-After', async () => {
      global.fetch = jest.fn().mockResolvedValue(createErrorResponse(400));

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        startTs: 1_700_000_000,
        endTs: 1_702_000_000,
      });

      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to get price history (HTTP 400)',
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({ status: 400, retryAfter: null }),
          }),
        }),
      );
    });

    it('returns an empty series when the request fails', async () => {
      const networkError = new Error('Network request failed');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      const result = await createProvider().getPriceHistory({
        marketId: 'token-123',
        interval: PredictPriceHistoryInterval.ONE_HOUR,
      });

      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.not.objectContaining({ status: expect.anything() }),
          }),
        }),
      );
    });
  });

  describe('getPositions (Data API v2)', () => {
    const createPositionRow = (overrides: Record<string, unknown> = {}) => ({
      condition_id: '0xcondition',
      event_id: 'event-1',
      icon: 'icon.png',
      title: 'Market',
      slug: 'market-slug',
      current_size: 20,
      outcome: 'Yes',
      outcome_index: 0,
      unrealized_pnl: 5,
      current_price: 0.75,
      current_value: 15,
      entry_cost_usdc: 10,
      avg_price: 0.5,
      redeemable: false,
      negative_risk: false,
      realized_pnl: 0,
      end_date: '2026-12-31',
      token_id: 'token-1',
      ...overrides,
    });

    const mappedPositionRow = {
      conditionId: '0xcondition',
      eventId: 'event-1',
      icon: 'icon.png',
      title: 'Market',
      slug: 'market-slug',
      eventSlug: undefined,
      size: 20,
      outcome: 'Yes',
      outcomeIndex: 0,
      cashPnl: 5,
      curPrice: 0.75,
      currentValue: 15,
      percentPnl: 50,
      initialValue: 10,
      avgPrice: 0.5,
      redeemable: false,
      negativeRisk: false,
      realizedPnl: 0,
      endDate: '2026-12-31',
      asset: 'token-1',
    };

    const mockActivityCheck = () =>
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [{}] }),
      });

    const mockPositionsPage = (
      rows: unknown[],
      nextCursor: string | null = null,
    ) => {
      const body = JSON.stringify({
        data: rows,
        pagination: { next_cursor: nextCursor },
      });
      return (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(body),
        json: jest.fn().mockResolvedValue(JSON.parse(body)),
      });
    };

    it('reads open positions from the v2 route with envelope + CURRENT_VALUE sort', async () => {
      mockActivityCheck();
      mockPositionsPage([createPositionRow()]);

      await createProvider().getPositions({ address: signer.address });

      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(mockParsePolymarketPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          positions: [mappedPositionRow],
        }),
      );
    });

    it('maps claimable reads to both settled statuses (winners and lost)', async () => {
      mockActivityCheck();
      mockPositionsPage([]);
      mockPositionsPage([]);

      await createProvider().getPositions({
        address: signer.address,
        claimable: true,
      });

      const positionCalls = (global.fetch as jest.Mock).mock.calls.filter(
        ([url]) => (url as string).includes('/v2/positions'),
      );
      expect(positionCalls).toHaveLength(2);
      expect(positionCalls[0][0]).toBe(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE&status=REDEEMABLE`,
      );
      expect(positionCalls[1][0]).toBe(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE&status=REDEEMABLE_LOST`,
      );
    });

    it('dedupes tokens that surface in both claimable walks', async () => {
      mockActivityCheck();
      mockPositionsPage([createPositionRow()]);
      mockPositionsPage([createPositionRow()]);

      await createProvider().getPositions({
        address: signer.address,
        claimable: true,
      });

      expect(mockParsePolymarketPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          positions: [mappedPositionRow],
        }),
      );
    });

    it('targets a single outcome with condition and a market with event_id', async () => {
      mockActivityCheck();
      mockPositionsPage([]);

      await createProvider().getPositions({
        address: signer.address,
        outcomeId: '0xcondition',
      });
      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE&condition=0xcondition`,
        expect.anything(),
      );

      mockActivityCheck();
      mockPositionsPage([]);

      await createProvider().getPositions({
        address: signer.address,
        marketId: 'event-1',
      });
      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE&event_id=event-1`,
        expect.anything(),
      );
    });

    it('follows next_cursor until it is exhausted', async () => {
      mockActivityCheck();
      mockPositionsPage([createPositionRow()], 'cursor-2');
      mockPositionsPage([createPositionRow({ token_id: 'token-2' })]);

      await createProvider().getPositions({ address: signer.address });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenLastCalledWith(
        `https://data-api.polymarket.com/v2/positions?limit=100&user=${legacySafeAddress}&sortBy=CURRENT_VALUE&cursor=cursor-2`,
        expect.anything(),
      );
      expect(mockParsePolymarketPositions).toHaveBeenCalledWith(
        expect.objectContaining({
          positions: [
            mappedPositionRow,
            { ...mappedPositionRow, asset: 'token-2' },
          ],
        }),
      );
    });

    it('caps cursor-following at 5 pages', async () => {
      mockActivityCheck();
      for (let page = 0; page < 6; page += 1) {
        mockPositionsPage([createPositionRow()], `cursor-${page + 1}`);
      }

      await createProvider().getPositions({ address: signer.address });

      // 1 activity check + 5 position pages (the 6th page is never requested).
      expect(global.fetch).toHaveBeenCalledTimes(6);
      const lastParseCall = mockParsePolymarketPositions.mock.calls.at(-1);
      expect(lastParseCall?.[0].positions).toHaveLength(5);
    });

    it('throws when the response is not the v2 envelope', async () => {
      mockActivityCheck();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('[]'),
      });

      await expect(
        createProvider().getPositions({ address: signer.address }),
      ).rejects.toThrow('Invalid positions response');
      expect(mockParsePolymarketPositions).not.toHaveBeenCalled();
    });
  });

  describe('getUnrealizedPnL (Data API v2)', () => {
    it('composes cashUpnl from the latest point and percentUpnl from open positions', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: {
              proxy_wallet: legacySafeAddress,
              points: [
                { t: 1, unrealized_pnl: 3.5 },
                { t: 2, unrealized_pnl: 7.25 },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest
            .fn()
            .mockResolvedValue(
              JSON.stringify({ data: [], pagination: { next_cursor: null } }),
            ),
        });
      mockParsePolymarketPositions.mockResolvedValue([
        createClaimPosition({ currentValue: 150, initialValue: 100 }),
        createClaimPosition({
          currentValue: 40,
          initialValue: 100,
          id: 'position-2',
        }),
      ]);

      await expect(
        createProvider().getUnrealizedPnL({ address: signer.address }),
      ).resolves.toEqual({
        user: legacySafeAddress,
        cashUpnl: 7.25,
        // (190 − 200) / 200 × 100
        percentUpnl: -5,
      });
    });

    it('keeps a null latest unrealized_pnl missing instead of zero', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: {
              proxy_wallet: legacySafeAddress,
              points: [{ t: 1, unrealized_pnl: 3.5 }, { t: 2 }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest
            .fn()
            .mockResolvedValue(
              JSON.stringify({ data: [], pagination: { next_cursor: null } }),
            ),
        });
      mockParsePolymarketPositions.mockResolvedValue([]);

      const result = await createProvider().getUnrealizedPnL({
        address: signer.address,
      });

      expect(result.cashUpnl).toBeUndefined();
      expect(result.percentUpnl).toBeUndefined();
    });

    it('treats a null data series as a missing value, not an error', async () => {
      // Mirrors the default E2E mock: /v2/user-pnl serves { data: null }
      // for users with no PnL history.
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest
            .fn()
            .mockResolvedValue(
              JSON.stringify({ data: [], pagination: { next_cursor: null } }),
            ),
        });
      mockParsePolymarketPositions.mockResolvedValue([
        createClaimPosition({ currentValue: 150, initialValue: 100 }),
      ]);

      await expect(
        createProvider().getUnrealizedPnL({ address: signer.address }),
      ).resolves.toEqual({
        user: legacySafeAddress,
        cashUpnl: undefined,
        // (150 − 100) / 100 × 100, still derived from open positions.
        percentUpnl: 50,
      });
    });

    it('treats a missing points list as a missing value, not an error', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { proxy_wallet: legacySafeAddress },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest
            .fn()
            .mockResolvedValue(
              JSON.stringify({ data: [], pagination: { next_cursor: null } }),
            ),
        });
      mockParsePolymarketPositions.mockResolvedValue([]);

      await expect(
        createProvider().getUnrealizedPnL({ address: signer.address }),
      ).resolves.toEqual({
        user: legacySafeAddress,
        cashUpnl: undefined,
        percentUpnl: undefined,
      });
    });

    it('throws when the PnL body is not an object', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: [{}] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue('unauthorized'),
        });

      await expect(
        createProvider().getUnrealizedPnL({ address: signer.address }),
      ).rejects.toThrow('Invalid unrealized P&L response');
    });
  });
});

describe('PolymarketProvider.subscribeToOrderbook', () => {
  const mockBook = {
    market: 'market-1',
    asset_id: 'token1',
    hash: 'hash',
    timestamp: '2025-01-12T12:00:00Z',
    bids: [{ price: '0.45', size: '50' }],
    asks: [{ price: '0.55', size: '50' }],
    min_order_size: '1',
    tick_size: '0.01',
    neg_risk: false,
  };

  beforeEach(() => {
    mockWebSocketManagerInstance.subscribeToOrderbook.mockReset();
    mockWebSocketManagerInstance.seedOrderbookSnapshot.mockReset();
    mockGetOrderBook.mockReset();
  });

  it('returns the WebSocketManager unsubscribe function', () => {
    const wsUnsubscribe = jest.fn();
    mockWebSocketManagerInstance.subscribeToOrderbook.mockReturnValue(
      wsUnsubscribe,
    );
    mockGetOrderBook.mockResolvedValue(mockBook);

    const provider = createProvider();
    const callback = jest.fn();
    const unsubscribe = provider.subscribeToOrderbook('token1', callback);

    expect(
      mockWebSocketManagerInstance.subscribeToOrderbook,
    ).toHaveBeenCalledWith('token1', callback);
    expect(unsubscribe).toBe(wsUnsubscribe);
  });

  it('bootstraps with getOrderBook and seeds the WebSocketManager on success', async () => {
    mockWebSocketManagerInstance.subscribeToOrderbook.mockReturnValue(
      jest.fn(),
    );
    mockGetOrderBook.mockResolvedValue(mockBook);

    createProvider().subscribeToOrderbook('token1', jest.fn());

    expect(mockGetOrderBook).toHaveBeenCalledWith({ tokenId: 'token1' });

    // Flush the pending REST promise.
    await Promise.resolve();
    await Promise.resolve();

    expect(
      mockWebSocketManagerInstance.seedOrderbookSnapshot,
    ).toHaveBeenCalledWith('token1', mockBook);
  });

  it('does not seed when getOrderBook rejects, but still returns the WS unsubscribe', async () => {
    const wsUnsubscribe = jest.fn();
    mockWebSocketManagerInstance.subscribeToOrderbook.mockReturnValue(
      wsUnsubscribe,
    );
    mockGetOrderBook.mockRejectedValue(new Error('boom'));

    const unsubscribe = createProvider().subscribeToOrderbook(
      'token1',
      jest.fn(),
    );

    expect(unsubscribe).toBe(wsUnsubscribe);

    await Promise.resolve();
    await Promise.resolve();

    expect(
      mockWebSocketManagerInstance.seedOrderbookSnapshot,
    ).not.toHaveBeenCalled();
  });

  it('subscribes via WS before awaiting REST so a WS book event can populate the cache first', async () => {
    // Asserts the provider's race-safe ordering: the synchronous WS
    // subscription happens before the awaited REST bootstrap. Combined
    // with the WebSocketManager guard (`seedOrderbookSnapshot` no-ops when
    // the cache is already populated), this prevents a late REST snapshot
    // from stomping a newer WS-delivered book.
    const callOrder: string[] = [];
    mockWebSocketManagerInstance.subscribeToOrderbook.mockImplementation(() => {
      callOrder.push('ws.subscribe');
      return jest.fn();
    });
    mockGetOrderBook.mockImplementation(() => {
      callOrder.push('rest.start');
      return Promise.resolve(mockBook);
    });
    mockWebSocketManagerInstance.seedOrderbookSnapshot.mockImplementation(
      () => {
        callOrder.push('ws.seed');
      },
    );

    createProvider().subscribeToOrderbook('token1', jest.fn());

    expect(callOrder).toEqual(['ws.subscribe', 'rest.start']);

    await Promise.resolve();
    await Promise.resolve();

    expect(callOrder).toEqual(['ws.subscribe', 'rest.start', 'ws.seed']);
  });
});

describe('PolymarketProvider.subscribeToCryptoPrices', () => {
  const credentials = {
    apiKey: 'key',
    secret: 'secret',
    passphrase: 'pass',
  };

  beforeEach(() => {
    mockWebSocketManagerInstance.subscribeToCryptoPrices.mockReset();
    mockWebSocketManagerInstance.useCryptoFeed.mockReset();
    mockWebSocketManagerInstance.subscribeToCryptoPrices.mockReturnValue(
      jest.fn(),
    );
    jest.mocked(createApiKey).mockReset();
  });

  it('authenticates PolyBolt with the selected account', async () => {
    jest.mocked(createApiKey).mockResolvedValue(credentials);
    const provider = createProvider(undefined, () => '0xabc');
    const callback = jest.fn();

    provider.subscribeToCryptoPrices(['btc/usd'], callback, {
      twapWindowSeconds: 30,
    });
    await jest.mocked(createApiKey).mock.results[0]?.value;
    await Promise.resolve();

    expect(mockWebSocketManagerInstance.useCryptoFeed).toHaveBeenCalledWith({
      mode: 'polybolt',
      credentials,
    });
    expect(
      mockWebSocketManagerInstance.subscribeToCryptoPrices,
    ).toHaveBeenCalledWith(['btc/usd'], callback, { twapWindowSeconds: 30 });
  });

  it('leaves the socket closed when the API key request fails', async () => {
    jest.mocked(createApiKey).mockRejectedValue(new Error('sign failed'));
    const provider = createProvider(undefined, () => '0xabc');

    provider.subscribeToCryptoPrices(['btc/usd'], jest.fn());
    await jest
      .mocked(createApiKey)
      .mock.results[0]?.value.catch(() => undefined);
    await Promise.resolve();

    expect(
      mockWebSocketManagerInstance.subscribeToCryptoPrices,
    ).not.toHaveBeenCalled();
    expect(mockWebSocketManagerInstance.useCryptoFeed).not.toHaveBeenCalled();
  });

  it('leaves the socket closed when no account is selected', () => {
    const provider = createProvider();

    provider.subscribeToCryptoPrices(['btc/usd'], jest.fn());

    expect(
      mockWebSocketManagerInstance.subscribeToCryptoPrices,
    ).not.toHaveBeenCalled();
  });
});
