import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { VenueMarketDataAdapter } from '../adapters/types';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';
import { PredictError, PredictErrorCode } from '../errors';
import {
  type PredictEntityId,
  type PredictFeedId,
  type PredictTimestamp,
  type PredictVenueId,
} from '../types';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from './PredictMarketDataService';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PredictNextGetVenueStatus: 'PredictNext Get Venue Status',
    PredictNextGetFeed: 'PredictNext Get Feed',
    PredictNextGetEvent: 'PredictNext Get Event',
    PredictNextGetMarketHistory: 'PredictNext Get Market History',
    PredictNextSearchEvents: 'PredictNext Search Events',
  },
  TraceOperation: {
    PredictDataFetch: 'predict.data_fetch',
  },
}));

const createService = (marketData: VenueMarketDataAdapter) => {
  const messenger: PredictMarketDataServiceMessenger = new Messenger({
    namespace: 'PredictMarketDataService',
  });
  return new PredictMarketDataService({
    messenger,
    marketData,
    venueId: KALSHI_VENUE_ID,
    policyOptions: { backoff: new ConstantBackoff(0) },
  });
};

const createMarketData = (): jest.Mocked<VenueMarketDataAdapter> => ({
  fetchVenueStatus: jest.fn(),
  fetchVenueCatalog: jest.fn(),
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
  searchEvents: jest.fn(),
});

const feedId = 'sports-football-nfl-games' as PredictFeedId;
const marketId = 'market-1' as PredictEntityId;

describe('PredictMarketDataService', () => {
  const services: PredictMarketDataService[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    services.splice(0).forEach((service) => service.destroy());
  });

  const buildService = (marketData: VenueMarketDataAdapter) => {
    const service = createService(marketData);
    services.push(service);
    return service;
  };

  it('rejects unsupported venues before invoking the adapter', async () => {
    const marketData = createMarketData();
    const service = buildService(marketData);

    const result = service.getVenueStatus('other' as PredictVenueId);

    await expect(result).rejects.toThrow(
      'This prediction venue is not supported.',
    );
    expect(marketData.fetchVenueStatus).not.toHaveBeenCalled();
  });

  it('serves the Venue catalog from cache for five minutes', async () => {
    const catalog = {
      venueId: KALSHI_VENUE_ID,
      actions: ['buy' as const],
      feeds: { 'nfl-games': feedId },
      searchSupported: true,
    };
    const marketData = createMarketData();
    marketData.fetchVenueCatalog.mockResolvedValue(catalog);
    const service = buildService(marketData);

    const first = await service.getVenueCatalog(KALSHI_VENUE_ID);
    jest.advanceTimersByTime(299_000);
    await service.getVenueCatalog(KALSHI_VENUE_ID);

    expect(first).toEqual(catalog);
    expect(marketData.fetchVenueCatalog).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2_000);
    await service.getVenueCatalog(KALSHI_VENUE_ID);

    expect(marketData.fetchVenueCatalog).toHaveBeenCalledTimes(2);
  });

  it('rejects a Venue catalog read for another Venue', async () => {
    const marketData = createMarketData();
    const service = buildService(marketData);

    const result = service.getVenueCatalog('polymarket' as PredictVenueId);

    await expect(result).rejects.toThrow(
      'This prediction venue is not supported.',
    );
    expect(marketData.fetchVenueCatalog).not.toHaveBeenCalled();
  });

  it('forwards Event list cancellation to the adapter', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [],
    });
    const service = buildService(marketData);
    const signal = new AbortController().signal;

    await service.getFeed(KALSHI_VENUE_ID, feedId, {}, undefined, { signal });

    expect(marketData.fetchFeed).toHaveBeenCalledWith(
      feedId,
      { cursor: undefined },
      { signal },
    );
  });

  it('stops Event pagination for an empty cursor', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [],
      nextCursor: '',
    });
    const service = buildService(marketData);

    const result = await service.getFeed(KALSHI_VENUE_ID, feedId, {});

    expect(result.nextCursor).toBeUndefined();
  });

  it('traces searches without the query text and forwards cancellation', async () => {
    const marketData = createMarketData();
    marketData.searchEvents.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      events: [],
    });
    const service = buildService(marketData);
    const signal = new AbortController().signal;

    await service.searchEvents(
      KALSHI_VENUE_ID,
      { q: 'chiefs', limit: 20 },
      { signal },
    );

    expect(marketData.searchEvents).toHaveBeenCalledWith(
      { q: 'chiefs', limit: 20 },
      { signal },
    );
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextSearchEvents,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^searchEvents-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
      },
      data: { queryLength: 6, limit: 20 },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextSearchEvents,
      id: expect.stringMatching(/^searchEvents-\d+$/u),
      data: { success: true, eventCount: 0 },
    });
  });

  it('traces Market history fetches with safe metadata and point count', async () => {
    const marketData = createMarketData();
    marketData.fetchMarketHistory.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      marketId,
      range: 'LIVE',
      observedAt: '2026-08-07T12:00:00Z' as PredictTimestamp,
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z' as PredictTimestamp,
          yesPrice: '0.42',
          noPrice: '0.58',
        },
      ],
    } as never);
    const service = buildService(marketData);

    await service.getMarketHistory(KALSHI_VENUE_ID, marketId, 'LIVE');

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        range: 'LIVE',
      },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      data: { success: true, pointCount: 1 },
    });
  });

  it('ends the Market history trace when the fetch fails', async () => {
    const marketData = createMarketData();
    marketData.fetchMarketHistory.mockRejectedValue(
      PredictError.from(PredictErrorCode.INVALID_RESPONSE),
    );
    const service = buildService(marketData);

    const result = service.getMarketHistory(KALSHI_VENUE_ID, marketId, '1D');

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        range: '1D',
      },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetMarketHistory,
      id: expect.stringMatching(/^getMarketHistory-\d+$/u),
      data: {
        success: false,
        error: expect.any(String),
      },
    });
  });

  it('retries transient errors twice after the initial attempt', async () => {
    const marketData = createMarketData();
    marketData.fetchVenueStatus.mockRejectedValue(
      PredictError.from(PredictErrorCode.NETWORK_ERROR),
    );
    const service = buildService(marketData);

    const result = service.getVenueStatus(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.NETWORK_ERROR,
    });
    expect(marketData.fetchVenueStatus).toHaveBeenCalledTimes(3);
  });

  it('does not retry response contract errors', async () => {
    const marketData = createMarketData();
    marketData.fetchVenueStatus.mockRejectedValue(
      PredictError.from(PredictErrorCode.INVALID_RESPONSE),
    );
    const service = buildService(marketData);

    const result = service.getVenueStatus(KALSHI_VENUE_ID);

    await expect(result).rejects.toMatchObject({
      code: PredictErrorCode.INVALID_RESPONSE,
    });
    expect(marketData.fetchVenueStatus).toHaveBeenCalledTimes(1);
  });

  it('traces Feed fetches with Event count', async () => {
    const marketData = createMarketData();
    marketData.fetchFeed.mockResolvedValue({
      venueId: KALSHI_VENUE_ID,
      id: feedId,
      title: 'NFL Games',
      events: [{ id: 'event-1' }],
    } as never);
    const service = buildService(marketData);

    await service.getFeed(KALSHI_VENUE_ID, feedId, { limit: 20 });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetFeed,
      op: TraceOperation.PredictDataFetch,
      id: expect.stringMatching(/^getFeed-\d+$/u),
      tags: {
        feature: PREDICT_NEXT_FEATURE_NAME,
        venueId: KALSHI_VENUE_ID,
        feedId,
      },
      data: { hasCursor: false, limit: 20 },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PredictNextGetFeed,
      id: expect.stringMatching(/^getFeed-\d+$/u),
      data: { success: true, eventCount: 1 },
    });
  });
});
