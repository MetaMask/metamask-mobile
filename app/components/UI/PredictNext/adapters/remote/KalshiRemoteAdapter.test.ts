import { PREDICT_MARKET_TYPES } from '../../constants';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictAmount,
  PredictDecimal,
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
} from '../../types';
import type {
  SignOperationInput,
  VenueOperationPreview,
} from '../../auth/signing/signOperationTypes';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';

const USER_APPROVAL = { kind: 'user-approved' as const };
const REVIEW_DISPLAY = {
  maxCost: '20.99',
  contracts: '43.00',
  payout: '43.00',
  minProceeds: '19.00',
};
const REVIEW_PROFILE = { version: 1, sha256: 'sha-1' };
const reviewOperation = jest.fn<
  Promise<VenueOperationPreview | undefined>,
  ['order.place', SignOperationInput]
>();

import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

const eventId = 'event-1' as PredictEntityId;
const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market-1' as PredictEntityId;
const range: PredictMarketHistoryRange = '1D';

const createEvent = (overrides = {}) => ({
  venueId: 'kalshi',
  id: 'event-1',
  title: 'Game outcome',
  markets: [
    {
      id: 'market-1',
      question: 'Will the team win?',
      status: 'active',
      outcomes: [
        {
          id: 'market-1-yes',
          side: 'yes',
          label: 'Yes',
          askPrice: '0.42',
          bidPrice: '0.40',
        },
        {
          id: 'market-1-no',
          side: 'no',
          label: 'No',
          askPrice: '0.61',
          bidPrice: '0.58',
        },
      ],
    },
  ],
  ...overrides,
});

const createMarketHistory = (overrides = {}) => ({
  venueId: 'kalshi',
  marketId: 'market-1',
  range,
  observedAt: '2026-08-07T12:00:00Z',
  points: [
    {
      timestamp: '2026-08-07T11:00:00Z',
      yesPrice: '0.42',
      noPrice: '0.58',
    },
  ],
  ...overrides,
});

const createClient = (): jest.Mocked<PredictApiReadTransport> => ({
  getSigningProfile: jest.fn(),
  fetchVenueStatus: jest.fn(),
  fetchVenueCatalog: jest.fn(),
  fetchBalance: jest.fn(),
  fetchPositions: jest.fn(),
  fetchActivity: jest.fn(),
  fetchPortfolioSummary: jest.fn(),
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
  searchEvents: jest.fn(),
  fetchOrderPreview: jest.fn(),
  commitOrder: jest.fn(),
  observeOrder: jest.fn(),
  listUnresolvedOrders: jest.fn(),
  fetchWithdrawPreview: jest.fn(),
  commitWithdraw: jest.fn(),
  observeWithdraw: jest.fn(),
  startDeposit: jest.fn(),
  createDeposit: jest.fn(),
  getDeposit: jest.fn(),
  listOpenDeposits: jest.fn(),
  reportDepositTransfer: jest.fn(),
  cancelDeposit: jest.fn(),
});

describe('KalshiRemoteAdapter', () => {
  let client: jest.Mocked<PredictApiReadTransport>;
  let adapter: KalshiRemoteAdapter;
  let approvalGeneration: number | undefined;

  beforeEach(() => {
    approvalGeneration = 0;
    reviewOperation.mockReset().mockResolvedValue({
      display: { ...REVIEW_DISPLAY },
      profile: REVIEW_PROFILE,
    });
    client = createClient();
    adapter = new KalshiRemoteAdapter(client, {
      getApprovalGeneration: () => approvalGeneration,
      previewOperation: reviewOperation,
    });
  });

  it('serves the API catalog without adding withdraw the deployment omits', async () => {
    const catalog = {
      venueId: 'kalshi',
      actions: ['buy', 'sell'],
      feeds: {
        sports: 'sports-football-nfl-games',
        'nfl-games': 'sports-football-nfl-games',
      },
      categories: ['sports'],
      searchSupported: true,
    };
    client.fetchVenueCatalog.mockResolvedValue(catalog);

    await expect(adapter.marketData.fetchVenueCatalog()).resolves.toEqual({
      ...catalog,
      screens: [],
    });
    expect(client.fetchVenueCatalog).toHaveBeenCalledWith('kalshi', undefined);
  });

  it('keeps withdraw when the deployment advertises it', async () => {
    client.fetchVenueCatalog.mockResolvedValue({
      venueId: 'kalshi',
      actions: ['buy', 'sell', 'deposit', 'withdraw'],
      feeds: {},
      categories: [],
      searchSupported: true,
    });

    await expect(adapter.marketData.fetchVenueCatalog()).resolves.toMatchObject(
      { actions: ['buy', 'sell', 'deposit', 'withdraw'] },
    );
  });

  it('surfaces a catalog read failure instead of fabricating support', async () => {
    client.fetchVenueCatalog.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.marketData.fetchVenueCatalog()).rejects.toMatchObject({
      code: PredictErrorCode.VENUE_UNAVAILABLE,
    });
  });

  it('rejects a malformed catalog instead of enabling partial support', async () => {
    client.fetchVenueCatalog.mockResolvedValue({
      venueId: 'kalshi',
      actions: 'buy',
    });

    await expect(adapter.marketData.fetchVenueCatalog()).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
  });

  it('preserves a cancelled catalog read instead of mapping it to a failure', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    client.fetchVenueCatalog.mockRejectedValue(abortError);

    await expect(adapter.marketData.fetchVenueCatalog()).rejects.toBe(
      abortError,
    );
  });

  it('forwards cancellation and reads the catalog through the client', async () => {
    client.fetchVenueCatalog.mockResolvedValue({
      venueId: 'kalshi',
      actions: ['buy', 'sell'],
      feeds: {},
      categories: [],
      searchSupported: false,
    });
    const signal = new AbortController().signal;

    await adapter.marketData.fetchVenueCatalog({ signal });

    expect(client.fetchVenueCatalog).toHaveBeenCalledWith('kalshi', {
      signal,
    });
  });

  it('parses canonical Events from the Predict API', async () => {
    client.fetchFeed.mockResolvedValue({
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: [createEvent()],
    });

    const result = await adapter.marketData.fetchFeed(feedId, { limit: 20 });

    expect(result.events[0].markets[0].outcomes[0].askPrice).toBe('0.42');
  });

  it('preserves grouped Market metadata from the Predict API', async () => {
    const group = {
      key: 'total-points',
      groupType: 'marketSelector',
      marketType: PREDICT_MARKET_TYPES.TOTAL,
      option: { type: 'number', value: 220.5 },
      displayOrder: 0,
    };
    client.fetchEvent.mockResolvedValue(
      createEvent({
        markets: [{ ...createEvent().markets[0], group }],
      }),
    );

    const result = await adapter.marketData.fetchEvent(eventId);

    expect(result.markets[0].group).toEqual(group);
  });

  it('parses combined moneyline, total, and spread Markets', async () => {
    const totalGroup = {
      key: 'total-points',
      groupType: 'marketSelector',
      marketType: 'total',
      option: { type: 'number', value: 220.5 },
      displayOrder: 0,
    };
    const spreadGroup = {
      key: 'spread-home',
      groupType: 'marketSelector',
      marketType: PREDICT_MARKET_TYPES.SPREAD,
      option: { type: 'number', value: 1.5 },
      displayOrder: 0,
    };
    const baseMarkets = createEvent().markets;

    client.fetchEvent.mockResolvedValue(
      createEvent({
        markets: [
          baseMarkets[0],
          { ...baseMarkets[0], id: 'total-market', group: totalGroup },
          { ...baseMarkets[0], id: 'spread-market', group: spreadGroup },
        ],
      }),
    );

    const result = await adapter.marketData.fetchEvent(eventId);

    expect(result.markets).toHaveLength(3);
    expect(result.markets.map((market) => market.group?.marketType)).toEqual([
      undefined,
      PREDICT_MARKET_TYPES.TOTAL,
      PREDICT_MARKET_TYPES.SPREAD,
    ]);
  });

  it('forwards Event query parameters and cancellation', async () => {
    client.fetchFeed.mockResolvedValue({
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: [createEvent()],
    });
    const signal = new AbortController().signal;

    await adapter.marketData.fetchFeed(feedId, { limit: 20 }, { signal });

    expect(client.fetchFeed).toHaveBeenCalledWith(
      adapter.venueId,
      feedId,
      { limit: 20 },
      { signal },
    );
  });

  it('rejects an Event list containing another Venue', async () => {
    client.fetchFeed.mockResolvedValue({
      venueId: 'kalshi',
      id: feedId,
      title: 'NFL Games',
      events: [createEvent({ venueId: 'other' })],
    });

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses an immutable Event from the Predict API', async () => {
    client.fetchEvent.mockResolvedValue(createEvent());

    const result = await adapter.marketData.fetchEvent(eventId);

    expect(result.id).toBe(eventId);
  });

  it('rejects an immutable Event with another Event ID', async () => {
    client.fetchEvent.mockResolvedValue(createEvent({ id: 'event-2' }));

    await expect(adapter.marketData.fetchEvent(eventId)).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses Market history', async () => {
    client.fetchMarketHistory.mockResolvedValue(createMarketHistory());

    const result = await adapter.marketData.fetchMarketHistory(marketId, range);

    expect(result.points[0].yesPrice).toBe('0.42');
    expect(result.points[0].noPrice).toBe('0.58');
  });

  it('forwards Market history cancellation', async () => {
    client.fetchMarketHistory.mockResolvedValue(createMarketHistory());
    const signal = new AbortController().signal;

    await adapter.marketData.fetchMarketHistory(marketId, range, { signal });

    expect(client.fetchMarketHistory).toHaveBeenCalledWith(
      adapter.venueId,
      marketId,
      range,
      { signal },
    );
  });

  it.each([
    ['Venue ID', { venueId: 'other' }],
    ['Market ID', { marketId: 'market-2' }],
    ['range', { range: '1W' }],
  ])('rejects Market history with another %s', async (_field, overrides) => {
    client.fetchMarketHistory.mockResolvedValue(createMarketHistory(overrides));

    const result = adapter.marketData.fetchMarketHistory(marketId, range);

    await expect(result).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses search results and forwards params and cancellation', async () => {
    client.searchEvents.mockResolvedValue({
      venueId: 'kalshi',
      events: [createEvent()],
    });
    const signal = new AbortController().signal;

    const result = await adapter.marketData.searchEvents(
      { q: 'chiefs', limit: 20 },
      { signal },
    );

    expect(result.events[0].id).toBe('event-1');
    expect(client.searchEvents).toHaveBeenCalledWith(
      adapter.venueId,
      { q: 'chiefs', limit: 20 },
      { signal },
    );
  });

  it.each([
    ['response Venue ID', { venueId: 'other' }],
    ['Event Venue ID', { events: [createEvent({ venueId: 'other' })] }],
  ])('rejects search results with another %s', async (_field, overrides) => {
    client.searchEvents.mockResolvedValue({
      venueId: 'kalshi',
      events: [],
      ...overrides,
    });

    await expect(
      adapter.marketData.searchEvents({ q: 'chiefs' }),
    ).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('parses Venue Status', async () => {
    client.fetchVenueStatus.mockResolvedValue({
      venueId: 'kalshi',
      status: 'degraded',
      checkedAt: '2026-08-07T12:00:00Z',
    });

    const result = await adapter.marketData.fetchVenueStatus();

    expect(result.status).toBe('degraded');
  });

  it('rejects Venue Status for another Venue', async () => {
    client.fetchVenueStatus.mockResolvedValue({
      venueId: 'other',
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
    });

    await expect(adapter.marketData.fetchVenueStatus()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('maps HTTP 429 to RATE_LIMITED keeping only the status from the response', async () => {
    client.fetchFeed.mockRejectedValue(new PredictHttpError(429));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.RATE_LIMITED,
        metadata: expect.objectContaining({ status: 429 }),
      }),
    );
  });

  it('maps HTTP 503 to VENUE_UNAVAILABLE', async () => {
    client.fetchFeed.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.VENUE_UNAVAILABLE,
      }),
    );
  });

  it.each([500, 502, 504])(
    'maps HTTP %s to NETWORK_ERROR with the status',
    async (status) => {
      client.fetchFeed.mockRejectedValue(new PredictHttpError(status));

      await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.NETWORK_ERROR,
          metadata: expect.objectContaining({ status }),
        }),
      );
    },
  );

  it.each([
    [403, PredictErrorCode.INVALID_RESPONSE],
    [451, PredictErrorCode.GEO_BLOCKED],
  ] as const)(
    'maps HTTP %s to %s without assuming every forbidden response is geography',
    async (status, code) => {
      client.fetchFeed.mockRejectedValue(new PredictHttpError(status));

      await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
        expect.objectContaining({
          code,
          metadata: expect.objectContaining({ status }),
        }),
      );
    },
  );

  it('maps an unhandled HTTP status to INVALID_RESPONSE with the status', async () => {
    client.fetchFeed.mockRejectedValue(new PredictHttpError(404));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.INVALID_RESPONSE,
        metadata: expect.objectContaining({ status: 404 }),
      }),
    );
  });

  it('maps other transport failures to INVALID_RESPONSE without their details', async () => {
    client.fetchFeed.mockRejectedValue(new Error('network detail'));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.INVALID_RESPONSE,
        metadata: undefined,
      }),
    );
  });

  it('preserves AbortError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    client.fetchFeed.mockRejectedValue(abortError);

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toBe(
      abortError,
    );
  });

  it('parses canonical Balance from the Predict API', async () => {
    client.fetchBalance.mockResolvedValue({
      venueId: 'kalshi',
      currency: 'USD',
      available: '123.13',
    });

    const result = await adapter.portfolio.fetchBalance();

    expect(result.available).toBe('123.13');
  });

  it('forwards Balance cancellation', async () => {
    client.fetchBalance.mockResolvedValue({
      venueId: 'kalshi',
      currency: 'USD',
      available: '123.13',
    });
    const signal = new AbortController().signal;

    await adapter.portfolio.fetchBalance({ signal });

    expect(client.fetchBalance).toHaveBeenCalledWith(adapter.venueId, {
      signal,
    });
  });

  it('rejects Balance for another Venue', async () => {
    client.fetchBalance.mockResolvedValue({
      venueId: 'other',
      currency: 'USD',
      available: '123.13',
    });

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('rejects a malformed Balance payload', async () => {
    client.fetchBalance.mockResolvedValue({
      venueId: 'kalshi',
      currency: 'USD',
      available: 'free',
    });

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('maps Balance HTTP 401 to UNAUTHENTICATED with the status', async () => {
    client.fetchBalance.mockRejectedValue(new PredictHttpError(401));

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.UNAUTHENTICATED,
        metadata: expect.objectContaining({ status: 401 }),
      }),
    );
  });

  it('maps Balance HTTP 451 to GEO_BLOCKED', async () => {
    client.fetchBalance.mockRejectedValue(new PredictHttpError(451));

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.GEO_BLOCKED }),
    );
  });

  it('maps a venue_authorization_required 403 to UNAUTHENTICATED, not GEO_BLOCKED', async () => {
    client.fetchBalance.mockRejectedValue(
      new PredictHttpError(403, 'venue_authorization_required'),
    );

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.UNAUTHENTICATED,
        metadata: expect.objectContaining({
          status: 403,
          bodyCode: 'venue_authorization_required',
        }),
      }),
    );
  });

  it('maps Balance HTTP 503 to VENUE_UNAVAILABLE', async () => {
    client.fetchBalance.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.VENUE_UNAVAILABLE }),
    );
  });

  it('parses canonical Positions from the Predict API', async () => {
    const page = {
      venueId: 'kalshi',
      positions: [
        {
          venueId: 'kalshi',
          marketId: 'market-1',
          side: 'yes',
          status: 'open',
          shares: '75.00',
          averagePrice: '0.55',
          costBasis: '41.25',
          context: {
            eventId: 'event-1',
            eventTitle: 'Lakers vs Celtics',
            marketQuestion: 'Will the Lakers win?',
            outcomeLabel: 'Lakers',
          },
        },
      ],
      nextCursor: 'opaque',
    };
    client.fetchPositions.mockResolvedValue(page);

    const result = await adapter.portfolio.fetchPositions({ limit: 20 });

    expect(result).toEqual(page);
    expect(client.fetchPositions).toHaveBeenCalledWith(
      adapter.venueId,
      { limit: 20 },
      undefined,
    );
  });

  it('forwards Positions cancellation', async () => {
    client.fetchPositions.mockResolvedValue({
      venueId: 'kalshi',
      positions: [],
    });
    const signal = new AbortController().signal;

    await adapter.portfolio.fetchPositions({ limit: 20 }, { signal });

    expect(client.fetchPositions).toHaveBeenCalledWith(
      adapter.venueId,
      { limit: 20 },
      { signal },
    );
  });

  it('rejects Positions for another Venue', async () => {
    client.fetchPositions.mockResolvedValue({
      venueId: 'other',
      positions: [],
    });

    await expect(adapter.portfolio.fetchPositions({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('rejects a malformed Positions payload', async () => {
    client.fetchPositions.mockResolvedValue({
      venueId: 'kalshi',
      positions: [{ marketId: 'market-1' }],
    });

    await expect(adapter.portfolio.fetchPositions({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('maps Positions HTTP 401 to UNAUTHENTICATED', async () => {
    client.fetchPositions.mockRejectedValue(new PredictHttpError(401));

    await expect(adapter.portfolio.fetchPositions({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.UNAUTHENTICATED }),
    );
  });

  it('parses canonical Activity from the Predict API', async () => {
    const page = {
      venueId: 'kalshi',
      activity: [
        {
          type: 'settlement',
          id: 'settlement-market-1-yes',
          venueId: 'kalshi',
          marketId: 'market-1',
          side: 'yes',
          shares: '75.00',
          result: 'yes',
          proceeds: '75.00',
          realizedPnl: '33.75',
          timestamp: '2026-09-02T00:00:00.000Z',
        },
        {
          type: 'trade',
          id: '0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a',
          venueId: 'kalshi',
          marketId: 'market-1',
          side: 'yes',
          action: 'buy',
          shares: '75.00',
          price: '0.55',
          amount: '41.25',
          fee: '0',
          timestamp: '2026-09-01T12:00:00.000Z',
        },
      ],
      settlementsCompleteFrom: '2026-08-27T00:00:00.000Z',
    };
    client.fetchActivity.mockResolvedValue(page);

    const result = await adapter.portfolio.fetchActivity({ limit: 20 });

    expect(result).toEqual(page);
  });

  it('rejects Activity for another Venue', async () => {
    client.fetchActivity.mockResolvedValue({
      venueId: 'other',
      activity: [],
    });

    await expect(adapter.portfolio.fetchActivity({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('rejects a malformed Activity payload', async () => {
    client.fetchActivity.mockResolvedValue({
      venueId: 'kalshi',
      activity: [{ type: 'fill', id: 'fill-1' }],
    });

    await expect(adapter.portfolio.fetchActivity({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('rejects an Activity page out of the pinned order', async () => {
    const trade = {
      type: 'trade',
      venueId: 'kalshi',
      marketId: 'market-1',
      side: 'yes',
      action: 'buy',
      shares: '1',
      price: '0.55',
      amount: '0.56',
      fee: '0.01',
    };
    client.fetchActivity.mockResolvedValue({
      venueId: 'kalshi',
      activity: [
        { ...trade, id: 'older', timestamp: '2026-09-01T00:00:00.000Z' },
        { ...trade, id: 'newer', timestamp: '2026-09-02T00:00:00.000Z' },
      ],
    });

    await expect(adapter.portfolio.fetchActivity({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('composes the Portfolio Summary from the holdings totals and the Balance', async () => {
    const holdings = {
      venueId: 'kalshi',
      currency: 'USD',
      positionsValue: '24.40',
      claimableValue: '0',
      unrealizedPnl: '1.78',
      unrealizedPnlPercent: '7.85',
      asOf: '2026-10-23T12:00:05.120Z',
      complete: false,
    };
    client.fetchPortfolioSummary.mockResolvedValue(holdings);
    client.fetchBalance.mockResolvedValue({
      venueId: 'kalshi',
      currency: 'USD',
      available: '50.0000',
    });
    const signal = new AbortController().signal;

    const result = await adapter.portfolio.fetchPortfolioSummary({ signal });

    expect(result).toEqual({
      ...holdings,
      availableBalance: '50.0000',
      totalValue: '74.40',
    });
    expect(client.fetchPortfolioSummary).toHaveBeenCalledWith(adapter.venueId, {
      signal,
    });
    expect(client.fetchBalance).toHaveBeenCalledWith(adapter.venueId, {
      signal,
    });
  });

  it('rejects a Portfolio Summary for another Venue', async () => {
    client.fetchBalance.mockResolvedValue({
      venueId: 'kalshi',
      currency: 'USD',
      available: '0',
    });
    client.fetchPortfolioSummary.mockResolvedValue({
      venueId: 'other',
      currency: 'USD',
      positionsValue: '0',
      claimableValue: '0',
      unrealizedPnl: '0',
      asOf: '2026-10-23T12:00:05.120Z',
      complete: true,
    });

    await expect(adapter.portfolio.fetchPortfolioSummary()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
    );
  });

  it('maps Portfolio Summary HTTP 503 to VENUE_UNAVAILABLE', async () => {
    client.fetchPortfolioSummary.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.portfolio.fetchPortfolioSummary()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.VENUE_UNAVAILABLE }),
    );
  });

  it('maps Activity HTTP 503 to VENUE_UNAVAILABLE', async () => {
    client.fetchActivity.mockRejectedValue(new PredictHttpError(503));

    await expect(adapter.portfolio.fetchActivity({})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.VENUE_UNAVAILABLE }),
    );
  });

  describe('trading', () => {
    const previewPayload = {
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
      venueId: 'kalshi',
      marketId: 'market-1',
      side: 'yes',
      requestedAmount: '20.00',
      orderAmount: '20.00',
      estimatedContracts: 43,
      averagePrice: '0.4651',
      limitPrice: '0.4700',
      fee: '0.86',
      feeBreakdown: [
        { source: 'venue', amount: '0.43' },
        { source: 'metamask', amount: '0.43' },
      ],
      totalDebit: '20.86',
      potentialPayout: '43.00',
      potentialProfit: '22.14',
      expiresAt: '2026-03-01T12:00:30.000Z',
    };
    const sellPreviewPayload = {
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
      venueId: 'kalshi',
      marketId: 'market-1',
      side: 'yes',
      action: 'sell',
      requestedContracts: 70,
      estimatedContracts: 65,
      averagePrice: '0.4800',
      limitPrice: '0.4000',
      fee: '0.31',
      feeBreakdown: [
        { source: 'venue', amount: '0.16' },
        { source: 'metamask', amount: '0.15' },
      ],
      estimatedProceeds: '31.20',
      estimatedNetProceeds: '30.89',
      expiresAt: '2026-03-01T12:00:30.000Z',
    };
    const previewParams = {
      marketId,
      side: 'yes' as const,
      action: 'buy' as const,
      amount: '20' as never,
      idempotencyKey: 'b3c2a1d0-1111-4222-8333-444455556666',
    };
    const sellPreviewParams = {
      marketId,
      side: 'yes' as const,
      action: 'sell' as const,
      contracts: '70' as never,
      idempotencyKey: 'c4d5e6f0-1111-4222-8333-444455556666',
    };

    beforeEach(async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.parse('2026-03-01T12:00:00.000Z'));
      client.fetchOrderPreview.mockResolvedValue(previewPayload);
      await adapter.trading.previewOrder(previewParams);
      await adapter.trading.reviewOrder(previewPayload.previewId);
      client.fetchOrderPreview.mockClear();
      reviewOperation.mockClear();
    });
    afterEach(() => jest.restoreAllMocks());

    it('sends the sell intent through the transport unchanged', async () => {
      adapter.trading.invalidatePreviews();
      client.fetchOrderPreview.mockResolvedValue(sellPreviewPayload);

      await adapter.trading.previewOrder(sellPreviewParams);

      expect(client.fetchOrderPreview).toHaveBeenCalledWith(
        adapter.venueId,
        sellPreviewParams,
        undefined,
      );
    });

    it('parses a canonical sell Order Preview for the exact intent', async () => {
      adapter.trading.invalidatePreviews();
      client.fetchOrderPreview.mockResolvedValue(sellPreviewPayload);

      const result = await adapter.trading.previewOrder(sellPreviewParams);

      expect(result).toMatchObject({
        action: 'sell',
        requestedContracts: 70,
        estimatedNetProceeds: '30.89',
      });
    });

    it('rejects a sell Order Preview bound to a different contract count', async () => {
      client.fetchOrderPreview.mockResolvedValue({
        ...sellPreviewPayload,
        requestedContracts: 65,
      });

      await expect(
        adapter.trading.previewOrder(sellPreviewParams),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('rejects a sell Order Preview that answers a buy intent', async () => {
      client.fetchOrderPreview.mockResolvedValue(previewPayload);

      await expect(
        adapter.trading.previewOrder(sellPreviewParams),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('parses a canonical Order Preview for the exact intent', async () => {
      client.fetchOrderPreview.mockResolvedValue(previewPayload);

      const result = await adapter.trading.previewOrder(previewParams);

      expect(result.previewId).toBe(previewPayload.previewId);
      expect(result).toMatchObject({ requestedAmount: '20.00' });
    });

    it('sends the legacy buy wire shape without an action key', async () => {
      client.fetchOrderPreview.mockResolvedValue(previewPayload);

      await adapter.trading.previewOrder(previewParams);

      expect(client.fetchOrderPreview).toHaveBeenCalledWith(
        adapter.venueId,
        // Version tolerance: no `action` key reaches the wire for a buy.
        {
          marketId,
          side: 'yes',
          amount: '20',
          idempotencyKey: previewParams.idempotencyKey,
        },
        undefined,
      );
    });

    it('parses a buy Preview that carries an explicit action (new backend)', async () => {
      client.fetchOrderPreview.mockResolvedValue({
        ...previewPayload,
        action: 'buy',
      });

      await expect(
        adapter.trading.previewOrder(previewParams),
      ).resolves.toMatchObject({ action: 'buy', requestedAmount: '20.00' });
    });

    it('accepts an amount echo that differs only in trailing zeros', async () => {
      adapter.trading.invalidatePreviews();
      client.fetchOrderPreview.mockResolvedValue({
        ...previewPayload,
        requestedAmount: '20.0000',
      });

      await expect(
        adapter.trading.previewOrder(previewParams),
      ).resolves.toMatchObject({ requestedAmount: '20.0000' });
    });

    it('rejects an Order Preview bound to a different amount', async () => {
      client.fetchOrderPreview.mockResolvedValue({
        ...previewPayload,
        requestedAmount: '50.00',
      });

      await expect(adapter.trading.previewOrder(previewParams)).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('rejects an Order Preview for another Market or side', async () => {
      client.fetchOrderPreview.mockResolvedValue(previewPayload);

      await expect(
        adapter.trading.previewOrder({ ...previewParams, side: 'no' }),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
      await expect(
        adapter.trading.previewOrder({
          ...previewParams,
          marketId: 'market-2' as PredictEntityId,
        }),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('maps canonical backend preview codes to client codes', async () => {
      client.fetchOrderPreview.mockRejectedValue(
        new PredictHttpError(404, 'market_not_found'),
      );

      await expect(adapter.trading.previewOrder(previewParams)).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.MARKET_NOT_FOUND,
          metadata: expect.objectContaining({
            status: 404,
            bodyCode: 'market_not_found',
          }),
        }),
      );
    });

    it('maps an unknown backend preview code by status, keeping the code', async () => {
      client.fetchOrderPreview.mockRejectedValue(
        new PredictHttpError(400, 'invalid_request'),
      );

      await expect(adapter.trading.previewOrder(previewParams)).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.INVALID_RESPONSE,
          metadata: expect.objectContaining({
            status: 400,
            bodyCode: 'invalid_request',
          }),
        }),
      );
    });

    it('maps the over-sell and position-read backend codes', async () => {
      client.fetchOrderPreview.mockRejectedValue(
        new PredictHttpError(422, 'insufficient_position'),
      );

      await expect(
        adapter.trading.previewOrder(sellPreviewParams),
      ).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.INSUFFICIENT_POSITION,
        }),
      );

      client.fetchOrderPreview.mockRejectedValue(
        new PredictHttpError(503, 'position_unavailable'),
      );

      await expect(
        adapter.trading.previewOrder(sellPreviewParams),
      ).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.POSITION_UNAVAILABLE,
        }),
      );
    });

    const receiptPayload = {
      operationId: 'd8f1c0aa-2222-4333-9444-555566667777',
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
      venueId: 'kalshi',
      marketId,
      side: 'yes',
      status: 'submitted',
      requestedMaxSpend: '20.00',
      quotedContracts: 43,
      venueOrderId: null,
      filledContracts: null,
      actualSpend: null,
      averageFillPrice: null,
      fee: null,
      payoutExposure: null,
    };

    const sellReceiptPayload = {
      operationId: 'd8f1c0aa-2222-4333-9444-555566667777',
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
      venueId: 'kalshi',
      marketId,
      side: 'yes',
      action: 'sell',
      status: 'filled',
      quotedContracts: 70,
      venueOrderId: 'venue-order-1',
      filledContracts: '70.00',
      averageFillPrice: '0.4800',
      fee: '0.31',
      actualProceeds: '31.20',
      netProceeds: '30.89',
    };

    it.each(['count', 'price', 'idempotency', 'expiry', 'generation'] as const)(
      'revokes the old review when the same preview identity changes %s',
      async (drift) => {
        const params = { ...previewParams };
        const response = { ...previewPayload };
        if (drift === 'count') response.estimatedContracts = 42;
        if (drift === 'price') response.limitPrice = '0.4800';
        if (drift === 'expiry') response.expiresAt = '2026-03-01T12:01:00.000Z';
        if (drift === 'idempotency') {
          params.idempotencyKey = 'c4d5e6f0-1111-4222-8333-444455556666';
        }
        if (drift === 'generation') approvalGeneration = 1;
        client.fetchOrderPreview.mockResolvedValue(response);

        await expect(
          adapter.trading.previewOrder(params),
        ).rejects.toMatchObject({
          code: PredictErrorCode.INVALID_RESPONSE,
        });
        await expect(
          adapter.trading.reviewOrder(previewPayload.previewId),
        ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
        await expect(
          adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
        ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
        expect(reviewOperation).not.toHaveBeenCalled();
        expect(client.commitOrder).not.toHaveBeenCalled();
      },
    );

    it('keeps an unchanged same-preview response bound to its reviewed signing snapshot', async () => {
      client.fetchOrderPreview.mockResolvedValue({ ...previewPayload });
      await expect(
        adapter.trading.previewOrder({ ...previewParams }),
      ).resolves.toMatchObject({
        previewId: previewPayload.previewId,
        estimatedContracts: 43,
        limitPrice: '0.4700',
      });
      client.commitOrder.mockResolvedValue(receiptPayload);
      await expect(
        adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
      ).resolves.toMatchObject({ status: 'submitted' });
      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: previewPayload.previewId },
        undefined,
        expect.objectContaining({
          inputs: expect.objectContaining({
            idempotencyKey: previewParams.idempotencyKey,
          }),
          values: { count: '40.00', price: '0.4700' },
          confirmed: true,
        }),
      );
    });

    it('pins quote-time inputs and values despite form and returned-preview drift', async () => {
      adapter.trading.invalidatePreviews();
      const params = { ...previewParams };
      // The app targets ES2022, before Promise.withResolvers.
      let resolveQuote!: (value: typeof previewPayload) => void;
      client.fetchOrderPreview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveQuote = resolve;
          }),
      );
      const quoting = adapter.trading.previewOrder(params);
      params.amount = '99' as never;
      params.idempotencyKey = 'changed-after-quote-start';
      params.marketId = 'changed-market' as PredictEntityId;
      params.side = 'no' as typeof params.side;
      resolveQuote(previewPayload);
      const preview = await quoting;
      preview.limitPrice = '0.9900' as PredictDecimal;
      preview.estimatedContracts = 1;
      if (preview.action === 'buy')
        preview.requestedAmount = '99.00' as PredictAmount;

      const review = await adapter.trading.reviewOrder(
        previewPayload.previewId,
      );
      Object.assign(review, { maxCost: '0.01', contracts: '999' });
      client.commitOrder.mockResolvedValue(receiptPayload);
      await expect(
        adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
      ).resolves.toMatchObject({ status: 'submitted' });
      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: previewPayload.previewId },
        undefined,
        {
          inputs: {
            marketId,
            idempotencyKey: previewParams.idempotencyKey,
            action: 'buy',
            outcome: 'yes',
            amountCents: 2000,
          },
          values: { count: '40.00', price: '0.4700' },
          approvalGeneration: 0,
          confirmed: true,
        },
      );
    });

    it('reviews without confirmation and grants confirmation only on actual approval', async () => {
      adapter.trading.invalidatePreviews();
      await adapter.trading.previewOrder(previewParams);
      await expect(
        adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.VENUE_SIGNING_REFUSED });
      expect(client.commitOrder).not.toHaveBeenCalled();

      const display = { ...REVIEW_DISPLAY };
      reviewOperation.mockResolvedValueOnce({
        display,
        profile: REVIEW_PROFILE,
      });
      const review = await adapter.trading.reviewOrder(
        previewPayload.previewId,
      );
      expect(review).toEqual({
        previewId: previewPayload.previewId,
        maxCost: display.maxCost,
        contracts: display.contracts,
        payout: display.payout,
        proceedsIfFullyFilled: display.minProceeds,
      });
      const reviewInput = reviewOperation.mock.calls[0][1];
      expect(reviewInput).not.toHaveProperty('confirmed');
      expect(client.commitOrder).not.toHaveBeenCalled();

      client.commitOrder.mockResolvedValue(receiptPayload);
      await adapter.trading.commitOrder(
        previewPayload.previewId,
        USER_APPROVAL,
      );
      expect(client.commitOrder.mock.calls[0][3]).toMatchObject({
        ...reviewInput,
        confirmed: true,
      });
    });

    it('passes the reviewed profile snapshot to the commit signature', async () => {
      adapter.trading.invalidatePreviews();
      await adapter.trading.previewOrder(previewParams);
      await adapter.trading.reviewOrder(previewPayload.previewId);
      client.commitOrder.mockResolvedValue(receiptPayload);

      await adapter.trading.commitOrder(
        previewPayload.previewId,
        USER_APPROVAL,
      );

      expect(client.commitOrder.mock.calls[0][3]).toMatchObject({
        profile: REVIEW_PROFILE,
      });
    });

    it('fails closed when no signing dependency is available', async () => {
      const unsignedAdapter = new KalshiRemoteAdapter(client);
      await unsignedAdapter.trading.previewOrder(previewParams);
      await expect(
        unsignedAdapter.trading.reviewOrder(previewPayload.previewId),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      await expect(
        unsignedAdapter.trading.commitOrder(
          previewPayload.previewId,
          USER_APPROVAL,
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
      expect(client.commitOrder).not.toHaveBeenCalled();

      // Review discarded the unauthenticated pin. A separate adapter proves
      // commit also fails closed when called directly on a fresh unsigned pin.
      const directCommitAdapter = new KalshiRemoteAdapter(client);
      await directCommitAdapter.trading.previewOrder(previewParams);
      await expect(
        directCommitAdapter.trading.commitOrder(
          previewPayload.previewId,
          USER_APPROVAL,
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it.each([1, undefined])(
      'refuses a reviewed preview after auth generation becomes %s',
      async (generation) => {
        approvalGeneration = generation;
        await expect(
          adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
        ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
        expect(client.commitOrder).not.toHaveBeenCalled();
      },
    );

    it('rejects a quote completed after its auth generation was revoked', async () => {
      adapter.trading.invalidatePreviews();
      let resolveQuote!: (value: typeof previewPayload) => void;
      client.fetchOrderPreview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveQuote = resolve;
          }),
      );
      const quoting = adapter.trading.previewOrder(previewParams);
      approvalGeneration = 1;
      resolveQuote(previewPayload);
      await expect(quoting).rejects.toMatchObject({
        code: PredictErrorCode.PREVIEW_EXPIRED,
      });
      await expect(
        adapter.trading.reviewOrder(previewPayload.previewId),
      ).rejects.toMatchObject({
        code: PredictErrorCode.PREVIEW_EXPIRED,
      });
      expect(reviewOperation).not.toHaveBeenCalled();
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it('does not expose a review completed after auth generation revocation', async () => {
      let resolveReview!: (value: VenueOperationPreview) => void;
      reviewOperation.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReview = resolve;
          }),
      );
      const reviewing = adapter.trading.reviewOrder(previewPayload.previewId);
      approvalGeneration = 1;
      resolveReview({ display: REVIEW_DISPLAY, profile: REVIEW_PROFILE });
      await expect(reviewing).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it('invalidates a pending quote when its preview generation changes', async () => {
      let resolveQuote!: (value: typeof previewPayload) => void;
      client.fetchOrderPreview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveQuote = resolve;
          }),
      );
      const quoting = adapter.trading.previewOrder(previewParams);
      adapter.trading.invalidatePreviews();
      resolveQuote(previewPayload);
      await expect(quoting).rejects.toMatchObject({
        code: PredictErrorCode.PREVIEW_EXPIRED,
      });
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it('refuses expired approval at the exact preview expiry boundary', async () => {
      jest
        .mocked(Date.now)
        .mockReturnValue(Date.parse(previewPayload.expiresAt));
      await expect(
        adapter.trading.commitOrder(previewPayload.previewId, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it('bounds pinned approval state at 32 previews and evicts the oldest', async () => {
      let newestId = '';
      for (let index = 0; index < 32; index += 1) {
        newestId = `preview-${index}`;
        client.fetchOrderPreview.mockResolvedValueOnce({
          ...previewPayload,
          previewId: newestId,
        });
        await adapter.trading.previewOrder(previewParams);
      }
      await expect(
        adapter.trading.reviewOrder(previewPayload.previewId),
      ).rejects.toMatchObject({ code: PredictErrorCode.PREVIEW_EXPIRED });
      await expect(
        adapter.trading.reviewOrder('preview-0'),
      ).resolves.toMatchObject({
        previewId: 'preview-0',
      });
      await expect(
        adapter.trading.reviewOrder(newestId),
      ).resolves.toMatchObject({
        previewId: newestId,
      });
      client.commitOrder.mockResolvedValue({
        ...receiptPayload,
        previewId: newestId,
      });
      await expect(
        adapter.trading.commitOrder(newestId, USER_APPROVAL),
      ).resolves.toMatchObject({ previewId: newestId });
    });

    it('parses a canonical sell Order Receipt for the committed preview', async () => {
      adapter.trading.invalidatePreviews();
      client.fetchOrderPreview.mockResolvedValue(sellPreviewPayload);
      await adapter.trading.previewOrder(sellPreviewParams);
      await adapter.trading.reviewOrder(sellPreviewPayload.previewId);
      client.commitOrder.mockResolvedValue(sellReceiptPayload);

      const result = await adapter.trading.commitOrder(
        sellReceiptPayload.previewId,
        USER_APPROVAL,
      );

      expect(result).toMatchObject({
        action: 'sell',
        status: 'filled',
        filledContracts: '70.00',
        netProceeds: '30.89',
      });
      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: sellReceiptPayload.previewId },
        undefined,
        {
          inputs: {
            marketId,
            idempotencyKey: sellPreviewParams.idempotencyKey,
            action: 'sell',
            outcome: 'yes',
            contracts: '70',
          },
          values: { count: '70.00', price: '0.4000' },
          approvalGeneration: 0,
          confirmed: true,
        },
      );
    });

    it('rejects a sell Order Receipt carrying buy-only fields', async () => {
      adapter.trading.invalidatePreviews();
      client.fetchOrderPreview.mockResolvedValue(sellPreviewPayload);
      await adapter.trading.previewOrder(sellPreviewParams);
      await adapter.trading.reviewOrder(sellPreviewPayload.previewId);
      client.commitOrder.mockResolvedValue({
        ...sellReceiptPayload,
        payoutExposure: '70.00',
      });

      await expect(
        adapter.trading.commitOrder(
          sellReceiptPayload.previewId,
          USER_APPROVAL,
        ),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('parses a canonical Order Receipt for the committed preview', async () => {
      client.commitOrder.mockResolvedValue(receiptPayload);

      const result = await adapter.trading.commitOrder(
        receiptPayload.previewId,
        USER_APPROVAL,
      );

      expect(result.status).toBe('submitted');
      expect(result.quotedContracts).toBe(43);
      expect(result.venueOrderId).toBeNull();
      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: receiptPayload.previewId },
        undefined,
        expect.objectContaining({
          inputs: expect.objectContaining({ marketId, amountCents: 2000 }),
          values: { count: '40.00', price: '0.4700' },
          confirmed: true,
        }),
      );
    });

    it('observes the operation receipt without signing a commit', async () => {
      client.observeOrder.mockResolvedValue(receiptPayload);

      const result = await adapter.trading.observeOrder(
        receiptPayload.previewId,
      );

      expect(result.status).toBe('submitted');
      expect(client.observeOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: receiptPayload.previewId },
        undefined,
      );
      expect(client.commitOrder).not.toHaveBeenCalled();
    });

    it('maps a missing operation to ORDER_OUTCOME_UNKNOWN', async () => {
      client.observeOrder.mockRejectedValue(
        new PredictHttpError(404, 'operation_not_found'),
      );

      await expect(
        adapter.trading.observeOrder(receiptPayload.previewId),
      ).rejects.toMatchObject({
        code: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
        metadata: {
          status: 404,
          bodyCode: 'operation_not_found',
          phase: 'observe',
        },
      });
    });

    it('forwards Order Receipt cancellation', async () => {
      client.commitOrder.mockResolvedValue(receiptPayload);
      const signal = new AbortController().signal;

      await adapter.trading.commitOrder(
        receiptPayload.previewId,
        USER_APPROVAL,
        { signal },
      );

      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: receiptPayload.previewId },
        { signal },
        expect.objectContaining({ confirmed: true }),
      );
    });

    it('rejects an Order Receipt bound to another preview', async () => {
      const otherPreviewId = 'b3c2a1d0-1111-4222-8333-444455559999';
      client.fetchOrderPreview.mockResolvedValue({
        ...previewPayload,
        previewId: otherPreviewId,
      });
      await adapter.trading.previewOrder(previewParams);
      await adapter.trading.reviewOrder(otherPreviewId);
      client.commitOrder.mockResolvedValue(receiptPayload);

      await expect(
        adapter.trading.commitOrder(otherPreviewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('rejects an Order Receipt for another Venue', async () => {
      client.commitOrder.mockResolvedValue({
        ...receiptPayload,
        venueId: 'other',
      });

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('rejects a malformed Order Receipt payload', async () => {
      client.commitOrder.mockResolvedValue({
        ...receiptPayload,
        status: 'cancelled',
      });

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('maps canonical backend commit codes to client codes', async () => {
      client.commitOrder.mockRejectedValue(
        new PredictHttpError(409, 'market_not_tradeable'),
      );

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.MARKET_NOT_TRADEABLE,
        }),
      );
    });

    it('maps Order Receipt HTTP 401 to UNAUTHENTICATED without leaking token failures', async () => {
      client.commitOrder.mockRejectedValue(new PredictHttpError(401));

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.UNAUTHENTICATED }),
      );
    });

    it('maps Order Receipt HTTP 503 to VENUE_UNAVAILABLE', async () => {
      client.commitOrder.mockRejectedValue(new PredictHttpError(503));

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.VENUE_UNAVAILABLE }),
      );
    });

    it('preserves Order Receipt AbortError', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      client.commitOrder.mockRejectedValue(abortError);

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId, USER_APPROVAL),
      ).rejects.toBe(abortError);
    });
  });
  describe('funding', () => {
    const destination = {
      address: '0xcDe7aB4E0f4a8C7c0F8aE4bD9c1D2e3F4a5B6c7D',
      network: 'base',
      source: 'configured_demo',
    };
    const withdrawPreviewId = 'b3c2a1d0-1111-4222-8333-444455556666';
    const previewPayload = {
      previewId: withdrawPreviewId,
      venueId: 'kalshi',
      currency: 'USD',
      mode: 'fixed',
      requestedAmount: '5.00',
      destination,
      expiresAt: '2026-03-01T12:00:30.000Z',
    };
    const receiptPayload = {
      operationId: '0f8a1c2b-3333-4444-8555-666677778888',
      previewId: withdrawPreviewId,
      venueId: 'kalshi',
      currency: 'USD',
      mode: 'fixed',
      status: 'processing',
      needsManualReview: false,
      requestedAmount: '5.00',
      withdrawnAmount: null,
      venueTransferId: null,
      destination,
      createdAt: '2026-03-01T12:00:10.000Z',
      resolvedAt: null,
    };

    it('passes a fixed quote straight through to the transport', async () => {
      client.fetchWithdrawPreview.mockResolvedValue(previewPayload);

      const result = await adapter.funding.previewWithdraw({
        amount: '5.00' as PredictAmount,
      });

      expect(result.requestedAmount).toBe('5.00');
      expect(result.destination).toEqual(destination);
      expect(client.fetchWithdrawPreview).toHaveBeenCalledWith(
        adapter.venueId,
        { amount: '5.00' },
        undefined,
      );
    });

    it('passes a sweep intent through without inventing an amount', async () => {
      client.fetchWithdrawPreview.mockResolvedValue({
        ...previewPayload,
        mode: 'sweep_all',
        requestedAmount: undefined,
      });

      const result = await adapter.funding.previewWithdraw({ sweepAll: true });

      expect(result.mode).toBe('sweep_all');
      expect(result.requestedAmount).toBeUndefined();
      expect(client.fetchWithdrawPreview).toHaveBeenCalledWith(
        adapter.venueId,
        { sweepAll: true },
        undefined,
      );
    });

    it('pins nothing locally: every quote and commit reaches the backend', async () => {
      client.fetchWithdrawPreview.mockResolvedValue(previewPayload);
      client.commitWithdraw.mockResolvedValue(receiptPayload);

      await adapter.funding.previewWithdraw({
        amount: '5.00' as PredictAmount,
      });
      await adapter.funding.previewWithdraw({
        amount: '5.00' as PredictAmount,
      });
      await adapter.funding.commitWithdraw(withdrawPreviewId);
      await adapter.funding.commitWithdraw(withdrawPreviewId);

      expect(client.fetchWithdrawPreview).toHaveBeenCalledTimes(2);
      // Coalescing repeated Commits is the service's job, not the adapter's.
      expect(client.commitWithdraw).toHaveBeenCalledTimes(2);
      expect(client.commitWithdraw).toHaveBeenCalledWith(
        adapter.venueId,
        withdrawPreviewId,
        undefined,
        undefined,
      );
    });

    it('forwards the commit dispatch notification unchanged', async () => {
      const onDispatch = jest.fn();
      client.commitWithdraw.mockImplementationOnce(
        async (_venueId, _previewId, _options, notify) => {
          notify?.();
          return receiptPayload;
        },
      );

      await adapter.funding.commitWithdraw(
        withdrawPreviewId,
        undefined,
        onDispatch,
      );

      expect(client.commitWithdraw).toHaveBeenCalledWith(
        adapter.venueId,
        withdrawPreviewId,
        undefined,
        onDispatch,
      );
      expect(onDispatch).toHaveBeenCalledTimes(1);
    });

    it('observes the receipt without committing again', async () => {
      client.observeWithdraw.mockResolvedValue(receiptPayload);

      const result = await adapter.funding.observeWithdraw(withdrawPreviewId);

      expect(result.status).toBe('processing');
      expect(client.observeWithdraw).toHaveBeenCalledWith(
        adapter.venueId,
        withdrawPreviewId,
        undefined,
      );
      expect(client.commitWithdraw).not.toHaveBeenCalled();
    });

    it('carries a rejection receipt with its code', async () => {
      client.commitWithdraw.mockResolvedValue({
        ...receiptPayload,
        status: 'rejected',
        rejectionCode: 'step_up_verification_required',
        withdrawnAmount: null,
      });

      const result = await adapter.funding.commitWithdraw(withdrawPreviewId);

      expect(result).toMatchObject({
        status: 'rejected',
        rejectionCode: 'step_up_verification_required',
      });
    });

    it('rejects a quote for another Venue', async () => {
      client.fetchWithdrawPreview.mockResolvedValue({
        ...previewPayload,
        venueId: 'other-venue',
      });

      await expect(
        adapter.funding.previewWithdraw({ sweepAll: true }),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('rejects a sweep quote for a fixed intent', async () => {
      client.fetchWithdrawPreview.mockResolvedValue({
        ...previewPayload,
        mode: 'sweep_all',
        requestedAmount: undefined,
      });

      await expect(
        adapter.funding.previewWithdraw({ amount: '5.00' as PredictAmount }),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('rejects a fixed quote for a sweep intent', async () => {
      client.fetchWithdrawPreview.mockResolvedValue(previewPayload);

      await expect(
        adapter.funding.previewWithdraw({ sweepAll: true }),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('rejects a quote for an amount the person did not ask for', async () => {
      client.fetchWithdrawPreview.mockResolvedValue({
        ...previewPayload,
        requestedAmount: '6.00',
      });

      await expect(
        adapter.funding.previewWithdraw({ amount: '5.00' as PredictAmount }),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('accepts the amount echo normalized to two decimals', async () => {
      client.fetchWithdrawPreview.mockResolvedValue({
        ...previewPayload,
        requestedAmount: '5',
      });

      await expect(
        adapter.funding.previewWithdraw({ amount: '5.00' as PredictAmount }),
      ).resolves.toMatchObject({ requestedAmount: '5' });
    });

    it('rejects a receipt bound to another preview', async () => {
      client.commitWithdraw.mockResolvedValue({
        ...receiptPayload,
        previewId: 'b3c2a1d0-1111-4222-8333-444455559999',
      });

      await expect(
        adapter.funding.commitWithdraw(withdrawPreviewId),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('rejects an observation bound to another Venue', async () => {
      client.observeWithdraw.mockResolvedValue({
        ...receiptPayload,
        venueId: 'other-venue',
      });

      await expect(
        adapter.funding.observeWithdraw(withdrawPreviewId),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('rejects a malformed receipt payload', async () => {
      client.commitWithdraw.mockResolvedValue({
        ...receiptPayload,
        status: 'rejected',
      });

      await expect(
        adapter.funding.commitWithdraw(withdrawPreviewId),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('maps amount_below_minimum on a preview to AMOUNT_BELOW_MINIMUM', async () => {
      client.fetchWithdrawPreview.mockRejectedValue(
        new PredictHttpError(422, 'amount_below_minimum'),
      );

      await expect(
        adapter.funding.previewWithdraw({ amount: '0.50' as PredictAmount }),
      ).rejects.toMatchObject({
        code: PredictErrorCode.AMOUNT_BELOW_MINIMUM,
        metadata: { status: 422, phase: 'preview' },
      });
    });

    it('maps a preview 404 to UNSUPPORTED_VENUE with the preview phase', async () => {
      client.fetchWithdrawPreview.mockRejectedValue(
        new PredictHttpError(404, 'venue_not_found'),
      );

      await expect(
        adapter.funding.previewWithdraw({ sweepAll: true }),
      ).rejects.toMatchObject({
        code: PredictErrorCode.UNSUPPORTED_VENUE,
        metadata: { phase: 'preview' },
      });
    });

    it('maps a commit 503 to VENUE_UNAVAILABLE with the commit phase', async () => {
      client.commitWithdraw.mockRejectedValue(
        new PredictHttpError(503, 'venue_unavailable'),
      );

      await expect(
        adapter.funding.commitWithdraw(withdrawPreviewId),
      ).rejects.toMatchObject({
        code: PredictErrorCode.VENUE_UNAVAILABLE,
        metadata: {
          phase: 'commit',
          // No outcome in the body: the admin request may have reached Kalshi.
          outcome: 'unknown',
        },
      });
    });

    it('maps a missing operation on observe to ORDER_OUTCOME_UNKNOWN', async () => {
      client.observeWithdraw.mockRejectedValue(
        new PredictHttpError(404, 'operation_not_found'),
      );

      await expect(
        adapter.funding.observeWithdraw(withdrawPreviewId),
      ).rejects.toMatchObject({
        code: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
        metadata: { phase: 'observe', bodyCode: 'operation_not_found' },
      });
    });

    it('forwards the observation cancellation signal', async () => {
      client.observeWithdraw.mockResolvedValue(receiptPayload);
      const signal = new AbortController().signal;

      await adapter.funding.observeWithdraw(withdrawPreviewId, { signal });

      expect(client.observeWithdraw).toHaveBeenCalledWith(
        adapter.venueId,
        withdrawPreviewId,
        { signal },
      );
    });

    it('preserves an AbortError from a cancelled observation', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      client.observeWithdraw.mockRejectedValue(abortError);

      await expect(
        adapter.funding.observeWithdraw(withdrawPreviewId),
      ).rejects.toBe(abortError);
    });

    it('never carries a commit outcome on a failed withdrawal observation', async () => {
      // The GET replays the stored submission before it answers, so even a
      // not_placed body cannot speak for that submission.
      client.observeWithdraw.mockRejectedValue(
        new PredictHttpError(503, 'venue_unavailable', undefined, 'not_placed'),
      );

      const error = await adapter.funding
        .observeWithdraw(withdrawPreviewId)
        .catch((caught: unknown) => caught);

      expect(error).toMatchObject({
        code: PredictErrorCode.VENUE_UNAVAILABLE,
        metadata: { phase: 'observe' },
      });
      expect((error as PredictError).metadata).not.toHaveProperty('outcome');
    });
  });
});
