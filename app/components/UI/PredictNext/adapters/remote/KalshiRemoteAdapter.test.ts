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
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
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
});
