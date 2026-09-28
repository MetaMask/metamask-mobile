import { PREDICT_MARKET_TYPES } from '../../constants';
import { PredictErrorCode } from '../../errors';
import type {
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
} from '../../types';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';
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
  fetchVenueStatus: jest.fn(),
  fetchBalance: jest.fn(),
  fetchPositions: jest.fn(),
  fetchActivity: jest.fn(),
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
  fetchOrderPreview: jest.fn(),
  commitOrder: jest.fn(),
});

describe('KalshiRemoteAdapter', () => {
  let client: jest.Mocked<PredictApiReadTransport>;
  let adapter: KalshiRemoteAdapter;

  beforeEach(() => {
    client = createClient();
    adapter = new KalshiRemoteAdapter(client);
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

  it('maps HTTP 429 to RATE_LIMITED without response data', async () => {
    client.fetchFeed.mockRejectedValue(new PredictHttpError(429));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({
        code: PredictErrorCode.RATE_LIMITED,
        metadata: undefined,
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

  it.each([500, 502, 504])('maps HTTP %s to NETWORK_ERROR', async (status) => {
    client.fetchFeed.mockRejectedValue(new PredictHttpError(status));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.NETWORK_ERROR }),
    );
  });

  it('maps other transport failures to INVALID_RESPONSE', async () => {
    client.fetchFeed.mockRejectedValue(new Error('network detail'));

    await expect(adapter.marketData.fetchFeed(feedId, {})).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
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

  it('maps Balance HTTP 401 to UNAUTHENTICATED', async () => {
    client.fetchBalance.mockRejectedValue(new PredictHttpError(401));

    await expect(adapter.portfolio.fetchBalance()).rejects.toEqual(
      expect.objectContaining({ code: PredictErrorCode.UNAUTHENTICATED }),
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
          shares: '75.00',
          marketExposure: '41.25',
          realizedPnl: '-2.50',
          context: {
            eventId: 'event-1',
            eventTitle: 'Lakers vs Celtics',
            marketQuestion: 'Will the Lakers win?',
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
          type: 'fill',
          id: 'fill-1',
          venueId: 'kalshi',
          marketId: 'market-1',
          outcomeSide: 'yes',
          shares: '75.00',
          price: '0.55',
          timestamp: '2026-09-01T12:00:00.000Z',
        },
        {
          type: 'settlement',
          id: 'market-1:2026-09-02T00:00:00.000Z',
          venueId: 'kalshi',
          marketId: 'market-1',
          result: 'yes',
          side: 'yes',
          proceeds: '75.00',
          timestamp: '2026-09-02T00:00:00.000Z',
        },
      ],
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
    const previewParams = {
      marketId,
      side: 'yes' as const,
      amount: '20' as never,
    };

    it('parses a canonical Order Preview for the exact intent', async () => {
      client.fetchOrderPreview.mockResolvedValue(previewPayload);

      const result = await adapter.trading.previewOrder(previewParams);

      expect(result.previewId).toBe(previewPayload.previewId);
      expect(result.requestedAmount).toBe('20.00');
    });

    it('accepts an amount echo that differs only in trailing zeros', async () => {
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
        expect.objectContaining({ code: PredictErrorCode.MARKET_NOT_FOUND }),
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

    it('parses a canonical Order Receipt for the committed preview', async () => {
      client.commitOrder.mockResolvedValue(receiptPayload);

      const result = await adapter.trading.commitOrder(
        receiptPayload.previewId,
      );

      expect(result.status).toBe('submitted');
      expect(result.quotedContracts).toBe(43);
      expect(result.venueOrderId).toBeNull();
      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: receiptPayload.previewId },
        undefined,
      );
    });

    it('forwards Order Receipt cancellation', async () => {
      client.commitOrder.mockResolvedValue(receiptPayload);
      const signal = new AbortController().signal;

      await adapter.trading.commitOrder(receiptPayload.previewId, { signal });

      expect(client.commitOrder).toHaveBeenCalledWith(
        adapter.venueId,
        { previewId: receiptPayload.previewId },
        { signal },
      );
    });

    it('rejects an Order Receipt bound to another preview', async () => {
      client.commitOrder.mockResolvedValue(receiptPayload);

      await expect(
        adapter.trading.commitOrder('b3c2a1d0-1111-4222-8333-444455559999'),
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
        adapter.trading.commitOrder(receiptPayload.previewId),
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
        adapter.trading.commitOrder(receiptPayload.previewId),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.INVALID_RESPONSE }),
      );
    });

    it('maps canonical backend commit codes to client codes', async () => {
      client.commitOrder.mockRejectedValue(
        new PredictHttpError(409, 'market_not_tradeable'),
      );

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId),
      ).rejects.toEqual(
        expect.objectContaining({
          code: PredictErrorCode.MARKET_NOT_TRADEABLE,
        }),
      );
    });

    it('maps Order Receipt HTTP 401 to UNAUTHENTICATED without leaking token failures', async () => {
      client.commitOrder.mockRejectedValue(new PredictHttpError(401));

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.UNAUTHENTICATED }),
      );
    });

    it('maps Order Receipt HTTP 503 to VENUE_UNAVAILABLE', async () => {
      client.commitOrder.mockRejectedValue(new PredictHttpError(503));

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId),
      ).rejects.toEqual(
        expect.objectContaining({ code: PredictErrorCode.VENUE_UNAVAILABLE }),
      );
    });

    it('preserves Order Receipt AbortError', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      client.commitOrder.mockRejectedValue(abortError);

      await expect(
        adapter.trading.commitOrder(receiptPayload.previewId),
      ).rejects.toBe(abortError);
    });
  });
});
